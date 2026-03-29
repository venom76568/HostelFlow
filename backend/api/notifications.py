"""
Notifications API — Firebase Cloud Messaging (FCM) integration.

Endpoints:
  POST /api/notifications/token  — saves a device's FCM token against the current user

Helpers (used internally by other API modules):
  send_push_to_user(user_id, title, body, data, db)   — push to a single user
  send_push_to_role(tenant_id, role, title, body, data, db) — push to all users of a role
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.mongodb import get_database
from api.deps import get_current_user_token_data
from core.config import settings
import httpx
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ─── Schema ──────────────────────────────────────────────────────────────────

class FCMTokenRequest(BaseModel):
    token: str


# ─── Endpoint: Save FCM Token ─────────────────────────────────────────────────

@router.post("/token")
async def save_fcm_token(
    request: FCMTokenRequest,
    token_data: dict = Depends(get_current_user_token_data),
    db = Depends(get_database),
):
    """Save (or update) the FCM device token for the authenticated user."""
    user_id = token_data.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token.")

    await db["users"].update_one(
        {"id": user_id},
        {"$set": {"fcm_token": request.token}},
    )
    return {"message": "FCM token saved."}


# ─── Internal Push Helpers ────────────────────────────────────────────────────

def _is_fcm_configured() -> bool:
    """Returns True only when all required Firebase credentials are present."""
    configured = bool(
        settings.FIREBASE_PROJECT_ID
        and settings.FIREBASE_CLIENT_EMAIL
        and settings.FIREBASE_PRIVATE_KEY
    )
    if not configured:
        logger.warning(
            f"[Jainpro] FCM Missing Config: ProjID={bool(settings.FIREBASE_PROJECT_ID)}, "
            f"Email={bool(settings.FIREBASE_CLIENT_EMAIL)}, Key={bool(settings.FIREBASE_PRIVATE_KEY)}"
        )
    return configured


async def _get_fcm_access_token() -> str:
    """
    Obtain a short-lived OAuth 2.0 Bearer token for the FCM HTTP v1 API
    using the service account credentials stored in settings.
    Uses google-auth if available, otherwise falls back gracefully.
    """
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request as GoogleRequest

        service_account_info = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": (settings.FIREBASE_PRIVATE_KEY or "").replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        creds = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"],
        )
        creds.refresh(GoogleRequest())
        return creds.token
    except ImportError:
        logger.warning(
            "[Jainpro] google-auth not installed. "
            "Run: pip install google-auth  to enable push notifications."
        )
        raise


async def _send_fcm_message(fcm_token: str, title: str, body: str, data: dict) -> bool:
    """
    Send a single FCM message via the HTTP v1 API.
    Returns True on success, False on failure (non-fatal).
    """
    if not _is_fcm_configured():
        logger.info("[Jainpro] FCM not configured — skipping push notification.")
        return False

    try:
        access_token = await _get_fcm_access_token()
    except Exception:
        return False

    project_id = settings.FIREBASE_PROJECT_ID
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

    # Privacy: notification body shown in lock screen should be minimal.
    # Detailed info is passed in `data` for the app to read when opened.
    payload = {
        "message": {
            "token": fcm_token,
            "notification": {
                "title": title,
                "body": body,
            },
            "data": {k: str(v) for k, v in (data or {}).items()},
            "android": {"priority": "high"},
            "apns": {
                "headers": {"apns-priority": "10"},
                "payload": {"aps": {"content-available": 1}},
            },
            "webpush": {
                "headers": {"Urgency": "high"},
                # We handle the click-to-open logic manually in the Service Worker
                # to avoid generic browser "Tap to copy URL" prompts.
            },
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                content=json.dumps(payload),
            )
            if resp.status_code == 200:
                logger.debug(f"[JainPro] FCM push sent successfully to token.")
                return True
            else:
                logger.error(f"[JainPro] FCM send failed: {resp.status_code} {resp.text}")
                return False
    except Exception as exc:
        logger.error(f"[JainPro] FCM request error: {exc}")
        return False


async def send_push_to_user(
    user_id: str,
    title: str,
    body: str,
    db,
    data: dict | None = None,
) -> None:
    """
    Send a push notification to a specific user by their internal user_id.
    Silently skips if the user has no FCM token or FCM is not configured.
    """
    user = await db["users"].find_one({"id": user_id}, {"fcm_token": 1})
    if not user or not user.get("fcm_token"):
        return
    await _send_fcm_message(user["fcm_token"], title, body, data or {})


async def send_push_to_role(
    tenant_id: str,
    role: str,
    title: str,
    body: str,
    db,
    data: dict | None = None,
) -> None:
    """
    Broadcast a push notification to ALL users of a given role within a tenant.
    Silently skips users without FCM tokens.
    """
    cursor = db["users"].find(
        {"tenant_id": tenant_id, "role": role, "fcm_token": {"$exists": True, "$ne": None}},
        {"fcm_token": 1},
    )
    users = await cursor.to_list(length=500)
    
    if not users:
        logger.info(f"[Jainpro] No users with {role} role and FCM tokens found in tenant {tenant_id}")
        return

    logger.info(f"[Jainpro] Broadcasting push to {len(users)} users with role {role}")
    
    # Send all in parallel to avoid blocking the request
    tasks = [
        _send_fcm_message(user["fcm_token"], title, body, data or {})
        for user in users if user.get("fcm_token")
    ]
    if tasks:
        await asyncio.gather(*tasks)
