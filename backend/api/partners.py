from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
import random
import string
from core.config import settings
from db.mongodb import get_database
from models.tenant import TenantDB
from models.user import UserDB
from core.security import get_password_hash
from api.deps import get_current_user_token_data

router = APIRouter(prefix="/api/partners", tags=["partners"])

class ApplyPartnerRequest(BaseModel):
    name: str
    admin_email: str
    admin_password: str

def generate_college_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/apply", status_code=201)
async def apply_partner(request: ApplyPartnerRequest, db = Depends(get_database)):
    # Check if email exists
    existing_email = await db["tenants"].find_one({"admin_email": request.admin_email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Admin email already registered.")
        
    # Generate base slug
    import re
    base_slug = re.sub(r'[^a-z0-9]+', '-', request.name.lower()).strip('-')
    
    # Ensure slug uniqueness
    slug = base_slug
    counter = 1
    while await db["tenants"].find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    new_tenant = TenantDB(
        name=request.name,
        slug=slug,
        admin_email=request.admin_email,
        is_approved=False,
        is_active=False
    )
    
    await db["tenants"].insert_one(new_tenant.model_dump())
    
    new_admin_user = UserDB(
        tenant_id=new_tenant.id,
        full_name=f"{request.name} Administrator",
        email=request.admin_email,
        password_hash=get_password_hash(request.admin_password),
        role="Admin"
    )
    
    await db["users"].insert_one(new_admin_user.model_dump())
    
    return {"message": "Application submitted successfully.", "tenant_id": new_tenant.id, "slug": new_tenant.slug}

@router.get("/", response_model=List[TenantDB])
async def list_partners(token_data: dict = Depends(get_current_user_token_data), db = Depends(get_database)):
    if token_data.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="SuperAdmin only endpoint.")
    
    cursor = db["tenants"].find({})
    tenants = await cursor.to_list(length=100)
    return tenants

@router.post("/{tenant_id}/approve")
async def approve_partner(tenant_id: str, token_data: dict = Depends(get_current_user_token_data), db = Depends(get_database)):
    if token_data.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="SuperAdmin only endpoint.")
    
    tenant = await db["tenants"].find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    
    # Generate unique 6-digit code
    college_code = generate_college_code()
    
    await db["tenants"].update_one(
        {"id": tenant_id},
        {"$set": {"is_approved": True, "is_active": True, "college_code": college_code}}
    )
    return {"message": "College approved.", "college_code": college_code}

@router.post("/{tenant_id}/toggle-active")
async def toggle_active(tenant_id: str, token_data: dict = Depends(get_current_user_token_data), db = Depends(get_database)):
    if token_data.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="SuperAdmin only endpoint.")
        
    tenant = await db["tenants"].find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
        
    new_status = not tenant.get("is_active", False)
    await db["tenants"].update_one(
        {"id": tenant_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"College subscription status changed to {new_status}.", "is_active": new_status}
