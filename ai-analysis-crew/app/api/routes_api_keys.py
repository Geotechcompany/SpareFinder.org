"""API key management routes (Pro/Enterprise)."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .plan_enforcement import require_tier
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _generate_api_key() -> str:
    return f"sf_live_{secrets.token_urlsafe(32)}"


def _sanitize_key_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "name": row.get("name") or "API Key",
        "scopes": row.get("scopes") or [],
        "last_used_at": row.get("last_used_at"),
        "expires_at": row.get("expires_at"),
        "is_active": bool(row.get("is_active", True)),
        "created_at": row.get("created_at"),
    }


async def _list_keys_from_table(user_id: str) -> list[dict[str, Any]]:
    supabase = get_supabase_admin()
    result = await run_in_threadpool(
        lambda: supabase.table("api_keys")
        .select("id,name,scopes,last_used_at,expires_at,is_active,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data if result and result.data else []
    return [_sanitize_key_row(r) for r in rows if isinstance(r, dict)]


async def _create_key_in_table(
    *,
    user_id: str,
    name: str,
    scopes: list[str],
    expires_at: str | None,
    raw_key: str,
) -> dict[str, Any]:
    supabase = get_supabase_admin()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "key_hash": _hash_api_key(raw_key),
        "key_prefix": raw_key[:16],
        "scopes": scopes,
        "expires_at": expires_at,
        "is_active": True,
    }
    result = await run_in_threadpool(
        lambda: supabase.table("api_keys").insert([row]).execute()
    )
    saved = (
        result.data[0]
        if result and isinstance(result.data, list) and len(result.data) > 0
        else row
    )
    return _sanitize_key_row(saved)


async def _revoke_key_in_table(*, user_id: str, key_id: str) -> bool:
    supabase = get_supabase_admin()
    result = await run_in_threadpool(
        lambda: supabase.table("api_keys")
        .update({"is_active": False, "revoked_at": _utc_now_iso()})
        .eq("id", key_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result and result.data and len(result.data) > 0)


@router.get("")
async def list_api_keys(
    user: CurrentUser = Depends(get_current_user),
    _tier: CurrentUser = Depends(require_tier("pro")),
):
    """List current user's API keys."""
    try:
        keys = await _list_keys_from_table(user.id)
        return api_ok(data={"keys": keys})
    except Exception as e:
        return api_error(f"Failed to load API keys: {e}", status_code=500)


@router.post("")
async def create_api_key(
    payload: dict[str, Any] | None = None,
    user: CurrentUser = Depends(get_current_user),
    _tier: CurrentUser = Depends(require_tier("pro")),
):
    """Create a new API key for the current user."""
    try:
        body = payload or {}
        name = str(body.get("name") or "API Key").strip() or "API Key"
        scopes = body.get("scopes") if isinstance(body.get("scopes"), list) else []
        scopes = [str(s).strip() for s in scopes if str(s).strip()]
        if not scopes:
            scopes = ["external:v1"]
        expires_at = body.get("expires_at")
        expires_at = str(expires_at).strip() if expires_at else None

        raw_key = _generate_api_key()
        saved = await _create_key_in_table(
            user_id=user.id,
            name=name,
            scopes=scopes,
            expires_at=expires_at,
            raw_key=raw_key,
        )
        return api_ok(data={"key": {**saved, "value": raw_key}})
    except Exception as e:
        return api_error(f"Failed to create API key: {e}", status_code=500)


@router.post("/{key_id}/revoke")
async def revoke_api_key(
    key_id: str,
    user: CurrentUser = Depends(get_current_user),
    _tier: CurrentUser = Depends(require_tier("pro")),
):
    """Revoke an existing API key."""
    try:
        revoked = await _revoke_key_in_table(user_id=user.id, key_id=key_id)
        if not revoked:
            return api_error("API key not found", status_code=404)
        return api_ok(data={"revoked": True})
    except Exception as e:
        return api_error(f"Failed to revoke API key: {e}", status_code=500)

