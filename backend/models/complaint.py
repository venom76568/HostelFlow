from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class ComplaintDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    student_id: str
    category: str  # Food, Water, Cleaning, Electricity
    description: str
    status: str = "Pending"  # Pending, In_Progress, Resolved
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
