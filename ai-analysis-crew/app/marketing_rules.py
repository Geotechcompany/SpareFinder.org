"""Rule-based lead validation before AI sanitization."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

_DISPOSABLE_DOMAINS = frozenset(
    {
        "mailinator.com",
        "guerrillamail.com",
        "tempmail.com",
        "throwaway.email",
        "yopmail.com",
        "trashmail.com",
    }
)


def is_valid_email(email: str | None) -> bool:
    if not email or not isinstance(email, str):
        return False
    e = email.strip().lower()
    return bool(_EMAIL_RE.match(e))


def is_disposable_domain(email: str) -> bool:
    if "@" not in email:
        return False
    domain = email.strip().lower().split("@", 1)[-1]
    return domain in _DISPOSABLE_DOMAINS


LeadInsertStatus = Literal[
    "created",
    "duplicate_lead",
    "duplicate_user",
    "missing_email",
    "failed",
]


@dataclass(frozen=True)
class LeadInsertResult:
    lead: dict[str, Any] | None
    status: LeadInsertStatus


def normalize_email(email: str | None) -> str | None:
    if not email or not isinstance(email, str):
        return None
    e = email.strip().lower()
    return e if is_valid_email(e) else None


def marketing_lead_exists(
    supabase: Any,
    email: str,
    *,
    exclude_lead_id: str | None = None,
) -> bool:
    """True if this email already exists on marketing_leads (case-insensitive)."""
    em = normalize_email(email)
    if not em:
        return False
    exclude = (exclude_lead_id or "").strip() or None
    try:
        exact = (
            supabase.table("marketing_leads")
            .select("id")
            .eq("email", em)
            .limit(1)
            .execute()
        )
        for row in exact.data or []:
            if exclude and str(row.get("id")) == exclude:
                continue
            return True
        loose = (
            supabase.table("marketing_leads")
            .select("id,email")
            .ilike("email", em)
            .limit(5)
            .execute()
        )
        for row in loose.data or []:
            if exclude and str(row.get("id")) == exclude:
                continue
            if (str(row.get("email") or "").strip().lower()) == em:
                return True
    except Exception:
        return False
    return False


def app_user_exists_for_email(supabase: Any, email: str) -> bool:
    """True if a SpareFinder profile already uses this email."""
    em = normalize_email(email)
    if not em:
        return False
    try:
        exact = (
            supabase.table("profiles")
            .select("id")
            .eq("email", em)
            .limit(1)
            .execute()
        )
        if exact.data:
            return True
        loose = (
            supabase.table("profiles")
            .select("id,email")
            .ilike("email", em)
            .limit(5)
            .execute()
        )
        for row in loose.data or []:
            if (str(row.get("email") or "").strip().lower()) == em:
                return True
    except Exception:
        return False
    return False


def normalize_row(raw: dict[str, Any]) -> dict[str, Any]:
    """Trim string fields; lowercase email."""
    out = dict(raw)
    for key in ("email", "FULL_NAME", "full_name", "JOB_TITLE", "job_title", "COMPANY_NAME", "company_name"):
        if key in out and isinstance(out[key], str):
            out[key] = out[key].strip()
    em = out.get("email") or out.get("EMAIL")
    if isinstance(em, str):
        out["email"] = em.strip().lower()
    return out
