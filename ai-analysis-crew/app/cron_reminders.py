import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Literal, Optional, TypedDict, Any

import requests

logger = logging.getLogger(__name__)

from .database_storage import SUPABASE_URL, SUPABASE_HEADERS
from .email_sender import send_email_via_email_service, send_basic_email_smtp
from .image_generator import image_generator
from .ai_email_generator import ai_email_generator
from .engagement_email_storage import store_engagement_email, update_engagement_email_status
from .unsubscribe_utils import (
    check_user_unsubscribed,
    generate_unsubscribe_token,
    create_unsubscribe_url,
)


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
    """Send an appealing reengagement email with AI-generated content and images."""
    # Check if user has unsubscribed
    if check_user_unsubscribed(to_email, "reengagement"):
        logger.info(f"⏭️ Skipping email to {to_email} - user has unsubscribed")
        return False
    
    app_url = _app_url()
    base_url = app_url.rstrip("/")
    dashboard_url = f"{base_url}/dashboard"
    upload_url = f"{base_url}/dashboard/upload"
    help_url = f"{base_url}/help"
    contact_url = f"{base_url}/contact"
    settings_url = f"{base_url}/dashboard/settings"
    logo_url = f"{base_url}/sparefinderlogo.png"
    
    # Generate unsubscribe token and URL
    unsubscribe_token = generate_unsubscribe_token()
    unsubscribe_base_url = (
        (os.getenv("AI_CREW_PUBLIC_URL") or "").strip()
        or (os.getenv("EMAIL_UNSUBSCRIBE_BASE_URL") or "").strip()
        or base_url
    )
    unsubscribe_url = create_unsubscribe_url(unsubscribe_base_url, unsubscribe_token)
    
    # Generate theme for images (random selection)
    import random
    themes = ["industrial", "parts", "maintenance", "technology"]
    theme = random.choice(themes)
    
    # Generate hero image (top of email)
    hero_image_url = image_generator.generate_reengagement_image(theme)
    
    # Generate inline image (middle of email content)
    inline_image_url = image_generator.generate_reengagement_image(theme)
    
    # If inline image generation failed, use hero image as fallback
    if not inline_image_url or inline_image_url == hero_image_url:
        # Generate a different theme for variety
        other_themes = [t for t in themes if t != theme]
        if other_themes:
            inline_theme = random.choice(other_themes)
            inline_image_url = image_generator.generate_reengagement_image(inline_theme)
        if not inline_image_url:
            inline_image_url = hero_image_url  # Fallback to hero image
    
    # Generate complete email content using AI
    try:
        email_content = ai_email_generator.generate_reengagement_email_content(
            user_name=user_name,
            hero_image_url=hero_image_url or "",
            inline_image_url=inline_image_url or "",
            dashboard_url=dashboard_url,
            upload_url=upload_url,
            help_url=help_url,
            contact_url=contact_url,
            settings_url=settings_url,
            logo_url=logo_url,
            unsubscribe_url=unsubscribe_url,
        )
        
        subject = email_content["subject"]
        html_content = email_content["html_content"]
        text_content = email_content.get("text_content", "")
        
        # Store email in database before sending
        email_id = store_engagement_email(
            user_email=to_email,
            user_name=user_name,
            email_type="reengagement",
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            hero_image_url=hero_image_url,
            inline_image_url=inline_image_url,
            image_theme=theme,
            ai_model="gpt-4o",
            dashboard_url=dashboard_url,
            upload_url=upload_url,
            help_url=help_url,
            contact_url=contact_url,
            settings_url=settings_url,
            unsubscribe_url=unsubscribe_url,
            unsubscribe_token=unsubscribe_token,
            status="generated",
        )
        
    except Exception as e:
        logger.error(f"Failed to generate AI email content: {e}")
        import traceback
        logger.error(traceback.format_exc())
        # Fallback to basic template
        year = datetime.now().year
        subject = f"Welcome back, {user_name}!"
        html_content = f"""
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      /* Light by default */
      .bg {{ background: #f8fafc !important; }}
      .card {{ background: #ffffff !important; border: 1px solid rgba(2,6,23,.08) !important; }}
      .muted {{ color: #64748b !important; }}
      .text {{ color: #0f172a !important; }}
      .link {{ color: #2563eb !important; }}
      .pill {{ background: rgba(37,99,235,.08) !important; color: #1d4ed8 !important; border: 1px solid rgba(37,99,235,.18) !important; }}
      .divider {{ border-top: 1px solid rgba(2,6,23,.10) !important; }}
      .cta {{ background: linear-gradient(135deg,#2563eb,#1d4ed8) !important; color: #ffffff !important; }}
      .subcta {{ background: #ffffff !important; color: #1d4ed8 !important; border: 1px solid rgba(29,78,216,.35) !important; }}
      /* Dark-mode overrides (supported by some clients) */
      @media (prefers-color-scheme: dark) {{
        .bg {{ background: #020617 !important; }}
        .card {{ background: #020617 !important; border: 1px solid rgba(56,189,248,.35) !important; }}
        .muted {{ color: #94a3b8 !important; }}
        .text {{ color: #e5e7eb !important; }}
        .link {{ color: #38bdf8 !important; }}
        .pill {{ background: rgba(56,189,248,.12) !important; color: #7dd3fc !important; border: 1px solid rgba(56,189,248,.30) !important; }}
        .divider {{ border-top: 1px solid rgba(31,41,55,.85) !important; }}
        .subcta {{ background: #0b1220 !important; color: #7dd3fc !important; border: 1px solid rgba(125,211,252,.35) !important; }}
      }}
    </style>
  </head>
  <body class="bg" style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="bg" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td>
          <table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" class="card" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(2,6,23,.10);border:1px solid rgba(2,6,23,.08);">
            <tr>
              <td style="padding:18px 28px 14px 28px;background:transparent;border-bottom:1px solid rgba(2,6,23,.08);" class="divider">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align:left;vertical-align:middle;">
                      <img src="{logo_url}" alt="SpareFinder" style="max-height:28px;width:auto;display:block;border-radius:6px;" />
                    </td>
                    <td style="text-align:right;vertical-align:middle;font-size:11px;" class="muted">
                      Usage reminder · Inactive account
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <img src="{hero_image_url or ''}" alt="Industrial parts" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;color:#0f172a;">Welcome back, {user_name}!</h1>
                <p style="margin:0 0 20px 0;font-size:14px;color:#64748b;">We've missed you! SpareFinder makes identifying industrial parts faster and easier.</p>
                <img src="{inline_image_url or hero_image_url or ''}" alt="Parts workflow" style="display:block;width:100%;max-width:500px;margin:20px auto;border-radius:8px;" />
                <p style="margin:20px 0;font-size:14px;color:#64748b;">Upload a photo, get instant identification, and share results with your team—all in seconds.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                  <tr>
                    <td style="padding-right:10px;">
                      <a href="{upload_url}" style="display:inline-block;text-decoration:none;padding:12px 20px;border-radius:8px;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;">
                        Start Identifying Parts
                      </a>
                    </td>
                    <td>
                      <a href="{dashboard_url}" style="display:inline-block;text-decoration:none;padding:12px 16px;border-radius:8px;background:#ffffff;color:#1d4ed8;border:1px solid rgba(29,78,216,.35);font-weight:700;font-size:14px;">
                        View Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="divider" style="padding:14px 28px 18px 28px;border-top:1px solid rgba(2,6,23,.10);">
                <p class="muted" style="margin:0 0 10px 0;font-size:12px;line-height:1.6;">
                  You're receiving this because you have a SpareFinder account.
                  Manage preferences in <a class="link" href="{settings_url}" style="text-decoration:none;">Settings</a>.
                </p>
                <p class="muted" style="margin:0;font-size:11px;line-height:1.7;">
                  <strong class="text" style="font-weight:800;">SpareFinder</strong> · {base_url}<br/>
                  Help: <a class="link" href="{help_url}" style="text-decoration:none;">{help_url}</a> · Contact: <a class="link" href="{contact_url}" style="text-decoration:none;">{contact_url}</a><br/>
                  © {year} SpareFinder. All rights reserved.
                </p>
                <p class="muted" style="margin:8px 0 0 0;font-size:11px;line-height:1.6;">
                  <a class="link" href="{unsubscribe_url}" style="text-decoration:underline;">Unsubscribe from marketing emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

        text_content = f"""Hi {user_name},

Welcome back! We've missed you. SpareFinder makes identifying industrial parts faster and easier.

Start identifying parts: {upload_url}
View dashboard: {dashboard_url}

Need help? {help_url}
Contact: {contact_url}
Manage preferences: {settings_url}

© {year} SpareFinder. All rights reserved.
{base_url}

Unsubscribe: {unsubscribe_url}"""
        email_id = None
    
    # Send email via SMTP first, then fallback to email service
    smtp_success = send_basic_email_smtp(
        to_email=to_email,
        subject=subject,
        html=html_content,
        text=text_content
    )
    
    if not smtp_success:
        smtp_success = send_email_via_email_service(
            to_email=to_email,
            subject=subject,
            html=html_content,
            text=text_content
        )
    
    # Update email status in database
    if email_id:
        if smtp_success:
            update_engagement_email_status(email_id, "sent")
        else:
            update_engagement_email_status(email_id, "failed")
    
    return smtp_success


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









