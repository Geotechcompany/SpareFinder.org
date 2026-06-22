"""Marketing send pipeline: suppression, merge, AI/template, SMTP, logging."""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from .email_sender import send_basic_email_smtp, send_email_via_email_service
from .marketing_crew import (
    EmailContent,
    generate_email_with_crew,
    generate_email_with_openai,
    sanitize_lead_with_openai,
)
from .marketing_merge import apply_merge, html_to_plain, lead_to_merge_dict
from .marketing_outbound_defaults import default_campaign_id_for_new_leads, sanitize_review_batch_cap
from .marketing_rules import is_disposable_domain, is_valid_email
from .marketing_sanitize import finalize_sanitization_result, rule_based_sanitize_lead

logger = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def frontend_base_url() -> str:
    return _env("FRONTEND_URL", "https://sparefinder.org")


def ensure_unsubscribe_token(lead: dict[str, Any]) -> str:
    tok = lead.get("unsubscribe_token")
    if isinstance(tok, str) and len(tok) > 10:
        return tok
    return secrets.token_urlsafe(32)


def is_suppressed(supabase: Any, email: str | None) -> bool:
    if not email or "@" not in email:
        return True
    el = email.strip().lower()
    try:
        r = (
            supabase.table("marketing_unsubscribes")
            .select("id")
            .eq("email", el)
            .limit(1)
            .execute()
        )
        if r.data:
            return True
    except Exception as e:
        logger.warning("marketing_unsubscribes check failed: %s", e)

    try:
        r2 = (
            supabase.table("email_unsubscribe_preferences")
            .select("unsubscribed_from_all_marketing")
            .eq("user_email", el)
            .limit(1)
            .execute()
        )
        rows = r2.data or []
        if rows and rows[0].get("unsubscribed_from_all_marketing"):
            return True
    except Exception:
        pass

    return False


def count_sends_today(supabase: Any, campaign_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        r = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("campaign_id", campaign_id)
            .eq("status", "sent")
            .gte("sent_at", start.isoformat())
            .execute()
        )
        return int(getattr(r, "count", None) or 0)
    except Exception:
        return 0


def build_compliance_footer_html(campaign: dict[str, Any], ctx: dict[str, str]) -> str:
    addr = apply_merge(campaign.get("compliance_address") or "", ctx)
    disc = apply_merge(campaign.get("compliance_disclosure") or "", ctx)
    reason = apply_merge(campaign.get("compliance_reason") or "", ctx)
    unsub = ctx.get("unsubscribe_url") or ""
    parts = [
        f'<p style="font-size:12px;color:#64748b;">{disc}</p>',
        f'<p style="font-size:12px;color:#64748b;">{reason}</p>',
    ]
    if addr:
        parts.append(f'<p style="font-size:12px;color:#64748b;">{addr}</p>')
    if unsub:
        parts.append(
            f'<p style="font-size:12px;"><a href="{unsub}">Unsubscribe</a></p>'
        )
    return "\n".join(parts)


def render_message_for_lead(
    *,
    lead: dict[str, Any],
    campaign: dict[str, Any],
    use_ai: bool,
    use_crew_ai: bool,
) -> tuple[str, str, str]:
    """Returns subject, html, text."""
    fe = frontend_base_url()
    token = ensure_unsubscribe_token(lead)
    ctx = lead_to_merge_dict(lead, frontend_url=fe, unsubscribe_token=token)

    compliance_footer = build_compliance_footer_html(campaign, ctx)

    if use_ai:
        lead_ctx = {
            "email": lead.get("email"),
            "company": ctx.get("company"),
            "first_name": ctx.get("first_name"),
            "job_title": ctx.get("job_title"),
            "platform": ctx.get("platform"),
            "notes": lead.get("sanitized_notes") or "",
        }
        try:
            if use_crew_ai:
                merge_preview = apply_merge(campaign.get("html_template") or "", ctx)
                body = generate_email_with_crew(
                    lead_context=lead_ctx,
                    campaign_brief=campaign.get("ai_brief") or "",
                    merge_preview=merge_preview,
                )
            else:
                body = generate_email_with_openai(
                    lead_context=lead_ctx,
                    campaign_brief=campaign.get("ai_brief") or "",
                    compliance_footer_html=compliance_footer,
                )
            # Always merge: AI output may still contain {{frontend_url}} etc. even when
            # it omits unsubscribe placeholders (previously we skipped merge in that case).
            html_out = apply_merge((body.html or "").strip(), ctx) + "\n" + compliance_footer
            subj = apply_merge(body.subject or "", ctx)
            if body.text and body.text.strip():
                text_out = apply_merge(body.text.strip(), ctx)
            else:
                text_out = html_to_plain(html_out)
            return subj, html_out, text_out
        except Exception as e:
            logger.warning("AI generation failed, falling back to template: %s", e)

    subj = apply_merge(campaign.get("subject_template") or "", ctx)
    html_out = apply_merge(campaign.get("html_template") or "", ctx) + "\n" + compliance_footer
    text_tpl = campaign.get("text_template") or ""
    text_out = apply_merge(text_tpl, ctx) if text_tpl.strip() else html_to_plain(html_out)
    return subj, html_out, text_out


