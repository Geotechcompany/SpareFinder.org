from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

app = FastAPI(title="SpareFinder Email Service", version="1.0.0")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email-service")


class EmailRequest(BaseModel):
    to: str
    subject: str
    html: str
    text: str | None = None

def _env_bool(name: str, default: bool = False) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if raw in ("1", "true", "yes", "y", "on"):
        return True
    if raw in ("0", "false", "no", "n", "off"):
        return False
    return default


def send_email_via_smtp(
    to_email: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> bool:
    """
    Send a basic email via SMTP using settings from environment variables.
    """
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS")
    from_email = (os.getenv("SMTP_FROM") or user or "").strip()
    from_name = (os.getenv("SMTP_FROM_NAME") or "").strip()
    is_secure = _env_bool("SMTP_SECURE", default=(port == 465))

    if not user or not password:
        logger.warning("SMTP_USER/SMTP_PASSWORD not set - skipping email send")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = to_email

    if text:
        msg.attach(MIMEText(text, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))

    try:
        if is_secure:
            server = smtplib.SMTP_SSL(host, port, timeout=30)
            server.login(user, password)
            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()
        else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(user, password)
                server.sendmail(from_email, [to_email], msg.as_string())
        logger.info(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/send-email")
async def send_email(payload: EmailRequest):
    """
    Send an email using the configured SMTP server.
    """
    success = send_email_via_smtp(
        to_email=payload.to,
        subject=payload.subject,
        html=payload.html,
        text=payload.text,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {"success": True}


