from __future__ import annotations

import html
import os
import smtplib
import math
import requests
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Any, Optional
import stripe

from fastapi import APIRouter, Body, Depends, Path, Query
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, require_roles
from .errors import ApiError
from .responses import api_error, api_ok
from .support_ticket_email import format_ticket_message_html_for_email, format_ticket_message_plain_for_email
from .support_ticket_thread import enrich_ticket_messages_authors, fetch_ticket_messages_raw
from .plan_enforcement import _normalize_tier, canonical_trial_days_for_tier
from .subscription_utils import pick_best_subscription_row, pick_subscription_for_admin_display
from .supabase_admin import get_supabase_admin
from .supabase_auth_admin import delete_supabase_auth_user

router = APIRouter(prefix="/admin", tags=["admin"])

_TIER_PLAN_LABELS = {
    "free": "Starter",
    "pro": "Professional",
    "enterprise": "Enterprise",
}


def _tier_plan_label(tier: str) -> str:
    key = (tier or "").strip().lower()
    return _TIER_PLAN_LABELS.get(key, key or "subscription")


def _send_admin_subscription_canceled_email(
    supabase: Any,
    *,
    user_id: str,
    canceled_tier: str,
) -> None:
    """Notify the user after an admin cancels their subscription."""
    try:
        profile_res = (
            supabase.table("profiles")
            .select("email")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        profile = (profile_res.data or [None])[0]
        to_email = (profile.get("email") or "").strip() if profile else ""
        if not to_email:
            return
        from ..email_sender import send_subscription_canceled_email

        send_subscription_canceled_email(
            to_email=to_email,
            plan_name=_tier_plan_label(canceled_tier),
            end_date=datetime.utcnow().strftime("%Y-%m-%d"),
        )
    except Exception as mail_err:
        print(f"⚠️ Admin subscription canceled email error: {mail_err}")


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _count_from_response(res: Any, fallback: int) -> int:
    return int(getattr(res, "count", None) or fallback)


def _safe_prefs(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _enrich_user_location_fields(user: dict[str, Any]) -> None:
    """Normalize region preference columns for admin user lists."""
    prefs = _safe_prefs(user.get("preferences"))
    country = (user.get("user_country") or prefs.get("userCountry") or "").strip()
    region = (user.get("user_region") or prefs.get("userRegion") or "").strip()
    use_regional = user.get("use_regional_suppliers")
    if use_regional is None:
        use_regional = bool(prefs.get("useRegionalSuppliers"))
    currency = (prefs.get("userCurrency") or "").strip().upper()
    if country and not currency:
        from ..currency_utils import currency_for_country

        currency = currency_for_country(country)
    from ..currency_utils import country_to_iso2

    user["user_country"] = country or None
    user["user_region"] = region or None
    user["use_regional_suppliers"] = bool(use_regional)
    user["user_currency"] = currency or None
    user["location_label"] = ", ".join(x for x in (country, region) if x) or None
    user["country_code"] = country_to_iso2(country) if country else None


def _group_system_settings(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for r in rows:
        cat = str(r.get("category") or "general")
        key = str(r.get("setting_key") or "")
        if not key:
            continue
        value = r.get("setting_value")
        # Never expose Gmail OAuth client secret via the generic settings dump.
        if cat == "gmail" and key == "client_secret":
            grouped.setdefault(cat, {})["client_secret_set"] = bool(str(value or "").strip())
            continue
        grouped.setdefault(cat, {})[key] = value
    return grouped


def _smtp_from_settings(settings: dict[str, dict[str, Any]]) -> dict[str, Any]:
    email_settings = settings.get("email") or {}
    host = str(email_settings.get("smtp_host") or _env("SMTP_HOST", "smtp.gmail.com"))
    port = _as_int(email_settings.get("smtp_port") or _env("SMTP_PORT", "587"), 587)
    user = str(email_settings.get("smtp_user") or _env("SMTP_USER", _env("GMAIL_USER", ""))).strip()
    password = str(email_settings.get("smtp_password") or _env("SMTP_PASSWORD", _env("SMTP_PASS", _env("GMAIL_PASS", "")))).strip()
    secure_raw = email_settings.get("smtp_secure")
    secure = str(secure_raw).lower() in ("true", "1", "yes", "on") or port == 465
    from_name = str(email_settings.get("smtp_from_name") or _env("SMTP_FROM_NAME", "SpareFinder")).strip() or "SpareFinder"
    from_email = str(email_settings.get("smtp_user") or _env("SMTP_FROM", user)).strip()
    return {"host": host, "port": port, "secure": secure, "user": user, "password": password, "from_name": from_name, "from_email": from_email}


def _get_stripe_secret() -> str:
    return (os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY") or "").strip()


def _send_test_email_smtp(*, smtp_cfg: dict[str, Any], to_email: str, subject: str, html: str, text: str) -> tuple[bool, str]:
    host = str(smtp_cfg.get("host") or "")
    port = _as_int(smtp_cfg.get("port"), 587)
    user = str(smtp_cfg.get("user") or "")
    password = str(smtp_cfg.get("password") or "")
    secure = bool(smtp_cfg.get("secure"))
    from_name = str(smtp_cfg.get("from_name") or "SpareFinder")
    from_email = str(smtp_cfg.get("from_email") or user)

    if not host or not user or not password:
        return False, "SMTP credentials not configured"

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((str(Header(from_name, "utf-8")), from_email))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text or "", "plain"))
    msg.attach(MIMEText(html or "", "html"))

    server: smtplib.SMTP | None = None
    try:
        if secure:
            server = smtplib.SMTP_SSL(host=host, port=port, timeout=20)
        else:
            server = smtplib.SMTP(host=host, port=port, timeout=20)
            server._host = host  # type: ignore[attr-defined]
            server.starttls()
        server.login(user, password)
        server.sendmail(from_email, [to_email], msg.as_string())
        return True, "sent"
    except Exception as e:
        return False, str(e)
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                try:
                    server.close()
                except Exception:
                    pass


# -----------------------
# Users
# -----------------------


def _parse_iso_datetime(val: Any) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        dt = val
    else:
        try:
            s = str(val).strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
        except (TypeError, ValueError):
            return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _actor_ticket_from_clerk_response(data: dict[str, Any]) -> tuple[str | None, str | None]:
    """Clerk may return `token`, a consumable `url`, or both (token can be null)."""
    token: str | None = None
    redirect_url: str | None = None

    raw_token = data.get("token")
    if isinstance(raw_token, str) and raw_token.strip():
        token = raw_token.strip()

    raw_url = data.get("url")
    if isinstance(raw_url, str) and raw_url.strip():
        redirect_url = raw_url.strip()
        if not token:
            parsed = urlparse(redirect_url)
            query = parse_qs(parsed.query)
            for key in ("__clerk_ticket", "ticket"):
                values = query.get(key)
                if values and isinstance(values[0], str) and values[0].strip():
                    token = values[0].strip()
                    break

    return token, redirect_url


def _clerk_api_base() -> str:
    return (os.getenv("CLERK_API_URL") or "https://api.clerk.com/v1").rstrip("/")


def _format_clerk_api_error(resp: requests.Response) -> str:
    """Return a short, human-readable message from a Clerk API error body."""
    try:
        payload = resp.json()
        candidates: list[Any] = []
        if isinstance(payload, dict):
            candidates.append(payload)
            errors = payload.get("errors")
            if isinstance(errors, list):
                candidates.extend(errors)
        elif isinstance(payload, list):
            candidates.extend(payload)

        for item in candidates:
            if not isinstance(item, dict):
                continue
            for key in ("long_message", "longMessage", "message", "short_message", "shortMessage"):
                val = item.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()
    except Exception:
        pass
    return (resp.text or resp.reason or "Unknown Clerk error")[:300]


def _clerk_user_exists(*, clerk_secret: str, clerk_user_id: str) -> bool:
    if not clerk_user_id.startswith("user_"):
        return False
    try:
        resp = requests.get(
            f"{_clerk_api_base()}/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {clerk_secret}"},
            timeout=10,
        )
        return resp.status_code == 200
    except requests.RequestException:
        return False


def _clerk_lookup_user_id_by_email(*, clerk_secret: str, email: str) -> str | None:
    normalized = email.strip().lower()
    if not normalized:
        return None
    try:
        resp = requests.get(
            f"{_clerk_api_base()}/users",
            headers={"Authorization": f"Bearer {clerk_secret}"},
            params=[("email_address[]", normalized)],
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        payload = resp.json()
        users: list[Any]
        if isinstance(payload, list):
            users = payload
        elif isinstance(payload, dict):
            data = payload.get("data")
            users = data if isinstance(data, list) else []
        else:
            users = []
        for user in users:
            if isinstance(user, dict):
                user_id = user.get("id")
                if isinstance(user_id, str) and user_id.strip().startswith("user_"):
                    return user_id.strip()
    except requests.RequestException:
        return None
    return None


def _resolve_impersonation_clerk_user_id(
    supabase: Any,
    *,
    profile: dict[str, Any],
    clerk_secret: str,
) -> tuple[str | None, dict[str, Any] | None]:
    """
    Resolve the Clerk user ID for impersonation.
    Repairs stale profile.clerk_user_id values via email lookup when possible.
    """
    profile_id = profile.get("id")
    stored_id = (profile.get("clerk_user_id") or "").strip()
    email = (profile.get("email") or "").strip().lower()

    if stored_id and _clerk_user_exists(clerk_secret=clerk_secret, clerk_user_id=stored_id):
        return stored_id, None

    if email:
        resolved_id = _clerk_lookup_user_id_by_email(clerk_secret=clerk_secret, email=email)
        if resolved_id:
            if profile_id and resolved_id != stored_id:
                try:
                    supabase.table("profiles").update(
                        {
                            "clerk_user_id": resolved_id,
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                    ).eq("id", profile_id).execute()
                except Exception:
                    pass
            return resolved_id, None

    if stored_id and not stored_id.startswith("user_"):
        return None, api_error(
            "This profile has an invalid Clerk user ID. Ask the user to sign in once so their account links to Clerk.",
            status_code=400,
        )

    if not email:
        return None, api_error(
            "This user has no Clerk account linked yet. They must sign in at least once.",
            status_code=400,
        )

    return None, api_error(
        f"No Clerk account found for {email}. "
        "They may only exist in the database, or the API CLERK_SECRET_KEY may point to a different Clerk instance than the app.",
        status_code=400,
    )


def _trial_info_from_subscription(
    tier: str, status: str, period_end_raw: Any, period_start_raw: Any = None
) -> dict[str, Any]:
    """Trialing status, or Starter/Pro with a future period end (admin-assigned trials)."""
    status_l = (status or "").lower()
    tier_norm = _normalize_tier(tier)
    canonical_days = canonical_trial_days_for_tier(tier_norm)
    end = _parse_iso_datetime(period_end_raw)
    start = _parse_iso_datetime(period_start_raw)
    now = datetime.now(timezone.utc)

    is_on_trial = status_l == "trialing" or (
        canonical_days > 0
        and status_l in ("active", "trialing")
        and end is not None
        and end > now
    )

    days_remaining: int | None = None
    trial_ends_at: str | None = None

    if is_on_trial:
        if start and canonical_days > 0:
            capped_end = start + timedelta(days=canonical_days)
            if end is None or end > capped_end:
                end = capped_end
        trial_ends_at = end.isoformat() if end else (str(period_end_raw) if period_end_raw else None)
        if end:
            days_remaining = max(0, math.ceil((end - now).total_seconds() / 86400))
        else:
            days_remaining = 0

    return {
        "is_on_trial": is_on_trial,
        "trial_days_remaining": days_remaining,
        "trial_ends_at": trial_ends_at,
    }


@router.get("/users")
async def admin_get_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    country: str | None = Query(default=None, description="Filter by user_country (partial match)"),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    q = supabase.table("profiles").select("*", count="exact").order("created_at", desc=True)
    if search and search.strip():
        s = search.strip()
        q = q.or_(  # type: ignore[attr-defined]
            f"email.ilike.%{s}%,full_name.ilike.%{s}%,company.ilike.%{s}%,"
            f"user_country.ilike.%{s}%,user_region.ilike.%{s}%"
        )
    if role and role != "all":
        q = q.eq("role", role)
    if country and country.strip() and country.strip().lower() != "all":
        q = q.ilike("user_country", f"%{country.strip()}%")

    res = q.range(offset, offset + limit - 1).execute()
    users = res.data or []
    total = _count_from_response(res, len(users))

    # Attach subscription tier/status per user
    user_ids = [u["id"] for u in users if u.get("id")]
    subscription_by_user: dict[str, dict[str, str]] = {}
    if user_ids:
        try:
            subs_res = (
                supabase.table("subscriptions")
                .select("user_id, tier, status, current_period_start, current_period_end")
                .in_("user_id", user_ids)
                .execute()
            )
            subs_by_user: dict[str, list[dict[str, Any]]] = {}
            for row in subs_res.data or []:
                uid = row.get("user_id")
                if not uid:
                    continue
                subs_by_user.setdefault(str(uid), []).append(row)
            for uid_s, user_rows in subs_by_user.items():
                row = pick_subscription_for_admin_display(user_rows)
                if not row:
                    continue
                tier = row.get("tier") or "free"
                status = (row.get("status") or "inactive").lower().strip()
                if status == "cancelled":
                    status = "canceled"
                period_end = row.get("current_period_end")
                period_start = row.get("current_period_start") or row.get("updated_at")
                trial = _trial_info_from_subscription(tier, status, period_end, period_start)
                subscription_by_user[uid_s] = {
                    "tier": tier,
                    "status": status,
                    "current_period_end": period_end,
                    **trial,
                }
        except Exception:
            pass
    for u in users:
        _enrich_user_location_fields(u)
        uid = u.get("id")
        sub = subscription_by_user.get(str(uid)) if uid else None
        u["subscription_tier"] = sub["tier"] if sub else None
        u["subscription_status"] = sub["status"] if sub else None
        u["is_on_trial"] = bool(sub and sub.get("is_on_trial"))
        u["trial_days_remaining"] = sub.get("trial_days_remaining") if sub else None
        u["trial_ends_at"] = sub.get("trial_ends_at") if sub else None

    return api_ok(
        data={
            "users": users,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        }
    )


@router.get("/users/location-summary")
async def admin_users_location_summary(
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """Aggregate user counts by country for admin dashboards."""
    supabase = get_supabase_admin()
    res = (
        supabase.table("profiles")
        .select("user_country, user_region, use_regional_suppliers, preferences")
        .execute()
    )
    rows = res.data or []
    by_country: dict[str, dict[str, Any]] = {}
    unset = 0
    for row in rows:
        _enrich_user_location_fields(row)
        label = row.get("user_country") or ""
        if not label:
            unset += 1
            continue
        bucket = by_country.setdefault(
            label,
            {
                "country": label,
                "country_code": row.get("country_code"),
                "count": 0,
                "regional_enabled": 0,
            },
        )
        bucket["count"] += 1
        if row.get("use_regional_suppliers"):
            bucket["regional_enabled"] += 1

    countries = sorted(by_country.values(), key=lambda x: x["count"], reverse=True)
    return api_ok(
        data={
            "countries": countries,
            "unset_count": unset,
            "total_with_location": sum(c["count"] for c in countries),
        }
    )


class UpdateRoleBody(BaseModel):
    role: str = Field(pattern=r"^(user|admin|super_admin)$")


def _invalidate_profile_auth_cache(profile: dict[str, Any]) -> None:
    try:
        from ..redis_client import cache_delete, is_redis_configured

        if not is_redis_configured():
            return
        uid = str(profile.get("id") or "").strip()
        clerk_id = str(profile.get("clerk_user_id") or "").strip()
        if uid:
            cache_delete(f"user:id:{uid}")
        if clerk_id:
            cache_delete(f"user:clerk:{clerk_id}")
    except Exception:
        pass


def _sync_clerk_public_role(*, clerk_user_id: str, role: str) -> None:
    clerk_secret = (os.getenv("CLERK_SECRET_KEY") or "").strip()
    if not clerk_secret or not clerk_user_id.startswith("user_"):
        return
    try:
        requests.patch(
            f"{_clerk_api_base()}/users/{clerk_user_id}",
            headers={
                "Authorization": f"Bearer {clerk_secret}",
                "Content-Type": "application/json",
            },
            json={"public_metadata": {"role": role}},
            timeout=10,
        )
    except requests.RequestException:
        pass


@router.patch("/users/{userId}/role")
async def admin_update_user_role(
    userId: str = Path(...),
    payload: UpdateRoleBody = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    # postgrest-py 2.x: .update() returns a filter builder — no .select() after .eq().
    res = (
        supabase.table("profiles")
        .update({"role": payload.role, "updated_at": datetime.utcnow().isoformat()})
        .eq("id", userId)
        .execute()
    )
    rows = res.data or []
    updated = rows[0] if rows else None
    if not updated:
        return api_error("User not found", status_code=404)
    _invalidate_profile_auth_cache(updated)
    clerk_id = str(updated.get("clerk_user_id") or "").strip()
    if clerk_id:
        _sync_clerk_public_role(clerk_user_id=clerk_id, role=payload.role)
    return api_ok(message="User role updated successfully", data={"user": updated})


class UpdatePlanBody(BaseModel):
    tier: str = Field(pattern=r"^(free|pro|enterprise|no_plan)$")

    @field_validator("tier", mode="before")
    @classmethod
    def normalize_tier(cls, v: object) -> str:
        if v is None:
            raise ValueError("tier is required")
        s = str(v).strip().lower()
        if s == "no plan":
            return "no_plan"
        return s


@router.post("/users/{userId}/impersonate")
async def admin_impersonate_user(
    userId: str = Path(...),
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """
    Create a Clerk actor token so the admin can sign in as the target user.
    Requires CLERK_SECRET_KEY. See Clerk user impersonation docs.
    """
    clerk_secret = (os.getenv("CLERK_SECRET_KEY") or "").strip()
    if not clerk_secret:
        return api_error(
            "Clerk secret key is not configured. Set CLERK_SECRET_KEY on the API server.",
            status_code=503,
        )

    admin_clerk_id = (admin.clerk_user_id or "").strip()
    if not admin_clerk_id:
        return api_error(
            "Your admin account is not linked to Clerk. Sign out and sign in again via Clerk.",
            status_code=400,
        )

    if str(admin.id) == str(userId):
        return api_error("You cannot impersonate your own account.", status_code=400)

    supabase = get_supabase_admin()
    target_res = (
        supabase.table("profiles")
        .select("id, email, full_name, role, clerk_user_id")
        .eq("id", userId)
        .limit(1)
        .execute()
    )
    target_rows = target_res.data or []
    if not target_rows:
        return api_error("User not found", status_code=404)

    target = target_rows[0]
    target_role = (target.get("role") or "user").lower()
    if target_role in ("admin", "super_admin") and admin.role != "super_admin":
        return api_error(
            "Only super admins can impersonate admin accounts.",
            status_code=403,
        )

    target_clerk_id, resolve_error = _resolve_impersonation_clerk_user_id(
        supabase,
        profile=target,
        clerk_secret=clerk_secret,
    )
    if resolve_error:
        return resolve_error
    if not target_clerk_id:
        return api_error(
            "This user has no Clerk account linked yet. They must sign in at least once.",
            status_code=400,
        )

    clerk_base = _clerk_api_base()
    payload = {
        "user_id": target_clerk_id,
        "expires_in_seconds": 3600,
        "actor": {"sub": admin_clerk_id},
    }
    try:
        resp = requests.post(
            f"{clerk_base}/actor_tokens",
            headers={
                "Authorization": f"Bearer {clerk_secret}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
    except requests.RequestException as exc:
        return api_error(f"Failed to contact Clerk: {exc}", status_code=502)

    if resp.status_code not in (200, 201):
        detail = _format_clerk_api_error(resp)
        return api_error(
            f"Clerk could not create an impersonation token: {detail}",
            status_code=502,
        )

    clerk_payload = resp.json() if resp.content else {}
    if not isinstance(clerk_payload, dict):
        clerk_payload = {}

    token, redirect_url = _actor_ticket_from_clerk_response(clerk_payload)
    if not token and not redirect_url:
        status = clerk_payload.get("status")
        return api_error(
            "Clerk did not return an impersonation ticket or URL. "
            f"Enable user impersonation in the Clerk Dashboard (status={status!r}).",
            status_code=502,
        )

    return api_ok(
        message="Impersonation token created",
        data={
            "token": token,
            "redirect_url": redirect_url,
            "target": {
                "id": target.get("id"),
                "email": target.get("email"),
                "full_name": target.get("full_name"),
            },
        },
    )


@router.patch("/users/{userId}/plan")
async def admin_update_user_plan(
    userId: str = Path(...),
    payload: UpdatePlanBody = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """Update a user's subscription plan (tier). Use cancel endpoint to cancel subscriptions."""
    supabase = get_supabase_admin()
    tier = payload.tier
    now = datetime.utcnow()
    tier_norm = _normalize_tier(tier)
    trial_days = canonical_trial_days_for_tier(tier_norm)
    is_no_plan = tier == "no_plan"
    if is_no_plan:
        tier = "free"
    elif trial_days > 0:
        period_end = now + timedelta(days=trial_days)
    else:
        period_end = now + timedelta(days=30)

    existing = (
        supabase.table("subscriptions")
        .select("id, user_id, tier, status, stripe_subscription_id, cancel_at_period_end")
        .eq("user_id", userId)
        .execute()
    )
    rows = (existing.data or []) if hasattr(existing, "data") else []
    if rows:
        canceled_tier = str(rows[0].get("tier") or "free")
        if is_no_plan:
            stripe_subscription_id = str(rows[0].get("stripe_subscription_id") or "").strip()
            if stripe_subscription_id:
                stripe_secret = _get_stripe_secret()
                if not stripe_secret:
                    return api_error(
                        status_code=500,
                        error="stripe_not_configured",
                        message="Cannot cancel paid subscription because Stripe is not configured.",
                    )
                try:
                    stripe.api_key = stripe_secret
                    stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
                    if str(stripe_sub.get("status") or "").lower() not in ("canceled", "incomplete_expired"):
                        stripe.Subscription.cancel(stripe_subscription_id)
                except stripe.error.StripeError as e:
                    return api_error(
                        status_code=400,
                        error="stripe_cancel_failed",
                        message=f"Stripe cancellation failed: {e}",
                    )

        payload_update = {
            "tier": tier,
            "status": "canceled" if is_no_plan else ("trialing" if trial_days > 0 else "active"),
            "cancel_at_period_end": False if is_no_plan else bool(rows[0].get("cancel_at_period_end")),
            "updated_at": now.isoformat() + "Z",
        }
        if not is_no_plan:
            payload_update["current_period_start"] = now.isoformat() + "Z"
            payload_update["current_period_end"] = period_end.isoformat() + "Z"
        # Update every row for this user (duplicates can otherwise leave a stale canceled row "winning").
        supabase.table("subscriptions").update(payload_update).eq("user_id", userId).execute()
        updated_list = (
            supabase.table("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .execute()
        )
        data_list = (updated_list.data or []) if hasattr(updated_list, "data") else []
        updated = pick_best_subscription_row(data_list)
        if is_no_plan:
            _send_admin_subscription_canceled_email(
                supabase,
                user_id=userId,
                canceled_tier=canceled_tier,
            )
        return api_ok(
            message="User subscription cancelled." if is_no_plan else "User plan updated successfully",
            data={"subscription": updated},
        )
    if is_no_plan:
        supabase.table("subscriptions").insert({
            "user_id": userId,
            "tier": "free",
            "status": "canceled",
            "current_period_start": now.isoformat() + "Z",
            "current_period_end": period_end.isoformat() + "Z",
        }).execute()
    else:
        supabase.table("subscriptions").insert({
            "user_id": userId,
            "tier": tier,
            "status": "trialing" if trial_days > 0 else "active",
            "current_period_start": now.isoformat() + "Z",
            "current_period_end": period_end.isoformat() + "Z",
        }).execute()
    inserted_list = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .execute()
    )
    data_list = (inserted_list.data or []) if hasattr(inserted_list, "data") else []
    inserted = pick_best_subscription_row(data_list)
    return api_ok(
        message="User subscription cancelled." if is_no_plan else "User plan set successfully",
        data={"subscription": inserted},
    )


@router.delete("/users/{userId}")
async def admin_delete_user(
    userId: str = Path(...),
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    if userId == admin.id:
        return api_error(status_code=400, error="Cannot delete own account", message="Administrators cannot delete their own account")

    supabase = get_supabase_admin()
    # Best-effort: delete profile row and auth user.
    try:
        supabase.table("profiles").delete().eq("id", userId).execute()
    except Exception:
        pass
    try:
        await delete_supabase_auth_user(user_id=userId)
    except Exception:
        pass

    return api_ok(message="User deleted successfully")


# -----------------------
# Pricing plans (admin CRUD)
# -----------------------


@router.get("/plans")
async def admin_list_plans(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    """List all plans (active and inactive) for admin editing."""
    supabase = get_supabase_admin()
    try:
        result = supabase.table("plans").select("*").order("display_order").execute()
        return api_ok(data={"plans": result.data or []})
    except Exception as e:
        return api_error(status_code=500, error="db_error", message=str(e))


class PlanUpdateBody(BaseModel):
    tier: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None
    features: Optional[list[str]] = None
    popular: Optional[bool] = None
    color: Optional[str] = None
    limits_searches: Optional[int] = None
    limits_api_calls: Optional[int] = None
    limits_storage_mb: Optional[int] = None
    trial_days: Optional[int] = None
    trial_price: Optional[float] = None
    display_order: Optional[int] = None
    active: Optional[bool] = None


@router.put("/plans/{plan_id}")
async def admin_update_plan(
    plan_id: str = Path(...),
    payload: PlanUpdateBody = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """Update a plan by id (uuid) or tier."""
    supabase = get_supabase_admin()
    # Build update dict from non-None fields
    raw = payload.model_dump(exclude_unset=True)
    nullable_fields = frozenset({"trial_days", "trial_price", "description", "color"})
    updates = {}
    for k, v in raw.items():
        if v is None and k not in nullable_fields:
            continue
        if k == "tier":
            v = str(v).strip() if v else ""
            if not v:
                continue  # skip empty tier
        updates[k] = v
    if "trial_days" in updates:
        td = updates["trial_days"]
        updates["trial_days"] = None if td is None else max(0, int(td))
    if not updates:
        return api_error("No fields to update", code="no_fields", status_code=400)
    updates["updated_at"] = datetime.utcnow().isoformat()
    try:
        import uuid as uuid_mod
        is_uuid = False
        try:
            uuid_mod.UUID(plan_id)
            is_uuid = True
        except (ValueError, TypeError):
            pass
        # Always identify by id (UUID) so we can safely change tier
        if is_uuid:
            supabase.table("plans").update(updates).eq("id", plan_id).execute()
            result = supabase.table("plans").select("*").eq("id", plan_id).limit(1).execute()
        else:
            # Look up id by tier first, then update by id so tier can be changed
            row = supabase.table("plans").select("id").eq("tier", plan_id).limit(1).execute()
            if not row.data or len(row.data) == 0:
                return api_error("Plan not found", code="not_found", status_code=404)
            row_id = row.data[0].get("id")
            supabase.table("plans").update(updates).eq("id", row_id).execute()
            result = supabase.table("plans").select("*").eq("id", row_id).limit(1).execute()
        if not result.data or len(result.data) == 0:
            return api_error("Plan not found", code="not_found", status_code=404)
        return api_ok(data={"plan": result.data[0]}, message="Plan updated")
    except Exception as e:
        return api_error(str(e), code="db_error", status_code=500)


# -----------------------
# Admin dashboard statistics
# -----------------------


@router.get("/stats")
async def admin_stats(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    now = datetime.utcnow()

    # Counts
    users_res = supabase.table("profiles").select("id", count="exact").execute()
    total_users = _count_from_response(users_res, len(users_res.data or []))

    searches_res = supabase.table("part_searches").select("id", count="exact").execute()
    total_searches = _count_from_response(searches_res, len(searches_res.data or []))

    active_since = (now - timedelta(days=30)).isoformat()
    active_res = supabase.table("profiles").select("id", count="exact").gte("updated_at", active_since).execute()
    active_users = _count_from_response(active_res, len(active_res.data or []))

    # Recent searches (best-effort join)
    try:
        recent_searches = (
            supabase.table("part_searches")
            .select("id, created_at, confidence_score, ai_confidence, processing_time_ms, analysis_status, profiles(full_name, email)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
            .data
            or []
        )
    except Exception:
        recent_searches = []

    # Top users by search count (best-effort)
    try:
        top_users = (
            supabase.table("part_searches")
            .select("user_id, profiles(full_name, email), count:id.count()")
            .order("count", desc=True)
            .limit(5)
            .execute()
            .data
            or []
        )
    except Exception:
        top_users = []

    # Sidebar metrics
    last_24h = (now - timedelta(hours=24)).isoformat()
    last_week = (now - timedelta(days=7)).isoformat()
    searches_today_res = supabase.table("part_searches").select("id", count="exact").gte("created_at", last_24h).execute()
    new_users_today_res = supabase.table("profiles").select("id", count="exact").gte("created_at", last_24h).execute()
    searches_week_res = supabase.table("part_searches").select("id", count="exact").gte("created_at", last_week).execute()

    searches_today = _count_from_response(searches_today_res, len(searches_today_res.data or []))
    new_users_today = _count_from_response(new_users_today_res, len(new_users_today_res.data or []))
    searches_this_week = _count_from_response(searches_week_res, len(searches_week_res.data or []))

    # Success rate (simple: completed / total)
    completed_res = supabase.table("part_searches").select("id", count="exact").eq("analysis_status", "completed").execute()
    completed = _count_from_response(completed_res, len(completed_res.data or []))
    success_rate = (completed / total_searches * 100.0) if total_searches else 0.0

    return {
        "statistics": {
            "total_users": total_users,
            "total_searches": total_searches,
            "active_users": active_users,
            "success_rate": round(success_rate, 2),
            "searches_today": searches_today,
            "new_users_today": new_users_today,
            "searches_this_week": searches_this_week,
            "system_health": "healthy",
            "pending_tasks": 0,
            "recent_alerts": 0,
            "recent_searches": recent_searches,
            "top_users": top_users,
            "avg_response_time": 0,
            "cpu_usage": 0,
            "memory_usage": 0,
            "disk_usage": 0,
        }
    }


# -----------------------
# Analytics
# -----------------------


@router.get("/analytics")
async def admin_analytics(
    range: str = Query(default="30d"),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    days = 30
    if range == "7d":
        days = 7
    elif range == "90d":
        days = 90

    start = datetime.utcnow() - timedelta(days=days)
    supabase = get_supabase_admin()

    searches = supabase.table("part_searches").select("created_at").gte("created_at", start.isoformat()).execute().data or []
    regs = supabase.table("profiles").select("created_at").gte("created_at", start.isoformat()).execute().data or []

    def by_day(rows: list[dict[str, Any]]) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in rows:
            raw = str(r.get("created_at") or "")
            day = raw.split("T")[0] if "T" in raw else raw[:10]
            if not day:
                continue
            out[day] = out.get(day, 0) + 1
        return out

    return {"analytics": {"searches_by_day": by_day(searches), "registrations_by_day": by_day(regs), "time_range": range}}


# -----------------------
# Onboarding surveys
# -----------------------


@router.get("/onboarding-surveys")
async def admin_onboarding_surveys(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    res = (
        supabase.table("onboarding_surveys")
        .select("*, profiles(full_name)", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    surveys = res.data or []
    total = _count_from_response(res, len(surveys))
    return api_ok(
        data={
            "surveys": surveys,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        }
    )


@router.get("/onboarding-surveys/summary")
async def admin_onboarding_surveys_summary(
    range: str = Query(default="90d"),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    days = 90
    if range == "7d":
        days = 7
    elif range == "30d":
        days = 30
    elif range == "365d":
        days = 365

    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    supabase = get_supabase_admin()
    rows = (
        supabase.table("onboarding_surveys")
        .select("referral_source, company_size, role, primary_goal, interests, created_at")
        .gte("created_at", since)
        .execute()
        .data
        or []
    )

    by_ref: dict[str, int] = {}
    by_company: dict[str, int] = {}
    by_role: dict[str, int] = {}
    by_goal: dict[str, int] = {}
    interest_counts: dict[str, int] = {}

    for r in rows:
        by_ref[str(r.get("referral_source") or "unknown")] = by_ref.get(str(r.get("referral_source") or "unknown"), 0) + 1
        by_company[str(r.get("company_size") or "unknown")] = by_company.get(str(r.get("company_size") or "unknown"), 0) + 1
        by_role[str(r.get("role") or "unknown")] = by_role.get(str(r.get("role") or "unknown"), 0) + 1
        by_goal[str(r.get("primary_goal") or "unknown")] = by_goal.get(str(r.get("primary_goal") or "unknown"), 0) + 1
        interests = r.get("interests")
        if isinstance(interests, list):
            for i in interests:
                if isinstance(i, str) and i:
                    interest_counts[i] = interest_counts.get(i, 0) + 1

    top_interests = [{"interest": k, "count": v} for k, v in sorted(interest_counts.items(), key=lambda kv: kv[1], reverse=True)[:12]]
    return api_ok(
        data={
            "range": range,
            "since": since,
            "total": len(rows),
            "byReferralSource": by_ref,
            "byCompanySize": by_company,
            "byRole": by_role,
            "byPrimaryGoal": by_goal,
            "topInterests": top_interests,
        }
    )


# -----------------------
# Subscribers
# -----------------------


@router.get("/subscribers")
async def admin_subscribers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    tier: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    q = (
        supabase.table("subscriptions")
        .select("*, profiles(id, email, full_name, company, created_at, updated_at)", count="exact")
        .order("created_at", desc=True)
    )
    if tier and tier != "all":
        q = q.eq("tier", tier)
    if status and status != "all":
        q = q.eq("status", status)

    res = q.range(offset, offset + limit - 1).execute()
    subs = res.data or []
    total = _count_from_response(res, len(subs))

    # Stats
    stats_rows = supabase.table("subscriptions").select("tier, status").execute().data or []
    by_tier = {"free": 0, "pro": 0, "enterprise": 0}
    by_status = {"active": 0, "canceled": 0, "past_due": 0, "unpaid": 0, "trialing": 0}
    for r in stats_rows:
        t = str(r.get("tier") or "")
        s = str(r.get("status") or "")
        if t in by_tier:
            by_tier[t] += 1
        if s in by_status:
            by_status[s] += 1

    return api_ok(
        data={
            "subscribers": subs,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
            "statistics": {"total": total, "by_tier": by_tier, "by_status": by_status},
        }
    )


# -----------------------
# AI models + payment methods
# -----------------------


@router.get("/ai-models")
async def admin_ai_models(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    models = supabase.table("ai_models").select("*").order("created_at", desc=True).execute().data or []
    return {"models": models}


@router.get("/payment-methods")
async def admin_payment_methods(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    methods = supabase.table("payment_methods").select("*").order("created_at", desc=True).execute().data or []
    return {"methods": methods}


class CreatePaymentMethodBody(BaseModel):
    name: str
    provider: str
    api_key: str
    secret_key: str
    description: str | None = None


@router.post("/payment-methods")
async def admin_create_payment_method(
    payload: CreatePaymentMethodBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    method = (
        supabase.table("payment_methods")
        .insert(
            [
                {
                    "name": payload.name,
                    "provider": payload.provider,
                    "api_key": payload.api_key,
                    "secret_key": payload.secret_key,
                    "description": payload.description,
                    "status": "inactive",
                }
            ]
        )
        .select("*")
        .single()
        .execute()
        .data
    )
    return {"message": "Payment method created successfully", "method": method}


@router.delete("/payment-methods/{id}")
async def admin_delete_payment_method(
    id: str = Path(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    existing = supabase.table("payment_methods").select("id, name, status").eq("id", id).maybe_single().execute().data
    if not existing:
        return api_error(status_code=404, error="Payment method not found", message="The specified payment method does not exist")
    if str(existing.get("status") or "") == "active":
        return api_error(status_code=400, error="Cannot delete active payment method", message="Please disable the payment method before deleting it")
    supabase.table("payment_methods").delete().eq("id", id).execute()
    return api_ok(message=f'Payment method "{existing.get("name")}" deleted successfully')


# -----------------------
# Email templates + SMTP
# -----------------------


@router.get("/email-templates")
async def admin_email_templates(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    # Attempt to select extended schema, fallback to minimal
    try:
        templates = (
            supabase.table("email_templates")
            .select("id, name, subject, html_content, text_content, status, description, variables, created_at, updated_at")
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception:
        templates = supabase.table("email_templates").select("*").order("created_at", desc=True).execute().data or []
    return {"success": True, "templates": templates}


class EmailTemplateBody(BaseModel):
    name: str
    subject: str
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    variables: Optional[list[str]] = None


@router.post("/email-templates")
async def admin_create_email_template(
    payload: EmailTemplateBody,
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    row: dict[str, Any] = {
        "name": payload.name,
        "subject": payload.subject,
        "html_content": payload.html_content,
        "text_content": payload.text_content,
        "status": payload.status or "draft",
        "description": payload.description,
        "variables": payload.variables or [],
        "created_by": admin.id,
        "updated_by": admin.id,
    }
    try:
        ins = supabase.table("email_templates").insert([row]).execute()
        rows = ins.data or []
        created = rows[0] if rows else None
    except Exception:
        # Fallback for minimal schema
        minimal = {k: v for k, v in row.items() if k in ("name", "subject", "html_content", "text_content", "status")}
        ins = supabase.table("email_templates").insert([minimal]).execute()
        rows = ins.data or []
        created = rows[0] if rows else None

    if not created:
        return api_error("Email template insert returned no row", status_code=500)
    return api_ok(status_code=201, message="Email template created successfully", data=created)


@router.put("/email-templates/{id}")
async def admin_update_email_template(
    id: str = Path(...),
    payload: EmailTemplateBody = Body(...),
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    patch: dict[str, Any] = {
        "name": payload.name,
        "subject": payload.subject,
        "html_content": payload.html_content,
        "text_content": payload.text_content,
        "status": payload.status or "draft",
        "description": payload.description,
        "variables": payload.variables or [],
        "updated_by": admin.id,
    }
    try:
        res = supabase.table("email_templates").update(patch).eq("id", id).execute()
        rows = res.data or []
        updated = rows[0] if rows else None
    except Exception:
        minimal = {k: v for k, v in patch.items() if k in ("name", "subject", "html_content", "text_content", "status")}
        res = supabase.table("email_templates").update(minimal).eq("id", id).execute()
        rows = res.data or []
        updated = rows[0] if rows else None

    if not updated:
        return api_error("Email template not found or update returned no row", status_code=404)
    return api_ok(message="Email template updated successfully", data=updated)


@router.delete("/email-templates/{id}")
async def admin_delete_email_template(
    id: str = Path(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    supabase.table("email_templates").delete().eq("id", id).execute()
    return api_ok(message="Email template deleted successfully")


class TestEmailTemplateBody(BaseModel):
    test_email: str
    variables: Optional[dict[str, Any]] = None


@router.post("/email-templates/{id}/test")
async def admin_test_email_template(
    id: str = Path(...),
    payload: TestEmailTemplateBody = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    template = supabase.table("email_templates").select("*").eq("id", id).maybe_single().execute().data
    if not template:
        return api_error(status_code=404, error="Template not found", message="Email template not found")

    subject = str(template.get("subject") or "")
    html = str(template.get("html_content") or "")
    text = str(template.get("text_content") or "")

    vars_in = payload.variables or {}
    for k, v in vars_in.items():
        placeholder = "{{" + str(k) + "}}"
        subject = subject.replace(placeholder, str(v))
        html = html.replace(placeholder, str(v))
        text = text.replace(placeholder, str(v))

    # Load SMTP settings
    settings_rows = supabase.table("system_settings").select("category, setting_key, setting_value").execute().data or []
    smtp_cfg = _smtp_from_settings(_group_system_settings(settings_rows))

    ok, err = _send_test_email_smtp(
        smtp_cfg=smtp_cfg,
        to_email=payload.test_email,
        subject=f"[TEST] {subject}",
        html=html or "<p>Test email</p>",
        text=text or "Test email",
    )
    if not ok:
        return api_error(status_code=500, error="Failed to send test email", message=err)

    return api_ok(message="Test email sent successfully", data={"template": template.get("name")})


class SmtpConfigBody(BaseModel):
    host: str
    port: int
    username: str
    password: str
    encryption: str = "TLS"  # "SSL" | "TLS"
    fromName: str | None = None


@router.post("/test-smtp")
async def admin_test_smtp(
    payload: dict[str, Any] = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    smtp_cfg_raw = (payload or {}).get("smtpConfig") or {}
    cfg = SmtpConfigBody(**smtp_cfg_raw)
    secure = cfg.encryption.upper() == "SSL" or cfg.port == 465
    smtp_cfg = {
        "host": cfg.host,
        "port": cfg.port,
        "secure": secure,
        "user": cfg.username,
        "password": cfg.password,
        "from_name": cfg.fromName or "SpareFinder",
        "from_email": cfg.username,
    }
    ok, err = _send_test_email_smtp(
        smtp_cfg=smtp_cfg,
        to_email=cfg.username,
        subject="SMTP Test - SpareFinder Configuration",
        html="<h2>SMTP Configuration Test</h2><p>If you received this email, your SMTP configuration is working properly.</p>",
        text="SMTP Configuration Test\n\nIf you received this email, your SMTP configuration is working properly.",
    )
    if not ok:
        return api_error(status_code=500, error="SMTP test failed", message=err)
    return api_ok(message="SMTP test successful", data={"connectionVerified": True, "testEmailSent": True})


@router.post("/smtp-settings")
async def admin_save_smtp_settings(
    payload: dict[str, Any] = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    smtp_cfg_raw = (payload or {}).get("smtpConfig") or {}
    cfg = SmtpConfigBody(**smtp_cfg_raw)

    # Persist to system_settings (store booleans as strings for frontend parity)
    secure_str = "true" if (cfg.encryption.upper() == "SSL" or cfg.port == 465) else "false"
    rows = [
        {"category": "email", "setting_key": "smtp_host", "setting_value": cfg.host},
        {"category": "email", "setting_key": "smtp_port", "setting_value": str(cfg.port)},
        {"category": "email", "setting_key": "smtp_user", "setting_value": cfg.username},
        {"category": "email", "setting_key": "smtp_password", "setting_value": cfg.password},
        {"category": "email", "setting_key": "smtp_secure", "setting_value": secure_str},
        {"category": "email", "setting_key": "smtp_from_name", "setting_value": cfg.fromName or "SpareFinder"},
    ]

    supabase = get_supabase_admin()
    for r in rows:
        supabase.table("system_settings").upsert(
            {**r, "description": f"SMTP {r['setting_key'].replace('smtp_', '')} setting", "updated_at": datetime.utcnow().isoformat()},
            on_conflict="category,setting_key",
        ).execute()

    return api_ok(message="SMTP settings saved successfully", data={"smtpConfig": smtp_cfg_raw})


# -----------------------
# System settings + audit logs
# -----------------------


@router.get("/system-settings")
async def admin_system_settings(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    rows = supabase.table("system_settings").select("*").order("category", desc=False).execute().data or []
    return {"settings": _group_system_settings(rows)}


class GmailOauthSettingsBody(BaseModel):
    client_id: str = Field(default="", max_length=512)
    # Empty / omitted secret keeps the existing stored secret (same pattern as password updates).
    client_secret: str | None = Field(default=None, max_length=512)
    redirect_uri: str = Field(default="", max_length=1024)


@router.get("/gmail-oauth-settings")
async def admin_get_gmail_oauth_settings(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    from ..gmail_oauth import (
        default_gmail_redirect_uri,
        gmail_oauth_public_config,
        load_gmail_settings_from_db,
        not_configured_message,
    )

    supabase = get_supabase_admin()
    db = load_gmail_settings_from_db(supabase)
    cfg = gmail_oauth_public_config(db=db)
    stored_redirect = (db.get("redirect_uri") or "").strip()
    payload = {
        **cfg,
        # Prefer DB-stored redirect for the form; fall back to computed default for prefills.
        "redirect_uri": stored_redirect or cfg.get("redirect_uri") or default_gmail_redirect_uri(),
        "default_redirect_uri": default_gmail_redirect_uri(),
        "message": None if cfg.get("configured") else not_configured_message(),
    }
    return api_ok(payload)


@router.post("/gmail-oauth-settings")
async def admin_save_gmail_oauth_settings(
    body: GmailOauthSettingsBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    from ..gmail_oauth import (
        GMAIL_SETTING_CLIENT_ID,
        GMAIL_SETTING_CLIENT_SECRET,
        GMAIL_SETTING_REDIRECT_URI,
        GMAIL_SETTINGS_CATEGORY,
        default_gmail_redirect_uri,
        gmail_oauth_public_config,
        load_gmail_settings_from_db,
    )

    client_id = (body.client_id or "").strip()
    redirect_uri = (body.redirect_uri or "").strip() or default_gmail_redirect_uri()
    secret_in = body.client_secret
    secret_trim = (secret_in or "").strip() if secret_in is not None else ""

    supabase = get_supabase_admin()
    existing = load_gmail_settings_from_db(supabase)
    existing_secret = (existing.get(GMAIL_SETTING_CLIENT_SECRET) or "").strip()

    if not client_id:
        return api_error("Google Client ID is required", code="validation_error", status_code=400)

    # Blank secret on update = keep existing; require a secret on first save (or env fallback later).
    if not secret_trim and not existing_secret:
        # Allow save of client_id/redirect alone when env still provides the secret.
        if not (os.getenv("GOOGLE_GMAIL_CLIENT_SECRET") or "").strip():
            return api_error(
                "Google Client Secret is required (enter it once; leave blank later to keep it).",
                code="validation_error",
                status_code=400,
            )

    now = datetime.utcnow().isoformat()
    rows = [
        {
            "category": GMAIL_SETTINGS_CATEGORY,
            "setting_key": GMAIL_SETTING_CLIENT_ID,
            "setting_value": client_id,
            "description": "Google OAuth Client ID for Gmail lead extraction",
            "updated_at": now,
        },
        {
            "category": GMAIL_SETTINGS_CATEGORY,
            "setting_key": GMAIL_SETTING_REDIRECT_URI,
            "setting_value": redirect_uri,
            "description": "Google OAuth redirect URI for Gmail connect callback",
            "updated_at": now,
        },
    ]
    if secret_trim:
        rows.append(
            {
                "category": GMAIL_SETTINGS_CATEGORY,
                "setting_key": GMAIL_SETTING_CLIENT_SECRET,
                "setting_value": secret_trim,
                "description": "Google OAuth Client Secret for Gmail lead extraction",
                "updated_at": now,
            }
        )

    for r in rows:
        supabase.table("system_settings").upsert(r, on_conflict="category,setting_key").execute()

    db = load_gmail_settings_from_db(supabase)
    cfg = gmail_oauth_public_config(db=db)
    return api_ok(
        {
            **cfg,
            "redirect_uri": (db.get(GMAIL_SETTING_REDIRECT_URI) or "").strip() or cfg.get("redirect_uri"),
            "default_redirect_uri": default_gmail_redirect_uri(),
            "message": "Gmail OAuth settings saved",
        },
        message="Gmail OAuth settings saved",
    )


@router.get("/app-errors")
async def admin_app_errors(
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    severity: str | None = None,
    area: str | None = None,
    source: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    q = supabase.table("app_errors").select("*", count="exact").order("created_at", desc=True)
    if from_:
        q = q.gte("created_at", from_)
    if to:
        q = q.lte("created_at", to)
    if severity and severity != "all":
        q = q.eq("severity", severity)
    if area and area != "all":
        q = q.eq("area", area)
    if source and source != "all":
        q = q.eq("source", source)
    res = q.range(offset, offset + limit - 1).execute()
    total = _count_from_response(res, len(res.data or []))
    return api_ok(
        data={
            "errors": res.data or [],
            "pagination": {"page": page, "limit": limit, "total": total},
        }
    )


@router.get("/audit-logs")
async def admin_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=100, ge=1, le=200),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    # Try audit_logs first
    try:
        res = (
            supabase.table("audit_logs")
            .select("*", count="exact")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        logs = res.data or []
        total = _count_from_response(res, len(logs))
        # Best-effort join profiles for display
        enriched: list[dict[str, Any]] = []
        for l in logs:
            uid = l.get("user_id")
            profile = None
            if uid:
                try:
                    profile = supabase.table("profiles").select("full_name, email").eq("id", uid).maybe_single().execute().data
                except Exception:
                    profile = None
            enriched.append({**l, "profiles": profile})
        return {"success": True, "logs": enriched, "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)}}
    except Exception:
        pass

    # Fallback to user_activities
    res2 = (
        supabase.table("user_activities")
        .select("id, user_id, action, details, created_at, profiles(full_name, email)", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    rows = res2.data or []
    total = _count_from_response(res2, len(rows))
    transformed = [
        {
            "id": r.get("id"),
            "user_id": r.get("user_id"),
            "action": r.get("action"),
            "resource_type": "user_activity",
            "resource_id": None,
            "details": r.get("details"),
            "created_at": r.get("created_at"),
            "profiles": r.get("profiles"),
        }
        for r in rows
    ]
    return {"success": True, "logs": transformed, "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)}}


# -----------------------
# Support tickets (admin)
# -----------------------


@router.get("/tickets")
async def admin_list_tickets(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    status: str | None = Query(default=None),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    q = (
        supabase.table("support_tickets")
        .select("id, user_id, subject, status, priority, created_at, updated_at", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status and status.strip() and status.strip().lower() in ("open", "in_progress", "answered", "closed"):
        q = q.eq("status", status.strip().lower())
    res = q.execute()
    tickets = res.data or []
    total = _count_from_response(res, len(tickets))

    # Enrich with profile (email, full_name)
    user_ids = list({t.get("user_id") for t in tickets if t.get("user_id")})
    profiles_by_id: dict[str, dict[str, Any]] = {}
    if user_ids:
        try:
            pr = supabase.table("profiles").select("id, email, full_name").in_("id", user_ids).execute()
            for p in (pr.data or []):
                uid = p.get("id")
                if uid:
                    profiles_by_id[str(uid)] = p
        except Exception:
            pass
    for t in tickets:
        t["profile"] = profiles_by_id.get(str(t.get("user_id") or ""))

    return api_ok(
        data={
            "tickets": tickets,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        }
    )


@router.get("/tickets/{ticket_id}")
async def admin_get_ticket(
    ticket_id: str,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    # Use .limit(1) instead of .single() so PostgREST client returns a list; .single() with a row
    # that has a "message" column makes the client treat the response as an API error.
    supabase = get_supabase_admin()
    res = (
        supabase.table("support_tickets")
        .select("id, user_id, subject, message, status, priority, admin_notes, created_at, updated_at")
        .eq("id", ticket_id)
        .limit(1)
        .execute()
    )
    if not res.data or len(res.data) == 0:
        return api_error("Ticket not found", status_code=404)
    ticket = res.data[0]
    uid = ticket.get("user_id")
    if uid:
        try:
            pr = supabase.table("profiles").select("id, email, full_name, company").eq("id", uid).maybe_single().execute().data
            ticket["profile"] = pr
        except Exception:
            ticket["profile"] = None
    else:
        ticket["profile"] = None
    msgs = fetch_ticket_messages_raw(supabase, ticket_id, include_internal=True)
    enrich_ticket_messages_authors(supabase, msgs)
    ticket["messages"] = msgs
    return api_ok(data=ticket)


class AdminPostTicketMessageBody(BaseModel):
    body: str = Field(..., min_length=1, max_length=250_000)
    is_internal: bool = False
    set_status: Optional[str] = Field(default=None, pattern=r"^(open|in_progress|answered|closed)$")
    notify_email: bool = Field(
        default=True,
        description="If true, email the ticket owner when this is a public (non-internal) reply.",
    )

    @field_validator("body", mode="before")
    @classmethod
    def _strip_body(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()


def _notify_user_ticket_reply_email(
    *,
    to_email: str,
    recipient_name: str | None,
    ticket_id: str,
    ticket_subject: str,
    reply_body: str,
) -> None:
    """Email the customer when support posts a public reply."""
    import logging

    log = logging.getLogger(__name__)
    to_email = (to_email or "").strip()
    if not to_email or "@" not in to_email:
        log.warning("Ticket %s: no customer email; skipping reply notification", ticket_id)
        return
    try:
        from ..email_sender import send_basic_email_smtp, send_email_via_email_service
    except Exception as e:
        log.warning("Email imports failed for ticket reply: %s", e)
        return

    frontend = _env("FRONTEND_URL", "https://sparefinder.org").rstrip("/")
    ticket_url = f"{frontend}/support"
    subj = ticket_subject.strip() or "Support"
    subject_email = f"[SpareFinder] Reply on your ticket: {subj[:50]}{'…' if len(subj) > 50 else ''}"
    plain_body = format_ticket_message_plain_for_email(reply_body, max_chars=8000)
    html_body = format_ticket_message_html_for_email(reply_body, max_chars=8000)
    # Name must not be `html` — it shadows the stdlib `html` module used for .escape().
    email_html = f"""
<h2>New reply from SpareFinder support</h2>
<p>Hi {html.escape(recipient_name or "there")},</p>
<p>We posted an update on your ticket <strong>{html.escape(subj)}</strong>.</p>
<hr/>
{html_body}
<hr/>
<p><a href="{ticket_url}">Open your tickets in SpareFinder</a> to view the full thread.</p>
<p style="font-size:12px;color:#64748b">Ticket ID: {html.escape(ticket_id)}</p>
"""
    text = (
        f"New reply from SpareFinder support\n\n"
        f"Ticket: {subj}\n\n"
        f"{plain_body}\n\n"
        f"View your tickets: {ticket_url}\n"
        f"Ticket ID: {ticket_id}\n"
    )
    ok = send_basic_email_smtp(to_email=to_email, subject=subject_email, html=email_html, text=text)
    if not ok:
        ok = send_email_via_email_service(to_email=to_email, subject=subject_email, html=email_html, text=text)
    if ok:
        log.info("Ticket %s: reply notification emailed to customer", ticket_id)
    else:
        log.warning("Ticket %s: failed to email reply to customer", ticket_id)


@router.post("/tickets/{ticket_id}/messages")
async def admin_post_ticket_message(
    ticket_id: str,
    payload: AdminPostTicketMessageBody,
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """Append a reply (public or internal). Public replies sync latest text to support_tickets.admin_notes."""
    supabase = get_supabase_admin()
    chk = (
        supabase.table("support_tickets")
        .select("id, subject, user_id")
        .eq("id", ticket_id)
        .limit(1)
        .execute()
    )
    if not chk.data or len(chk.data) == 0:
        return api_error("Ticket not found", status_code=404)
    ticket_row = chk.data[0]
    body = (payload.body or "").strip()
    if not body:
        return api_error("Message body is required", status_code=400)
    rowm: dict[str, Any] = {
        "ticket_id": ticket_id,
        "body": body,
        "is_internal": bool(payload.is_internal),
        "author_role": "admin",
        "author_id": admin.id,
    }
    try:
        ins = supabase.table("support_ticket_messages").insert([rowm]).execute()
        created_rows = ins.data or []
        created = created_rows[0] if created_rows else None
    except Exception as e:
        return api_error(
            f"Could not save reply. Apply docs/sql/support_ticket_messages.sql in Supabase, then retry. ({e})",
            status_code=500,
        )
    ticket_updates: dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
    if not payload.is_internal:
        ticket_updates["admin_notes"] = body
    if payload.set_status is not None:
        ticket_updates["status"] = payload.set_status
    try:
        supabase.table("support_tickets").update(ticket_updates).eq("id", ticket_id).execute()
    except Exception as e:
        return api_error(f"Reply saved but ticket metadata update failed: {e}", status_code=500)
    if created:
        created = dict(created)
        created["author_display"] = admin.full_name or admin.email or "Support"

    if not payload.is_internal and payload.notify_email:
        uid = ticket_row.get("user_id")
        subj = str(ticket_row.get("subject") or "Support ticket")
        if uid:
            try:
                pr = (
                    supabase.table("profiles")
                    .select("email, full_name")
                    .eq("id", uid)
                    .limit(1)
                    .execute()
                )
                rowp = (pr.data or [{}])[0] if pr.data else {}
                cust_email = str(rowp.get("email") or "").strip()
                cust_name = rowp.get("full_name")
                if cust_email:
                    _notify_user_ticket_reply_email(
                        to_email=cust_email,
                        recipient_name=cust_name if isinstance(cust_name, str) else None,
                        ticket_id=ticket_id,
                        ticket_subject=subj,
                        reply_body=body,
                    )
            except Exception:
                import logging

                logging.getLogger(__name__).exception("Ticket %s: customer reply email failed", ticket_id)

    return api_ok(data={"message": created, "ticket_id": ticket_id}, message="Reply posted")


class AdminUpdateTicketBody(BaseModel):
    status: Optional[str] = Field(default=None, pattern=r"^(open|in_progress|answered|closed)$")
    admin_notes: Optional[str] = Field(default=None, max_length=10000)


@router.patch("/tickets/{ticket_id}")
async def admin_update_ticket(
    ticket_id: str,
    payload: AdminUpdateTicketBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    updates: dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
    if payload.status is not None:
        updates["status"] = payload.status
    if payload.admin_notes is not None:
        updates["admin_notes"] = payload.admin_notes
    if len(updates) <= 1:
        return api_error("No updates provided", status_code=400)
    try:
        # postgrest-py 2.x: SyncFilterRequestBuilder has no .select(); Prefer return=representation
        # already returns updated row(s) on .execute().
        res = supabase.table("support_tickets").update(updates).eq("id", ticket_id).execute()
        if not res.data or len(res.data) == 0:
            return api_error("Ticket not found", status_code=404)
        row = res.data[0]
        return api_ok(
            data={
                "id": row.get("id"),
                "subject": row.get("subject"),
                "status": row.get("status"),
                "admin_notes": row.get("admin_notes"),
                "updated_at": row.get("updated_at"),
            },
            message="Ticket updated",
        )
    except Exception as e:
        return api_error(f"Failed to update ticket: {e}", status_code=500)


class AdminBroadcastNotificationBody(BaseModel):
    """Create the same in-app notification row for many users (product announcements)."""

    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)
    type: str = Field(default="info", pattern=r"^(info|success|warning|error)$")
    action_url: Optional[str] = Field(default=None, max_length=2000)
    audience: str = Field(
        default="customers",
        description="customers = exclude admin/super_admin; all = every profile",
        pattern=r"^(all|customers)$",
    )


@router.post("/notifications/broadcast")
async def admin_broadcast_notifications(
    payload: AdminBroadcastNotificationBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    title = payload.title.strip()
    message = payload.message.strip()
    if not title or not message:
        return api_error("Title and message are required", code="invalid_request", status_code=400)

    audience = payload.audience

    def _broadcast() -> dict[str, int]:
        supabase = get_supabase_admin()
        page_size = 800
        page = 0
        user_ids: list[str] = []
        while True:
            res = (
                supabase.table("profiles")
                .select("id,role")
                .order("id", desc=False)
                .range(page * page_size, page * page_size + page_size - 1)
                .execute()
            )
            rows = res.data or []
            for r in rows:
                if not isinstance(r, dict):
                    continue
                uid = str(r.get("id") or "").strip()
                if not uid:
                    continue
                role = str(r.get("role") or "user").strip() or "user"
                if audience == "customers" and role in ("admin", "super_admin"):
                    continue
                user_ids.append(uid)
            if len(rows) < page_size:
                break
            page += 1

        if not user_ids:
            return {"recipient_count": 0, "notifications_created": 0}

        batch: list[dict[str, Any]] = []
        created = 0
        insert_chunk = 120
        base_row = {
            "title": title,
            "message": message,
            "type": payload.type,
            "action_url": (payload.action_url or "").strip() or None,
            "read": False,
            "metadata": {"source": "admin_broadcast"},
        }

        for uid in user_ids:
            row = {"user_id": uid, **base_row}
            batch.append(row)
            if len(batch) >= insert_chunk:
                supabase.table("notifications").insert(batch).execute()
                created += len(batch)
                batch = []
        if batch:
            supabase.table("notifications").insert(batch).execute()
            created += len(batch)

        return {"recipient_count": len(user_ids), "notifications_created": created}

    try:
        data = await run_in_threadpool(_broadcast)
    except Exception as e:
        return api_error(str(e), code="broadcast_failed", status_code=500)

    return api_ok(
        data=data,
        message=f"Posted to {data['recipient_count']} user(s); {data['notifications_created']} notification row(s) created.",
    )