def send_marketing_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    """Try SMTP then email-service."""
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if ok:
        return True
    return bool(
        send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)
    )


def record_send(
    supabase: Any,
    *,
    lead_id: str,
    campaign_id: str,
    cron_run_id: str | None,
    status: str,
    error_message: str | None,
    subject_snapshot: str | None,
    body_html_snapshot: str | None,
    tracking_token: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "lead_id": lead_id,
        "campaign_id": campaign_id,
        "cron_run_id": cron_run_id,
        "status": status,
        "error_message": error_message,
        "subject_snapshot": subject_snapshot,
        "body_html_snapshot": (body_html_snapshot or "")[:50000] if body_html_snapshot else None,
    }
    if status == "sent":
        payload["sent_at"] = datetime.now(timezone.utc).isoformat()
    if tracking_token:
        payload["tracking_token"] = tracking_token
    try:
        supabase.table("marketing_sends").insert(payload).execute()
    except Exception as e:
        logger.error("Failed to record marketing_sends: %s", e)


def send_tracked_marketing_and_record(
    supabase: Any,
    *,
    to_email: str,
    lead_id: str,
    campaign_id: str,
    cron_run_id: str | None,
    subj: str,
    html: str,
    text: str,
) -> bool:
    """
    Inject open pixel + click redirects (when enabled), send via SMTP/email-service,
    and append a marketing_sends row. Returns True on successful delivery.
    """
    from .marketing_tracking import inject_tracking_into_html, tracking_enabled

    track = secrets.token_urlsafe(24) if tracking_enabled() else None
    html_out = inject_tracking_into_html(html, tracking_token=track) if track else html
    ok = send_marketing_email(to_email=to_email, subject=subj, html=html_out, text=text)
    if ok:
        record_send(
            supabase,
            lead_id=lead_id,
            campaign_id=campaign_id,
            cron_run_id=cron_run_id,
            status="sent",
            error_message=None,
            subject_snapshot=subj[:500],
            body_html_snapshot=html_out[:50000],
            tracking_token=track,
        )
    else:
        record_send(
            supabase,
            lead_id=lead_id,
            campaign_id=campaign_id,
            cron_run_id=cron_run_id,
            status="failed",
            error_message="smtp/email service failed",
            subject_snapshot=subj[:500],
            body_html_snapshot=None,
            tracking_token=None,
        )
    return ok


def log_error(
    supabase: Any,
    *,
    severity: str,
    message: str,
    context: dict[str, Any] | None = None,
) -> None:
    try:
        supabase.table("marketing_errors").insert(
            {"severity": severity, "message": message[:5000], "context": context or {}}
        ).execute()
    except Exception as e:
        logger.error("log_error failed: %s", e)


