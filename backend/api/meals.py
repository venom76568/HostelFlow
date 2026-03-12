from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.meal import MealDB, MealResponseDB
from datetime import datetime, timezone
import io
import csv

router = APIRouter(prefix="/api/meals", tags=["meals"])

class MealCreateRequest(BaseModel):
    date: str
    breakfast: str
    lunch: str
    dinner: str

class MealRespondRequest(BaseModel):
    status: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_meal(
    request: MealCreateRequest, 
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can create meals.")
    
    # Check if a meal already exists for this date in this tenant
    existing = await db["meals"].find_one({"tenant_id": tenant_id, "date": request.date})
    if existing:
         raise HTTPException(status_code=400, detail="A menu for this date already exists.")

    new_meal = MealDB(
        tenant_id=tenant_id,
        date=request.date,
        breakfast=request.breakfast,
        lunch=request.lunch,
        dinner=request.dinner
    )

    await db["meals"].insert_one(new_meal.model_dump())
    return {"message": "Meal menu created successfully.", "meal_id": new_meal.id}

@router.get("/")
async def list_meals(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    # Sort by date descending (latest first)
    cursor = db["meals"].find({"tenant_id": tenant_id}).sort("date", -1).limit(10)
    meals = await cursor.to_list(length=10)
    return meals

@router.post("/{meal_id}/respond")
async def respond_to_meal(
    meal_id: str,
    request: MealRespondRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Only Students can respond to meals.")

    if request.status not in ["Having", "Skipping"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'Having' or 'Skipping'.")

    meal = await db["meals"].find_one({"id": meal_id, "tenant_id": tenant_id})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    user_id = token_data.get("uid")

    response_doc = await db["meal_responses"].find_one({"meal_id": meal_id, "user_id": user_id, "tenant_id": tenant_id})
    if response_doc:
         await db["meal_responses"].update_one(
             {"id": response_doc["id"]},
             {"$set": {"status": request.status, "updated_at": datetime.now(timezone.utc)}}
         )
    else:
        new_resp = MealResponseDB(
             meal_id=meal_id,
             tenant_id=tenant_id,
             user_id=user_id,
             status=request.status
        )
        await db["meal_responses"].insert_one(new_resp.model_dump())

    return {"message": f"Response recorded as {request.status}."}

@router.get("/{meal_id}/export")
async def export_meal_responses(
    meal_id: str,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can export responses.")
    
    meal = await db["meals"].find_one({"id": meal_id, "tenant_id": tenant_id})
    if not meal:
         raise HTTPException(status_code=404, detail="Meal not found.")

    responses = await db["meal_responses"].find({"meal_id": meal_id, "tenant_id": tenant_id}).to_list(length=1000)

    # Convert to CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["User ID", "Name", "Email", "Status", "Updated At"])

    for resp in responses:
         user = await db["users"].find_one({"id": resp["user_id"]})
         name = user["full_name"] if user else "Unknown"
         email = user["email"] if user else "Unknown"
         writer.writerow([resp["user_id"], name, email, resp["status"], resp.get("updated_at", "")])

    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="meal_{meal_id}_responses.csv"'
    }

    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
