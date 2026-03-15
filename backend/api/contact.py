from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from db.mongodb import get_database
from models.contact_message import ContactMessageDB
from api.deps import get_current_user_token_data

router = APIRouter(prefix="/api/contact", tags=["contact"])

class ContactMessageCreateRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_contact_message(request: ContactMessageCreateRequest, db = Depends(get_database)):
    new_message = ContactMessageDB(
        name=request.name,
        email=request.email,
        message=request.message
    )
    
    await db["contact_messages"].insert_one(new_message.model_dump())
    return {"message": "Your message has been received.", "id": new_message.id}

@router.get("/")
async def list_contact_messages(token_data: dict = Depends(get_current_user_token_data), db = Depends(get_database)):
    if token_data.get("role") != "SuperAdmin":
         raise HTTPException(status_code=403, detail="Only SuperAdmins can view contact messages.")
         
    cursor = db["contact_messages"].find().sort("created_at", -1)
    messages = await cursor.to_list(length=100)
    for msg in messages:
        msg["_id"] = str(msg["_id"])
    return messages
