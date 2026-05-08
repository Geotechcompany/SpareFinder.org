"""Rule-based lead validation before AI sanitization."""

from __future__ import annotations

import re
from typing import Any

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
