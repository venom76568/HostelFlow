from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


def generate_id():
    return uuid.uuid4().hex


class AttendanceDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    student_id: str
    date: str  # YYYY-MM-DD
    status: str = "Absent"  # "Present" or "Absent"
    marked_by: str  # admin user id who marked
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
