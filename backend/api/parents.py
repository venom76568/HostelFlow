from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db.mongodb import get_database
from api.deps import get_current_user_token_data, get_current_tenant
from models.parent_credential import ParentCredentialDB
from core.security import verify_password, get_password_hash, create_access_token
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/parents", tags=["parents"])


# ─── Admin: Manage parent credentials ────────────────────────────────────────

class CreateParentCredentialRequest(BaseModel):
    student_id: str
    username: str
    password: str


@router.post("/credentials", status_code=status.HTTP_201_CREATED)
async def create_parent_credential(
    request: CreateParentCredentialRequest,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
):
    """Admin creates login credentials for a student's parent."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can manage parent credentials.")

    # Verify student exists in this tenant
    student = await db["users"].find_one({
        "id": request.student_id, "tenant_id": tenant_id, "role": "Student"
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in your college.")

    # Check if username already exists for this tenant
    existing = await db["parent_credentials"].find_one({
        "tenant_id": tenant_id, "username": request.username
    })
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken. Choose another.")

    cred = ParentCredentialDB(
        tenant_id=tenant_id,
        student_id=request.student_id,
        username=request.username,
        password_hash=get_password_hash(request.password),
    )
    await db["parent_credentials"].insert_one(cred.model_dump())
    return {"message": "Parent credential created.", "id": cred.id}


@router.get("/credentials")
async def list_parent_credentials(
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
):
    """Admin lists all parent credentials for their college."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view parent credentials.")

    cursor = db["parent_credentials"].find({"tenant_id": tenant_id})
    creds = await cursor.to_list(length=1000)

    result = []
    for c in creds:
        student = await db["users"].find_one({"id": c["student_id"]})
        result.append({
            "id": c["id"],
            "username": c["username"],
            "student_id": c["student_id"],
            "student_name": student["full_name"] if student else "Unknown",
            "room_number": student.get("room_number", "N/A") if student else "N/A",
            "created_at": c.get("created_at", ""),
        })

    return result


@router.delete("/credentials/{credential_id}")
async def delete_parent_credential(
    credential_id: str,
    token_data: dict = Depends(get_current_user_token_data),
    tenant_id: str = Depends(get_current_tenant),
    db=Depends(get_database),
):
    """Admin deletes a parent credential."""
    if token_data.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete parent credentials.")

    result = await db["parent_credentials"].delete_one({
        "id": credential_id, "tenant_id": tenant_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credential not found.")

    return {"message": "Parent credential deleted."}


# ─── Parent: Login + View Attendance ──────────────────────────────────────────

class ParentLoginRequest(BaseModel):
    username: str
    password: str


class ParentTokenResponse(BaseModel):
    access_token: str
    token_type: str
    student_name: str
    student_id: str


@router.post("/login", response_model=ParentTokenResponse)
async def parent_login(request: ParentLoginRequest, db=Depends(get_database)):
    """Parent login — returns a JWT with role=Parent."""
    # Search across all tenants (parent just uses username + password)
    cred = await db["parent_credentials"].find_one({"username": request.username})
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    if not verify_password(request.password, cred["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    # Get linked student info
    student = await db["users"].find_one({"id": cred["student_id"]})
    if not student:
        raise HTTPException(status_code=404, detail="Linked student not found.")

    # Check tenant is active
    tenant = await db["tenants"].find_one({"id": cred["tenant_id"]})
    if not tenant or not tenant.get("is_approved") or not tenant.get("is_active"):
        raise HTTPException(status_code=403, detail="College is not active.")

    access_token = create_access_token(
        data={
            "uid": cred["id"],
            "role": "Parent",
            "tenant_id": cred["tenant_id"],
            "student_id": cred["student_id"],
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "student_name": student["full_name"],
        "student_id": cred["student_id"],
    }


@router.get("/attendance")
async def get_parent_attendance(
    token_data: dict = Depends(get_current_user_token_data),
    db=Depends(get_database),
):
    """Parent views their child's attendance for the past 30 days."""
    if token_data.get("role") != "Parent":
        raise HTTPException(status_code=403, detail="Only Parents can access this.")

    student_id = token_data.get("student_id")
    tenant_id = token_data.get("tenant_id")

    if not student_id or not tenant_id:
        raise HTTPException(status_code=400, detail="Invalid token data.")

    start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    cursor = db["attendance"].find({
        "tenant_id": tenant_id,
        "student_id": student_id,
        "date": {"$gte": start_date},
    }).sort("date", -1)

    records = await cursor.to_list(length=100)

    student = await db["users"].find_one({"id": student_id})
    student_name = student["full_name"] if student else "Unknown"
    student_room = student.get("room_number", "N/A") if student else "N/A"

    # Count stats
    total_present = sum(1 for r in records if r["status"] == "Present")
    total_absent = sum(1 for r in records if r["status"] == "Absent")

    return {
        "student_name": student_name,
        "room_number": student_room,
        "total_present": total_present,
        "total_absent": total_absent,
        "records": [{"date": r["date"], "status": r["status"]} for r in records],
    }
