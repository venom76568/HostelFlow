from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from core.config import settings
from api.partners import router as partners_router
from api.auth import router as auth_router
from api.meals import router as meals_router
from api.complaints import router as complaints_router
from api.leaves import router as leaves_router
from db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from api.deps import get_current_tenant
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(partners_router)
app.include_router(auth_router)
app.include_router(meals_router)
app.include_router(complaints_router)
app.include_router(leaves_router)

# Serve uploaded files for complaints (and later possibly profile pics)
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/test-tenant")
async def test_tenant_filter(tenant_id: str = Depends(get_current_tenant), db = Depends(get_database)):
    # This endpoint proves the tenant dependency works.
    return {"tenant_id": tenant_id, "message": "Tenant is active and approved."}
