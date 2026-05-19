"""
Reject uploads and keyword searches that are not manufacturing / industrial spare parts.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

# User-facing copy
REJECT_IMAGE_MESSAGE = (
    "This image doesn't appear to show a manufacturing or industrial spare part. "
    "Please upload a clear photo of a component, part, or equipment spare "
    "(e.g. bearing, motor, sensor, pump, circuit board, automotive body part)."
)
REJECT_KEYWORDS_MESSAGE = (
    "Your search doesn't appear to be about a manufacturing or industrial spare part. "
    "Use part names, OEM numbers, equipment models, or component descriptions "
    "(e.g. \"SKF 6205 bearing\", \"hydraulic pump seal kit\")."
)
REJECT_COMBINED_MESSAGE = (
    "SpareFinder only analyzes manufacturing and industrial spare parts. "
    "Please provide a part image and/or keywords that describe a component or spare."
)
REJECT_IDENTIFIED_SUBJECT_MESSAGE = (
    "SpareFinder only analyzes manufacturing and industrial spare parts. "
    "We identified “{subject}” — please upload a clear photo of a component or spare "
    "(e.g. bearing, motor, sensor, pump, seal, circuit board, industrial fitting)."
)


class NonManufacturingPartError(Exception):
    """Raised when vision/identification shows the subject is not a spare part."""

    def __init__(self, message: str, detected_subject: Optional[str] = None):
        super().__init__(message)
        self.detected_subject = detected_subject

MIN_KEYWORD_CHARS = 2
MAX_KEYWORD_CHARS = 500
MIN_IMAGE_BYTES = 4_000
MAX_IMAGE_BYTES = 12 * 1024 * 1024

# Fast pre-filter before LLM (whole-word, case-insensitive)
_NON_PART_KEYWORD_RE = re.compile(
    r"\b("
    r"cat|cats|kitten|kittens|dog|dogs|puppy|puppies|pet|pets|animal|animals|"
    r"meme|memes|selfie|selfies|food|pizza|burger|recipe|cooking|"
    r"football|soccer|basketball|sport|sports|celebrity|movie|movies|song|songs|"
    r"landscape|sunset|beach|wedding|baby|babies|portrait|face|person|people|"
    r"flower|flowers|tree|trees|nature|vacation|holiday|game|gaming|fortnite|minecraft"
    r")\b",
    re.IGNORECASE,
)

# Hints that keywords are plausibly part-related (if none match, still run LLM)
_PART_HINT_RE = re.compile(
    r"\b("
    r"part|parts|spare|spares|component|bearing|motor|pump|valve|sensor|seal|gasket|"
    r"filter|belt|gear|cylinder|actuator|relay|contactor|breaker|fuse|pcb|board|"
    r"oem|aftermarket|hydraulic|pneumatic|industrial|machinery|equipment|"
    r"compressor|coupling|impeller|nozzle|fitting|flange|bracket|housing|"
    r"bumper|grille|radiator|alternator|starter|turbo|injector|solenoid|"
    r")\b|[A-Z]{2,5}[-\s]?\d{2,}|\b\d{5,}[A-Z0-9-]*\b",
    re.IGNORECASE,
)


@dataclass
class ContentValidationResult:
    is_valid: bool
    user_message: str
    detected_subject: Optional[str] = None
    source: str = "heuristic"  # heuristic | llm | skipped


def _validation_enabled() -> bool:
    flag = os.getenv("CONTENT_VALIDATION_ENABLED", "true").strip().lower()
    return flag not in ("0", "false", "no", "off")


def _openai_client() -> Optional[OpenAI]:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


def _image_mime(image_data: bytes) -> str:
    if image_data[:4] == b"\x89PNG":
        return "image/png"
    if image_data[:2] == b"\xff\xd8":
        return "image/jpeg"
    if image_data[:4] == b"GIF8":
        return "image/gif"
    if image_data[:4] == b"RIFF" and len(image_data) > 12 and image_data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _heuristic_keywords(keywords: Optional[str]) -> Optional[ContentValidationResult]:
    if not keywords or not str(keywords).strip():
        return None
    text = str(keywords).strip()
    if len(text) < MIN_KEYWORD_CHARS:
        return ContentValidationResult(False, REJECT_KEYWORDS_MESSAGE, "too_short", "heuristic")
    if len(text) > MAX_KEYWORD_CHARS:
        return ContentValidationResult(
            False,
            f"Keywords must be under {MAX_KEYWORD_CHARS} characters.",
            "too_long",
            "heuristic",
        )
    if _NON_PART_KEYWORD_RE.search(text):
        return ContentValidationResult(
            False,
            REJECT_KEYWORDS_MESSAGE,
            _NON_PART_KEYWORD_RE.search(text).group(0),
            "heuristic",
        )
    return None


def _llm_validate_keywords(keywords: str) -> ContentValidationResult:
    client = _openai_client()
    if not client:
        # No API key: rely on heuristics + part hints
        if _PART_HINT_RE.search(keywords):
            return ContentValidationResult(True, "", None, "skipped")
        return ContentValidationResult(
            False,
            REJECT_KEYWORDS_MESSAGE,
            "unverified",
            "heuristic",
        )

    prompt = f"""You gate a spare-parts identification service (manufacturing, industrial, automotive components).

