import os
import asyncio
from datetime import datetime, timedelta
from typing import Literal, Optional, TypedDict, Any

import requests

from .database_storage import SUPABASE_URL, SUPABASE_HEADERS
from .email_sender import send_email_via_email_service


class ProfileRow(TypedDict, total=False):
    id: str
    email: str
    full_name: str
    created_at: str
    updated_at: str


def _app_url() -> str:
    return (os.getenv("SPAREFINDER_APP_URL") or "https://sparefinder.org").strip().rstrip("/")


def _admin_email() -> str:
    return (os.getenv("CRON_ADMIN_EMAIL") or "arthurbreck417@gmail.com").strip()


def _cron_token() -> str:
    return (os.getenv("CRON_TOKEN") or "").strip()


def _require_cron_token_or_none(*, token: Optional[str]) -> bool:
    """If CRON_TOKEN is set, require it; otherwise allow unauthenticated."""
    expected = _cron_token()
    if not expected:
        return True
    return (token or "").strip() == expected


def _fetch_profiles_for_onboarding(*, days_after_signup: int, limit: int) -> list[ProfileRow]:
    now = datetime.utcnow()
    cutoff_start = now - timedelta(days=days_after_signup + 1)
    cutoff_end = now - timedelta(days=days_after_signup)

    if not SUPABASE_URL:
        return []

    url = f"{SUPABASE_URL}/rest/v1/profiles"
    params = {
        "select": "id,email,full_name,created_at",
        "created_at": f"gte.{cutoff_start.isoformat()}",
        "created_at": f"lte.{cutoff_end.isoformat()}",
        "order": "created_at.asc",
        "limit": str(limit),
    }
    # NOTE: Python dict can't have duplicate keys; use PostgREST AND by using separate params keys:
    # created_at=gte...&created_at=lte... is not representable in dict; use full URL query string instead.
    # We build it manually.
    qs = (
        f"select=id,email,full_name,created_at"
        f"&created_at=gte.{cutoff_start.isoformat()}"
        f"&created_at=lte.{cutoff_end.isoformat()}"
        f"&order=created_at.asc"
        f"&limit={limit}"
    )
    res = requests.get(f"{url}?{qs}", headers=SUPABASE_HEADERS, timeout=15)
    res.raise_for_status()
    data = res.json()
    return data if isinstance(data, list) else []


def _fetch_profiles_for_reengagement(*, inactive_days: int, limit: int) -> list[ProfileRow]:
    now = datetime.utcnow()
    inactive_cutoff = now - timedelta(days=inactive_days)

    if not SUPABASE_URL:
        return []

    url = f"{SUPABASE_URL}/rest/v1/profiles"
    qs = (
        f"select=id,email,full_name,updated_at"
        f"&updated_at=lte.{inactive_cutoff.isoformat()}"
        f"&order=updated_at.asc"
        f"&limit={limit}"
    )
    res = requests.get(f"{url}?{qs}", headers=SUPABASE_HEADERS, timeout=15)
    res.raise_for_status()
    data = res.json()
    return data if isinstance(data, list) else []


def _send_onboarding_email(*, to_email: str, user_name: str) -> bool:
    app_url = _app_url()
    subject = "Welcome to SpareFinder — try your first part search"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <p>Hi {user_name},</p>
      <p>Thanks for signing up for <strong>SpareFinder</strong>.</p>
      <p>Upload a part photo or enter keywords and we’ll help identify it and find suppliers.</p>
      <p><a href="{app_url}" target="_blank" rel="noreferrer">Start a new search</a></p>
      <p>— SpareFinder Team</p>
    </div>
    """.strip()
    text = f"Hi {user_name},\n\nThanks for signing up for SpareFinder.\nStart a new search: {app_url}\n\n— SpareFinder Team"
    return send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)


def _send_reengagement_email(*, to_email: str, user_name: str) -> bool:
    app_url = _app_url()
    subject = "Need help finding a part? SpareFinder is ready"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <p>Hi {user_name},</p>
      <p>Quick reminder: if you’re still looking for a part, SpareFinder can help.</p>
      <p><a href="{app_url}" target="_blank" rel="noreferrer">Open SpareFinder</a></p>
      <p>— SpareFinder Team</p>
    </div>
    """.strip()
    text = f"Hi {user_name},\n\nIf you’re still looking for a part, SpareFinder can help: {app_url}\n\n— SpareFinder Team"
    return send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)


async def run_cron_reminders_background(
    *,
    reminder_type: Literal["onboarding", "reengagement"],
    days_after_signup: int,
    inactive_days: int,
    limit: int,
) -> dict[str, Any]:
    now = datetime.utcnow()
    sent = 0
    failed = 0

    if reminder_type == "onboarding":
        profiles = _fetch_profiles_for_onboarding(days_after_signup=days_after_signup, limit=limit)
        for p in profiles:
            email = (p.get("email") or "").strip()
            if not email:
                continue
            name = (p.get("full_name") or (email.split("@")[0] if "@" in email else "there")).strip()
            ok = _send_onboarding_email(to_email=email, user_name=name)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

        summary = {
            "type": reminder_type,
            "processed": len(profiles),
            "sent": sent,
            "failed": failed,
            "runAt": now.isoformat(),
        }

    else:
        profiles = _fetch_profiles_for_reengagement(inactive_days=inactive_days, limit=limit)
        for p in profiles:
            email = (p.get("email") or "").strip()
            if not email:
                continue
            name = (p.get("full_name") or (email.split("@")[0] if "@" in email else "there")).strip()
            ok = _send_reengagement_email(to_email=email, user_name=name)
            sent += 1 if ok else 0
            failed += 0 if ok else 1

        summary = {
            "type": reminder_type,
            "processed": len(profiles),
            "sent": sent,
            "failed": failed,
            "inactiveDays": inactive_days,
            "runAt": now.isoformat(),
        }

    # Admin summary (best-effort)
    admin_email = _admin_email()
    if admin_email:
        send_email_via_email_service(
            to_email=admin_email,
            subject=f"SpareFinder cron – {reminder_type} reminders ({sent}/{summary['processed']})",
            html=f"<pre>{summary}</pre>",
            text=str(summary),
        )

    return summary









