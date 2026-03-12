from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.leave import LeaveDB
from datetime import datetime, timezone

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
    db = Depends(get_database)
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

    await db["leaves"].insert_one(new_leave.model_dump())
    return {"message": "Leave requested successfully.", "leave_id": new_leave.id}

@router.get("/")
async def list_leaves(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    query = {"tenant_id": tenant_id}
    
    if token_data.get("role") == "Student":
        query["user_id"] = token_data.get("uid")
        
    cursor = db["leaves"].find(query).sort("created_at", -1)
    leaves = await cursor.to_list(length=100)
    for leave in leaves:
        leave["_id"] = str(leave["_id"])
    
    if token_data.get("role") == "Admin":
         for leave in leaves:
             user = await db["users"].find_one({"id": leave["user_id"]})
             if user:
                 leave["student_name"] = user["full_name"]

    return leaves

@router.patch("/{leave_id}/status")
async def update_leave_status(
    leave_id: str,
    request: LeaveStatusUpdate,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can update leave status.")
    
    if request.status not in ["Pending", "Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status.")

    result = await db["leaves"].update_one(
        {"id": leave_id, "tenant_id": tenant_id},
        {"$set": {"status": request.status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found.")
        
    return {"message": "Leave status updated."}
