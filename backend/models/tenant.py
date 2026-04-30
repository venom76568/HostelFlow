from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class TenantDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    slug: str
    college_code: Optional[str] = None
    is_approved: bool = False
    is_active: bool = False
    admin_email: str
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
