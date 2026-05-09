"""Admin marketing API + public cron endpoints for outbound campaigns."""

from __future__ import annotations

import csv
import io
import json
import logging
import os
import re
import secrets
from difflib import SequenceMatcher
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from ..marketing_crew import (
    auto_extract_email_from_csv_row,
    extract_lead_fields_from_csv_row,
    generate_email_with_openai,
    generate_serp_discovery_queries,
    sanitize_lead_with_openai,
)
from ..marketing_pipeline import (
    ensure_unsubscribe_token,
    frontend_base_url,
    log_error,
    render_message_for_lead,
    run_marketing_send_cron,
    send_marketing_email,
)
from ..marketing_rules import is_disposable_domain, is_valid_email, normalize_row
from ..marketing_serpapi import organic_results_to_lead_candidates, search_google
from .auth_dependencies import CurrentUser, require_roles
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin/marketing", tags=["marketing-admin"])
cron_router = APIRouter(tags=["marketing-cron"])


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return s or "campaign"


# ---------- Pydantic ----------
class CampaignCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    is_paused: bool = True
    priority: int = 0
    max_per_run: int = 10
    max_per_day: int = 50
    min_delay_seconds: int = 30
    subject_template: str | None = None
    html_template: str | None = None
    text_template: str | None = None
    use_ai: bool = False
    use_crew_ai: bool = False
    ai_brief: str | None = None
    compliance_address: str | None = None
    compliance_disclosure: str | None = None
    compliance_reason: str | None = None


class CampaignPatchBody(BaseModel):
    name: str | None = None
    is_paused: bool | None = None
    priority: int | None = None
    max_per_run: int | None = None
    max_per_day: int | None = None
    min_delay_seconds: int | None = None
    subject_template: str | None = None
    html_template: str | None = None
    text_template: str | None = None
    use_ai: bool | None = None
    use_crew_ai: bool | None = None
    ai_brief: str | None = None
    compliance_address: str | None = None
    compliance_disclosure: str | None = None
    compliance_reason: str | None = None


class PreviewBody(BaseModel):
    lead_id: str
    campaign_id: str


class TestSendBody(BaseModel):
    campaign_id: str
    to_email: str = Field(min_length=3, max_length=320)


class DiscoverBody(BaseModel):
    queries: list[str] | None = None
    max_queries: int = 3
    campaign_id: str | None = None
    # Optional SerpAPI geo (overrides saved settings for this run). ISO 3166-1 alpha-2 e.g. ng
    gl: str | None = Field(default=None, max_length=8)
    hl: str | None = Field(default=None, max_length=12)
    # When set, used for this run only (lets "Run discovery" match the form without Save first).
    google_search_provider: str | None = Field(default=None, max_length=32)
    serpapi_key: str | None = Field(default=None, max_length=256)


class GenerateSerpQueriesBody(BaseModel):
    country_code: str = Field(default="", max_length=4)
    country_name: str | None = Field(default=None, max_length=120)
    count: int = Field(default=8, ge=5, le=15)
    extra_context: str | None = Field(default=None, max_length=800)


class LeadPatchBody(BaseModel):
    sanitization_status: Literal["accepted", "review", "rejected"] | None = None
    full_name: str | None = None
    job_title: str | None = None
    company_name: str | None = None
    email: str | None = None
    lead_status_internal: Literal["pending", "sent", "bounced", "opt_out", "skipped"] | None = None
    campaign_id: str | None = None


class BulkLeadActionBody(BaseModel):
    ids: list[str] = Field(default_factory=list)
    action: Literal["delete", "update"]
    payload: dict[str, Any] | None = None


class MarketingSettingsBody(BaseModel):
    serp_query_templates: list[str] | None = None
    serp_results_per_query: int | None = None
    serpapi_key: str | None = None
    # ISO 3166-1 alpha-2 for SerpAPI `gl` + lead tagging (e.g. ng, ke). Empty = global.
    serp_target_country_code: str | None = None
    serp_target_hl: str | None = Field(default=None, max_length=12)
    # serpapi = serpapi.com ; serper = serper.dev (same key field, different vendor)
    google_search_provider: str | None = Field(default=None, max_length=32)
    # When set, new leads (discover/CSV with no campaign) attach here; unset = highest-priority unpaused campaign.
    default_outbound_campaign_id: str | None = Field(default=None, max_length=64)


class GenerateCampaignBody(BaseModel):
    campaign_goal: str = Field(min_length=8, max_length=2000)
    audience: str | None = None
    tone: str | None = None
    # False = send the saved subject/HTML/text with merge fields per recipient (default).
    # True = call the model again on every send (higher cost; can drift from the saved draft).
    use_ai: bool = False
    use_crew_ai: bool = False


# ---------- Admin: campaigns ----------


