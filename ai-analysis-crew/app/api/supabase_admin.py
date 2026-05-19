"""Supabase admin client singleton."""

import os

import httpx
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

_supabase_admin: Client | None = None


def _build_httpx_client() -> httpx.Client:
    """
    HTTP/1.1 client — avoids intermittent HTTP/2 'Server disconnected' errors
    against Supabase/Cloudflare on some networks (especially Windows dev).
    """
    timeout = httpx.Timeout(30.0, connect=15.0)
    return httpx.Client(http2=False, timeout=timeout)


def get_supabase_admin() -> Client:
    """Get or create the Supabase admin client."""
    global _supabase_admin

    if _supabase_admin is None:
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY"
            )

        options = SyncClientOptions(
            httpx_client=_build_httpx_client(),
            postgrest_client_timeout=30,
            storage_client_timeout=60,
        )
        _supabase_admin = create_client(supabase_url, supabase_key, options=options)

    return _supabase_admin


def reset_supabase_admin() -> None:
    """Close and recreate the client (e.g. after long idle disconnect)."""
    global _supabase_admin
    if _supabase_admin is not None:
        try:
            client = getattr(_supabase_admin, "httpx_client", None)
            if client is not None:
                client.close()
        except Exception:
            pass
    _supabase_admin = None