Query: "{keywords}"

Reply with JSON only:
{{
  "is_spare_part_query": true or false,
  "detected_subject": "short label e.g. hydraulic pump seal / cat photo / pizza",
  "reason": "one sentence for internal logs"
}}

Accept: part names, OEM numbers, equipment models, industrial/automotive component descriptions.
Reject: animals, people, food, entertainment, memes, general trivia, unrelated consumer goods, landscapes."""

    try:
        response = client.chat.completions.create(
            model=os.getenv("CONTENT_VALIDATION_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        if data.get("is_spare_part_query") is True:
            return ContentValidationResult(True, "", data.get("detected_subject"), "llm")
        return ContentValidationResult(
            False,
            REJECT_KEYWORDS_MESSAGE,
            data.get("detected_subject"),
            "llm",
        )
    except Exception as exc:
        logger.warning("Keyword LLM validation failed: %s", exc)
        if _PART_HINT_RE.search(keywords):
            return ContentValidationResult(True, "", None, "skipped")
        return ContentValidationResult(
            False,
            REJECT_KEYWORDS_MESSAGE,
            None,
            "heuristic",
        )


def validate_keywords(keywords: str) -> ContentValidationResult:
    if not _validation_enabled():
        return ContentValidationResult(True, "", None, "skipped")

    text = (keywords or "").strip()
    if not text:
        return ContentValidationResult(False, REJECT_KEYWORDS_MESSAGE, "empty", "heuristic")

    blocked = _heuristic_keywords(text)
    if blocked:
        return blocked

    if _PART_HINT_RE.search(text) and len(text.split()) <= 12:
        # Short, obvious part queries skip LLM for speed/cost
        return ContentValidationResult(True, "", None, "heuristic")

    return _llm_validate_keywords(text)


def _llm_validate_image(image_data: bytes) -> ContentValidationResult:
    client = _openai_client()
    if not client:
        logger.warning("Image validation skipped: OPENAI_API_KEY not set")
        return ContentValidationResult(True, "", None, "skipped")

    b64 = base64.b64encode(image_data).decode("utf-8")
    mime = _image_mime(image_data)

    prompt = """You gate uploads for a manufacturing/industrial/automotive SPARE PART identification service.

Look at the image. Reply with JSON only:
{
  "is_spare_part_image": true or false,
  "detected_subject": "short label e.g. ball bearing / cat / person selfie / pizza",
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence for internal logs"
}

ACCEPT (is_spare_part_image=true):
- Individual components, parts, assemblies sold for repair (bearings, motors, pumps, valves, sensors, seals, PCBs, fittings, automotive body/mechanical parts as parts, industrial equipment components).

REJECT (is_spare_part_image=false):
- Animals, pets, people, selfies, food, drinks, landscapes, buildings, memes, screenshots, documents-only, whole vehicles without focus on a specific replaceable part, random household items, clothing, toys unrelated to industrial parts.

