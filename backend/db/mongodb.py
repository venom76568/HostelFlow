from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_obj = MongoDB()

async def connect_to_mongo():
    db_obj.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_obj.db = db_obj.client[settings.DATABASE_NAME]

async def close_mongo_connection():
    if db_obj.client:
        db_obj.client.close()

def get_database():
    return db_obj.db
