"""Email sending functionality using Gmail SMTP."""

import os
import smtplib
import logging
import socket
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
import httpx

logger = logging.getLogger(__name__)

def _get_smtp_host_port() -> tuple[str, int] | None:
    """
    Read SMTP host/port from env, but treat empty values as "not set".

    Fixes common Render misconfig where SMTP_HOST is present but empty, which can
    break TLS with: "server_hostname cannot be an empty string or start with a leading dot."
    """
    raw_host = os.getenv("SMTP_HOST")
    host = (raw_host or "").strip()
    if not host:
        host = "smtp.gmail.com"

    if host.startswith("."):
        logger.error(
            f"❌ Invalid SMTP_HOST value: {host!r}. It cannot start with a leading dot."
        )
        return None

    raw_port = os.getenv("SMTP_PORT")
    try:
        port = int((raw_port or "").strip() or "587")
    except ValueError:
        logger.warning(f"⚠️ Invalid SMTP_PORT value: {raw_port!r}. Falling back to 587.")
        port = 587

    return host, port


def send_basic_email_smtp(
    *,
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """
    Send a basic email via SMTP using the AI service env vars.

    Uses:
    - GMAIL_USER / GMAIL_PASS (recommended)
    - SMTP_HOST / SMTP_PORT (defaults to gmail STARTTLS)
    """
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_PASS")
    if not gmail_user or not gmail_pass:
        logger.warning(
            "⚠️ Email not configured (GMAIL_USER/GMAIL_PASS not set) - skipping email send"
        )
        return False

    smtp_config = _get_smtp_host_port()
    if not smtp_config:
        return False
    smtp_host, smtp_port = smtp_config

    # Build message (multipart alternative: text + html)
    msg = MIMEMultipart("alternative")
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg["Subject"] = subject
    if text:
        msg.attach(MIMEText(text, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))

    # Quick connectivity test first (helps return fast on blocked SMTP)
    try:
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.settimeout(5)
        result = test_socket.connect_ex((smtp_host, smtp_port))
        test_socket.close()
        if result != 0:
            logger.warning(f"⚠️ Cannot reach {smtp_host}:{smtp_port} - skipping email send")
            return False
    except Exception as conn_test_error:
        logger.warning(f"⚠️ Network connectivity test failed: {conn_test_error}")
        return False

    try:
        server = None
        try:
            server = smtplib.SMTP(timeout=30)
            server.connect(smtp_host, smtp_port)
            server.starttls()
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, [to_email], msg.as_string())
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    try:
                        server.close()
                    except Exception:
                        pass
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email: {e}")
        return False


def send_email_via_email_service(
    *,
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """
    Send an email via the separate email-service HTTP API.
    Expects EMAIL_SERVICE_URL to be set (e.g. https://sparefinder-org-1.onrender.com).
    """
    base_url = (os.getenv("EMAIL_SERVICE_URL") or "").strip().rstrip("/")
    if not base_url:
        return False

    url = f"{base_url}/send-email"
    payload = {"to": to_email, "subject": subject, "html": html, "text": text}

    try:
        with httpx.Client(timeout=30) as client:
            res = client.post(url, json=payload)
        if 200 <= res.status_code < 300:
            logger.info(f"✅ Email-service sent email to {to_email}")
            return True
        logger.error(f"❌ Email-service failed ({res.status_code}): {res.text}")
        return False
    except Exception as e:
        logger.error(f"❌ Email-service request failed: {e}")
        return False


def send_email_with_attachment(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str
) -> bool:
    """
    Send an email with PDF attachment via Gmail SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body text
        attachment_path: Path to PDF file to attach
        
    Returns:
        True if successful, False otherwise
    """
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_PASS")
    
    # Check if email is configured
    if not gmail_user or not gmail_pass:
        logger.warning("⚠️ Email not configured (GMAIL_USER/GMAIL_PASS not set) - skipping email send")
        return False
    
    # Check if attachment exists
    if not Path(attachment_path).exists():
        logger.error(f"❌ Attachment file not found: {attachment_path}")
        return False
    
    smtp_config = _get_smtp_host_port()
    if not smtp_config:
        return False
    smtp_host, smtp_port = smtp_config
    
    try:
        # Test network connectivity first
        logger.info(f"📧 Attempting to send email to {to_email} via {smtp_host}:{smtp_port}")
        
        # Check network connectivity before attempting connection
        try:
            test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_socket.settimeout(5)  # 5 second timeout for connectivity test
            result = test_socket.connect_ex((smtp_host, smtp_port))
            test_socket.close()
            
            if result != 0:
                logger.warning(f"⚠️ Cannot reach {smtp_host}:{smtp_port} - network may be unreachable")
                logger.warning("⚠️ Email sending will be skipped - analysis will continue")
                return False
        except Exception as conn_test_error:
            logger.warning(f"⚠️ Network connectivity test failed: {conn_test_error}")
            logger.warning("⚠️ Email sending will be skipped - analysis will continue")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = gmail_user
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach PDF
        with open(attachment_path, "rb") as attachment:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
        
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename= {Path(attachment_path).name}'
        )
        msg.attach(part)
        
        # Connect to SMTP server with timeout and better error handling
        server = None
        try:
            server = smtplib.SMTP(timeout=30)  # 30 second timeout
            server.connect(smtp_host, smtp_port)
            server.starttls()
            server.login(gmail_user, gmail_pass)
            text = msg.as_string()
            server.sendmail(gmail_user, to_email, text)
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        finally:
            # Always close the connection
            if server:
                try:
                    server.quit()
                except:
                    try:
                        server.close()
                    except:
                        pass
        
    except socket.gaierror as e:
        # DNS resolution failure or network unreachable
        logger.error(f"❌ Network error (DNS/connection): {e}")
        logger.warning("⚠️ Email sending failed due to network issues - analysis will continue")
        return False
    except socket.timeout as e:
        # Connection timeout
        logger.error(f"❌ SMTP connection timeout: {e}")
        logger.warning("⚠️ Email sending timed out - analysis will continue")
        return False
    except ConnectionRefusedError as e:
        # Connection refused
        logger.error(f"❌ SMTP connection refused: {e}")
        logger.warning("⚠️ Email server refused connection - analysis will continue")
        return False
    except OSError as e:
        # Network unreachable or other OS-level errors
        if "Network is unreachable" in str(e) or e.errno == 101:
            logger.error(f"❌ Network is unreachable: {e}")
            logger.warning("⚠️ Email sending failed - network unreachable. Analysis will continue.")
        else:
            logger.error(f"❌ Network/OS error: {e}")
        return False
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email: {e}")
        logger.warning("⚠️ Email sending failed - analysis will continue")
        return False


