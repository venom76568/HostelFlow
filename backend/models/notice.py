from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class NoticeDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    title: str
    content: str
    is_edited: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
