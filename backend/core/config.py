from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Jainpro"
    MONGODB_URL: str
    SECONDARY_MONGODB_URL: Optional[str] = None
    DATABASE_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 14
    FRONTEND_URL: str = "http://localhost:5173"
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str

    # Resend API key for OTP email delivery
    # Get a free key at https://resend.com
    RESEND_API_KEY: Optional[str] = None
    MAIL_FROM: str = "jainprohostel@gmail.com"
    MAIL_FROM_NAME: str = "Jainpro"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
