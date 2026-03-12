from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class LeaveDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    user_id: str
    start_date: str
    end_date: str
    reason: str
    status: str = "Pending" # Pending, Approved, Rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
