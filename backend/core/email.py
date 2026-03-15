"""
Email helper for sending OTPs via fastapi-mail.

If SMTP settings are not configured in .env, falls back to printing
the OTP to the server console (useful for development/testing).
"""
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from core.config import settings


def _get_mail_config() -> ConnectionConfig | None:
    """Build ConnectionConfig if SMTP settings are present."""
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return None
    return ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USER,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_PORT=settings.SMTP_PORT,
        MAIL_SERVER=settings.SMTP_HOST,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def send_otp_email(to_email: str, otp: str) -> None:
    """
    Send a password-reset OTP email.
    Falls back to console logging if SMTP is not configured.
    """
    subject = "HostelFlow — Your Password Reset OTP"
    body = f"""
    <html>
    <body style="background:#0f172a;color:#f1f5f9;font-family:Inter,sans-serif;padding:40px;">
      <div style="max-width:480px;margin:auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="color:#60a5fa;margin-bottom:4px;">🔒 Password Reset</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">You requested a password reset for your HostelFlow account.</p>
        <div style="background:#0f172a;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#f1f5f9;font-family:monospace;">{otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">This OTP is valid for <strong style="color:#94a3b8;">10 minutes</strong> and can only be used once.</p>
        <p style="color:#64748b;font-size:13px;">If you did not request this, please ignore this email.</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;"/>
        <p style="color:#475569;font-size:11px;text-align:center;">© HostelFlow — Secure Campus Management</p>
      </div>
    </body>
    </html>
    """

    conf = _get_mail_config()
    if conf is None:
        # Development fallback — print to console
        print(f"\n{'='*50}")
        print(f"[HostelFlow OTP] To: {to_email}")
        print(f"[HostelFlow OTP] OTP Code: {otp}")
        print(f"[HostelFlow OTP] (SMTP not configured — printed to console)")
        print(f"{'='*50}\n")
        return

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype="html",
    )
    fm = FastMail(conf)
    await fm.send_message(message)
