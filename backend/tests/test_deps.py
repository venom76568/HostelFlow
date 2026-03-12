import sys
import os
# ensure backend is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from db.mongodb import get_database
from core.security import create_access_token

class MockTenantsCollection:
    async def find_one(self, query):
        tenant_id = query.get("id")
        if tenant_id == "active_approved":
            return {"id": "active_approved", "is_approved": True, "is_active": True}
        elif tenant_id == "inactive":
            return {"id": "inactive", "is_approved": True, "is_active": False}
        elif tenant_id == "unapproved":
            return {"id": "unapproved", "is_approved": False, "is_active": True}
        return None

class MockDB:
    def __getitem__(self, key):
        if key == "tenants":
            return MockTenantsCollection()
        return {}

async def override_get_database():
    return MockDB()

@pytest.mark.asyncio
async def test_tenant_dependency():
    app.dependency_overrides[get_database] = override_get_database
    
    # Valid token
    token_valid = create_access_token({"uid": "user1", "role": "Student", "tenant_id": "active_approved"})
    
    # Inactive token
    token_inactive = create_access_token({"uid": "user2", "role": "Student", "tenant_id": "inactive"})
    
    # Unapproved token
    token_unapproved = create_access_token({"uid": "user3", "role": "Student", "tenant_id": "unapproved"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Valid
        res = await ac.get("/api/test-tenant", headers={"Authorization": f"Bearer {token_valid}"})
        assert res.status_code == 200
        assert res.json()["tenant_id"] == "active_approved"
        
        # 2. Inactive
        res = await ac.get("/api/test-tenant", headers={"Authorization": f"Bearer {token_inactive}"})
        assert res.status_code == 403
        assert "inactive" in res.json()["detail"].lower()
        
        # 3. Unapproved
        res = await ac.get("/api/test-tenant", headers={"Authorization": f"Bearer {token_unapproved}"})
        assert res.status_code == 403
        assert "not approved" in res.json()["detail"].lower()
