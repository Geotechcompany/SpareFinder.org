"""Gmail OAuth2 + read-only lead extraction for admin marketing.

Uses Google OAuth authorization code flow and Gmail API (readonly).
Tokens are stored in gmail_oauth_connections; refresh tokens never leave the API.
"""

from __future__ import annotations

import base64
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from email.utils import parseaddr
from typing import Any
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

# Inbound inquiry signals (subject / snippet). Case-insensitive substring match.
LEAD_HINT_TERMS = (
    "inquiry",
    "enquiry",
    "quote",
    "rfq",
    "request",
    "interested",
    "spare",
    "parts",
    "part number",
    "demo",
    "pricing",
    "price",
    "contact",
    "question",
    "looking for",
    "need help",
    "supplier",
    "procurement",
    "availability",
    "catalog",
    "catalogue",
)

SKIP_SENDER_PREFIXES = (
    "noreply@",
    "no-reply@",
    "donotreply@",
    "do-not-reply@",
    "mailer-daemon@",
    "notifications@",
    "notify@",
    "newsletter@",
    "bounce@",
    "postmaster@",
)

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


GMAIL_SETTINGS_CATEGORY = "gmail"
# Keys stored in system_settings (category=gmail). client_secret must never be returned to clients.
GMAIL_SETTING_CLIENT_ID = "client_id"
GMAIL_SETTING_CLIENT_SECRET = "client_secret"
GMAIL_SETTING_REDIRECT_URI = "redirect_uri"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _coerce_setting_value(raw: Any) -> str:
    """Normalize system_settings.setting_value (plain string or JSON-encoded string)."""
    if raw is None:
        return ""
    if isinstance(raw, (int, float, bool)):
        return str(raw).strip()
    s = str(raw).strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        try:
            import json

            return str(json.loads(s)).strip()
        except Exception:
            return s.strip('"').strip()
    return s


def load_gmail_settings_from_db(supabase: Any | None = None) -> dict[str, str]:
    """Load Gmail OAuth credentials from system_settings. Empty dict on failure."""
    try:
        if supabase is None:
            from .api.supabase_admin import get_supabase_admin

            supabase = get_supabase_admin()
        rows = (
            supabase.table("system_settings")
            .select("setting_key, setting_value")
            .eq("category", GMAIL_SETTINGS_CATEGORY)
            .execute()
        ).data or []
        out: dict[str, str] = {}
        for row in rows:
            key = str(row.get("setting_key") or "").strip()
            if not key:
                continue
            out[key] = _coerce_setting_value(row.get("setting_value"))
        return out
    except Exception as e:
        logger.debug("gmail system_settings load failed: %s", e)
        return {}


def _gmail_setting(key: str, *, db: dict[str, str] | None = None) -> str:
    settings = db if db is not None else load_gmail_settings_from_db()
    return (settings.get(key) or "").strip()


def gmail_client_id(*, db: dict[str, str] | None = None) -> str:
    return _gmail_setting(GMAIL_SETTING_CLIENT_ID, db=db) or _env("GOOGLE_GMAIL_CLIENT_ID")


def gmail_client_secret(*, db: dict[str, str] | None = None) -> str:
    return _gmail_setting(GMAIL_SETTING_CLIENT_SECRET, db=db) or _env("GOOGLE_GMAIL_CLIENT_SECRET")


def gmail_redirect_uri(*, db: dict[str, str] | None = None) -> str:
    explicit = _gmail_setting(GMAIL_SETTING_REDIRECT_URI, db=db) or _env("GOOGLE_GMAIL_REDIRECT_URI")
    if explicit:
        return explicit
    # Prefer public API base (Netlify /api proxy or Render).
    base = (
        _env("API_PUBLIC_URL")
        or _env("MARKETING_LINK_BASE_URL")
        or _env("FRONTEND_URL")
        or "http://localhost:8000"
    ).rstrip("/")
    return f"{base}/api/admin/marketing/gmail/callback"


def gmail_oauth_configured(*, db: dict[str, str] | None = None) -> bool:
    settings = db if db is not None else load_gmail_settings_from_db()
    return bool(gmail_client_id(db=settings) and gmail_client_secret(db=settings))


def gmail_credentials_source(*, db: dict[str, str] | None = None) -> str:
    """Where client id/secret resolve from: settings | env | mixed | none."""
    settings = db if db is not None else load_gmail_settings_from_db()
    id_db = bool(_gmail_setting(GMAIL_SETTING_CLIENT_ID, db=settings))
    secret_db = bool(_gmail_setting(GMAIL_SETTING_CLIENT_SECRET, db=settings))
    id_env = bool(_env("GOOGLE_GMAIL_CLIENT_ID"))
    secret_env = bool(_env("GOOGLE_GMAIL_CLIENT_SECRET"))
    if id_db and secret_db:
        return "settings"
    if id_env and secret_env and not (id_db or secret_db):
        return "env"
    if (id_db or id_env) and (secret_db or secret_env):
        return "mixed"
    return "none"


