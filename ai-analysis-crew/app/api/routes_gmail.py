"""Admin Gmail OAuth + inbound lead extraction routes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from ..gmail_oauth import (
    build_authorize_url,
    connection_status_payload,
    create_oauth_state,
    exchange_code_for_tokens,
    ensure_access_token,
    fetch_google_userinfo,
    frontend_gmail_return_url,
    get_active_connection,
    gmail_message_already_imported,
    gmail_oauth_configured,
    list_candidate_messages,
    mark_connection_error,
    mark_connection_revoked,
    not_configured_message,
    parse_oauth_state,
    revoke_google_token,
    upsert_connection,
)
from .auth_dependencies import CurrentUser, require_roles
from .responses import api_error, api_ok
from .routes_marketing import _insert_marketing_lead
from .supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/marketing/gmail", tags=["marketing-gmail"])


class GmailExtractBody(BaseModel):
    max_messages: int = Field(default=40, ge=1, le=100)
    newer_than_days: int = Field(default=60, ge=1, le=365)
    query: str | None = Field(default=None, max_length=500)
    campaign_id: str | None = Field(default=None, max_length=64)
    # only_lead_like=True keeps inquiry-looking mail; False imports all non-automated senders.
    only_lead_like: bool = True
    run_sanitize: bool = False
    dry_run: bool = False


@router.get("/status")
async def gmail_status(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    try:
        conn = get_active_connection(supabase)
    except RuntimeError as e:
        cfg = connection_status_payload(None)
        return api_ok(
            {
                **cfg,
                "redirect_uri": None,
                "connection": None,
                "table_ready": False,
                "message": str(e),
            }
        )
    payload = connection_status_payload(conn)
    payload["table_ready"] = True
    if not payload["configured"]:
        payload["message"] = not_configured_message()
    return api_ok(payload)


@router.get("/connect")
async def gmail_connect_start(admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    if not gmail_oauth_configured():
        return api_error(
            not_configured_message(),
            code="gmail_not_configured",
            status_code=503,
        )
    try:
        # Ensure table exists before sending the admin to Google.
        get_active_connection(get_supabase_admin())
    except RuntimeError as e:
        return api_error(str(e), code="gmail_table_missing", status_code=503)

    state = create_oauth_state(user_id=admin.id, email=admin.email)
    try:
        url = build_authorize_url(state=state)
    except RuntimeError as e:
        return api_error(str(e), code="gmail_not_configured", status_code=503)
    return api_ok({"authorize_url": url})


@router.get("/callback")
async def gmail_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
):
    """Google redirect target (no Clerk JWT). State JWT binds the admin who started connect."""
    if error:
        return RedirectResponse(
            url=frontend_gmail_return_url(error=f"Google denied access: {error}"),
            status_code=302,
        )
    if not code or not state:
        return RedirectResponse(
            url=frontend_gmail_return_url(error="Missing OAuth code or state"),
            status_code=302,
        )
    try:
        claims = parse_oauth_state(state)
    except ValueError as e:
        return RedirectResponse(
            url=frontend_gmail_return_url(error=str(e)),
            status_code=302,
        )

    user_id = str(claims.get("sub") or "").strip()
    try:
        tokens = await exchange_code_for_tokens(code)
        access = (tokens.get("access_token") or "").strip()
        refresh = (tokens.get("refresh_token") or "").strip()
        if not access:
            raise RuntimeError("Google did not return an access token")
        profile = await fetch_google_userinfo(access)
        email = (profile.get("email") or "").strip().lower()
        if not email:
            raise RuntimeError("Google profile has no email")
        supabase = get_supabase_admin()
        upsert_connection(
            supabase,
            connected_by_user_id=user_id or None,
            email=email,
            google_account_id=str(profile.get("sub") or "") or None,
            refresh_token=refresh,
            access_token=access,
            expires_in=int(tokens.get("expires_in") or 3600),
            scopes=str(tokens.get("scope") or ""),
        )
    except Exception as e:
        logger.exception("Gmail OAuth callback failed: %s", e)
        return RedirectResponse(
            url=frontend_gmail_return_url(error=str(e)[:180]),
            status_code=302,
        )

    return RedirectResponse(url=frontend_gmail_return_url(connected=True), status_code=302)


@router.post("/disconnect")
async def gmail_disconnect(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    try:
        conn = get_active_connection(supabase)
    except RuntimeError as e:
        return api_error(str(e), code="gmail_table_missing", status_code=503)
    if not conn:
        return api_ok({"disconnected": False, "message": "No Gmail account connected"})

    token = (conn.get("refresh_token") or conn.get("access_token") or "").strip()
    await revoke_google_token(token)
    mark_connection_revoked(supabase, str(conn["id"]))
    return api_ok({"disconnected": True, "email": conn.get("email")})


@router.post("/extract")
async def gmail_extract_leads(
    body: GmailExtractBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    if not gmail_oauth_configured():
        return api_error(
            not_configured_message(),
            code="gmail_not_configured",
            status_code=503,
        )
    supabase = get_supabase_admin()
    try:
        conn = get_active_connection(supabase)
    except RuntimeError as e:
        return api_error(str(e), code="gmail_table_missing", status_code=503)
    if not conn:
        return api_error("Connect a Gmail account first.", code="gmail_not_connected", status_code=400)

    try:
        access = await ensure_access_token(supabase, conn)
        candidates = await list_candidate_messages(
            access_token=access,
            max_messages=body.max_messages,
            newer_than_days=body.newer_than_days,
            query=body.query,
        )
    except Exception as e:
        logger.exception("Gmail extract failed: %s", e)
        mark_connection_error(supabase, str(conn["id"]), str(e))
        return api_error(str(e), code="gmail_api_error", status_code=502)

    if body.only_lead_like:
        candidates = [c for c in candidates if c.get("looks_like_lead")]

    summary: dict[str, Any] = {
        "scanned": len(candidates),
        "created": 0,
        "duplicates": 0,
        "skipped_message": 0,
        "failed": 0,
        "dry_run": body.dry_run,
        "preview": [],
    }

    for msg in candidates:
        mid = str(msg.get("gmail_message_id") or "")
        email = str(msg.get("sender_email") or "").strip().lower()
        preview_row = {
            "gmail_message_id": mid,
            "email": email,
            "full_name": msg.get("sender_name"),
            "subject": msg.get("subject"),
            "looks_like_lead": bool(msg.get("looks_like_lead")),
        }
        if body.dry_run:
            summary["preview"].append(preview_row)
            continue

        if gmail_message_already_imported(supabase, mid):
            summary["skipped_message"] += 1
            preview_row["status"] = "already_imported"
            summary["preview"].append(preview_row)
            continue

        row = {
            "email": email,
            "full_name": msg.get("sender_name"),
            "company_name": None,
            "job_title": None,
            "platform": "gmail",
            "gmail_message_id": mid,
            "gmail_thread_id": msg.get("thread_id"),
            "gmail_subject": msg.get("subject"),
            "gmail_snippet": msg.get("snippet"),
            "gmail_date": msg.get("date_header"),
            "gmail_body_preview": msg.get("body_preview"),
            "from_header": msg.get("from_header"),
        }
        result = _insert_marketing_lead(
            supabase,
            row,
            campaign_id=body.campaign_id,
            source="gmail_inbox",
            run_sanitize=body.run_sanitize,
        )
        status = result.status
        preview_row["status"] = status
        if status == "created":
            summary["created"] += 1
        elif status in ("duplicate_lead", "duplicate_user"):
            summary["duplicates"] += 1
        else:
            summary["failed"] += 1
        summary["preview"].append(preview_row)

    # Cap preview list for UI
    summary["preview"] = summary["preview"][:50]

    now = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("gmail_oauth_connections").update(
            {
                "last_sync_at": now,
                "last_extract_summary": {
                    "scanned": summary["scanned"],
                    "created": summary["created"],
                    "duplicates": summary["duplicates"],
                    "skipped_message": summary["skipped_message"],
                    "failed": summary["failed"],
                    "dry_run": body.dry_run,
                    "at": now,
                },
                "last_error": None,
                "status": "connected",
                "updated_at": now,
            }
        ).eq("id", conn["id"]).execute()
    except Exception as e:
        logger.warning("Failed to persist Gmail extract summary: %s", e)

    return api_ok(summary)
