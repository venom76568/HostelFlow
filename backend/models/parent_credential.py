from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


def generate_id():
    return uuid.uuid4().hex


class ParentCredentialDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    student_id: str
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
