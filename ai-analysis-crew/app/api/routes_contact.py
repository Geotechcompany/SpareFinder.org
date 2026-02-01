from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field

from ..email_sender import send_basic_email_smtp, send_email_via_email_service
from .responses import api_error, api_ok

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactBody(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company: str | None = Field(default=None, max_length=100)
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=10, max_length=2000)
    inquiryType: str = Field(pattern=r"^(support|sales|billing|technical|general)$")


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _send_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    # Prefer direct SMTP; fall back to email-service.
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if ok:
        return True
    return send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)


@router.post("")
async def submit_contact_form(payload: ContactBody):
    try:
        name = payload.name.strip()
        email = str(payload.email).strip().lower()
        company = payload.company.strip() if payload.company else None
        subject = payload.subject.strip() if payload.subject else None
        message = payload.message.strip()
        inquiry_type = payload.inquiryType

        if not name or not message:
            return api_error(status_code=400, error="Validation failed", message="Invalid contact form data")

        to_sales = _env("CONTACT_TO_EMAIL", "sales@tpsinternational.co.uk")
        frontend_url = _env("FRONTEND_URL", "https://app.sparefinder.org")

        email_subject = subject and f"[{inquiry_type.upper()}] {subject}" or f"[{inquiry_type.upper()}] New Contact Form Submission"

        submitted_at = datetime.utcnow().isoformat()

        html_sales = f"""
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> {name}</p>
<p><strong>Email:</strong> {email}</p>
<p><strong>Company:</strong> {company or "Not provided"}</p>
<p><strong>Inquiry Type:</strong> {inquiry_type}</p>
<p><strong>Subject:</strong> {subject or "No subject"}</p>
<p><strong>Submitted:</strong> {submitted_at}</p>
<hr/>
<p style="white-space: pre-wrap">{message}</p>
"""
        text_sales = (
            "Contact Form Submission\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Company: {company or 'Not provided'}\n"
            f"Inquiry Type: {inquiry_type}\n"
            f"Subject: {subject or 'No subject'}\n"
            f"Submitted: {submitted_at}\n\n"
            "Message:\n"
            f"{message}\n"
        )

        email_sent = _send_email(to_email=to_sales, subject=email_subject, html=html_sales, text=text_sales)

        # Best-effort confirmation email (don't fail if this doesn't work)
        confirmation_subject = "Thank you for contacting SpareFinder"
        html_user = f"""
<p>Hi {name},</p>
<p>We’ve received your message and will respond within <strong>24 hours</strong> during business days.</p>
<p><strong>Inquiry Type:</strong> {inquiry_type}</p>
{f"<p><strong>Subject:</strong> {subject}</p>" if subject else ""}
<p>You can also visit your dashboard here: <a href="{frontend_url}/dashboard">{frontend_url}/dashboard</a></p>
<p>— SpareFinder Team</p>
"""
        text_user = (
            f"Hi {name},\n\n"
            "We’ve received your message and will respond within 24 hours during business days.\n\n"
            f"Inquiry Type: {inquiry_type}\n"
            + (f"Subject: {subject}\n" if subject else "")
            + f"\nDashboard: {frontend_url}/dashboard\n\n"
            "— SpareFinder Team\n"
        )
        try:
            _send_email(to_email=email, subject=confirmation_subject, html=html_user, text=text_user)
        except Exception:
            pass

        return api_ok(
            message="Your message has been sent successfully! We will respond within 24 hours.",
            data={"submittedAt": submitted_at, "inquiryType": inquiry_type, "emailSent": email_sent},
        )
    except Exception:
        return api_error(
            status_code=500,
            error="Internal server error",
            message=(
                "We apologize, but there was an error processing your message. "
                "Please try again or contact us directly at sales@tpsinternational.co.uk"
            ),
        )





