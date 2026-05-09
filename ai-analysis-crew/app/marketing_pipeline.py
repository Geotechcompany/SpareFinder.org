"""Marketing send pipeline: suppression, merge, AI/template, SMTP, logging."""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from .email_sender import send_basic_email_smtp, send_email_via_email_service
from .marketing_crew import EmailContent, generate_email_with_crew, generate_email_with_openai
from .marketing_merge import apply_merge, html_to_plain, lead_to_merge_dict

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
            html_out = (body.html or "").strip()
            if "{{unsubscribe_url}}" not in html_out and "{{unsubscribe_token}}" not in html_out:
                html_out = html_out + "\n" + compliance_footer
            else:
                html_out = apply_merge(html_out, ctx) + "\n" + compliance_footer
            subj = apply_merge(body.subject or "", ctx)
            text_out = body.text.strip() if body.text else html_to_plain(html_out)
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
    try:
        supabase.table("marketing_sends").insert(payload).execute()
    except Exception as e:
        logger.error("Failed to record marketing_sends: %s", e)


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

            ok = send_marketing_email(to_email=email, subject=subj, html=html, text=text)
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
                record_send(
                    supabase,
                    lead_id=str(lead["id"]),
                    campaign_id=str(cid),
                    cron_run_id=run_id or None,
                    status="sent",
                    error_message=None,
                    subject_snapshot=subj[:500],
                    body_html_snapshot=html[:50000],
                )
            else:
                failed += 1
                remaining_global -= 1
                budget -= 1
                record_send(
                    supabase,
                    lead_id=str(lead["id"]),
                    campaign_id=str(cid),
                    cron_run_id=run_id or None,
                    status="failed",
                    error_message="smtp/email service failed",
                    subject_snapshot=subj[:500],
                    body_html_snapshot=None,
                )

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
            "lead_status_internal=pending, sanitization_status=accepted, and a non-empty email."
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
        "diagnostics": {
            "unpaused_campaigns": n_camp,
            "campaigns_with_send_budget": campaigns_with_budget,
            "pending_accepted_candidates_seen": candidates_considered,
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