def run_marketing_sanitize_review_batch(
    supabase: Any,
    *,
    max_batch: int = 25,
) -> dict[str, Any]:
    """
    Process leads stuck in sanitization_status=review: rule-check email, then re-run OpenAI sanitize.
    Called from marketing send/discover crons so the queue drains without manual admin actions.
    """
    max_batch = max(0, min(int(max_batch), 500))
    if max_batch == 0:
        return {
            "ok": True,
            "processed": 0,
            "accepted": 0,
            "rejected": 0,
            "still_review": 0,
            "errors": 0,
        }

    try:
        lr = (
            supabase.table("marketing_leads")
            .select("*")
            .eq("sanitization_status", "review")
            .order("updated_at", desc=False)
            .limit(max_batch)
            .execute()
        )
        rows = lr.data or []
    except Exception as e:
        logger.error("sanitize_review_batch: load leads: %s", e)
        return {
            "ok": False,
            "error": str(e),
            "processed": 0,
            "accepted": 0,
            "rejected": 0,
            "still_review": 0,
            "errors": 0,
        }

    accepted = 0
    rejected = 0
    still_review = 0
    errors = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for lead in rows:
        lid = str(lead.get("id") or "").strip()
        if not lid:
            continue
        email = (lead.get("email") or "").strip().lower()
        raw = {k: v for k, v in dict(lead).items() if k not in ("sanitization_status",)}
        patch: dict[str, Any] = {"updated_at": now_iso}
        status_out = "review"

        try:
            if not email or not is_valid_email(email):
                patch["sanitization_status"] = "rejected"
                patch["crew_trace"] = "cron_sanitize:invalid_email"
                status_out = "rejected"
            elif is_disposable_domain(email):
                patch["sanitization_status"] = "rejected"
                patch["crew_trace"] = "cron_sanitize:disposable_domain"
                status_out = "rejected"
            else:
                rule = rule_based_sanitize_lead(raw, email=email)
                if rule.sanitization_status == "accepted":
                    sr = rule
                else:
                    sr = sanitize_lead_with_openai(raw, fast_path=True)
                    sr = finalize_sanitization_result(email=email, raw=raw, result=sr)
                patch["sanitized_full_name"] = sr.sanitized_full_name or None
                patch["sanitized_job_title"] = sr.sanitized_job_title or None
                patch["sanitized_company_name"] = sr.sanitized_company_name or None
                patch["sanitized_notes"] = sr.sanitized_notes or None
                patch["sanitization_status"] = sr.sanitization_status
                patch["crew_trace"] = (sr.crew_trace or "cron_sanitize")[:2000]
                status_out = sr.sanitization_status
        except Exception as ex:
            logger.warning("sanitize_review_batch OpenAI lead %s: %s", lid, ex)
            patch["sanitization_status"] = "review"
            patch["crew_trace"] = f"cron_sanitize_error:{ex}"[:500]
            status_out = "review"
            errors += 1

        try:
            supabase.table("marketing_leads").update(patch).eq("id", lid).execute()
            if status_out == "accepted":
                accepted += 1
            elif status_out == "rejected":
                rejected += 1
            else:
                still_review += 1
        except Exception as ue:
            logger.warning("sanitize_review_batch update %s: %s", lid, ue)
            errors += 1

    processed = len(rows)
    return {
        "ok": True,
        "processed": processed,
        "accepted": accepted,
        "rejected": rejected,
        "still_review": still_review,
        "errors": errors,
    }


def run_marketing_sanitize_review_drain(
    supabase: Any,
    *,
    batch_size: int = 100,
    max_total: int = 500,
) -> dict[str, Any]:
    """Process the sanitization review queue in repeated batches until drained or max_total reached."""
    batch_size = max(1, min(int(batch_size), 500))
    max_total = max(0, min(int(max_total), 2000))
    if max_total == 0:
        return {
            "ok": True,
            "batches": 0,
            "processed": 0,
            "accepted": 0,
            "rejected": 0,
            "still_review": 0,
            "errors": 0,
        }

    totals: dict[str, Any] = {
        "ok": True,
        "batches": 0,
        "processed": 0,
        "accepted": 0,
        "rejected": 0,
        "still_review": 0,
        "errors": 0,
    }
    remaining = max_total

    while remaining > 0:
        chunk = min(batch_size, remaining)
        result = run_marketing_sanitize_review_batch(supabase, max_batch=chunk)
        if not result.get("ok"):
            totals["ok"] = False
            totals["error"] = result.get("error")
            break

        totals["batches"] += 1
        processed = int(result.get("processed") or 0)
        totals["processed"] += processed
        totals["accepted"] += int(result.get("accepted") or 0)
        totals["rejected"] += int(result.get("rejected") or 0)
        totals["still_review"] += int(result.get("still_review") or 0)
        totals["errors"] += int(result.get("errors") or 0)
        remaining -= processed

        if processed == 0:
            break
        if int(result.get("accepted") or 0) + int(result.get("rejected") or 0) == 0:
            break

    return totals


