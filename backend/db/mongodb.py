from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

class MongoDB:
    client_primary: AsyncIOMotorClient = None
    client_secondary: AsyncIOMotorClient = None
    db_primary = None
    db_secondary = None

db_obj = MongoDB()

async def connect_to_mongo():
    # Primary Client (Core Data: Users, Tenants)
    db_obj.client_primary = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        retryWrites=True,
    )
    db_obj.db_primary = db_obj.client_primary[settings.DATABASE_NAME]

    # Secondary Client (Activity Data: Attendance, Complaints, etc.)
    # If SECONDARY_MONGODB_URL is not set, use the primary client for everything
    if settings.SECONDARY_MONGODB_URL:
        db_obj.client_secondary = AsyncIOMotorClient(
            settings.SECONDARY_MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=5,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            retryWrites=True,
        )
        db_obj.db_secondary = db_obj.client_secondary[settings.DATABASE_NAME]
    else:
        db_obj.client_secondary = db_obj.client_primary
        db_obj.db_secondary = db_obj.db_primary

    # Warm up connection pools
    try:
        await db_obj.client_primary.admin.command("ping")
        if settings.SECONDARY_MONGODB_URL:
            await db_obj.client_secondary.admin.command("ping")
    except Exception:
        pass

    # Create indexes for performance
    await _ensure_indexes()

async def _ensure_indexes():
    """Create indexes on both clusters."""
    # Primary Cluster Indexes
    db_p = db_obj.db_primary
    try:
        await db_p["users"].create_index("email", unique=True, sparse=True)
        await db_p["users"].create_index("id", unique=True)
        await db_p["users"].create_index("tenant_id")
        await db_p["tenants"].create_index("id", unique=True)
        await db_p["tenants"].create_index("slug", unique=True, sparse=True)
        await db_p["password_reset_tokens"].create_index("email")
        await db_p["password_reset_tokens"].create_index("expires_at", expireAfterSeconds=0)
    except Exception: pass

    # Secondary Cluster Indexes (High Load data)
    db_s = db_obj.db_secondary
    try:
        await db_s["complaints"].create_index("id", unique=True)
        await db_s["complaints"].create_index("tenant_id")
        await db_s["attendance"].create_index([("tenant_id", 1), ("student_id", 1), ("date", 1)], unique=True)
        await db_s["attendance"].create_index([("tenant_id", 1), ("date", 1)])
        await db_s["leaves"].create_index("id", unique=True)
        await db_s["leaves"].create_index("tenant_id")
        await db_s["meals"].create_index("id", unique=True)
        await db_s["notices"].create_index("id", unique=True)
    except Exception: pass

async def close_mongo_connection():
    if db_obj.client_primary:
        db_obj.client_primary.close()
    if db_obj.client_secondary and db_obj.client_secondary != db_obj.client_primary:
        db_obj.client_secondary.close()

def get_database():
    """Returns the primary database (default)."""
    return db_obj.db_primary

def get_activity_database():
    """Returns the database for high-volume activity (Attendance, Complaints, etc)."""
    return db_obj.db_secondary
