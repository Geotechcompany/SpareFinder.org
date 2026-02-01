"""Supabase admin client singleton."""

import os
from supabase import create_client, Client


_supabase_admin: Client | None = None


def get_supabase_admin() -> Client:
    """Get or create the Supabase admin client."""
    global _supabase_admin
    
    if _supabase_admin is None:
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY")
        
        _supabase_admin = create_client(supabase_url, supabase_key)
    
    return _supabase_admin


