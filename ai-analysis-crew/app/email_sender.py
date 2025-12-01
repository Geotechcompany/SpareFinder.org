"""Email sending functionality using Gmail SMTP."""

import os
import smtplib
import logging
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

logger = logging.getLogger(__name__)


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
    
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    
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


