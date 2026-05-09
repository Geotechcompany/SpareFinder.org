"""AI sanitization and outbound email generation for marketing (OpenAI + optional CrewAI)."""

from __future__ import annotations

import json
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Literal

from crewai import Agent, Crew, Task
from langchain_openai import ChatOpenAI
from openai import OpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class SanitizeResult(BaseModel):
    sanitized_full_name: str = ""
    sanitized_job_title: str = ""
    sanitized_company_name: str = ""
    sanitized_notes: str = ""
    sanitization_status: Literal["accepted", "review", "rejected"] = "review"
    crew_trace: str = ""


class EmailContent(BaseModel):
    subject: str = ""
    html: str = ""
    text: str = ""


class ExtractedLeadFields(BaseModel):
    email: str = ""
    full_name: str = ""
    job_title: str = ""
    company_name: str = ""
    platform: str = ""


def _openai_client() -> OpenAI:
    key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        raise ValueError("OPENAI_API_KEY not configured")
    return OpenAI(api_key=key)


_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


def _heuristic_email_from_row(row: dict[str, Any]) -> str:
    for v in row.values():
        if not isinstance(v, str):
            continue
        match = _EMAIL_RE.search(v.strip())
        if match:
            return match.group(0).strip().lower()
    return ""


def extract_lead_fields_from_csv_row(raw_row: dict[str, Any]) -> ExtractedLeadFields:
    """
    AI extraction for messy CSV rows.
    Falls back to heuristic email extraction when AI is unavailable or fails.
    """
    heuristic_email = _heuristic_email_from_row(raw_row)
    key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        return ExtractedLeadFields(email=heuristic_email)

    client = _openai_client()
    model = os.getenv("MARKETING_SANITIZE_MODEL", "gpt-4o-mini")
    payload = json.dumps(raw_row, ensure_ascii=False)[:12000]
    system = (
        "Extract lead fields from CSV row JSON. "
        "Return JSON ONLY with keys: email, full_name, job_title, company_name, platform. "
        "If unknown, return empty string. Never invent an email."
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0.0,
            max_tokens=300,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": payload},
            ],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        email = str(data.get("email") or "").strip().lower()
        if not email:
            email = heuristic_email
        return ExtractedLeadFields(
            email=email,
            full_name=str(data.get("full_name") or "").strip(),
            job_title=str(data.get("job_title") or "").strip(),
            company_name=str(data.get("company_name") or "").strip(),
            platform=str(data.get("platform") or "").strip(),
        )
    except Exception as e:
        logger.warning("extract_lead_fields_from_csv_row fallback: %s", e)
        return ExtractedLeadFields(email=heuristic_email)


def auto_extract_email_from_csv_row(raw_row: dict[str, Any]) -> str:
    """
    Automatic email extraction pipeline for CSV rows.
    Priority:
    1) AI extraction result
    2) Regex heuristic from raw row text
    """
    extracted = extract_lead_fields_from_csv_row(raw_row)
    email = (extracted.email or "").strip().lower()
    if email:
        return email
    return _heuristic_email_from_row(raw_row).strip().lower()


def sanitize_lead_with_openai(raw_payload: dict[str, Any], *, fast_path: bool = True) -> SanitizeResult:
    """
    Normalize messy CSV/Serp rows into structured fields + gatekeeper status.
    Uses JSON mode for reliability.
    """
    client = _openai_client()
    model = os.getenv("MARKETING_SANITIZE_MODEL", "gpt-4o-mini")
    user_payload = json.dumps(raw_payload, ensure_ascii=False)[:12000]

    system = (
        "You are a B2B lead data normalizer for SpareFinder (industrial spare parts SaaS). "
        "Given raw lead JSON, produce structured fields. "
        "sanitization_status: accepted = clearly usable; review = missing email or ambiguous; rejected = fake/spam/disposable pattern. "
        "Never invent an email address. "
        "Return ONLY JSON matching keys: sanitized_full_name, sanitized_job_title, sanitized_company_name, "
        "sanitization_status (accepted|review|rejected), sanitized_notes (short), crew_trace (one-line summary)."
    )
    if fast_path:
        system += " Prefer accepted when email looks like a real business domain."

    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        max_tokens=500,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_payload},
        ],
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return SanitizeResult(
            sanitization_status="review",
            sanitized_notes="AI parse failed",
            crew_trace="json_parse_error",
        )

    status = str(data.get("sanitization_status") or "review").lower()
    if status not in ("accepted", "review", "rejected"):
        status = "review"

    return SanitizeResult(
        sanitized_full_name=str(data.get("sanitized_full_name") or "")[:500],
        sanitized_job_title=str(data.get("sanitized_job_title") or "")[:500],
        sanitized_company_name=str(data.get("sanitized_company_name") or "")[:500],
        sanitized_notes=str(data.get("sanitized_notes") or "")[:2000],
        sanitization_status=status,  # type: ignore[arg-type]
        crew_trace=str(data.get("crew_trace") or "openai_sanitize")[:2000],
    )