def gmail_oauth_public_config(*, db: dict[str, str] | None = None) -> dict[str, Any]:
    """Safe config for admin UI — never includes raw client_secret."""
    settings = db if db is not None else load_gmail_settings_from_db()
    configured = gmail_oauth_configured(db=settings)
    has_secret = bool(
        _gmail_setting(GMAIL_SETTING_CLIENT_SECRET, db=settings) or _env("GOOGLE_GMAIL_CLIENT_SECRET")
    )
    return {
        "configured": configured,
        "client_id": gmail_client_id(db=settings),
        "redirect_uri": gmail_redirect_uri(db=settings),
        "has_client_secret": has_secret,
        "client_secret_set": has_secret,
        "source": gmail_credentials_source(db=settings),
    }


def default_gmail_redirect_uri() -> str:
    """Computed default redirect URI (env / public URL), ignoring DB override."""
    base = (
        _env("API_PUBLIC_URL")
        or _env("MARKETING_LINK_BASE_URL")
        or _env("FRONTEND_URL")
        or "http://localhost:8000"
    ).rstrip("/")
    return f"{base}/api/admin/marketing/gmail/callback"


def frontend_gmail_return_url(*, connected: bool = False, error: str | None = None) -> str:
    fe = (_env("FRONTEND_URL") or "https://sparefinder.org").rstrip("/")
    q: dict[str, str] = {"tab": "gmail"}
    if connected:
        q["gmail"] = "connected"
    if error:
        q["gmail_error"] = error[:200]
    return f"{fe}/admin/marketing-outbound?{urlencode(q)}"


def _state_secret() -> str:
    return (
        _env("GOOGLE_GMAIL_STATE_SECRET")
        or gmail_client_secret()
        or _env("CLERK_SECRET_KEY")
        or "sparefinder-gmail-oauth-dev"
    )


def not_configured_message() -> str:
    return (
        "Gmail OAuth is not configured. Add Google Client ID and Client Secret under "
        "Admin → Site settings, or set GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET "
        "on the API server."
    )


def create_oauth_state(*, user_id: str, email: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email or "",
        "nonce": secrets.token_urlsafe(16),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
        "purpose": "gmail_oauth",
    }
    return jwt.encode(payload, _state_secret(), algorithm="HS256")