def run_marketing_send_cron(
    supabase: Any,
    *,
    max_batch: int = 20,
) -> dict[str, Any]:
    """
    Public cron: process active campaigns, send to pending leads (email required, not suppressed).
    Respects per-campaign limits and is_paused.
    """
    import time
    import uuid

    run_id = str(uuid.uuid4())
    try:
        supabase.table("marketing_cron_runs").insert(
            {"id": run_id, "kind": "send", "started_at": datetime.now(timezone.utc).isoformat()}
        ).execute()
    except Exception:
        run_id = ""

    sanitize_cap = sanitize_review_batch_cap(supabase)
    sanitize_review = (
        run_marketing_sanitize_review_drain(
            supabase,
            batch_size=sanitize_cap,
            max_total=max(sanitize_cap * 5, 500),
        )
        if sanitize_cap > 0
        else {"ok": True, "batches": 0, "processed": 0, "accepted": 0, "rejected": 0, "still_review": 0, "errors": 0}
    )

    sent = 0
    failed = 0
    skipped = 0
    remaining_global = max(1, min(max_batch, 500))
    campaigns_with_budget = 0
    candidates_considered = 0

    try:
        camp_res = (
            supabase.table("marketing_campaigns")
            .select("*")
            .eq("is_paused", False)
            .order("priority", desc=True)
            .execute()
        )
        campaigns = camp_res.data or []
    except Exception as e:
        log_error(supabase, severity="critical", message=f"load campaigns: {e}")
        return {"ok": False, "error": str(e), "sent": 0, "failed": 0, "skipped": 0}

    orphan_leads_assigned_campaign = 0
    active_ids: list[str] = []
    try:
        target_cid = default_campaign_id_for_new_leads(supabase)
        if campaigns:
            active_ids = [str(c["id"]) for c in campaigns if c.get("id")]
            if active_ids and (not target_cid or target_cid not in active_ids):
                target_cid = active_ids[0]
        if target_cid:
            q = (
                supabase.table("marketing_leads")
                .select("id")
                .eq("lead_status_internal", "pending")
                .eq("sanitization_status", "accepted")
                .limit(500)
            )
            if len(active_ids) == 1 and target_cid == active_ids[0]:
                only = active_ids[0]
                q = q.or_(f"campaign_id.is.null,campaign_id.neq.{only}")
            else:
                q = q.is_("campaign_id", "null")
            sel = q.execute()
            oids = [str(r["id"]) for r in (sel.data or [])]
            if oids:
                now_iso = datetime.now(timezone.utc).isoformat()
                supabase.table("marketing_leads").update(
                    {"campaign_id": target_cid, "updated_at": now_iso}
                ).in_("id", oids).execute()
                orphan_leads_assigned_campaign = len(oids)
    except Exception as e:
        logger.warning("send cron: orphan campaign_id backfill skipped: %s", e)

    for campaign in campaigns:
        if remaining_global <= 0:
            break
        cid = campaign.get("id")
        if not cid:
            continue
        daily_cap = int(campaign.get("max_per_day") or 50)
        run_cap = int(campaign.get("max_per_run") or 10)
        already = count_sends_today(supabase, str(cid))
        remaining_day = max(0, daily_cap - already)
        budget = min(run_cap, remaining_day, remaining_global)
        if budget <= 0:
            continue

        delay_sec = int(campaign.get("min_delay_seconds") or 0)

        try:
            lr = (
                supabase.table("marketing_leads")
                .select("*")
                .eq("campaign_id", str(cid))
                .eq("lead_status_internal", "pending")
                .eq("sanitization_status", "accepted")
                .limit(min(budget * 5, 200))
                .execute()
            )
            candidates = [row for row in (lr.data or []) if (row.get("email") or "").strip()]
        except Exception as e:
            log_error(supabase, severity="error", message=f"load leads: {e}", context={"campaign_id": cid})
            continue

        campaigns_with_budget += 1
        candidates_considered += len(candidates)

        for lead in candidates:
            if remaining_global <= 0:
                break
            if budget <= 0:
                break
            email = (lead.get("email") or "").strip().lower()

            if is_suppressed(supabase, email):
                skipped += 1
                remaining_global -= 1
                budget -= 1
                record_send(
                    supabase,
                    lead_id=str(lead["id"]),
                    campaign_id=str(cid),
                    cron_run_id=run_id or None,
                    status="skipped",
                    error_message="suppressed",
                    subject_snapshot=None,
                    body_html_snapshot=None,
                )
                continue

            token = ensure_unsubscribe_token(lead)
            if token != lead.get("unsubscribe_token"):
                try:
                    supabase.table("marketing_leads").update({"unsubscribe_token": token}).eq(
                        "id", lead["id"]
                    ).execute()
                    lead["unsubscribe_token"] = token
                except Exception:
                    pass

            use_ai = bool(campaign.get("use_ai"))
            use_crew = bool(campaign.get("use_crew_ai"))

            try:
                subj, html, text = render_message_for_lead(
                    lead=lead,
                    campaign=campaign,
                    use_ai=use_ai,
                    use_crew_ai=use_crew,
                )
            except Exception as ge:
                failed += 1
                remaining_global -= 1
                budget -= 1
                record_send(
                    supabase,
                    lead_id=str(lead["id"]),
                    campaign_id=str(cid),
                    cron_run_id=run_id or None,
                    status="failed",
                    error_message=f"render: {ge}"[:2000],
                    subject_snapshot=None,
                    body_html_snapshot=None,
                )
                log_error(
                    supabase,
                    severity="error",
                    message=str(ge)[:2000],
                    context={"lead_id": str(lead["id"]), "campaign_id": str(cid)},
                )
                continue

            ok = send_tracked_marketing_and_record(
                supabase,
                to_email=email,
                lead_id=str(lead["id"]),
                campaign_id=str(cid),
                cron_run_id=run_id or None,
                subj=subj,
                html=html,
                text=text,
            )
            if ok:
                sent += 1
                remaining_global -= 1
                budget -= 1
                try:
                    supabase.table("marketing_leads").update(
                        {
                            "lead_status_internal": "sent",
                            "last_sent_at": datetime.now(timezone.utc).isoformat(),
                        }
                    ).eq("id", lead["id"]).execute()
                except Exception:
                    pass
            else:
                failed += 1
                remaining_global -= 1
                budget -= 1

            if delay_sec > 0:
                time.sleep(min(delay_sec, 60))

    hints: list[str] = []
    n_camp = len(campaigns)
    if n_camp == 0:
        hints.append(
            "No sendable campaigns: every row in marketing_campaigns has is_paused=true — activate one in admin."
        )
    elif campaigns_with_budget == 0:
        hints.append(
            "Active campaigns hit zero send budget today (max_per_day already reached for each) or limits are 0."
        )
    elif candidates_considered == 0:
        hints.append(
            "No matching leads: for each active campaign, leads need campaign_id set to that campaign, "
            "lead_status_internal=pending, sanitization_status=accepted, and a non-empty email. "
            "(The send cron now assigns campaign_id to accepted+pending rows that were still null — up to 500 per run.)"
        )
    if sent == 0 and failed > 0:
        hints.append(
            "SMTP or fallback email service rejected sends — set SMTP_HOST/SMTP_USER/SMTP_PASSWORD (or email-service env) "
            "and check marketing_sends + marketing_errors."
        )
    if sent == 0 and skipped > 0 and failed == 0 and candidates_considered > 0:
        hints.append(
            "Every candidate was skipped (unsubscribed / marketing suppression) — check marketing_unsubscribes."
        )

    summary = {
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "cron_run_id": run_id,
        "sanitize_review_queue": sanitize_review,
        "diagnostics": {
            "unpaused_campaigns": n_camp,
            "campaigns_with_send_budget": campaigns_with_budget,
            "pending_accepted_candidates_seen": candidates_considered,
            "orphan_leads_assigned_campaign": orphan_leads_assigned_campaign,
            "hints": hints,
        },
    }
    if run_id:
        try:
            supabase.table("marketing_cron_runs").update(
                {
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "summary": summary,
                }
            ).eq("id", run_id).execute()
        except Exception:
            pass

    return {"ok": True, **summary}


