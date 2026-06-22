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


def _polish_generated_email_copy(subject: str, html: str, text: str) -> tuple[str, str, str]:
    """Fix common model slip-ups before merge or send."""

    def _one(s: str) -> str:
        if not s:
            return s
        s = re.sub(
            r"\babout\s+SpareFinder\s+can\s+support\b",
            "about how SpareFinder can support",
            s,
            flags=re.IGNORECASE,
        )
        s = re.sub(
            r"\bdiscussion\s+about\s+SpareFinder\s+can\b",
            "discussion about how SpareFinder can",
            s,
            flags=re.IGNORECASE,
        )
        for old, new in (
            ("[Your Name]", "The SpareFinder team"),
            ("[your name]", "The SpareFinder team"),
            ("[Your Position]", ""),
            ("[your position]", ""),
            ("[Your Title]", ""),
            ("[your title]", ""),
        ):
            s = s.replace(old, new)
        s = s.replace("Example Corp", "{{company}}")
        s = re.sub(r"\bExample\s+Corp\b", "{{company}}", s, flags=re.IGNORECASE)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip()

    return _one(subject), _one(html), _one(text)


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
        "You write concise B2B cold outreach for SpareFinder (industrial spare parts: identify parts from photos, find suppliers). "
        "Rules: no false financial incentives, no fake payouts, no government/bank impersonation. Honest, professional tone. "
        "Output JSON only with keys subject, html, text. "
        "HTML: body fragment only (no <html> document). Wrap the letter in ONE outer "
        '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.55;'
        'color:#0f172a;max-width:560px">…</div>. '
        'Use <p style="margin:0 0 14px"> for paragraphs. '
        "Include one clear call-to-action as a single rounded button-style link, e.g. "
        '<a href="{{frontend_url}}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;'
        'border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">See how SpareFinder works</a> '
        "(label may vary but must stay truthful). "
        "For the reader's company and name use merge tokens {{company}}, {{first_name}}, {{job_title}} where appropriate — "
        "never hard-code fake companies like Example Corp or Acme. "
        "Signature: end with Best regards, then a line The SpareFinder team — do NOT use [Your Name], [Your Position], or any bracket placeholders. "
        "Grammar must be correct, e.g. write 'about how SpareFinder can support…', never 'about SpareFinder can support…'. "
        "A short compliance footer is appended by the system; do not add long legal blocks."
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

    subj, html_out, txt = _polish_generated_email_copy(
        str(data.get("subject") or ""),
        str(data.get("html") or ""),
        str(data.get("text") or ""),
    )
    return EmailContent(subject=subj[:300], html=html_out[:50000], text=txt[:20000])


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
        "HTML is a styled fragment (outer div, paragraphs, one CTA button-link). Use {{company}} and {{first_name}}; "
        "no [Your Name] or Example Corp. Sign off as The SpareFinder team. No false financial claims.",
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
            subj, html_out, txt = _polish_generated_email_copy(
                str(data.get("subject") or ""),
                str(data.get("html") or ""),
                str(data.get("text") or ""),
            )
            return EmailContent(subject=subj[:300], html=html_out[:50000], text=txt[:20000])
    except Exception as e:
        logger.warning("Crew outbound JSON parse failed: %s", e)

    raise ValueError("crew_output_not_json")


def generate_serp_discovery_queries(
    *,
    country_code: str,
    country_name: str,
    count: int = 8,
    extra_context: str | None = None,
    exclude_queries: list[str] | None = None,
) -> list[str]:
    """
    AI-generated Google search strings for SerpAPI B2B discovery (SpareFinder / industrial parts).
    """
    client = _openai_client()
    model = os.getenv("MARKETING_SANITIZE_MODEL", "gpt-4o-mini")
    cc = (country_code or "").strip().lower()[:4] or "global"
    cn = (country_name or "").strip()[:120] or cc.upper()
    n = max(5, min(int(count), 15))
    extra = (extra_context or "").strip()[:800]
    excluded: list[str] = []
    seen_exclude: set[str] = set()
    for raw in exclude_queries or []:
        s = str(raw).strip()
        if not s:
            continue
        key = " ".join(s.lower().split())
        if key in seen_exclude:
            continue
        seen_exclude.add(key)
        excluded.append(s[:200])
        if len(excluded) >= 40:
            break
    user_obj = {
        "country_code": cc,
        "country_label": cn,
        "count": n,
        "product": "SpareFinder — identify industrial spare parts from photos and find suppliers faster.",
        "notes": extra,
        "do_not_repeat_queries": excluded,
    }
    exclude_hint = ""
    if excluded:
        exclude_hint = (
            " Do NOT repeat or closely paraphrase any string in do_not_repeat_queries — invent new angles, "
            "industries, job titles, and keyword combinations."
        )
    system = (
        f"You produce {n} DISTINCT Google web search queries to find B2B leads (companies or roles) who care about "
        "industrial spare parts, MRO, maintenance, procurement, asset reliability, or fleet operations. "
        f"Geography focus: {cn} (region code hint: {cc}). "
        "Each query must be a short string suitable for Google's search box (no bullet prefixes). "
        "Mix angles: procurement + industry, maintenance + sector, OEM parts, plant engineering, distributors, etc. "
        "Stay factual; no scams or illegal angles."
        f"{exclude_hint} "
        f'Return JSON ONLY: {{"queries": ["...", ...]}} with exactly {n} unique non-empty strings.'
    )
    resp = client.chat.completions.create(
        model=model,
        temperature=0.8,
        max_tokens=900,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_obj, ensure_ascii=False)},
        ],
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    arr = data.get("queries")
    if not isinstance(arr, list):
        return []
    out: list[str] = []
    for item in arr:
        s = str(item).strip()
        if not s:
            continue
        key = " ".join(s.lower().split())
        if key in seen_exclude:
            continue
        if s not in out:
            out.append(s)
        if len(out) >= n:
            break
    return out[:n]
