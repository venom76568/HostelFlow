import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from db.mongodb import get_database, get_activity_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.leave import LeaveDB
from datetime import datetime, timezone
from typing import Optional
from api.notifications import send_push_to_role, send_push_to_user

router = APIRouter(prefix="/api/leaves", tags=["leaves"])

class LeaveCreateRequest(BaseModel):
    start_date: str
    end_date: str
    reason: str

class LeaveStatusUpdate(BaseModel):
    status: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def request_leave(
    request: LeaveCreateRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Only Students can request leaves.")

    new_leave = LeaveDB(
        tenant_id=tenant_id,
        user_id=token_data.get("uid"),
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason
    )

    await adb["leaves"].insert_one(new_leave.model_dump())

    # Notify admins about the new leave request
    await send_push_to_role(
        tenant_id=tenant_id,
        role="Admin",
        title="New Leave Request",
        body="A student has submitted an outing/leave request.",
        db=db,
        data={"url": f"/{tenant_id}/admin", "tag": "leave-new"},
    )

    return {"message": "Leave requested successfully.", "leave_id": new_leave.id}

@router.get("/")
async def list_leaves(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database),
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    student_name: Optional[str] = None,
):
    query: dict = {"tenant_id": tenant_id}
    
    if token_data.get("role") == "Student":
        query["user_id"] = token_data.get("uid")

    # Apply optional filters (admin only meaningful for most)
    if status_filter and status_filter != "All":
        query["status"] = status_filter
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        # filter leaves that start on or before end_date
        query.setdefault("start_date", {})
        if isinstance(query["start_date"], dict):
            query["start_date"]["$lte"] = end_date
        else:
            query["start_date"] = {"$lte": end_date}

    cursor = adb["leaves"].find(query).sort("start_date", -1)
    leaves = await cursor.to_list(length=500)
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
    
    if token_data.get("role") == "Admin":
        for leave in leaves:
            user = await db["users"].find_one({"id": leave["user_id"]})
            if user:
                leave["student_name"] = user["full_name"]
        # Client-side student_name filter (case-insensitive substring)
        if student_name:
            leaves = [l for l in leaves if student_name.lower() in l.get("student_name", "").lower()]

    return leaves


@router.get("/export")
async def export_leaves_csv(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database),
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Export all leaves for this tenant as a CSV file."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can export leave records.")

    query: dict = {"tenant_id": tenant_id}
    if status_filter and status_filter != "All":
        query["status"] = status_filter
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        query.setdefault("start_date", {})
        if isinstance(query["start_date"], dict):
            query["start_date"]["$lte"] = end_date
        else:
            query["start_date"] = {"$lte": end_date}

    cursor = adb["leaves"].find(query).sort("start_date", -1)
    leaves = await cursor.to_list(length=5000)

    # Enrich with student names
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
        user = await db["users"].find_one({"id": leave["user_id"]})
        leave["student_name"] = user["full_name"] if user else "Unknown"

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Leave ID", "Student Name", "Start Date", "End Date", "Reason", "Status", "Created At"])
    for l in leaves:
        writer.writerow([
            l.get("id", ""),
            l.get("student_name", ""),
            l.get("start_date", ""),
            l.get("end_date", ""),
            l.get("reason", ""),
            l.get("status", ""),
            l.get("created_at", ""),
        ])

    output.seek(0)
    filename = f"leaves_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.patch("/{leave_id}/status")
async def update_leave_status(
    leave_id: str,
    request: LeaveStatusUpdate,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can update leave status.")
    
    if request.status not in ["Pending", "Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status.")

    result = await adb["leaves"].update_one(
        {"id": leave_id, "tenant_id": tenant_id},
        {"$set": {"status": request.status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    # Notify the student about the decision
    if request.status in ["Approved", "Rejected"]:
        leave = await adb["leaves"].find_one({"id": leave_id, "tenant_id": tenant_id})
        if leave:
            student_id = leave.get("user_id")
            tenant = await db["tenants"].find_one({"id": tenant_id})
            slug = tenant.get("slug", "") if tenant else ""
            if student_id:
                verb = "approved" if request.status == "Approved" else "rejected"
                await send_push_to_user(
                    user_id=student_id,
                    title=f"Leave {request.status}",
                    body=f"Your leave request has been {verb} by the warden.",
                    db=db,
                    data={"url": f"/{slug}/dashboard", "tag": f"leave-{request.status.lower()}-{leave_id}"},
                )

    return {"message": "Leave status updated."}
