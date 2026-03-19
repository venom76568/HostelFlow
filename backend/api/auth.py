from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from db.mongodb import get_database
from models.user import UserDB
from core.security import verify_password, get_password_hash, create_access_token
from core.config import settings
from core.email import send_otp_email
from api.deps import get_current_user_token_data
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
import string

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
    new_password: str


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


@router.post("/request-password-reset")
async def request_password_reset(body: PasswordResetRequestBody, db = Depends(get_database)):
    """
    Step 1: Check if email exists, generate OTP, store it, and email it.
    Rate limit: only 1 OTP per 60 seconds (user can resend after 60s).
    OTP still expires after 10 minutes.
    """
    email = body.email.strip().lower()

    # Check if user exists (admin or student — anyone in users collection)
    user = await db["users"].find_one({"email": email})
    is_superadmin = (email == settings.SUPERADMIN_EMAIL.lower())

    if not user and not is_superadmin:
        # Return generic message to avoid email enumeration
        return {"message": "If this email is registered, you will receive an OTP shortly."}

    # Rate limit: 60-second cooldown between sends
    now = datetime.now(timezone.utc)
    existing_token = await db["password_reset_tokens"].find_one({"email": email, "expires_at": {"$gt": now}})
    if existing_token:
        created_at = existing_token.get("created_at")
        if created_at:
            # Make sure created_at is timezone-aware
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed = (now - created_at).total_seconds()
            if elapsed < 60:
                wait = int(60 - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {wait} second(s) before requesting a new OTP."
                )

    # Delete any previous tokens for this email, then generate a new one
    await db["password_reset_tokens"].delete_many({"email": email})

    otp = _generate_otp()
    expires_at = now + timedelta(minutes=10)

    await db["password_reset_tokens"].insert_one({
        "email": email,
        "otp": otp,
        "expires_at": expires_at,
        "created_at": now,
        "used": False,
    })

    # Send OTP via Resend
    await send_otp_email(email, otp)

    return {"message": "If this email is registered, you will receive an OTP shortly."}


@router.post("/verify-otp")
async def verify_otp(body: OTPVerifyBody, db = Depends(get_database)):
    """
    Step 2: Verify OTP. Returns success token hint if valid.
    """
    email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    token_doc = await db["password_reset_tokens"].find_one({
        "email": email,
        "otp": body.otp,
        "expires_at": {"$gt": now},
        "used": False,
    })

    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    return {"message": "OTP verified successfully. You may now reset your password."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody, db = Depends(get_database)):
    """
    Step 3: Reset password. Requires a valid, unused, non-expired OTP to still exist.
    After resetting, the OTP token is deleted (one-time use).
    """
    email = body.email.strip().lower()
    now = datetime.now(timezone.utc)

    token_doc = await db["password_reset_tokens"].find_one({
        "email": email,
        "expires_at": {"$gt": now},
        "used": False,
    })

    if not token_doc:
        raise HTTPException(status_code=400, detail="OTP session expired or not verified. Please restart the reset flow.")

    new_hash = get_password_hash(body.new_password)

    # Check if SuperAdmin
    if email == settings.SUPERADMIN_EMAIL.lower():
        # SuperAdmin password lives in .env, cannot be changed via DB reset.
        # Delete the token and return an error.
        await db["password_reset_tokens"].delete_many({"email": email})
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

    # Invalidate the OTP token (delete it)
    await db["password_reset_tokens"].delete_many({"email": email})

    return {"message": "Password reset successfully. You can now log in with your new password."}
