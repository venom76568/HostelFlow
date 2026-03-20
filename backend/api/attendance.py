from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from db.mongodb import get_database, get_activity_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.attendance import AttendanceDB
from datetime import datetime, timezone, timedelta
import io, csv
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


class MarkAttendanceRequest(BaseModel):
    student_id: str
    date: str  # YYYY-MM-DD
    status: str  # "Present" or "Absent"


class BulkMarkRequest(BaseModel):
    date: str
    records: List[MarkAttendanceRequest]


@router.get("/")
async def get_attendance(
    date: str = None,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
    adb=Depends(get_activity_database),
):
    """Get attendance for a given date with students sorted by room number."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view attendance.")

    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Get all students for this tenant, sorted by room_number ascending
    students_cursor = db["users"].find(
        {"tenant_id": tenant_id, "role": "Student"}
    ).sort("room_number", 1)
    students = await students_cursor.to_list(length=1000)

    # Get attendance records for this date
    attendance_cursor = adb["attendance"].find(
        {"tenant_id": tenant_id, "date": date}
    )
    attendance_records = await attendance_cursor.to_list(length=1000)
    attendance_map = {r["student_id"]: r["status"] for r in attendance_records}

    result = []
    for s in students:
        result.append({
            "student_id": s["id"],
            "full_name": s["full_name"],
            "email": s["email"],
            "room_number": s.get("room_number", "N/A"),
            "contact": s.get("contact", ""),
            "status": attendance_map.get(s["id"], ""),  # empty = not marked
        })

    total_present = sum(1 for r in result if r["status"] == "Present")
    total_absent = sum(1 for r in result if r["status"] == "Absent")
    total_unmarked = sum(1 for r in result if r["status"] == "")

    return {
        "date": date,
        "students": result,
        "total_students": len(result),
        "total_present": total_present,
        "total_absent": total_absent,
        "total_unmarked": total_unmarked,
    }


@router.post("/mark")
async def mark_attendance(
    request: MarkAttendanceRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
    adb=Depends(get_activity_database),
):
    """Mark or update attendance for a single student on a given date."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can mark attendance.")

    if request.status not in ["Present", "Absent"]:
        raise HTTPException(status_code=400, detail="Status must be 'Present' or 'Absent'.")

    # Upsert: update if exists, insert if not
    existing = await adb["attendance"].find_one({
        "tenant_id": tenant_id,
        "student_id": request.student_id,
        "date": request.date,
    })

    if existing:
        await adb["attendance"].update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": request.status, "marked_by": token_data["uid"]}}
        )
    else:
        record = AttendanceDB(
            tenant_id=tenant_id,
            student_id=request.student_id,
            date=request.date,
            status=request.status,
            marked_by=token_data["uid"],
        )
        await adb["attendance"].insert_one(record.model_dump())

    return {"message": f"Attendance marked as {request.status}."}


@router.post("/mark-bulk")
async def mark_attendance_bulk(
    request: BulkMarkRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
    adb=Depends(get_activity_database),
):
    """Mark attendance for multiple students at once."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can mark attendance.")

    for record in request.records:
        if record.status not in ["Present", "Absent"]:
            continue
            
        existing = await adb["attendance"].find_one({
            "tenant_id": tenant_id,
            "student_id": record.student_id,
            "date": request.date,
        })

        if existing:
            await adb["attendance"].update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": record.status, "marked_by": token_data["uid"]}}
            )
        else:
            att = AttendanceDB(
                tenant_id=tenant_id,
                student_id=record.student_id,
                date=request.date,
                status=record.status,
                marked_by=token_data["uid"],
            )
            await adb["attendance"].insert_one(att.model_dump())

    return {"message": f"Bulk attendance marked for {len(request.records)} students."}


@router.get("/export")
async def export_attendance(
    date: str = None,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
    adb=Depends(get_activity_database),
):
    """Export attendance as CSV."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can export attendance.")

    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    students_cursor = db["users"].find(
        {"tenant_id": tenant_id, "role": "Student"}
    ).sort("room_number", 1)
    students = await students_cursor.to_list(length=1000)

    attendance_cursor = adb["attendance"].find(
        {"tenant_id": tenant_id, "date": date}
    )
    attendance_records = await attendance_cursor.to_list(length=1000)
    attendance_map = {r["student_id"]: r["status"] for r in attendance_records}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Room No", "Student Name", "Email", "Status"])

    for s in students:
        writer.writerow([
            s.get("room_number", "N/A"),
            s["full_name"],
            s["email"],
            attendance_map.get(s["id"], "Not Marked"),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{date}.csv"},
    )


@router.get("/student/{student_id}")
async def get_student_attendance_history(
    student_id: str,
    days: int = 30,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
    adb=Depends(get_activity_database),
):
    """Get attendance history for a student (past N days)."""
    # Allow Admin or Parent role
    if token_data.get("role") not in ["Admin", "Parent", "Student"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    # For Parent or Student role, verify they can only see their linked/own student_id
    if token_data.get("role") == "Student":
        if token_data.get("uid") != student_id:
             raise HTTPException(status_code=403, detail="You can only view your own attendance.")
             
    if token_data.get("role") == "Parent":
        if token_data.get("student_id") != student_id:
            raise HTTPException(status_code=403, detail="You can only view your child's attendance.")

    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    cursor = adb["attendance"].find({
        "tenant_id": tenant_id,
        "student_id": student_id,
        "date": {"$gte": start_date},
    }).sort("date", -1)

    records = await cursor.to_list(length=1000)

    # Get student info
    student = await db["users"].find_one({"id": student_id, "tenant_id": tenant_id})
    student_name = student["full_name"] if student else "Unknown"
    student_room = student.get("room_number", "N/A") if student else "N/A"

    return {
        "student_id": student_id,
        "student_name": student_name,
        "room_number": student_room,
        "records": [{"date": r["date"], "status": r["status"]} for r in records],
    }
