"""
Email helper for sending OTPs via Resend (https://resend.com).

resend.Emails.send() is synchronous, so we run it in a thread-pool
executor via asyncio.to_thread() to avoid blocking the FastAPI event loop.

If RESEND_API_KEY is not set in .env, falls back to printing the OTP
to the server console (great for local dev without an API key).
"""
import asyncio
import resend
from core.config import settings


def _send_sync(to_email: str, otp: str) -> None:
    """Synchronous Resend call — runs inside a thread executor."""
    resend.api_key = settings.RESEND_API_KEY  # type: ignore[assignment]

    html_body = f"""
    <html>
    <body style="background:#0f172a;color:#f1f5f9;font-family:Inter,sans-serif;padding:40px;">
      <div style="max-width:480px;margin:auto;background:#1e293b;border-radius:16px;
                  padding:32px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#60a5fa;margin-bottom:4px;">&#128274; Password Reset</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">
          You requested a password reset for your JainPro account.
        </p>
        <div style="background:#0f172a;border-radius:12px;padding:24px;
                    text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;
                       color:#f1f5f9;font-family:monospace;">{otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">
          This OTP is valid for <strong style="color:#94a3b8;">10 minutes</strong>
          and can only be used once.
        </p>
        <p style="color:#64748b;font-size:13px;">
          If you did not request this, please ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;"/>
        <p style="color:#475569;font-size:11px;text-align:center;">
          &copy; JainPro &mdash; Secure Campus Management
        </p>
      </div>
    </body>
    </html>
    """

    resend.Emails.send({
        "from": f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>",
        "to": [to_email],
        "subject": "Jainpro — Your Password Reset OTP",
        "html": html_body,
    })


async def send_otp_email(to_email: str, otp: str) -> None:
    """
    Async wrapper — sends OTP email via Resend.
    Falls back to console logging when RESEND_API_KEY is not configured.
    """
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_your"):
        # Dev fallback
        print(f"\n{'=' * 50}")
        print(f"[Jainpro OTP]  To      : {to_email}")
        print(f"[Jainpro OTP]  OTP Code: {otp}")
        print(f"[Jainpro OTP]  (RESEND_API_KEY not set — printed to console)")
        print(f"{'=' * 50}\n")
        return

    # Run the blocking Resend SDK call in a thread pool
    await asyncio.to_thread(_send_sync, to_email, otp)
