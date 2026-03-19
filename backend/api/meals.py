from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from db.mongodb import get_database, get_activity_database
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
    meal_type: str # 'breakfast', 'lunch', 'dinner'
    status: str # 'Having' or 'Skipping'

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_meal(
    request: MealCreateRequest, 
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can create meals.")
    
    # Check if a meal already exists for this date in this tenant
    existing = await adb["meals"].find_one({"tenant_id": tenant_id, "date": request.date})
    if existing:
         raise HTTPException(status_code=400, detail="A menu for this date already exists.")
         
    new_meal = MealDB(
        tenant_id=tenant_id,
        date=request.date,
        breakfast=request.breakfast,
        lunch=request.lunch,
        dinner=request.dinner
    )

    await adb["meals"].insert_one(new_meal.model_dump())
    return {"message": "Meal menu created successfully.", "meal_id": new_meal.id}

@router.get("/")
async def list_meals(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    cursor = adb["meals"].find({"tenant_id": tenant_id}).sort("date", -1).limit(10)
    meals = await cursor.to_list(length=10)

    for meal in meals:
        meal["_id"] = str(meal["_id"])

    return meals

@router.put("/{meal_id}", status_code=status.HTTP_200_OK)
async def update_meal(
    meal_id: str,
    request: MealCreateRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can edit meals.")
         
    result = await adb["meals"].update_one(
        {"id": meal_id, "tenant_id": tenant_id},
        {"$set": {
            "date": request.date,
            "breakfast": request.breakfast, 
            "lunch": request.lunch,
            "dinner": request.dinner,
            "is_edited": True
        }}
    )
    
    if result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Meal not found.")
    return {"message": "Meal menu updated successfully."}

@router.delete("/{meal_id}", status_code=status.HTTP_200_OK)
async def delete_meal(
    meal_id: str,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can delete meals.")
         
    result = await adb["meals"].delete_one({"id": meal_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
         raise HTTPException(status_code=404, detail="Meal not found.")
         
    # Optional cascading delete of responses
    await adb["meal_responses"].delete_many({"meal_id": meal_id, "tenant_id": tenant_id})
    
    return {"message": "Meal deleted successfully."}

@router.get("/my-responses")
async def get_my_responses(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Student":
        return []
    
    user_id = token_data.get("uid")
    cursor = adb["meal_responses"].find({"user_id": user_id, "tenant_id": tenant_id})
    responses = await cursor.to_list(length=100)
    for r in responses:
        r["_id"] = str(r["_id"])
    return responses

@router.post("/{meal_id}/respond")
async def respond_to_meal(
    meal_id: str,
    request: MealRespondRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Student":
        raise HTTPException(status_code=403, detail="Only Students can respond to meals.")

    if request.status not in ["Having", "Skipping"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'Having' or 'Skipping'.")

    if request.meal_type not in ["breakfast", "lunch", "dinner"]:
        raise HTTPException(status_code=400, detail="Invalid meal type.")

    meal = await adb["meals"].find_one({"id": meal_id, "tenant_id": tenant_id})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    # Time Validation: Can only vote till 23:59 the day before the meal
    meal_date = datetime.strptime(meal["date"], "%Y-%m-%d").date()
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    current_date = datetime.now(ist).date()
    
    if current_date >= meal_date:
         raise HTTPException(status_code=400, detail="Voting for this meal is closed.")

    user_id = token_data.get("uid")
    status_field = f"{request.meal_type}_status"

    response_doc = await adb["meal_responses"].find_one({"meal_id": meal_id, "user_id": user_id, "tenant_id": tenant_id})
    if response_doc:
         if response_doc.get(status_field) == request.status:
             return {"message": f"Response is already recorded as {request.status}."}
         
         await adb["meal_responses"].update_one(
             {"_id": response_doc["_id"]},
             {"$set": {status_field: request.status, "updated_at": datetime.now(timezone.utc)}}
         )
    else:
        new_resp = MealResponseDB(
             meal_id=meal_id,
             tenant_id=tenant_id,
             user_id=user_id,
             **{status_field: request.status}
        )
        await adb["meal_responses"].insert_one(new_resp.model_dump())

    return {"message": f"Response recorded as {request.status}."}

@router.get("/{meal_id}/export")
async def export_meal_responses(
    meal_id: str,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database),
    adb = Depends(get_activity_database)
):
    if token_data.get("role") != "Admin":
         raise HTTPException(status_code=403, detail="Only Admins can export responses.")
    
    meal = await adb["meals"].find_one({"id": meal_id, "tenant_id": tenant_id})
    if not meal:
         raise HTTPException(status_code=404, detail="Meal not found.")
         
    meal_date = datetime.strptime(meal["date"], "%Y-%m-%d").date()
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    current_date = datetime.now(ist).date()
    
    if current_date < meal_date:
        raise HTTPException(status_code=400, detail="Cannot export responses until the explicitly voting window has closed.")

    responses = await adb["meal_responses"].find({"meal_id": meal_id, "tenant_id": tenant_id}).to_list(length=1000)

    # Convert to CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["User ID", "Name", "Email", "Breakfast", "Lunch", "Dinner", "Updated At"])

    totals = {
        "breakfast": {"Having": 0, "Skipping": 0},
        "lunch": {"Having": 0, "Skipping": 0},
        "dinner": {"Having": 0, "Skipping": 0}
    }

    for resp in responses:
         user = await db["users"].find_one({"id": resp["user_id"]})
         name = user["full_name"] if user else "Unknown"
         email = user["email"] if user else "Unknown"
         
         b_status = resp.get("breakfast_status") or "N/A"
         l_status = resp.get("lunch_status") or "N/A"
         d_status = resp.get("dinner_status") or "N/A"
         
         if b_status in ["Having", "Skipping"]: totals["breakfast"][b_status] += 1
         if l_status in ["Having", "Skipping"]: totals["lunch"][l_status] += 1
         if d_status in ["Having", "Skipping"]: totals["dinner"][d_status] += 1
         
         writer.writerow([resp["user_id"], name, email, b_status, l_status, d_status, resp.get("updated_at", "")])

    writer.writerow([])
    writer.writerow(["", "", "TOTALS (HAVING)"])
    writer.writerow(["", "", "", totals["breakfast"]["Having"], totals["lunch"]["Having"], totals["dinner"]["Having"]])
    writer.writerow(["", "", "TOTALS (SKIPPING)"])
    writer.writerow(["", "", "", totals["breakfast"]["Skipping"], totals["lunch"]["Skipping"], totals["dinner"]["Skipping"]])

    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="meal_{meal_id}_responses.csv"'
    }

    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
