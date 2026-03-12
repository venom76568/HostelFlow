from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex

class MealDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    tenant_id: str
    date: str  # YYYY-MM-DD format
    breakfast: str
    lunch: str
    dinner: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MealResponseDB(BaseModel):
    id: str = Field(default_factory=generate_id)
    meal_id: str
    tenant_id: str
    user_id: str
    status: str # "Having" or "Skipping"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