def parse_oauth_state(state: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(state, _state_secret(), algorithms=["HS256"])
    except JWTError as e:
        raise ValueError(f"Invalid or expired OAuth state: {e}") from e
    if payload.get("purpose") != "gmail_oauth":
        raise ValueError("Invalid OAuth state purpose")
    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise ValueError("OAuth state missing user")
    return payload


def build_authorize_url(*, state: str) -> str:
    if not gmail_oauth_configured():
        raise RuntimeError(not_configured_message())
    params = {
        "client_id": gmail_client_id(),
        "redirect_uri": gmail_redirect_uri(),
        "response_type": "code",
        "scope": f"{GMAIL_READONLY_SCOPE} openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    if not gmail_oauth_configured():
        raise RuntimeError("Gmail OAuth is not configured")
    data = {
        "code": code,
        "client_id": gmail_client_id(),
        "client_secret": gmail_client_secret(),
        "redirect_uri": gmail_redirect_uri(),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        body = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            err = body.get("error_description") or body.get("error") or resp.text
            raise RuntimeError(f"Google token exchange failed: {err}")
        return body


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    data = {
        "client_id": gmail_client_id(),
        "client_secret": gmail_client_secret(),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        body = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            err = body.get("error_description") or body.get("error") or resp.text
            raise RuntimeError(f"Google token refresh failed: {err}")
        return body


async def fetch_google_userinfo(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        body = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            raise RuntimeError(f"Failed to load Google profile: {body.get('error') or resp.text}")
        return body


async def revoke_google_token(token: str) -> None:
    if not token:
        return
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(GOOGLE_REVOKE_URL, params={"token": token})
    except Exception as e:
        logger.warning("Google token revoke failed: %s", e)


def _connection_public_view(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "id": row.get("id"),
        "email": row.get("email"),
        "status": row.get("status"),
        "scopes": row.get("scopes"),
        "last_sync_at": row.get("last_sync_at"),
        "last_extract_summary": row.get("last_extract_summary") or {},
        "last_error": row.get("last_error"),
        "connected_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def get_active_connection(supabase: Any) -> dict[str, Any] | None:
    try:
        r = (
            supabase.table("gmail_oauth_connections")
            .select("*")
            .eq("status", "connected")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = r.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.warning("gmail_oauth_connections read failed: %s", e)
        raise RuntimeError(
            "Gmail connections table is missing. Run docs/sql/gmail_oauth_connections.sql in Supabase."
        ) from e


def upsert_connection(
    supabase: Any,
    *,
    connected_by_user_id: str | None,
    email: str,
    google_account_id: str | None,
    refresh_token: str,
    access_token: str | None,
    expires_in: int | None,
    scopes: str | None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    expires_at = None
    if access_token and expires_in:
        expires_at = (now + timedelta(seconds=int(expires_in) - 60)).isoformat()

    existing = None
    email_key = email.strip().lower()
    try:
        er = (
            supabase.table("gmail_oauth_connections")
            .select("id,refresh_token")
            .eq("email", email_key)
            .limit(1)
            .execute()
        )
        existing = (er.data or [None])[0]
    except Exception:
        existing = None

    # Google only returns refresh_token on first consent; keep prior if omitted.
    effective_refresh = refresh_token or (existing.get("refresh_token") if existing else "")
    if not effective_refresh:
        raise RuntimeError(
            "Google did not return a refresh token. Disconnect in Google Account permissions "
            "and reconnect with prompt=consent."
        )

    payload: dict[str, Any] = {
        "connected_by_user_id": connected_by_user_id,
        "email": email_key,
        "google_account_id": google_account_id,
        "refresh_token": effective_refresh,
        "access_token": access_token,
        "access_token_expires_at": expires_at,
        "scopes": scopes or GMAIL_READONLY_SCOPE,
        "status": "connected",
        "last_error": None,
        "updated_at": now.isoformat(),
    }

    if existing and existing.get("id"):
        upd = (
            supabase.table("gmail_oauth_connections")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        )
        return (upd.data or [None])[0] or {**payload, "id": existing["id"]}

    payload["created_at"] = now.isoformat()
    ins = supabase.table("gmail_oauth_connections").insert(payload).execute()
    return (ins.data or [None])[0] or payload


def mark_connection_error(supabase: Any, connection_id: str, message: str) -> None:
    try:
        supabase.table("gmail_oauth_connections").update(
            {
                "status": "error",
                "last_error": message[:1000],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", connection_id).execute()
    except Exception as e:
        logger.warning("Failed to mark Gmail connection error: %s", e)


def mark_connection_revoked(supabase: Any, connection_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("gmail_oauth_connections").update(
        {
            "status": "revoked",
            "refresh_token": "",
            "access_token": None,
            "access_token_expires_at": None,
            "updated_at": now,
            "last_error": None,
        }
    ).eq("id", connection_id).execute()


async def ensure_access_token(supabase: Any, connection: dict[str, Any]) -> str:
    token = (connection.get("access_token") or "").strip()
    expires_raw = connection.get("access_token_expires_at")
    still_valid = False
    if token and expires_raw:
        try:
            exp = datetime.fromisoformat(str(expires_raw).replace("Z", "+00:00"))
            still_valid = exp > datetime.now(timezone.utc) + timedelta(seconds=30)
        except Exception:
            still_valid = False
    if still_valid:
        return token

    refresh = (connection.get("refresh_token") or "").strip()
    if not refresh:
        raise RuntimeError("Gmail connection has no refresh token; reconnect the account.")

    tokens = await refresh_access_token(refresh)
    access = (tokens.get("access_token") or "").strip()
    if not access:
        raise RuntimeError("Google did not return an access token")
    expires_in = int(tokens.get("expires_in") or 3600)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)).isoformat()
    supabase.table("gmail_oauth_connections").update(
        {
            "access_token": access,
            "access_token_expires_at": expires_at,
            "status": "connected",
            "last_error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", connection["id"]).execute()
    connection["access_token"] = access
    connection["access_token_expires_at"] = expires_at
    return access


def _header_map(payload: dict[str, Any]) -> dict[str, str]:
    headers = payload.get("headers") or []
    out: dict[str, str] = {}
    for h in headers:
        name = str(h.get("name") or "").strip().lower()
        if name:
            out[name] = str(h.get("value") or "")
    return out


def _decode_body_data(data: str | None) -> str:
    if not data:
        return ""
    raw = data.replace("-", "+").replace("_", "/")
    pad = "=" * (-len(raw) % 4)
    try:
        return base64.b64decode(raw + pad).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_text_from_payload(payload: dict[str, Any] | None, *, depth: int = 0) -> str:
    if not payload or depth > 8:
        return ""
    mime = str(payload.get("mimeType") or "")
    body = payload.get("body") or {}
    data = body.get("data")
    if mime.startswith("text/") and data:
        return _decode_body_data(data)
    parts = payload.get("parts") or []
    texts: list[str] = []
    for part in parts:
        texts.append(_extract_text_from_payload(part, depth=depth + 1))
    return "\n".join(t for t in texts if t)


def _should_skip_sender(email: str) -> bool:
    el = email.strip().lower()
    return any(el.startswith(p) for p in SKIP_SENDER_PREFIXES)


def _looks_like_lead(subject: str, snippet: str, body: str) -> bool:
    hay = f"{subject}\n{snippet}\n{body[:4000]}".lower()
    return any(term in hay for term in LEAD_HINT_TERMS)


def _parse_from(from_header: str) -> tuple[str | None, str | None]:
    name, addr = parseaddr(from_header or "")
    addr = (addr or "").strip().lower()
    if not addr or "@" not in addr:
        m = EMAIL_RE.search(from_header or "")
        addr = m.group(0).lower() if m else ""
    name = (name or "").strip() or None
    return (addr or None), name


def gmail_message_already_imported(supabase: Any, message_id: str) -> bool:
    if not message_id:
        return False
    try:
        r = (
            supabase.table("marketing_leads")
            .select("id")
            .filter("raw_payload->>gmail_message_id", "eq", message_id)
            .limit(1)
            .execute()
        )
        return bool(r.data)
    except Exception as e:
        logger.debug("gmail message dedupe check failed: %s", e)
        return False


async def _gmail_get(
    client: httpx.AsyncClient,
    path: str,
    *,
    access_token: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    resp = await client.get(
        f"{GMAIL_API_BASE}{path}",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params or {},
    )
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        err = body.get("error", {})
        msg = err.get("message") if isinstance(err, dict) else None
        raise RuntimeError(msg or f"Gmail API error ({resp.status_code})")
    return body


async def list_candidate_messages(
    *,
    access_token: str,
    max_messages: int = 40,
    query: str | None = None,
    newer_than_days: int = 60,
) -> list[dict[str, Any]]:
    """List recent inbox messages that may be inbound leads."""
    q = (query or "").strip()
    if not q:
        q = f"in:inbox newer_than:{max(1, newer_than_days)}d -category:promotions -category:social"
    async with httpx.AsyncClient(timeout=45.0) as client:
        listed = await _gmail_get(
            client,
            "/users/me/messages",
            access_token=access_token,
            params={"q": q, "maxResults": min(max(1, max_messages), 100)},
        )
        ids = [m.get("id") for m in (listed.get("messages") or []) if m.get("id")]
        results: list[dict[str, Any]] = []
        for mid in ids:
            msg = await _gmail_get(
                client,
                f"/users/me/messages/{mid}",
                access_token=access_token,
                params={"format": "full"},
            )
            payload = msg.get("payload") or {}
            headers = _header_map(payload)
            subject = headers.get("subject") or ""
            from_h = headers.get("from") or ""
            date_h = headers.get("date") or ""
            snippet = msg.get("snippet") or ""
            body_text = _extract_text_from_payload(payload)
            sender_email, sender_name = _parse_from(from_h)
            if not sender_email or _should_skip_sender(sender_email):
                continue
            is_lead_like = _looks_like_lead(subject, snippet, body_text)
            results.append(
                {
                    "gmail_message_id": mid,
                    "thread_id": msg.get("threadId"),
                    "subject": subject,
                    "snippet": snippet,
                    "from_header": from_h,
                    "date_header": date_h,
                    "sender_email": sender_email,
                    "sender_name": sender_name,
                    "body_preview": (body_text or snippet or "")[:2000],
                    "looks_like_lead": is_lead_like,
                }
            )
        # Prefer inquiry-like messages, then keep chronological order from Gmail list.
        results.sort(key=lambda m: (0 if m["looks_like_lead"] else 1))
        return results


def connection_status_payload(connection: dict[str, Any] | None) -> dict[str, Any]:
    cfg = gmail_oauth_public_config()
    return {
        "configured": cfg["configured"],
        "redirect_uri": cfg["redirect_uri"] if cfg["configured"] else None,
        "has_client_secret": cfg["has_client_secret"],
        "source": cfg["source"],
        "connection": _connection_public_view(connection),
        "scopes_required": [GMAIL_READONLY_SCOPE],
    }
