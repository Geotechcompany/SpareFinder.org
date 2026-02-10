"""Support ticket routes for authenticated users."""

from __future__ import annotations

import os
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


# ---------- Pydantic models ----------


class CreateTicketBody(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    priority: str = Field(default="medium", pattern=r"^(low|medium|high)$")


# ---------- Notify all admins of new ticket ----------


def _get_admin_emails() -> list[str]:
    """Return list of email addresses for all admin and super_admin profiles."""
    fallback = _env("ADMIN_NOTIFY_EMAIL") or _env("CONTACT_TO_EMAIL") or ""
    try:
        supabase = get_supabase_admin()
        res = (
            supabase.table("profiles")
            .select("email")
            .in_("role", ["admin", "super_admin"])
            .execute()
        )
        emails = []
        for row in (res.data or []):
            e = (row.get("email") or "").strip()
            if e and "@" in e and e not in emails:
                emails.append(e)
        if emails:
            return emails
    except Exception as e:
        logger.warning("Could not fetch admin emails from profiles: %s", e)
    if fallback:
        return [fallback]
    return []


def _notify_admin_new_ticket(
    *,
    ticket_id: str,
    subject: str,
    message: str,
    user_email: str,
    user_name: str | None,
    priority: str,
) -> None:
    """Send new-ticket notification email to all admins (and fallback address if no admins in DB)."""
    admin_emails = _get_admin_emails()
    if not admin_emails:
        logger.warning("No admin emails found (profiles with role admin/super_admin or ADMIN_NOTIFY_EMAIL); skipping new-ticket notification")
        return
    frontend = _env("FRONTEND_URL", "https://sparefinder.org").rstrip("/")
    admin_tickets_url = f"{frontend}/admin/tickets"
    try:
        from ..email_sender import send_basic_email_smtp, send_email_via_email_service

        subject_email = f"[SpareFinder] New support ticket: {subject[:50]}{'…' if len(subject) > 50 else ''}"
        html = f"""
<h2>New support ticket</h2>
<p><strong>Ticket ID:</strong> {ticket_id}</p>
<p><strong>From:</strong> {user_name or '—'} &lt;{user_email}&gt;</p>
<p><strong>Subject:</strong> {subject}</p>
<p><strong>Priority:</strong> {priority}</p>
<hr/>
<p style="white-space: pre-wrap">{message[:2000]}</p>
<p><a href="{admin_tickets_url}">Open tickets in admin</a></p>
"""
        text = (
            f"New support ticket\n\n"
            f"Ticket ID: {ticket_id}\n"
            f"From: {user_name or '—'} <{user_email}>\n"
            f"Subject: {subject}\n"
            f"Priority: {priority}\n\n"
            f"{message[:2000]}\n\n"
            f"Open tickets: {admin_tickets_url}\n"
        )
        sent = 0
        for to_email in admin_emails:
            ok = send_basic_email_smtp(to_email=to_email, subject=subject_email, html=html, text=text)
            if not ok:
                ok = send_email_via_email_service(to_email=to_email, subject=subject_email, html=html, text=text)
            if ok:
                sent += 1
        if sent:
            logger.info("New ticket %s notification sent to %d admin(s)", ticket_id, sent)
        else:
            logger.warning("Failed to send new-ticket notification to any admin")
    except Exception as e:
        logger.exception("Error sending new-ticket notification: %s", e)


# ---------- User endpoints ----------


@router.post("")
async def create_ticket(
    payload: CreateTicketBody,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Create a new support ticket. Notifies admin by email."""
    try:
        supabase = get_supabase_admin()
        row = {
            "user_id": user.id,
            "subject": payload.subject.strip(),
            "message": payload.message.strip(),
            "status": "open",
            "priority": payload.priority,
        }
        res = supabase.table("support_tickets").insert(row).select("id, subject, status, created_at").execute()
        if not res.data or len(res.data) == 0:
            return api_error("Failed to create ticket", status_code=500)
        ticket = res.data[0]
        ticket_id = ticket.get("id")
        if ticket_id:
            _notify_admin_new_ticket(
                ticket_id=str(ticket_id),
                subject=payload.subject.strip(),
                message=payload.message.strip(),
                user_email=user.email,
                user_name=user.full_name,
                priority=payload.priority,
            )
        return api_ok(data=ticket, message="Ticket created. We'll get back to you soon.")
    except Exception as e:
        logger.exception("Create ticket error: %s", e)
        return api_error("Failed to create ticket", status_code=500)


@router.get("")
async def list_my_tickets(
    user: CurrentUser = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    status: str | None = Query(None),
) -> dict[str, Any]:
    """List current user's tickets."""
    try:
        supabase = get_supabase_admin()
        offset = (page - 1) * limit
        q = (
            supabase.table("support_tickets")
            .select("id, subject, status, priority, created_at, updated_at", count="exact")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if status and status.strip() and status.strip().lower() in ("open", "in_progress", "answered", "closed"):
            q = q.eq("status", status.strip().lower())
        res = q.execute()
        tickets = res.data or []
        total = getattr(res, "count", None)
        if total is None:
            total = len(tickets)
        return api_ok(data={"tickets": tickets, "total": total, "page": page, "limit": limit})
    except Exception as e:
        logger.exception("List tickets error: %s", e)
        return api_error("Failed to list tickets", status_code=500)


@router.get("/{ticket_id}")
async def get_my_ticket(
    ticket_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Get one ticket by id (must belong to current user)."""
    try:
        supabase = get_supabase_admin()
        res = (
            supabase.table("support_tickets")
            .select("id, subject, message, status, priority, admin_notes, created_at, updated_at")
            .eq("id", ticket_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return api_ok(data=res.data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Get ticket error: %s", e)
        return api_error("Failed to load ticket", status_code=500)
