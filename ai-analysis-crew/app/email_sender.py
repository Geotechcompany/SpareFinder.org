"""Email sending functionality using Gmail SMTP."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path


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
    
    if not gmail_user or not gmail_pass:
        raise ValueError("GMAIL_USER and GMAIL_PASS environment variables must be set")
    
    if not Path(attachment_path).exists():
        raise FileNotFoundError(f"Attachment file not found: {attachment_path}")
    
    try:
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
        
        # Send email
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(gmail_user, gmail_pass)
        text = msg.as_string()
        server.sendmail(gmail_user, to_email, text)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