def run_marketing_admin_send_to_leads(
    supabase: Any,
    *,
    lead_ids: list[str],
    max_batch: int = 25,
) -> dict[str, Any]:
    """
    Send campaign emails for specific lead IDs (admin UI). Same rules as the send cron for each row:
    pending, accepted review, non-paused campaign, not suppressed. Ignores daily/run caps on campaigns.
    """
    import time

    seen: list[str] = []
    for raw in lead_ids:
        s = str(raw).strip()
        if s and s not in seen:
            seen.append(s)
    cap = max(1, min(int(max_batch), 100, len(seen)))
    ids = seen[:cap]

    sent = 0
    failed = 0
    skipped = 0
    errors: list[str] = []
    hints: list[str] = []

    try:
        lr = supabase.table("marketing_leads").select("*").in_("id", ids).execute()
        by_id = {str(r["id"]): r for r in (lr.data or [])}
    except Exception as e:
        logger.exception("admin bulk send: load leads")
        return {
            "ok": False,
            "error": str(e),
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "errors": [],
            "hints": [str(e)],
        }

    camp_cache: dict[str, dict[str, Any]] = {}

    def load_campaign(cid: str) -> dict[str, Any] | None:
        if cid in camp_cache:
            return camp_cache[cid]
        try:
            r = supabase.table("marketing_campaigns").select("*").eq("id", cid).limit(1).execute()
            row = (r.data or [None])[0]
            if isinstance(row, dict):
                camp_cache[cid] = row
                return row
        except Exception as e:
            logger.warning("admin bulk send: load campaign %s: %s", cid, e)
        return None

    cron_run_id: str | None = None

    for lid in ids:
        lead = by_id.get(lid)
        if not lead:
            errors.append(f"{lid}: lead not found")
            continue
        email = (lead.get("email") or "").strip().lower()
        if not email:
            errors.append(f"{lid}: missing email")
            continue
        if lead.get("lead_status_internal") != "pending":
            errors.append(f"{email}: send status must be pending (got {lead.get('lead_status_internal')})")
            continue
        if lead.get("sanitization_status") != "accepted":
            errors.append(f"{email}: review must be accepted (got {lead.get('sanitization_status')})")
            continue
        raw_cid = lead.get("campaign_id")
        if not raw_cid:
            errors.append(f"{email}: assign a campaign before sending")
            continue
        cid = str(raw_cid)
        campaign = load_campaign(cid)
        if not campaign:
            errors.append(f"{email}: campaign not found")
            continue
        if campaign.get("is_paused"):
            cname = campaign.get("name") or cid
            errors.append(f"{email}: campaign {cname!r} is paused — activate it or reassign the contact.")
            continue

        if is_suppressed(supabase, email):
            skipped += 1
            record_send(
                supabase,
                lead_id=str(lead["id"]),
                campaign_id=cid,
                cron_run_id=cron_run_id,
                status="skipped",
                error_message="suppressed",
                subject_snapshot=None,
                body_html_snapshot=None,
            )
            continue

        token = ensure_unsubscribe_token(lead)
        if token != lead.get("unsubscribe_token"):
            try:
                supabase.table("marketing_leads").update({"unsubscribe_token": token}).eq("id", lead["id"]).execute()
                lead["unsubscribe_token"] = token
            except Exception:
                pass

        use_ai = bool(campaign.get("use_ai"))
        use_crew = bool(campaign.get("use_crew_ai"))

        try:
            subj, html, text = render_message_for_lead(
                lead=lead,
                campaign=campaign,
                use_ai=use_ai,
                use_crew_ai=use_crew,
            )
        except Exception as ge:
            failed += 1
            record_send(
                supabase,
                lead_id=str(lead["id"]),
                campaign_id=cid,
                cron_run_id=cron_run_id,
                status="failed",
                error_message=f"render: {ge}"[:2000],
                subject_snapshot=None,
                body_html_snapshot=None,
            )
            log_error(
                supabase,
                severity="error",
                message=str(ge)[:2000],
                context={"lead_id": str(lead["id"]), "campaign_id": cid, "source": "admin_bulk_send"},
            )
            continue

        ok = send_tracked_marketing_and_record(
            supabase,
            to_email=email,
            lead_id=str(lead["id"]),
            campaign_id=cid,
            cron_run_id=cron_run_id,
            subj=subj,
            html=html,
            text=text,
        )
        if ok:
            sent += 1
            try:
                supabase.table("marketing_leads").update(
                    {
                        "lead_status_internal": "sent",
                        "last_sent_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", lead["id"]).execute()
            except Exception:
                pass
        else:
            failed += 1

        delay_sec = int(campaign.get("min_delay_seconds") or 0)
        if delay_sec > 0:
            time.sleep(min(delay_sec, 60))

    if sent == 0 and failed == 0 and skipped == 0 and not errors:
        hints.append(
            "Nothing was sent — rows must be pending, review accepted, on an active campaign, and not suppressed."
        )
    elif sent == 0 and failed > 0:
        hints.append("SMTP or email-service failed — verify server configuration.")

    return {
        "ok": True,
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "errors": errors[:40],
        "hints": hints,
    }
