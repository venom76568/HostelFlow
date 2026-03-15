from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class ContactMessageDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    email: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
