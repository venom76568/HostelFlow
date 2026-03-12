from typing import Optional
from pydantic import BaseModel, Field
import uuid

def generate_id():
    return uuid.uuid4().hex

class UserDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    full_name: str
    email: str
    password_hash: str
    role: str  # "Admin" or "Student"
    contact: Optional[str] = None
    room_number: Optional[str] = None
