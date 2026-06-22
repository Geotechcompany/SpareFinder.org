"""Rule-based and batched lead sanitization for marketing outbound."""

from __future__ import annotations

import logging
from typing import Any

from .marketing_crew import SanitizeResult, sanitize_lead_with_openai
from .marketing_rules import is_disposable_domain, is_valid_email, normalize_email

logger = logging.getLogger(__name__)


def _pick_str(raw: dict[str, Any], *keys: str) -> str:
    for key in keys:
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def rule_based_sanitize_lead(raw: dict[str, Any], *, email: str) -> SanitizeResult:
    """
    Fast sanitization without OpenAI.
    Valid non-disposable business emails are auto-accepted for outbound automation.
    """
    em = normalize_email(email) or ""
    if not em or not is_valid_email(em):
        return SanitizeResult(
            sanitization_status="rejected",
            sanitized_notes="Invalid or missing email",
            crew_trace="rule:invalid_email",
        )
    if is_disposable_domain(em):
        return SanitizeResult(
            sanitization_status="rejected",
            sanitized_notes="Disposable email domain",
            crew_trace="rule:disposable_domain",
        )

    full_name = _pick_str(raw, "full_name", "FULL_NAME", "sanitized_full_name")
    job_title = _pick_str(raw, "job_title", "JOB_TITLE", "sanitized_job_title")
    company = _pick_str(raw, "company_name", "COMPANY_NAME", "sanitized_company_name")

    return SanitizeResult(
        sanitized_full_name=full_name[:500],
        sanitized_job_title=job_title[:500],
        sanitized_company_name=company[:500],
        sanitized_notes="Auto-accepted: valid business email",
        sanitization_status="accepted",
        crew_trace="rule_based_accept",
    )


def finalize_sanitization_result(
    *,
    email: str,
    raw: dict[str, Any],
    result: SanitizeResult,
) -> SanitizeResult:
    """Promote AI 'review' leads with valid business emails to accepted."""
    if result.sanitization_status != "review":
        return result
    promoted = rule_based_sanitize_lead(raw, email=email)
    if promoted.sanitization_status != "accepted":
        return result
    return SanitizeResult(
        sanitized_full_name=(result.sanitized_full_name or promoted.sanitized_full_name)[:500],
        sanitized_job_title=(result.sanitized_job_title or promoted.sanitized_job_title)[:500],
        sanitized_company_name=(result.sanitized_company_name or promoted.sanitized_company_name)[:500],
        sanitized_notes=(result.sanitized_notes or promoted.sanitized_notes)[:2000],
        sanitization_status="accepted",
        crew_trace="auto_accept_valid_email",
    )


def apply_sanitize_result_to_payload(payload: dict[str, Any], result: SanitizeResult) -> None:
    payload["sanitized_full_name"] = result.sanitized_full_name or None
    payload["sanitized_job_title"] = result.sanitized_job_title or None
    payload["sanitized_company_name"] = result.sanitized_company_name or None
    payload["sanitized_notes"] = result.sanitized_notes or None
    payload["sanitization_status"] = result.sanitization_status
    payload["crew_trace"] = (result.crew_trace or "")[:2000]


def sanitize_lead_for_storage(
    raw: dict[str, Any],
    *,
    email: str,
    run_sanitize: bool,
    use_openai_enrichment: bool = False,
) -> SanitizeResult:
    """
    Single entry for inserts/imports.
    Default: rule-based accept (fast, automated). Optional OpenAI enrichment when requested.
    """
    if not run_sanitize:
        return rule_based_sanitize_lead(raw, email=email)

    rule = rule_based_sanitize_lead(raw, email=email)
    if rule.sanitization_status == "rejected":
        return rule

    if not use_openai_enrichment:
        return rule

    try:
        ai = sanitize_lead_with_openai(raw, fast_path=True)
        ai = finalize_sanitization_result(email=email, raw=raw, result=ai)
        if ai.sanitization_status == "rejected":
            return ai
        return SanitizeResult(
            sanitized_full_name=(ai.sanitized_full_name or rule.sanitized_full_name)[:500],
            sanitized_job_title=(ai.sanitized_job_title or rule.sanitized_job_title)[:500],
            sanitized_company_name=(ai.sanitized_company_name or rule.sanitized_company_name)[:500],
            sanitized_notes=(ai.sanitized_notes or rule.sanitized_notes)[:2000],
            sanitization_status="accepted",
            crew_trace=(ai.crew_trace or rule.crew_trace)[:2000],
        )
    except Exception as exc:
        logger.warning("sanitize_lead_for_storage OpenAI failed, using rule path: %s", exc)
        return rule
