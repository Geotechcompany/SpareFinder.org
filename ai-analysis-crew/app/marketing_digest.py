"""Daily marketing digest email to admins."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from .email_sender import send_basic_email_smtp, send_email_via_email_service

logger = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _get_admin_emails(supabase: Any) -> list[str]:
    fallback = _env("ADMIN_NOTIFY_EMAIL") or _env("CONTACT_TO_EMAIL") or ""
    try:
        res = (
            supabase.table("profiles")
            .select("email")
            .in_("role", ["admin", "super_admin"])
            .execute()
        )
        emails: list[str] = []
        for row in res.data or []:
            e = (row.get("email") or "").strip()
            if e and "@" in e and e not in emails:
                emails.append(e)
        if emails:
            return emails
    except Exception as e:
        logger.warning("digest admin emails: %s", e)
    if fallback:
        return [fallback]
    return []


def run_marketing_digest(supabase: Any) -> dict[str, Any]:
    """Summarize yesterday (UTC) marketing activity and email admins."""
    now = datetime.now(timezone.utc)
    day_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_start = day_end - timedelta(days=1)

    summary_lines: list[str] = []

    try:
        new_leads = (
            supabase.table("marketing_leads")
            .select("id", count="exact")
            .gte("created_at", day_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .execute()
        )
        nl = int(getattr(new_leads, "count", None) or 0)
    except Exception:
        nl = 0

    try:
        sends_ok = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "sent")
            .gte("sent_at", day_start.isoformat())
            .lt("sent_at", day_end.isoformat())
            .execute()
        )
        s_ok = int(getattr(sends_ok, "count", None) or 0)
    except Exception:
        s_ok = 0

    try:
        sends_fail = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "failed")
            .gte("created_at", day_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .execute()
        )
        s_fail = int(getattr(sends_fail, "count", None) or 0)
    except Exception:
        s_fail = 0

    try:
        unsubs = (
            supabase.table("marketing_unsubscribes")
            .select("id", count="exact")
            .gte("unsubscribed_at", day_start.isoformat())
            .lt("unsubscribed_at", day_end.isoformat())
            .execute()
        )
        u_ct = int(getattr(unsubs, "count", None) or 0)
    except Exception:
        u_ct = 0

    summary_lines.append("--- Yesterday (UTC calendar day) ---")
    summary_lines.append(f"Window (UTC): {day_start.isoformat()} → {day_end.isoformat()}")
    summary_lines.append(f"New leads: {nl}")
    summary_lines.append(f"Sends (sent): {s_ok}")
    summary_lines.append(f"Sends (failed): {s_fail}")
    summary_lines.append(f"New marketing unsubscribes: {u_ct}")

    # Rolling 7 days (UTC) so quiet single days still show useful context
    week_start = day_end - timedelta(days=7)
    try:
        w_leads = (
            supabase.table("marketing_leads")
            .select("id", count="exact")
            .gte("created_at", week_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .execute()
        )
        w_nl = int(getattr(w_leads, "count", None) or 0)
    except Exception:
        w_nl = 0
    try:
        w_sent = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "sent")
            .gte("sent_at", week_start.isoformat())
            .lt("sent_at", day_end.isoformat())
            .execute()
        )
        w_ok = int(getattr(w_sent, "count", None) or 0)
    except Exception:
        w_ok = 0
    try:
        w_fail = (
            supabase.table("marketing_sends")
            .select("id", count="exact")
            .eq("status", "failed")
            .gte("created_at", week_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .execute()
        )
        w_f = int(getattr(w_fail, "count", None) or 0)
    except Exception:
        w_f = 0
    try:
        w_un = (
            supabase.table("marketing_unsubscribes")
            .select("id", count="exact")
            .gte("unsubscribed_at", week_start.isoformat())
            .lt("unsubscribed_at", day_end.isoformat())
            .execute()
        )
        w_u = int(getattr(w_un, "count", None) or 0)
    except Exception:
        w_u = 0

    summary_lines.append("")
    summary_lines.append(f"--- Last 7 days (UTC): {week_start.isoformat()} → {day_end.isoformat()} ---")
    summary_lines.append(f"New leads: {w_nl}")
    summary_lines.append(f"Sends (sent): {w_ok}")
    summary_lines.append(f"Sends (failed): {w_f}")
    summary_lines.append(f"Marketing unsubscribes: {w_u}")
    summary_lines.append("")
    summary_lines.append(
        "Note: Yesterday counts only rows whose timestamps fall inside that UTC day. "
        "If you imported/sent outside that window, yesterday can be 0 while the 7-day block still shows activity."
    )

    body_html = "<h2>SpareFinder marketing digest</h2><pre style='font-family:system-ui'>" + "\n".join(
        summary_lines
    ) + "</pre>"

    recipients = _get_admin_emails(supabase)
    if not recipients:
        return {"ok": True, "emailed": 0, "message": "no admin emails", "stats": summary_lines}

    subj = f"SpareFinder marketing digest — {day_start.date()}"
    ok_count = 0
    for to in recipients:
        ok = send_basic_email_smtp(to_email=to, subject=subj, html=body_html, text="\n".join(summary_lines))
        if not ok:
            ok = bool(
                send_email_via_email_service(
                    to_email=to, subject=subj, html=body_html, text="\n".join(summary_lines)
                )
            )
        if ok:
            ok_count += 1

    return {"ok": True, "emailed": ok_count, "recipients": len(recipients), "stats": summary_lines}
