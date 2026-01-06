"""Storage module for engagement emails in Supabase database."""

import os
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("⚠️ Supabase configuration not found - engagement email storage will be disabled")
else:
    logger.info(f"✅ Supabase configured for engagement emails: {SUPABASE_URL[:30]}...")

# Supabase headers
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def store_engagement_email(
    user_email: str,
    user_name: str,
    email_type: str,
    subject: str,
    html_content: str,
    text_content: Optional[str],
    hero_image_url: Optional[str],
    inline_image_url: Optional[str],
    image_theme: Optional[str],
    ai_model: str = "gpt-4o",
    generation_prompt: Optional[str] = None,
    dashboard_url: Optional[str] = None,
    upload_url: Optional[str] = None,
    help_url: Optional[str] = None,
    contact_url: Optional[str] = None,
    settings_url: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
    unsubscribe_token: Optional[str] = None,
    status: str = "generated",
) -> Optional[str]:
    """
    Store a generated engagement email in the database.
    
    Args:
        user_email: Recipient email address
        user_name: Recipient name
        email_type: Type of email ('reengagement' or 'onboarding')
        subject: Email subject line
        html_content: HTML email content
        text_content: Plain text email content
        hero_image_url: URL of hero image
        inline_image_url: URL of inline image
        image_theme: Theme used for image generation
        ai_model: AI model used for generation
        generation_prompt: Prompt used for AI generation
        dashboard_url: Dashboard link
        upload_url: Upload page link
        help_url: Help page link
        contact_url: Contact page link
        settings_url: Settings page link
        unsubscribe_url: Unsubscribe link
        unsubscribe_token: Unsubscribe token
        status: Email status ('generated', 'sent', 'failed', 'bounced')
        
    Returns:
        UUID of stored email record, or None if storage failed
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase not configured - skipping engagement email storage")
            return None
        
        url = f"{SUPABASE_URL}/rest/v1/engagement_emails"
        
        payload = {
            "user_email": user_email,
            "user_name": user_name,
            "email_type": email_type,
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content,
            "hero_image_url": hero_image_url,
            "inline_image_url": inline_image_url,
            "image_theme": image_theme,
            "ai_model": ai_model,
            "generation_prompt": generation_prompt,
            "dashboard_url": dashboard_url,
            "upload_url": upload_url,
            "help_url": help_url,
            "contact_url": contact_url,
            "settings_url": settings_url,
            "unsubscribe_url": unsubscribe_url,
            "unsubscribe_token": unsubscribe_token,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        response = requests.post(url, json=payload, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code in (200, 201):
            data = response.json()
            email_id = data[0].get("id") if isinstance(data, list) and len(data) > 0 else data.get("id")
            logger.info(f"✅ Engagement email stored in database: {email_id}")
            return email_id
        else:
            logger.error(f"❌ Failed to store engagement email: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error storing engagement email: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def update_engagement_email_status(
    email_id: str,
    status: str,
    opened: Optional[bool] = None,
    clicked: Optional[bool] = None,
    clicked_url: Optional[str] = None,
) -> bool:
    """
    Update the status of an engagement email.
    
    Args:
        email_id: UUID of the email record
        status: New status ('sent', 'opened', 'clicked', 'failed', 'bounced')
        opened: Whether email was opened
        clicked: Whether any link was clicked
        clicked_url: URL that was clicked
        
    Returns:
        bool: True if update successful, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return False
        
        url = f"{SUPABASE_URL}/rest/v1/engagement_emails?id=eq.{email_id}"
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if status == "sent":
            update_data["sent_at"] = datetime.utcnow().isoformat()
        elif status == "opened" and opened:
            update_data["opened"] = True
            update_data["opened_at"] = datetime.utcnow().isoformat()
        elif status == "clicked" and clicked:
            update_data["clicked"] = True
            update_data["clicked_at"] = datetime.utcnow().isoformat()
            if clicked_url:
                update_data["clicked_url"] = clicked_url
        
        response = requests.patch(url, json=update_data, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code in (200, 204):
            logger.info(f"✅ Updated engagement email status: {email_id} -> {status}")
            return True
        else:
            logger.error(f"❌ Failed to update engagement email status: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error updating engagement email status: {e}")
        return False

