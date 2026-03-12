from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.notice import NoticeDB
from datetime import datetime, timezone

router = APIRouter(prefix="/api/notices", tags=["notices"])

class NoticeCreateRequest(BaseModel):
    title: str
    content: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_notice(
    request: NoticeCreateRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can post notices.")
    
    new_notice = NoticeDB(
        tenant_id=tenant_id,
        title=request.title,
        content=request.content
    )

    await db["notices"].insert_one(new_notice.model_dump())
    return {"message": "Notice created successfully.", "notice_id": new_notice.id}

@router.get("/")
async def list_notices(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    # Both students and admins can view notices for their tenant
    cursor = db["notices"].find({"tenant_id": tenant_id}).sort("created_at", -1).limit(20)
    notices = await cursor.to_list(length=20)
    for notice in notices:
        notice["_id"] = str(notice["_id"])
    return notices

@router.delete("/{notice_id}", status_code=status.HTTP_200_OK)
async def delete_notice(
    notice_id: str,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can delete notices.")
         
    result = await db["notices"].delete_one({"id": notice_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
         raise HTTPException(status_code=404, detail="Notice not found.")
    return {"message": "Notice deleted successfully."}

@router.put("/{notice_id}", status_code=status.HTTP_200_OK)
async def update_notice(
    notice_id: str,
    request: NoticeCreateRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can edit notices.")
         
    result = await db["notices"].update_one(
        {"id": notice_id, "tenant_id": tenant_id},
        {"$set": {
            "title": request.title, 
            "content": request.content,
            "is_edited": True
        }}
    )
    
    if result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Notice not found.")
    return {"message": "Notice updated successfully."}