def generate_email_with_openai(
    *,
    lead_context: dict[str, Any],
    campaign_brief: str,
    compliance_footer_html: str,
) -> EmailContent:
    """Single-call outbound generation with honesty guardrails."""
    client = _openai_client()
    model = os.getenv("MARKETING_OUTBOUND_MODEL", "gpt-4o-mini")
    ctx = json.dumps(lead_context, ensure_ascii=False)[:8000]

    system = (
        "You write concise B2B cold outreach for SpareFinder. "
        "Rules: no false financial incentives, no fake payouts, no government/bank impersonation. "
        "Include a professional tone. Output JSON with keys subject, html, text. "
        "HTML must be a simple fragment (no full document). "
        "The compliance footer HTML will be appended by the system — you may reference that an unsubscribe link exists."
    )
    user = {
        "campaign_brief": campaign_brief,
        "lead": ctx,
        "compliance_footer_html_snippet": compliance_footer_html[:2000],
        "product": "SpareFinder helps teams identify industrial spare parts from photos and discover suppliers.",
    }

    resp = client.chat.completions.create(
        model=model,
        temperature=0.65,
        max_tokens=1200,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ],
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return EmailContent(subject="SpareFinder for your spare parts workflow", html="<p></p>", text="")

    return EmailContent(
        subject=str(data.get("subject") or "")[:300],
        html=str(data.get("html") or "")[:50000],
        text=str(data.get("text") or "")[:20000],
    )


def generate_email_with_crew(
    *,
    lead_context: dict[str, Any],
    campaign_brief: str,
    merge_preview: str,
) -> EmailContent:
    """
    Multi-agent CrewAI path (strategist → copywriter). Final task returns JSON in text.
    """
    if not (os.getenv("OPENAI_API_KEY") or "").strip():
        raise ValueError("OPENAI_API_KEY not configured")

    llm = ChatOpenAI(model=os.getenv("MARKETING_CREW_MODEL", "gpt-4o-mini"), temperature=0.5)

    strategist = Agent(
        role="Messaging strategist",
        goal="Pick one honest angle for outreach using lead + brief only.",
        backstory="You focus on industrial procurement and spare parts problems. No hype, no fake rewards.",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )
    copywriter = Agent(
        role="Email copywriter",
        goal="Produce subject + HTML fragment + plain text for email as JSON.",
        backstory="You write clear B2B email copy. Output valid JSON only in the final answer.",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    ctx_text = json.dumps(lead_context, ensure_ascii=False)[:6000]
    task1 = Task(
        description=f"Campaign brief:\n{campaign_brief}\n\nLead context:\n{ctx_text}\n\n"
        "Summarize the single best messaging angle in 3-5 short bullets. No JSON yet.",
        agent=strategist,
        expected_output="Short bullet list",
    )
    task2 = Task(
        description="Using the strategist output and this merge-resolved HTML preview (for tone only):\n"
        f"{merge_preview[:4000]}\n\n"
        'Return a single JSON object (and nothing else) with keys: "subject", "html", "text". '
        "HTML is a simple fragment. No false financial claims.",
        agent=copywriter,
        expected_output='JSON: {"subject":"...","html":"...","text":"..."}',
        context=[task1],
    )

    crew = Crew(agents=[strategist, copywriter], tasks=[task1, task2], verbose=False)

    def _run() -> str:
        return str(crew.kickoff())

    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(_run)
        result_text = future.result(timeout=120)

    try:
        start = result_text.find("{")
        end = result_text.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(result_text[start : end + 1])
            return EmailContent(
                subject=str(data.get("subject") or "")[:300],
                html=str(data.get("html") or "")[:50000],
                text=str(data.get("text") or "")[:20000],
            )
    except Exception as e:
        logger.warning("Crew outbound JSON parse failed: %s", e)

    raise ValueError("crew_output_not_json")
