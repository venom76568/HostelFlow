from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from core.config import settings
from db.mongodb import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user_token_data(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("uid")
        role: str = payload.get("role")
        tenant_id: str = payload.get("tenant_id")
        if user_id is None or role is None or tenant_id is None:
            raise credentials_exception
        return {"uid": user_id, "role": role, "tenant_id": tenant_id}
    except JWTError:
        raise credentials_exception

async def get_current_tenant(
    token_data: dict = Depends(get_current_user_token_data),
    db = Depends(get_database)
) -> str:
    if token_data.get("role") == "SuperAdmin":
        return None  # Super admin bypasses tenant checks

    tenant_id = token_data.get("tenant_id")
    tenant_doc = await db["tenants"].find_one({"id": tenant_id})
    if not tenant_doc:
         raise HTTPException(status_code=403, detail="Tenant not found.")
    
    if not tenant_doc.get("is_approved"):
        raise HTTPException(status_code=403, detail="College not approved yet.")

    if not tenant_doc.get("is_active"):
        raise HTTPException(status_code=403, detail="College subscription inactive.")

    return tenant_id
