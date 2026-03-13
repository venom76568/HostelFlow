from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, File
from pydantic import BaseModel
from typing import List, Optional
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.complaint import ComplaintDB
from datetime import datetime, timezone
import os
import shutil

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

UPLOAD_DIR = "uploads/complaints"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ComplaintStatusUpdate(BaseModel):
    status: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_complaint(
    category: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Only Students can file complaints.")

    image_url = None
    if image:
        # Generate a unique filename
        filename = f"{tenant_id}_{token_data.get('uid')}_{int(datetime.now().timestamp())}_{image.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/complaints/{filename}"

    new_complaint = ComplaintDB(
        tenant_id=tenant_id,
        student_id=token_data.get("uid"),
        category=category,
        description=description,
        image_url=image_url
    )

    await db["complaints"].insert_one(new_complaint.model_dump())
    return {"message": "Complaint submitted successfully.", "complaint_id": new_complaint.id}

@router.get("/")
async def list_complaints(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    query = {"tenant_id": tenant_id}
    
    # Students only see their own complaints
    if token_data.get("role") == "Student":
        query["student_id"] = token_data.get("uid")
        
    cursor = db["complaints"].find(query).sort("created_at", -1)
    raw_complaints = await cursor.to_list(length=1000)
    
    current_time = datetime.now(timezone.utc)
    complaints = []
    for comp in raw_complaints:
        # Filter out Resolved complaints older than 14 days
        if comp.get("status") == "Resolved":
            last_updated = comp.get("updated_at") or comp.get("created_at")
            if last_updated:
                if last_updated.tzinfo is None:
                    last_updated = last_updated.replace(tzinfo=timezone.utc)
                if (current_time - last_updated).days > 14:
                    continue
                    
        comp["_id"] = str(comp["_id"])
        complaints.append(comp)
        
    # Enhance with student info if admin
    if token_data.get("role") == "Admin":
         for comp in complaints:
             user = await db["users"].find_one({"id": comp["student_id"]})
             if user:
                 comp["student_name"] = user["full_name"]
                 comp["student_room"] = user.get("room_number", "N/A")

    return complaints

@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    request: ComplaintStatusUpdate,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can update complaint status.")
    
    if request.status not in ["Pending", "In_Progress", "Resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status.")

    result = await db["complaints"].update_one(
        {"id": complaint_id, "tenant_id": tenant_id},
        {"$set": {
            "status": request.status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Complaint not found.")
        
    return {"message": "Complaint status updated."}
