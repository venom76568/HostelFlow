from fastapi import APIRouter, Depends, HTTPException
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/students")
async def list_students(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db = Depends(get_database)
):
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view the student roster.")
    
    cursor = db["users"].find({"tenant_id": tenant_id, "role": "Student"}).sort("full_name", 1)
    students = await cursor.to_list(length=1000)
    
    for student in students:
        student["_id"] = str(student["_id"])
        if "password_hash" in student:
            del student["password_hash"]
            
    return students
