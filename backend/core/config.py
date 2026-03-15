from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hostel-Flow SaaS"
    MONGODB_URL: str
    DATABASE_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 14
    FRONTEND_URL: str = "http://localhost:5173"
    SUPERADMIN_EMAIL: str
    SUPERADMIN_PASSWORD: str

    # Email / SMTP settings for OTP delivery
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    MAIL_FROM: str = "noreply@hostelflow.com"
    MAIL_FROM_NAME: str = "HostelFlow"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