@admin_router.get("/campaigns")
async def list_campaigns(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    res = supabase.table("marketing_campaigns").select("*").order("priority", desc=True).execute()
    return api_ok(data={"campaigns": res.data or []})


@admin_router.post("/campaigns")
async def create_campaign(
    body: CampaignCreateBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    slug_base = _slugify(body.name)
    slug = slug_base
    for i in range(0, 50):
        check = supabase.table("marketing_campaigns").select("id").eq("slug", slug).execute()
        if not check.data:
            break
        slug = f"{slug_base}-{i+1}"

    row = {
        "name": body.name.strip(),
        "slug": slug,
        "is_paused": body.is_paused,
        "priority": body.priority,
        "max_per_run": body.max_per_run,
        "max_per_day": body.max_per_day,
        "min_delay_seconds": body.min_delay_seconds,
        "use_ai": body.use_ai,
        "use_crew_ai": body.use_crew_ai,
    }
    if body.subject_template is not None:
        row["subject_template"] = body.subject_template
    if body.html_template is not None:
        row["html_template"] = body.html_template
    if body.text_template is not None:
        row["text_template"] = body.text_template
    if body.ai_brief is not None:
        row["ai_brief"] = body.ai_brief
    if body.compliance_address is not None:
        row["compliance_address"] = body.compliance_address
    if body.compliance_disclosure is not None:
        row["compliance_disclosure"] = body.compliance_disclosure
    if body.compliance_reason is not None:
        row["compliance_reason"] = body.compliance_reason

    res = supabase.table("marketing_campaigns").insert(row).execute()
    created = (res.data or [None])[0]
    return api_ok(data={"campaign": created})


@admin_router.patch("/campaigns/{campaign_id}")
async def patch_campaign(
    campaign_id: str,
    body: CampaignPatchBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    patch: dict[str, Any] = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not patch:
        return api_ok(data={"campaign": None})
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("marketing_campaigns").update(patch).eq("id", campaign_id).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return api_ok(data={"campaign": rows[0]})


# ---------- Admin: settings ----------


def _get_settings_row(supabase: Any) -> dict[str, Any]:
    r = supabase.table("marketing_settings").select("*").eq("setting_key", "defaults").execute()
    if r.data:
        return r.data[0]
    supabase.table("marketing_settings").insert(
        {
            "setting_key": "defaults",
            "setting_value": {
                "serp_query_templates": [],
                "serp_results_per_query": 10,
                "google_search_provider": "serper",
            },
        }
    ).execute()
    r2 = supabase.table("marketing_settings").select("*").eq("setting_key", "defaults").execute()
    return (r2.data or [{}])[0]


@admin_router.get("/settings")
async def get_marketing_settings(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    row = _get_settings_row(supabase)
    return api_ok(data={"settings": row.get("setting_value") or {}})


@admin_router.patch("/settings")
async def patch_marketing_settings(
    body: MarketingSettingsBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    row = _get_settings_row(supabase)
    val = dict(row.get("setting_value") or {})
    if body.serp_query_templates is not None:
        val["serp_query_templates"] = [str(q).strip() for q in body.serp_query_templates if str(q).strip()]
    if body.serp_results_per_query is not None:
        val["serp_results_per_query"] = max(1, min(int(body.serp_results_per_query), 20))
    if body.serpapi_key is not None:
        val["serpapi_key"] = body.serpapi_key.strip()
    if body.serp_target_country_code is not None:
        cc = body.serp_target_country_code.strip().lower()[:4]
        val["serp_target_country_code"] = cc
    if body.serp_target_hl is not None:
        hl = body.serp_target_hl.strip().lower()[:12]
        val["serp_target_hl"] = hl
    if body.google_search_provider is not None:
        gp = body.google_search_provider.strip().lower()
        if gp in ("serper", "serper.dev", "google.serper", ""):
            val["google_search_provider"] = "serper"
        elif gp in ("serpapi", "serpapi.com"):
            val["google_search_provider"] = "serpapi"
        else:
            val["google_search_provider"] = "serper"
    if body.default_outbound_campaign_id is not None:
        dcid = str(body.default_outbound_campaign_id).strip()
        if dcid:
            val["default_outbound_campaign_id"] = dcid
        else:
            val.pop("default_outbound_campaign_id", None)
    supabase.table("marketing_settings").update(
        {"setting_value": val, "updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("setting_key", "defaults").execute()
    return api_ok(data={"settings": val})


@admin_router.post("/serp-queries/ai-generate")
async def ai_generate_serp_queries(
    body: GenerateSerpQueriesBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    """Return AI-suggested Google queries for discovery (does not persist until you Save)."""
    try:
        queries = generate_serp_discovery_queries(
            country_code=body.country_code or "",
            country_name=body.country_name or body.country_code or "Global",
            count=body.count,
            extra_context=body.extra_context,
        )
    except Exception as e:
        logger.exception("ai_generate_serp_queries")
        return api_error(str(e), status_code=400)
    if not queries:
        return api_error("AI returned no queries — try again or adjust country/context", status_code=400)
    return api_ok(data={"queries": queries})


@admin_router.post("/campaigns/ai-generate")
async def ai_generate_campaign(
    body: GenerateCampaignBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    prompt = (
        f"Goal: {body.campaign_goal}\n"
        f"Audience: {body.audience or 'Industrial procurement and maintenance teams'}\n"
        f"Tone: {body.tone or 'professional and concise'}\n"
        "Generate one outbound email: subject line, HTML fragment (no full document), and plain-text body.\n"
        "Use merge placeholders exactly (double curly braces) — do not hard-code example names or companies. "
        "Allowed tokens: {{first_name}}, {{full_name}}, {{company}}, {{job_title}}, {{email}}, {{platform}}, {{frontend_url}} for the main CTA link. "
        "You may use {{unsubscribe_url}} in HTML if needed.\n"
        "Sign the email as The SpareFinder team (literal text), not [Your Name]. Use correct grammar, e.g. "
        "'about how SpareFinder can support', not 'about SpareFinder can support'.\n"
        "Do not add a legal footer or unsubscribe block; the sending system appends compliance automatically."
    )
    content = generate_email_with_openai(
        lead_context={
            "first_name": "Alex",
            "company": "Acme Industries",
            "job_title": "Procurement Manager",
            "platform": "manual",
        },
        campaign_brief=prompt,
        compliance_footer_html=(
            '<p style="font-size:12px;color:#64748b;">You received this because the message may be relevant '
            'to your professional role. <a href="{{unsubscribe_url}}">Unsubscribe</a></p>'
        ),
    )

    name = f"AI Campaign {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    slug_base = _slugify(name)
    slug = slug_base
    for i in range(0, 50):
        check = supabase.table("marketing_campaigns").select("id").eq("slug", slug).execute()
        if not check.data:
            break
        slug = f"{slug_base}-{i+1}"

    row = {
        "name": name,
        "slug": slug,
        "is_paused": True,
        "priority": 0,
        "max_per_run": 10,
        "max_per_day": 50,
        "min_delay_seconds": 30,
        "subject_template": content.subject or "SpareFinder for {{company}}",
        "html_template": content.html or "<p>Hi {{first_name}},</p><p>Quick note from SpareFinder.</p>",
        "text_template": content.text or "",
        "use_ai": body.use_ai,
        "use_crew_ai": body.use_crew_ai,
        "ai_brief": body.campaign_goal,
    }
    created = (supabase.table("marketing_campaigns").insert(row).execute().data or [None])[0]
    return api_ok(data={"campaign": created})


# ---------- Admin: leads ----------


@admin_router.get("/leads")
async def list_leads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = None,
    source: str | None = None,
    sanitization_status: str | None = None,
    campaign_id: str | None = None,
    country_code: str | None = Query(
        None,
        description="Filter by target_country_code stored on lead raw_payload (Serp discovery). Use 'all' to skip.",
    ),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    q = supabase.table("marketing_leads").select("*", count="exact").order("created_at", desc=True)
    if search and search.strip():
        s = search.strip()
        q = q.or_(f"email.ilike.%{s}%,company_name.ilike.%{s}%,full_name.ilike.%{s}%")
    if source and source != "all":
        q = q.eq("source", source)
    if sanitization_status and sanitization_status != "all":
        q = q.eq("sanitization_status", sanitization_status)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    cc = (country_code or "").strip().lower()
    if cc and cc not in ("all", "any"):
        q = q.contains("raw_payload", {"target_country_code": cc})
    res = q.range(offset, offset + limit - 1).execute()
    total = int(getattr(res, "count", None) or len(res.data or []))
    return api_ok(
        data={
            "leads": res.data or [],
            "pagination": {"page": page, "limit": limit, "total": total},
        }
    )


@admin_router.patch("/leads/{lead_id}")
async def patch_lead(
    lead_id: str,
    body: LeadPatchBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    patch: dict[str, Any] = {}
    if body.sanitization_status is not None:
        patch["sanitization_status"] = body.sanitization_status
    if body.full_name is not None:
        patch["full_name"] = body.full_name.strip() or None
    if body.job_title is not None:
        patch["job_title"] = body.job_title.strip() or None
    if body.company_name is not None:
        patch["company_name"] = body.company_name.strip() or None
    if body.email is not None:
        normalized_email = body.email.strip().lower()
        if normalized_email and not is_valid_email(normalized_email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        patch["email"] = normalized_email or None
    if body.lead_status_internal is not None:
        patch["lead_status_internal"] = body.lead_status_internal
    if body.campaign_id is not None:
        patch["campaign_id"] = body.campaign_id.strip() or None
    if not patch:
        return api_ok(data={"lead": None})
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("marketing_leads").update(patch).eq("id", lead_id).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Lead not found")
    return api_ok(data={"lead": rows[0]})


@admin_router.post("/leads/bulk")
async def bulk_manage_leads(
    body: BulkLeadActionBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    ids = [str(x).strip() for x in body.ids if str(x).strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="ids is required")
    if len(ids) > 1000:
        raise HTTPException(status_code=400, detail="Too many ids; max 1000")

    if body.action == "delete":
        res = supabase.table("marketing_leads").delete().in_("id", ids).execute()
        count = len(res.data or [])
        return api_ok(data={"deleted": count, "ids": ids[:20]})

    patch: dict[str, Any] = {}
    payload = body.payload or {}
    if "sanitization_status" in payload:
        s = str(payload.get("sanitization_status") or "").strip().lower()
        if s not in ("accepted", "review", "rejected"):
            raise HTTPException(status_code=400, detail="Invalid sanitization_status")
        patch["sanitization_status"] = s
    if "lead_status_internal" in payload:
        ls = str(payload.get("lead_status_internal") or "").strip().lower()
        if ls not in ("pending", "sent", "bounced", "opt_out", "skipped"):
            raise HTTPException(status_code=400, detail="Invalid lead_status_internal")
        patch["lead_status_internal"] = ls
    if "campaign_id" in payload:
        patch["campaign_id"] = (str(payload.get("campaign_id") or "").strip() or None)

    for field in ("full_name", "job_title", "company_name"):
        if field in payload:
            patch[field] = (str(payload.get(field) or "").strip() or None)
    if "email" in payload:
        em = str(payload.get("email") or "").strip().lower()
        if em and not is_valid_email(em):
            raise HTTPException(status_code=400, detail="Invalid email format")
        patch["email"] = em or None

    if not patch:
        raise HTTPException(status_code=400, detail="No valid payload fields")
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = supabase.table("marketing_leads").update(patch).in_("id", ids).execute()
    updated = len(res.data or [])
    return api_ok(data={"updated": updated, "ids": ids[:20]})


def _default_campaign_id_for_new_leads(supabase: Any) -> str | None:
    """
    Campaign to attach when caller passes no campaign_id (CSV import, Google discover, cron discover).
    Uses default_outbound_campaign_id from marketing settings if that campaign exists; otherwise the
    highest-priority unpaused campaign (newest first when priorities tie).
    """
    row = _get_settings_row(supabase)
    val = row.get("setting_value") or {}
    explicit = str(val.get("default_outbound_campaign_id") or "").strip()
    if explicit:
        chk = supabase.table("marketing_campaigns").select("id").eq("id", explicit).limit(1).execute()
        if chk.data:
            return explicit
    r = (
        supabase.table("marketing_campaigns")
        .select("id")
        .eq("is_paused", False)
        .order("priority", desc=True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = r.data or []
    return str(rows[0]["id"]) if rows else None


def _discovery_candidate_has_usable_email(candidate: dict[str, Any]) -> bool:
    """Discovery only persists rows with a syntactically valid, non-disposable mailbox."""
    em = str(candidate.get("email") or "").strip().lower()
    if not is_valid_email(em):
        return False
    if is_disposable_domain(em):
        return False
    return True


def _upsert_lead(
    supabase: Any,
    row: dict[str, Any],
    *,
    campaign_id: str | None,
    source: str,
    run_sanitize: bool,
) -> dict[str, Any] | None:
    raw = {k: v for k, v in dict(row).items() if k not in ("sanitization_status", "source")}
    raw = normalize_row(raw)
    email = raw.get("email") or raw.get("EMAIL")
    if isinstance(email, str):
        email = email.strip().lower()
    full_name = raw.get("full_name") or raw.get("FULL_NAME") or ""
    job_title = raw.get("job_title") or raw.get("JOB_TITLE") or ""
    company = raw.get("company_name") or raw.get("COMPANY_NAME") or ""
    platform = raw.get("platform") or ""

    effective_campaign = (str(campaign_id).strip() if campaign_id else "") or None
    if not effective_campaign:
        effective_campaign = _default_campaign_id_for_new_leads(supabase)

    payload = {
        "full_name": str(full_name).strip() or None,
        "job_title": str(job_title).strip() or None,
        "company_name": str(company).strip() or None,
        "platform": str(platform).strip() or None,
        "email": email,
        "source": source,
        "campaign_id": effective_campaign,
        "raw_payload": raw,
        "lead_status_internal": "pending",
    }

    if email and is_valid_email(email):
        if is_disposable_domain(email):
            payload["sanitization_status"] = "rejected"
            payload["crew_trace"] = "disposable_domain"
        elif run_sanitize:
            try:
                sr = sanitize_lead_with_openai(raw, fast_path=True)
                payload["sanitized_full_name"] = sr.sanitized_full_name or None
                payload["sanitized_job_title"] = sr.sanitized_job_title or None
                payload["sanitized_company_name"] = sr.sanitized_company_name or None
                payload["sanitized_notes"] = sr.sanitized_notes or None
                payload["sanitization_status"] = sr.sanitization_status
                payload["crew_trace"] = sr.crew_trace
            except Exception as e:
                payload["sanitization_status"] = "review"
                payload["crew_trace"] = f"sanitize_error:{e}"[:500]
        else:
            payload["sanitization_status"] = "accepted"
    else:
        payload["sanitization_status"] = "review"

    payload["unsubscribe_token"] = secrets.token_urlsafe(32)

    if email and is_valid_email(email):
        existing = (
            supabase.table("marketing_leads")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if existing.data:
            lid = existing.data[0]["id"]
            up = {k: v for k, v in payload.items() if k != "unsubscribe_token"}
            res = supabase.table("marketing_leads").update(up).eq("id", lid).execute()
            return (res.data or [None])[0]

    ins = supabase.table("marketing_leads").insert(payload).execute()
    return (ins.data or [None])[0]


@admin_router.post("/leads/import")
async def import_leads_csv(
    file: UploadFile = File(...),
    campaign_id: str | None = Form(None),
    run_sanitize: bool = Form(True),
    column_map: str | None = Form(None),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    raw_bytes = await file.read()
    if not raw_bytes:
        return api_error("Uploaded file is empty", status_code=400)
    text = ""
    decode_errors: list[str] = []
    for enc in ("utf-8-sig", "utf-16", "utf-16le", "utf-16be", "latin-1"):
        try:
            text = raw_bytes.decode(enc)
            break
        except Exception as e:
            decode_errors.append(f"{enc}:{e}")
    if not text:
        raise HTTPException(status_code=400, detail="Could not decode file. Save as UTF-8/UTF-16 CSV or TSV.")
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    mapping: dict[str, str] = {}
    if column_map:
        try:
            mapping = json.loads(column_map)
        except Exception:
            # Be permissive: ignore malformed column_map and continue with auto-detect.
            mapping = {}

    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        return api_error(
            "CSV has no header row. Ensure first row contains column names (e.g. EMAIL, FULL_NAME, COMPANY_NAME).",
            status_code=400,
        )

    # Some ".csv" exports still use tabs/semicolons. Recover if header parsed as one giant column.
    if len(reader.fieldnames) == 1:
        single = (reader.fieldnames[0] or "")
        fallback_delim = None
        if "\t" in single:
            fallback_delim = "\t"
        elif ";" in single:
            fallback_delim = ";"
        elif "|" in single:
            fallback_delim = "|"
        if fallback_delim:
            delimiter = fallback_delim
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            if not reader.fieldnames:
                return api_error("CSV header could not be parsed", status_code=400)

    # Remove blank header columns from exports that start with empty tab/commas.
    reader.fieldnames = [(h or "").strip() for h in reader.fieldnames if (h or "").strip()]
    if not reader.fieldnames:
        return api_error("CSV header is empty after normalization", status_code=400)

    logger.info(
        "marketing import: filename=%s delimiter=%r headers=%s",
        getattr(file, "filename", "unknown"),
        delimiter,
        reader.fieldnames[:20],
    )

    def _norm_header(v: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (v or "").strip().lower())

    def _guess_email_col(headers: list[str]) -> str | None:
        preferred = {
            "email",
            "emailaddress",
            "workemail",
            "businessemail",
            "contactemail",
            "companyemail",
            "primaryemail",
            "officialemail",
        }
        scored: list[tuple[float, str]] = []
        for h in headers:
            nh = _norm_header(h)
            if not nh:
                continue
            if nh in preferred:
                return h
            score = max(
                SequenceMatcher(None, nh, "email").ratio(),
                SequenceMatcher(None, nh, "emailaddress").ratio(),
                0.92 if "email" in nh else 0.0,
            )
            scored.append((score, h))
        if not scored:
            return None
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1] if scored[0][0] >= 0.58 else None

    def col(key: str, default_alts: list[str]) -> str | None:
        if mapping.get(key):
            return mapping[key]
        fieldnames = list(reader.fieldnames or [])
        norm_map = {_norm_header(h): h for h in fieldnames}
        for a in default_alts:
            direct = norm_map.get(_norm_header(a))
            if direct:
                return direct
        return None

    email_c = col("email", ["EMAIL", "email", "Email"]) or _guess_email_col(list(reader.fieldnames or []))

    fn_c = col("full_name", ["FULL_NAME", "full_name", "Name"])
    job_c = col("job_title", ["JOB_TITLE", "job_title"])
    co_c = col("company_name", ["COMPANY_NAME", "company_name", "Company"])
    plat_c = col("platform", ["platform", "Platform"])

    imported = 0
    skipped_no_email = 0
    errors: list[str] = []

    for i, row in enumerate(reader):
        try:
            # Skip blank rows
            if not row or all(not str(v or "").strip() for v in row.values()):
                continue

            # Remove empty-key columns (common in sheet exports with extra separators)
            row = {str(k or "").strip(): (v or "") for k, v in row.items() if str(k or "").strip()}

            out: dict[str, Any] = {}
            mapped_email = (row.get(email_c) or "").strip() if email_c else ""
            auto_email = auto_extract_email_from_csv_row({k: (v or "") for k, v in row.items()})
            # Always prioritize AI/auto extraction for emails.
            em = auto_email or mapped_email
            if fn_c:
                out["full_name"] = (row.get(fn_c) or "").strip()
            if job_c:
                out["job_title"] = (row.get(job_c) or "").strip()
            if co_c:
                out["company_name"] = (row.get(co_c) or "").strip()
            if plat_c:
                out["platform"] = (row.get(plat_c) or "").strip()

            # Only call AI extraction when we actually need it (reduces import latency/timeouts).
            needs_ai_extract = (
                not em
                or not out.get("full_name")
                or not out.get("job_title")
                or not out.get("company_name")
                or not out.get("platform")
            )
            ai_extracted = None
            if needs_ai_extract:
                ai_extracted = extract_lead_fields_from_csv_row({k: (v or "") for k, v in row.items()})
                if not em:
                    em = ai_extracted.email.strip()
            out["email"] = em
            if not out["email"] or not is_valid_email(out["email"]):
                skipped_no_email += 1
                continue
            if fn_c:
                out["full_name"] = out.get("full_name") or ""
            if not out.get("full_name") and ai_extracted:
                out["full_name"] = ai_extracted.full_name
            if job_c:
                out["job_title"] = out.get("job_title") or ""
            if not out.get("job_title") and ai_extracted:
                out["job_title"] = ai_extracted.job_title
            if co_c:
                out["company_name"] = out.get("company_name") or ""
            if not out.get("company_name") and ai_extracted:
                out["company_name"] = ai_extracted.company_name
            if plat_c:
                out["platform"] = out.get("platform") or ""
            if not out.get("platform"):
                out["platform"] = (ai_extracted.platform if ai_extracted else "") or "csv_import"

            _upsert_lead(supabase, out, campaign_id=campaign_id, source="csv_import", run_sanitize=run_sanitize)
            imported += 1
        except Exception as e:
            errors.append(f"row {i+2}: {e}")

    if errors:
        log_error(supabase, severity="warning", message="csv_import partial errors", context={"errors": errors[:50]})

    return api_ok(
        data={
            "imported": imported,
            "skipped_no_email": skipped_no_email,
            "delimiter": delimiter,
            "errors": errors[:20],
        }
    )


@admin_router.post("/discover")
async def discover_serpapi(
    body: DiscoverBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    settings = _get_settings_row(supabase)
    val = settings.get("setting_value") or {}
    key_override = (
        str(body.serpapi_key or "").strip()
        or str(val.get("serpapi_key") or "").strip()
        or None
    )
    templates = body.queries if body.queries else (val.get("serp_query_templates") or [])
    if not templates:
        return api_error("No queries configured — add serp_query_templates in settings or pass queries[]", status_code=400)

    max_q = max(1, min(body.max_queries, 10))
    per_q = max(1, min(int(val.get("serp_results_per_query") or 10), 20))
    gl_use = (str(body.gl or val.get("serp_target_country_code") or "").strip() or None)
    hl_use = (str(body.hl or val.get("serp_target_hl") or "").strip() or None)
    tag_cc = gl_use.lower()[:4] if gl_use else ""
    if body.google_search_provider is not None and str(body.google_search_provider).strip():
        prov_raw = str(body.google_search_provider).strip().lower()
    else:
        prov_raw = str(val.get("google_search_provider") or os.getenv("MARKETING_GOOGLE_SEARCH_PROVIDER") or "serper").strip().lower()
    search_provider = "serper" if prov_raw in ("serper", "serper.dev", "google.serper") else "serpapi"
    lead_source = "serper_google" if search_provider == "serper" else "serpapi_google"

    created = 0
    errs: list[str] = []
    per_query: list[dict[str, Any]] = []

    for q in templates[:max_q]:
        try:
            resp = search_google(
                query=q,
                num=per_q,
                api_key=key_override,
                gl=gl_use,
                hl=hl_use,
                provider=search_provider,
            )
            organic = resp.get("organic_results") or []
            if not organic:
                msg = (
                    "Search API returned no organic results for this query (layout may be local pack, "
                    "news, or zero web matches). Try a broader query or set country / hl for your market."
                )
                errs.append(f"{q}: {msg}")
                logger.warning("marketing discover: zero organic_results query=%r keys=%s", q, list(resp.keys())[:20])
            candidates = organic_results_to_lead_candidates(resp, query=q)
            stored_q = 0
            for c in candidates:
                if tag_cc:
                    c["target_country_code"] = tag_cc
                if not _discovery_candidate_has_usable_email(c):
                    continue
                _upsert_lead(
                    supabase,
                    c,
                    campaign_id=body.campaign_id,
                    source=lead_source,
                    run_sanitize=True,
                )
                created += 1
                stored_q += 1
            per_query.append(
                {
                    "query": q,
                    "organic_count": len(organic),
                    "candidates_seen": len(candidates),
                    "candidates_stored": stored_q,
                }
            )
            if organic and candidates and stored_q == 0:
                errs.append(
                    f"{q}: skipped {len(candidates)} organic row(s) — no valid non-disposable email in SERP/snippet scrape"
                )
        except Exception as e:
            errs.append(f"{q}: {e}")
            log_error(supabase, severity="error", message=f"serp discover: {e}", context={"query": q})

    return api_ok(
        data={
            "candidates_upserted": created,
            "errors": errs,
            "queries_run": templates[:max_q],
            "per_query": per_query,
        }
    )


# ---------- Admin: logs & dashboard ----------


@admin_router.get("/sends")
async def list_sends(
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    campaign_id: str | None = None,
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    q = supabase.table("marketing_sends").select("*", count="exact").order("created_at", desc=True)
    if from_:
        q = q.gte("created_at", from_)
    if to:
        q = q.lte("created_at", to)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    if status and status != "all":
        q = q.eq("status", status)
    res = q.range(offset, offset + limit - 1).execute()
    total = int(getattr(res, "count", None) or len(res.data or []))
    return api_ok(data={"sends": res.data or [], "pagination": {"page": page, "limit": limit, "total": total}})


@admin_router.get("/errors")
async def list_errors(
    from_: str | None = Query(None, alias="from"),
    to: str | None = Query(None),
    severity: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit
    q = supabase.table("marketing_errors").select("*", count="exact").order("created_at", desc=True)
    if from_:
        q = q.gte("created_at", from_)
    if to:
        q = q.lte("created_at", to)
    if severity and severity != "all":
        q = q.eq("severity", severity)
    res = q.range(offset, offset + limit - 1).execute()
    total = int(getattr(res, "count", None) or len(res.data or []))
    return api_ok(data={"errors": res.data or [], "pagination": {"page": page, "limit": limit, "total": total}})


@admin_router.get("/dashboard")
async def marketing_dashboard(_admin: CurrentUser = Depends(require_roles("admin", "super_admin"))):
    supabase = get_supabase_admin()
    try:
        leads_total = supabase.table("marketing_leads").select("id", count="exact").execute()
        # Match cron send rules: pending + accepted + tied to an unpaused campaign (not global "pending" only).
        camp_ids = (
            supabase.table("marketing_campaigns").select("id").eq("is_paused", False).execute().data or []
        )
        active_cids = [str(r["id"]) for r in camp_ids if r.get("id")]
        if active_cids:
            pending_res = (
                supabase.table("marketing_leads")
                .select("id", count="exact")
                .eq("lead_status_internal", "pending")
                .eq("sanitization_status", "accepted")
                .in_("campaign_id", active_cids)
                .execute()
            )
            leads_ready_for_cron = int(getattr(pending_res, "count", None) or 0)
        else:
            leads_ready_for_cron = 0
        pending_any_campaign = (
            supabase.table("marketing_leads")
            .select("id", count="exact")
            .eq("lead_status_internal", "pending")
            .execute()
        )
        review = (
            supabase.table("marketing_leads")
            .select("id", count="exact")
            .eq("sanitization_status", "review")
            .execute()
        )
        sends_today = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "sent")
            .gte(
                "sent_at",
                datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat(),
            )
            .execute()
        )
        failed_today = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "failed")
            .gte(
                "created_at",
                datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat(),
            )
            .execute()
        )
        return api_ok(
            data={
                "leads_total": int(getattr(leads_total, "count", None) or 0),
                "leads_pending_send": leads_ready_for_cron,
                "leads_pending_any_campaign": int(getattr(pending_any_campaign, "count", None) or 0),
                "active_unpaused_campaigns": len(active_cids),
                "leads_needs_review": int(getattr(review, "count", None) or 0),
                "sends_today": int(getattr(sends_today, "count", None) or 0),
                "failed_today": int(getattr(failed_today, "count", None) or 0),
                "timezone_note": "Counts use UTC day boundary for today. “Waiting to email” counts only contacts ready for the automatic sender (active campaign, pending, accepted).",
            }
        )
    except Exception as e:
        logger.error("dashboard: %s", e)
        return api_error(str(e), status_code=500)


# ---------- Admin: preview / test ----------


@admin_router.post("/preview")
async def preview_email(
    body: PreviewBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    lr = supabase.table("marketing_leads").select("*").eq("id", body.lead_id).single().execute()
    lead = lr.data
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    cr = supabase.table("marketing_campaigns").select("*").eq("id", body.campaign_id).single().execute()
    campaign = cr.data
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    token = ensure_unsubscribe_token(lead)
    subj, html, text = render_message_for_lead(
        lead=lead,
        campaign=campaign,
        use_ai=bool(campaign.get("use_ai")),
        use_crew_ai=bool(campaign.get("use_crew_ai")),
    )
    return api_ok(data={"subject": subj, "html": html, "text": text})


@admin_router.post("/test-send")
async def test_send(
    body: TestSendBody,
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    to_email = body.to_email.strip().lower()
    if not is_valid_email(to_email):
        raise HTTPException(status_code=400, detail="Invalid recipient email address")
    cr = supabase.table("marketing_campaigns").select("*").eq("id", body.campaign_id).single().execute()
    campaign = cr.data
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    token = secrets.token_urlsafe(32)
    fake_lead: dict[str, Any] = {
        "email": to_email,
        "full_name": _admin.full_name or "Test User",
        "company_name": "Example Corp",
        "job_title": "Procurement",
        "sanitized_full_name": _admin.full_name,
        "sanitized_company_name": "Example Corp",
        "sanitized_job_title": "Procurement",
        "platform": "test_send",
        "raw_payload": {},
        "unsubscribe_token": token,
    }

    try:
        subj, html, text = render_message_for_lead(
            lead=fake_lead,
            campaign=campaign,
            use_ai=bool(campaign.get("use_ai")),
            use_crew_ai=bool(campaign.get("use_crew_ai")),
        )
    except Exception as e:
        logger.exception("marketing test_send render")
        log_error(
            supabase,
            severity="error",
            message=f"test_send render failed: {e}",
            context={"campaign_id": body.campaign_id},
        )
        raise HTTPException(status_code=500, detail=f"Failed to build message: {e}") from e

    ok = send_marketing_email(to_email=to_email, subject=subj, html=html, text=text)
    if not ok:
        log_error(
            supabase,
            severity="error",
            message="test_send: SMTP and email service both failed",
            context={"campaign_id": body.campaign_id, "to": to_email},
        )
        raise HTTPException(
            status_code=502,
            detail="Email send failed — configure SMTP (e.g. SMTP_HOST, SMTP_USER) or email service env vars on the API server.",
        )
    return api_ok(message="Test email sent", data={"subject": subj})


# ---------- Public cron (no auth) ----------


@cron_router.get("/cron/marketing-send")
async def cron_marketing_send(limit: int = Query(default=20, ge=1, le=200)):
    supabase = get_supabase_admin()
    try:
        result = run_marketing_send_cron(supabase, max_batch=limit)
        return result
    except Exception as e:
        logger.error("cron marketing-send: %s", e)
        log_error(supabase, severity="critical", message=f"cron marketing-send: {e}")
        return {"ok": False, "error": str(e)}


@cron_router.get("/cron/marketing-digest")
async def cron_marketing_digest():
    supabase = get_supabase_admin()
    try:
        from ..marketing_digest import run_marketing_digest

        return run_marketing_digest(supabase)
    except Exception as e:
        logger.error("cron marketing-digest: %s", e)
        return {"ok": False, "error": str(e)}


@cron_router.get("/cron/marketing-discover")
async def cron_marketing_discover(max_queries: int = Query(default=2, ge=1, le=10)):
    """Scheduled Google discovery using saved query templates (Serper.dev by default)."""
    supabase = get_supabase_admin()
    settings = _get_settings_row(supabase)
    val = settings.get("setting_value") or {}
    key_override = str(val.get("serpapi_key") or "").strip() or None
    templates = val.get("serp_query_templates") or []
    if not templates:
        return {"ok": False, "error": "No serp_query_templates in marketing settings"}
    per_q = max(1, min(int(val.get("serp_results_per_query") or 10), 20))
    gl_use = (str(val.get("serp_target_country_code") or "").strip() or None)
    hl_use = (str(val.get("serp_target_hl") or "").strip() or None)
    tag_cc = gl_use.lower()[:4] if gl_use else ""
    prov_raw = str(val.get("google_search_provider") or os.getenv("MARKETING_GOOGLE_SEARCH_PROVIDER") or "serper").strip().lower()
    search_provider = "serper" if prov_raw in ("serper", "serper.dev", "google.serper") else "serpapi"
    lead_source = "serper_google" if search_provider == "serper" else "serpapi_google"
    created = 0
    errs: list[str] = []
    per_query: list[dict[str, Any]] = []
    for q in templates[:max_queries]:
        try:
            resp = search_google(
                query=q,
                num=per_q,
                api_key=key_override,
                gl=gl_use,
                hl=hl_use,
                provider=search_provider,
            )
            organic = resp.get("organic_results") or []
            if not organic:
                errs.append(
                    f"{q}: no organic_results (try broader query or SERPAPI_GL / SERPAPI_HL for regional SERPs)"
                )
                logger.warning("cron marketing-discover: zero organic_results query=%r", q)
            candidates = organic_results_to_lead_candidates(resp, query=q)
            stored_q = 0
            for c in candidates:
                if tag_cc:
                    c["target_country_code"] = tag_cc
                if not _discovery_candidate_has_usable_email(c):
                    continue
                _upsert_lead(supabase, c, campaign_id=None, source=lead_source, run_sanitize=True)
                created += 1
                stored_q += 1
            per_query.append(
                {
                    "query": q,
                    "organic_count": len(organic),
                    "candidates_seen": len(candidates),
                    "candidates_stored": stored_q,
                }
            )
            if organic and candidates and stored_q == 0:
                errs.append(
                    f"{q}: skipped {len(candidates)} organic row(s) — no valid non-disposable email in SERP/snippet scrape"
                )
        except Exception as e:
            errs.append(str(e))
    return {"ok": True, "candidates_upserted": created, "errors": errs, "per_query": per_query}


class EspWebhookBody(BaseModel):
    """Stub payload for future ESP integration."""

    event_type: str = "unknown"
    data: dict[str, Any] = Field(default_factory=dict)


@cron_router.post("/webhooks/email/esp")
async def webhook_email_esp(payload: EspWebhookBody):
    """Optional: store raw webhook events for future delivery tracking."""
    supabase = get_supabase_admin()
    try:
        supabase.table("marketing_email_events").insert(
            {"event_type": payload.event_type[:200], "payload": payload.data}
        ).execute()
        return {"ok": True, "note": "SMTP-only sends do not populate delivery/bounce automatically."}
    except Exception as e:
        return {"ok": False, "error": str(e)}
