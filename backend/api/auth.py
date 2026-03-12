from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from db.mongodb import get_database
from models.user import UserDB
from core.security import verify_password, get_password_hash, create_access_token
from core.config import settings
from api.deps import get_current_user_token_data
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    college_code: str
    room_number: Optional[str] = None
    role: str = "Student"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    slug: Optional[str] = None

@router.post("/register/student", status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, db = Depends(get_database)):
    # Find tenant by college code
    tenant = await db["tenants"].find_one({"college_code": request.college_code, "is_approved": True, "is_active": True})
    if not tenant:
        raise HTTPException(status_code=400, detail="Invalid or inactive college code.")
    
    # Check if email is already registered
    existing_user = await db["users"].find_one({"email": request.email})
    if existing_user:
         raise HTTPException(status_code=400, detail="Email already registered.")

    new_user = UserDB(
        tenant_id=tenant["id"],
        full_name=request.full_name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role,
        room_number=request.room_number
    )

    await db["users"].insert_one(new_user.model_dump())
    return {"message": "User registered successfully."}

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_database)):
    # SuperAdmin explicit check
    if form_data.username == settings.SUPERADMIN_EMAIL and form_data.password == settings.SUPERADMIN_PASSWORD:
        access_token = create_access_token(
            data={"uid": "superadmin", "role": "SuperAdmin", "tenant_id": "superadmin"}
        )
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "role": "SuperAdmin",
            "slug": "super-panel"
        }

    user = await db["users"].find_one({"email": form_data.username})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    tenant = await db["tenants"].find_one({"id": user["tenant_id"]})
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="College not found.")
        
    if not tenant.get("is_approved"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your college application is pending SuperAdmin approval.")
        
    if not tenant.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="College subscription is inactive.")

    access_token = create_access_token(
        data={"uid": user["id"], "role": user["role"], "tenant_id": user["tenant_id"]}
    )

    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user["role"],
        "slug": tenant["slug"]
    }

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, token_data: dict = Depends(get_current_user_token_data), db = Depends(get_database)):
    user = await db["users"].find_one({"id": token_data["uid"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if not verify_password(request.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect old password.")
    
    await db["users"].update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": get_password_hash(request.new_password)}}
    )
    return {"message": "Password updated successfully."}
