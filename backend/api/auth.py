from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from db.mongodb import get_database
from models.user import UserDB
from core.security import verify_password, get_password_hash, create_access_token
from core.config import settings
from core.email import send_otp_email
from core.utils import generate_student_id
from api.deps import get_current_user_token_data
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
import string
import hmac
import hashlib
import time

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    college_code: str
    room_number: str
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

    student_id = None
    if request.role.lower() == "student":
        student_id = generate_student_id(tenant.get("name", "UNKN"))

    new_user = UserDB(
        tenant_id=tenant["id"],
        full_name=request.full_name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=request.role,
        room_number=request.room_number,
        student_id=student_id
    )

    await db["users"].insert_one(new_user.model_dump())
    
    response_data = {"message": "User registered successfully."}
    if student_id:
        response_data["student_id"] = student_id
        
    return response_data

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


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password — OTP Flow
# ─────────────────────────────────────────────────────────────────────────────

class PasswordResetRequestBody(BaseModel):
    email: str

class OTPVerifyBody(BaseModel):
    email: str
    otp: str

class ResetPasswordBody(BaseModel):
    email: str
    otp: str
    new_password: str


def _generate_stateless_otp(email: str, timestamp_window: int) -> str:
    """
    Generates a deterministic 6-digit OTP based on the server secret, user email, and a time window.
    No database storage required.
    """
    # Create a unique message for this user and time window
    message = f"{email}:{timestamp_window}:{settings.SECRET_KEY}"
    # Use HMAC-SHA256
    h = hmac.new(settings.SECRET_KEY.encode(), message.encode(), hashlib.sha256)
    # Convert to a 6-digit number
    res = int(h.hexdigest(), 16) % 1000000
    return str(res).zfill(6)


@router.post("/request-password-reset")
async def request_password_reset(body: PasswordResetRequestBody, db = Depends(get_database)):
    """
    Step 1: Calculate stateless OTP and email it.
    """
    email = body.email.strip().lower()

    # Check if user exists
    user = await db["users"].find_one({"email": email})
    is_superadmin = (email == settings.SUPERADMIN_EMAIL.lower())

    if not user and not is_superadmin:
        return {"message": "If this email is registered, you will receive an OTP shortly."}

    # Time window (5 minutes)
    window = int(time.time() / 300)
    otp = _generate_stateless_otp(email, window)

    # Send OTP via Resend
    await send_otp_email(email, otp)

    return {"message": "If this email is registered, you will receive an OTP shortly."}


@router.post("/verify-otp")
async def verify_otp(body: OTPVerifyBody):
    """
    Step 2: Verify OTP by checking current and previous windows (tolerance).
    """
    email = body.email.strip().lower()
    current_window = int(time.time() / 300)
    
    # Check current window and previous window (for 5-10 min validity)
    for w in [current_window, current_window - 1]:
        if _generate_stateless_otp(email, w) == body.otp:
            return {"message": "OTP verified successfully. You may now reset your password."}

    raise HTTPException(status_code=400, detail="Invalid or expired OTP.")


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody, db = Depends(get_database)):
    """
    Step 3: Reset password. Verifies OTP mathematically (stateless).
    """
    email = body.email.strip().lower()
    current_window = int(time.time() / 300)
    
    # Verify OTP one last time before allowing the update
    is_valid = False
    for w in [current_window, current_window - 1]:
        if _generate_stateless_otp(email, w) == body.otp:
            is_valid = True
            break
            
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please restart the reset flow.")

    new_hash = get_password_hash(body.new_password)

    # Check if SuperAdmin
    if email == settings.SUPERADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=400,
            detail="SuperAdmin password must be updated via the .env file, not this flow."
        )

    result = await db["users"].update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"message": "Password reset successfully. You can now log in with your new password."}
