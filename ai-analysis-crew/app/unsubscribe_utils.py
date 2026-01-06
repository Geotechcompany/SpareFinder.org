"""Utilities for managing email unsubscribe functionality."""

import os
import secrets
import logging
import requests
from typing import Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("⚠️ Supabase configuration not found - unsubscribe functionality will be limited")
else:
    logger.info(f"✅ Supabase configured for unsubscribe: {SUPABASE_URL[:30]}...")

# Supabase headers
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def generate_unsubscribe_token() -> str:
    """Generate a secure, unique unsubscribe token."""
    return secrets.token_urlsafe(32)


def create_unsubscribe_url(base_url: str, token: str) -> str:
    """Create an unsubscribe URL from base URL and token."""
    return f"{base_url.rstrip('/')}/unsubscribe?token={token}"


def check_user_unsubscribed(user_email: str, email_type: str = "reengagement") -> bool:
    """
    Check if a user has unsubscribed from marketing emails.
    
    Args:
        user_email: User's email address
        email_type: Type of email ('reengagement' or 'onboarding')
        
    Returns:
        True if user is unsubscribed, False otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return False
        
        # Use the database function if available, otherwise query directly
        url = f"{SUPABASE_URL}/rest/v1/rpc/is_user_unsubscribed_from_reengagement"
        
        response = requests.post(
            url,
            json={"p_user_email": user_email},
            headers=SUPABASE_HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return bool(result) if isinstance(result, bool) else False
        
        # Fallback: query directly
        url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?user_email=eq.{user_email}&select=unsubscribed_from_all_marketing,unsubscribed_from_reengagement,unsubscribed_from_onboarding"
        
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                prefs = data[0]
                # Check if unsubscribed from all marketing
                if prefs.get("unsubscribed_from_all_marketing"):
                    return True
                # Check specific email type
                if email_type == "reengagement" and prefs.get("unsubscribed_from_reengagement"):
                    return True
                if email_type == "onboarding" and prefs.get("unsubscribed_from_onboarding"):
                    return True
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Error checking unsubscribe status: {e}")
        return False


def unsubscribe_user(
    token: str,
    reason: Optional[str] = None,
    source: str = "email_link"
) -> Dict[str, Any]:
    """
    Unsubscribe a user using their unsubscribe token.
    
    Args:
        token: Unsubscribe token
        reason: Optional reason for unsubscribing
        source: Source of unsubscribe ('email_link', 'settings_page', 'admin')
        
    Returns:
        Dictionary with success status and message
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"success": False, "message": "Database not configured"}
        
        # Find user by token
        url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?unsubscribe_token=eq.{token}&select=*"
        
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code != 200:
            return {"success": False, "message": "Failed to find unsubscribe record"}
        
        data = response.json()
        
        if not data or len(data) == 0:
            # Try to find in engagement_emails table
            url = f"{SUPABASE_URL}/rest/v1/engagement_emails?unsubscribe_token=eq.{token}&select=user_email,email_type&limit=1"
            response = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
            
            if response.status_code == 200:
                email_data = response.json()
                if email_data and len(email_data) > 0:
                    user_email = email_data[0].get("user_email")
                    email_type = email_data[0].get("email_type", "reengagement")
                    
                    if user_email:
                        # Create or update unsubscribe preference
                        return _create_or_update_unsubscribe(
                            user_email=user_email,
                            email_type=email_type,
                            reason=reason,
                            source=source
                        )
            
            return {"success": False, "message": "Invalid unsubscribe token"}
        
        prefs = data[0]
        user_email = prefs.get("user_email")
        email_type = "reengagement"  # Default, can be determined from context
        
        # Update unsubscribe preference
        update_url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?unsubscribe_token=eq.{token}"
        
        update_data = {
            "unsubscribed_from_all_marketing": True,
            "unsubscribed_from_reengagement": True,
            "unsubscribed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if reason:
            update_data["unsubscribe_reason"] = reason
        if source:
            update_data["unsubscribe_source"] = source
        
        response = requests.patch(update_url, json=update_data, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code in (200, 204):
            logger.info(f"✅ User unsubscribed: {user_email}")
            return {
                "success": True,
                "message": "Successfully unsubscribed from marketing emails",
                "user_email": user_email
            }
        else:
            return {"success": False, "message": f"Failed to update unsubscribe status: {response.status_code}"}
            
    except Exception as e:
        logger.error(f"❌ Error unsubscribing user: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "message": f"Error: {str(e)}"}


def _create_or_update_unsubscribe(
    user_email: str,
    email_type: str,
    reason: Optional[str] = None,
    source: str = "email_link"
) -> Dict[str, Any]:
    """Create or update unsubscribe preference for a user."""
    try:
        # Check if preference exists
        url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?user_email=eq.{user_email}&select=id"
        response = requests.get(url, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data and len(data) > 0:
                # Update existing
                pref_id = data[0]["id"]
                update_url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?id=eq.{pref_id}"
                
                update_data = {
                    "unsubscribed_from_all_marketing": True,
                    "unsubscribed_from_reengagement": True,
                    "unsubscribed_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                
                if reason:
                    update_data["unsubscribe_reason"] = reason
                if source:
                    update_data["unsubscribe_source"] = source
                
                response = requests.patch(update_url, json=update_data, headers=SUPABASE_HEADERS, timeout=10)
                
                if response.status_code in (200, 204):
                    return {"success": True, "message": "Successfully unsubscribed", "user_email": user_email}
            else:
                # Create new
                token = generate_unsubscribe_token()
                create_url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences"
                
                create_data = {
                    "user_email": user_email,
                    "unsubscribed_from_all_marketing": True,
                    "unsubscribed_from_reengagement": True,
                    "unsubscribe_token": token,
                    "unsubscribed_at": datetime.utcnow().isoformat(),
                }
                
                if reason:
                    create_data["unsubscribe_reason"] = reason
                if source:
                    create_data["unsubscribe_source"] = source
                
                response = requests.post(create_url, json=create_data, headers=SUPABASE_HEADERS, timeout=10)
                
                if response.status_code in (200, 201):
                    return {"success": True, "message": "Successfully unsubscribed", "user_email": user_email}
        
        return {"success": False, "message": "Failed to create/update unsubscribe preference"}
        
    except Exception as e:
        logger.error(f"❌ Error creating/updating unsubscribe: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}


def resubscribe_user(user_email: str) -> Dict[str, Any]:
    """
    Resubscribe a user to marketing emails.
    
    Args:
        user_email: User's email address
        
    Returns:
        Dictionary with success status and message
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"success": False, "message": "Database not configured"}
        
        url = f"{SUPABASE_URL}/rest/v1/email_unsubscribe_preferences?user_email=eq.{user_email}"
        
        update_data = {
            "unsubscribed_from_all_marketing": False,
            "unsubscribed_from_reengagement": False,
            "unsubscribed_from_onboarding": False,
            "resubscribed_at": datetime.utcnow().isoformat(),
            "resubscribe_count": 1,  # Will be incremented by database if needed
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        response = requests.patch(url, json=update_data, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code in (200, 204):
            logger.info(f"✅ User resubscribed: {user_email}")
            return {"success": True, "message": "Successfully resubscribed to marketing emails"}
        else:
            return {"success": False, "message": f"Failed to resubscribe: {response.status_code}"}
            
    except Exception as e:
        logger.error(f"❌ Error resubscribing user: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}

