from __future__ import annotations

import os
import smtplib
from datetime import datetime, timedelta
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, Path, Query
from pydantic import BaseModel, Field

from .auth_dependencies import CurrentUser, require_roles
from .errors import ApiError
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin
from .supabase_auth_admin import delete_supabase_auth_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _count_from_response(res: Any, fallback: int) -> int:
    return int(getattr(res, "count", None) or fallback)


def _group_system_settings(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for r in rows:
        cat = str(r.get("category") or "general")
        key = str(r.get("setting_key") or "")
        if not key:
            continue
        grouped.setdefault(cat, {})[key] = r.get("setting_value")
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


@router.get("/users")
async def admin_get_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    q = supabase.table("profiles").select("*", count="exact").order("created_at", desc=True)
    if search and search.strip():
        s = search.strip()
        q = q.or_(f"email.ilike.%{s}%,full_name.ilike.%{s}%,company.ilike.%{s}%")  # type: ignore[attr-defined]
    if role and role != "all":
        q = q.eq("role", role)

    res = q.range(offset, offset + limit - 1).execute()
    users = res.data or []
    total = _count_from_response(res, len(users))

    return api_ok(
        data={
            "users": users,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": max(1, (total + limit - 1) // limit)},
        }
    )


class UpdateRoleBody(BaseModel):
    role: str = Field(pattern=r"^(user|admin|super_admin)$")


@router.patch("/users/{userId}/role")
async def admin_update_user_role(
    userId: str = Path(...),
    payload: UpdateRoleBody = Body(...),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    updated = (
        supabase.table("profiles")
        .update({"role": payload.role, "updated_at": datetime.utcnow().isoformat()})
        .eq("id", userId)
        .select("*")
        .single()
        .execute()
        .data
    )
    return api_ok(message="User role updated successfully", data={"user": updated})


@router.delete("/users/{userId}")
async def admin_delete_user(
    userId: str = Path(...),
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    if userId == admin.user_id:
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
    updates = {}
    for k, v in raw.items():
        if v is None:
            continue
        if k == "tier":
            v = str(v).strip() if v else ""
            if not v:
                continue  # skip empty tier
        updates[k] = v
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
        "created_by": admin.user_id,
        "updated_by": admin.user_id,
    }
    try:
        created = supabase.table("email_templates").insert([row]).select("*").single().execute().data
    except Exception:
        # Fallback for minimal schema
        minimal = {k: v for k, v in row.items() if k in ("name", "subject", "html_content", "text_content", "status")}
        created = supabase.table("email_templates").insert([minimal]).select("*").single().execute().data

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
        "updated_by": admin.user_id,
    }
    try:
        updated = supabase.table("email_templates").update(patch).eq("id", id).select("*").single().execute().data
    except Exception:
        minimal = {k: v for k, v in patch.items() if k in ("name", "subject", "html_content", "text_content", "status")}
        updated = supabase.table("email_templates").update(minimal).eq("id", id).select("*").single().execute().data

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





