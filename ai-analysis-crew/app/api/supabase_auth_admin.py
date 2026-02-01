"""Supabase auth admin functions."""

import os
import requests
from .supabase_admin import get_supabase_admin


def delete_supabase_auth_user(user_id: str) -> bool:
    """
    Delete a user from Supabase Auth.
    Requires service_role key.
    """
    try:
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not service_key:
            print("Missing Supabase credentials for auth admin")
            return False
        
        # Use Supabase Management API to delete auth user
        url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key
        }
        
        response = requests.delete(url, headers=headers, timeout=10)
        
        if response.status_code in (200, 204):
            return True
        
        print(f"Failed to delete auth user {user_id}: {response.status_code} - {response.text}")
        return False
        
    except Exception as e:
        print(f"Error deleting auth user: {e}")
        return False