When uncertain but the main subject is clearly a part/component, accept. When clearly not a part, reject."""

    try:
        response = client.chat.completions.create(
            model=os.getenv("CONTENT_VALIDATION_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=250,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        confidence = str(data.get("confidence", "medium")).lower()
        is_part = data.get("is_spare_part_image") is True
        if is_part and confidence in ("high", "medium"):
            return ContentValidationResult(True, "", data.get("detected_subject"), "llm")
        if is_part and confidence == "low":
            return ContentValidationResult(True, "", data.get("detected_subject"), "llm")
        return ContentValidationResult(
            False,
            REJECT_IMAGE_MESSAGE,
            data.get("detected_subject"),
            "llm",
        )
    except Exception as exc:
        logger.error("Image LLM validation failed: %s", exc)
        return ContentValidationResult(
            False,
            "We could not verify this image. Please try again with a clear photo of a spare part.",
            None,
            "heuristic",
        )


def validate_image_upload_preflight(image_data: bytes) -> ContentValidationResult:
    """Size checks only — subject validation runs after vision identifies the part."""
    if not _validation_enabled():
        return ContentValidationResult(True, "", None, "skipped")

    if not image_data or len(image_data) < MIN_IMAGE_BYTES:
        return ContentValidationResult(
            False,
            "Image is too small or empty. Upload a clear photo of the part (at least a few KB).",
            "too_small",
            "heuristic",
        )
    if len(image_data) > MAX_IMAGE_BYTES:
        return ContentValidationResult(
            False,
            "Image is too large. Maximum size is 12 MB.",
            "too_large",
            "heuristic",
        )
    return ContentValidationResult(True, "", None, "skipped")


def validate_image(image_data: bytes) -> ContentValidationResult:
    if not _validation_enabled():
        return ContentValidationResult(True, "", None, "skipped")

    if not image_data or len(image_data) < MIN_IMAGE_BYTES:
        return ContentValidationResult(
            False,
            "Image is too small or empty. Upload a clear photo of the part (at least a few KB).",
            "too_small",
            "heuristic",
        )
    if len(image_data) > MAX_IMAGE_BYTES:
        return ContentValidationResult(
            False,
            "Image is too large. Maximum size is 12 MB.",
            "too_large",
            "heuristic",
        )

    return _llm_validate_image(image_data)


def _llm_validate_identified_part(identification_text: str) -> ContentValidationResult:
    client = _openai_client()
    text = (identification_text or "").strip()
    if not text:
        return ContentValidationResult(
            False,
            "Could not identify a part from this image. Try a clearer photo of the component.",
            "empty",
            "heuristic",
        )
    if not client:
        logger.warning("Identified-part validation skipped: OPENAI_API_KEY not set")
        return ContentValidationResult(True, "", None, "skipped")

    prompt = f"""You gate a manufacturing / industrial SPARE PART identification service.

An AI vision step already analyzed an upload. Use this identification text:

---
{text[:6000]}
---

Reply with JSON only:
{{
  "is_manufacturing_spare_part": true or false,
  "identified_part_name": "short label e.g. SKF 6205 bearing / Mazda front grille / cat / pizza / whole car",
  "detected_subject": "same as identified_part_name or shorter",
  "reason": "one sentence for internal logs"
}}

ACCEPT (is_manufacturing_spare_part=true):
- Individual industrial, machinery, or equipment spare components.
- Automotive replacement parts shown as an isolated component (bearing, brake pad, sensor, pump, seal, filter, alternator, etc.).
- Clear focus on a purchasable repair part, not lifestyle/marketing imagery.

REJECT (is_manufacturing_spare_part=false):
- Whole vehicles, car exteriors marketed as a car (brand grille photo, full car, showroom shot).
- Animals, people, selfies, food, drinks, landscapes, memes, screenshots, documents-only.
- Random consumer goods unrelated to industrial/MRO spare parts.
- When the main subject is not a discrete component or spare for manufacturing/industrial use."""

    try:
        response = client.chat.completions.create(
            model=os.getenv("CONTENT_VALIDATION_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=220,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        subject = (
            data.get("identified_part_name")
            or data.get("detected_subject")
            or "unknown subject"
        )
        if data.get("is_manufacturing_spare_part") is True:
            return ContentValidationResult(True, "", str(subject), "llm")
        msg = REJECT_IDENTIFIED_SUBJECT_MESSAGE.format(subject=str(subject))
        return ContentValidationResult(False, msg, str(subject), "llm")
    except Exception as exc:
        logger.warning("Identified-part LLM validation failed: %s", exc)
        return ContentValidationResult(True, "", None, "skipped")


def validate_identified_part(identification_text: str) -> ContentValidationResult:
    """After vision/part identification — reject non-manufacturing subjects."""
    if not _validation_enabled():
        return ContentValidationResult(True, "", None, "skipped")
    return _llm_validate_identified_part(identification_text)


def validate_upload_content(
    *,
    image_data: Optional[bytes] = None,
    keywords: Optional[str] = None,
) -> ContentValidationResult:
    """Validate image upload (and optional keywords) before starting crew analysis."""
    if not _validation_enabled():
        return ContentValidationResult(True, "", None, "skipped")

    kw = (keywords or "").strip()
    if kw:
        kw_result = validate_keywords(kw)
        if not kw_result.is_valid:
            return kw_result

    if image_data:
        return validate_image_upload_preflight(image_data)

    if kw:
        return validate_keywords(kw)

    return ContentValidationResult(False, REJECT_COMBINED_MESSAGE, "empty", "heuristic")
