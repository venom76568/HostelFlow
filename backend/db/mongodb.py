from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_obj = MongoDB()

async def connect_to_mongo():
    db_obj.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=50,
        minPoolSize=5,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        retryWrites=True,
    )
    db_obj.db = db_obj.client[settings.DATABASE_NAME]

    # Warm up connection pool with a ping
    try:
        await db_obj.client.admin.command("ping")
    except Exception:
        pass  # Non-fatal — app still works, just slower first request

    # Create indexes for performance
    await _ensure_indexes()

async def _ensure_indexes():
    """Create indexes on frequently queried fields for fast lookups."""
    db = db_obj.db
    try:
        # Users collection
        await db["users"].create_index("email", unique=True, sparse=True)
        await db["users"].create_index("id", unique=True)
        await db["users"].create_index("tenant_id")
        await db["users"].create_index([("tenant_id", 1), ("role", 1)])

        # Tenants collection
        await db["tenants"].create_index("id", unique=True)
        await db["tenants"].create_index("slug", unique=True, sparse=True)
        await db["tenants"].create_index("college_code", sparse=True)

        # Complaints collection
        await db["complaints"].create_index("id", unique=True)
        await db["complaints"].create_index("tenant_id")
        await db["complaints"].create_index([("tenant_id", 1), ("student_id", 1)])

        # Leaves collection
        await db["leaves"].create_index("id", unique=True)
        await db["leaves"].create_index("tenant_id")

        # Meals collection
        await db["meals"].create_index("id", unique=True)
        await db["meals"].create_index("tenant_id")

        # Notices collection
        await db["notices"].create_index("id", unique=True)
        await db["notices"].create_index("tenant_id")

        # Password reset tokens
        await db["password_reset_tokens"].create_index("email")
        await db["password_reset_tokens"].create_index(
            "expires_at", expireAfterSeconds=0
        )  # TTL index — auto-delete expired tokens

        # Attendance collection
        await db["attendance"].create_index(
            [("tenant_id", 1), ("student_id", 1), ("date", 1)],
            unique=True
        )
        await db["attendance"].create_index([("tenant_id", 1), ("date", 1)])

        # Parent credentials collection
        await db["parent_credentials"].create_index(
            [("tenant_id", 1), ("username", 1)],
            unique=True
        )
        await db["parent_credentials"].create_index("student_id")

    except Exception:
        pass  # Non-fatal — indexes may already exist

async def close_mongo_connection():
    if db_obj.client:
        db_obj.client.close()

def get_database():
    return db_obj.db
