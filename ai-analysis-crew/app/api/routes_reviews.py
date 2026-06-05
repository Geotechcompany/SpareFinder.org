from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from starlette.concurrency import run_in_threadpool

from ..email_sender import send_basic_email_smtp, send_email_via_email_service
from ..sparefinder_contact import CONTACT_EMAIL
from .auth_dependencies import CurrentUser, get_current_user
from .errors import ApiError
from .responses import api_error, api_ok
from .subscription_utils import pick_best_subscription_row
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _send_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if ok:
        return True
    return send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)


def _normalize_job_type(value: str | None) -> str:
    mode = (value or "image").lower().strip()
    if mode == "both":
        return "both"
    if mode in ("keyword", "keywords", "keywords_only"):
        return "keyword"
    return "image"


def _normalize_part_search_id(value: str | None) -> str | None:
    if not value or not str(value).strip():
        return None
    try:
        return str(uuid.UUID(str(value).strip()))
    except (ValueError, AttributeError):
        return None


def _exception_text(exc: Exception) -> str:
    parts = [str(exc)]
    for attr in ("message", "details", "hint", "code"):
        val = getattr(exc, attr, None)
        if val:
            parts.append(str(val))
    for arg in getattr(exc, "args", ()) or ():
        if arg:
            parts.append(str(arg))
    return " ".join(parts).lower()


def _insert_analysis_review_row(supabase: Any, row: dict[str, Any]) -> dict[str, Any] | None:
    """Insert review row; avoid .single() which can fail with postgrest-py 2.x."""
    res = supabase.table("analysis_reviews").insert([row]).execute()
    data = res.data or []
    if data and isinstance(data[0], dict):
        return data[0]

    lookup = (
        supabase.table("analysis_reviews")
        .select("*")
        .eq("user_id", row["user_id"])
        .eq("job_id", row["job_id"])
        .limit(1)
        .execute()
    )
    rows = lookup.data or []
    return rows[0] if rows and isinstance(rows[0], dict) else None


def _analysis_review_error_response(exc: Exception) -> JSONResponse:
    msg = _exception_text(exc)
    if "23505" in msg or "duplicate" in msg or "unique" in msg:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "error": "duplicate",
                "message": "You have already reviewed this analysis",
            },
        )
    if "analysis_reviews" in msg and (
        "does not exist" in msg
        or "schema cache" in msg
        or "42p01" in msg
        or "pgrst205" in msg
        or "could not find the table" in msg
    ):
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "reviews_not_configured",
                "message": "Reviews are not configured on the server. Run docs/sql/create_analysis_reviews.sql in Supabase.",
            },
        )
    if "23503" in msg or "foreign key" in msg:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "profile_link_failed",
                "message": "Could not save review for your account. Please try again or contact support.",
            },
        )
    if "23514" in msg or "check constraint" in msg:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "invalid_review",
                "message": "Invalid review data. Please check your rating and try again.",
            },
        )
    print(f"❌ create_analysis_review: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "review_save_failed",
            "message": "Failed to submit review",
        },
    )


def _require_subscription_or_trial(*, user_id: str) -> None:
    supabase = get_supabase_admin()
    sub_res = (
        supabase.table("subscriptions")
        .select("tier, status, current_period_end")
        .eq("user_id", user_id)
        .execute()
    )
    sub = pick_best_subscription_row(sub_res.data or [])
    if not sub:
        raise ApiError(
            status_code=403,
            error="Subscription required",
            message="You need an active subscription or trial to write reviews. Please upgrade your plan to continue.",
        )
    status = str(sub.get("status") or "")
    if status not in ("active", "trialing"):
        raise ApiError(
            status_code=403,
            error="Subscription expired",
            message="Your subscription has expired. Please renew your subscription to write reviews.",
        )
    cpe = sub.get("current_period_end")
    try:
        if not cpe or datetime.fromisoformat(str(cpe).replace("Z", "+00:00")) <= datetime.utcnow():
            raise ApiError(
                status_code=403,
                error="Subscription expired",
                message="Your subscription has expired. Please renew your subscription to write reviews.",
            )
    except ApiError:
        raise
    except Exception:
        # If parsing fails, be conservative.
        raise ApiError(
            status_code=403,
            error="Subscription expired",
            message="Your subscription has expired. Please renew your subscription to write reviews.",
        )


class PublicReviewBody(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=100)
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=5, max_length=200)
    message: str = Field(min_length=10, max_length=2000)


@router.get("", name="list_public_reviews")
async def list_public_reviews(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    res = (
        supabase.table("reviews")
        .select("*", count="exact")
        .eq("published", True)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    reviews = res.data or []
    total = int(getattr(res, "count", None) or len(reviews))

    # Stats
    ratings_res = (
        supabase.table("reviews")
        .select("rating")
        .eq("published", True)
        .execute()
    )
    ratings = ratings_res.data or []
    avg = (sum(int(r.get("rating") or 0) for r in ratings) / len(ratings)) if ratings else 0.0

    return api_ok(
        data={
            "reviews": reviews,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": max(1, (total + limit - 1) // limit),
            },
            "stats": {"averageRating": round(avg, 1), "totalReviews": total},
        }
    )


@router.get("/stats")
async def public_review_stats():
    supabase = get_supabase_admin()
    res = supabase.table("reviews").select("rating").eq("published", True).execute()
    ratings = res.data or []
    total = len(ratings)
    avg = (sum(int(r.get("rating") or 0) for r in ratings) / total) if total else 0.0

    distribution = []
    for rating in [1, 2, 3, 4, 5]:
        count = sum(1 for r in ratings if int(r.get("rating") or 0) == rating)
        pct = int(round((count / total) * 100)) if total else 0
        distribution.append({"rating": rating, "count": count, "percentage": pct})

    return api_ok(data={"totalReviews": total, "averageRating": round(avg, 1), "ratingDistribution": distribution})


@router.post("")
async def submit_public_review(payload: PublicReviewBody, user: CurrentUser = Depends(get_current_user)):
    _require_subscription_or_trial(user_id=user.id)

    supabase = get_supabase_admin()
    now = datetime.utcnow().isoformat()

    inserted = (
        supabase.table("reviews")
        .insert(
            [
                {
                    "name": payload.name.strip(),
                    "email": str(payload.email).strip().lower(),
                    "company": payload.company.strip() if payload.company else None,
                    "rating": payload.rating,
                    "title": payload.title.strip(),
                    "message": payload.message.strip(),
                    "published": True,
                    "verified": False,
                    "created_at": now,
                }
            ]
        )
        .select("*")
        .single()
        .execute()
        .data
    )

    # Notify sales (best-effort)
    to_sales = _env("REVIEWS_TO_EMAIL", _env("CONTACT_TO_EMAIL", CONTACT_EMAIL))
    subject = f"New Customer Review: {payload.rating} stars - {payload.title.strip()}"
    html_sales = f"""
<h2>New Customer Review</h2>
<p><strong>Rating:</strong> {payload.rating}/5</p>
<p><strong>Name:</strong> {payload.name}</p>
<p><strong>Email:</strong> {payload.email}</p>
<p><strong>Company:</strong> {payload.company or "Not provided"}</p>
<p><strong>Title:</strong> {payload.title}</p>
<hr/>
<p style="white-space: pre-wrap">{payload.message}</p>
<p style="color:#64748b;font-size:12px">Review ID: {inserted.get("id")}</p>
"""
    text_sales = (
        "New Customer Review\n\n"
        f"Rating: {payload.rating}/5\n"
        f"Name: {payload.name}\n"
        f"Email: {payload.email}\n"
        f"Company: {payload.company or 'Not provided'}\n"
        f"Title: {payload.title}\n\n"
        f"{payload.message}\n\n"
        f"Review ID: {inserted.get('id')}\n"
    )
    email_sent = _send_email(to_email=to_sales, subject=subject, html=html_sales, text=text_sales)

    # Confirmation email (best-effort)
    try:
        frontend_url = _env("FRONTEND_URL", "https://sparefinder.org")
        confirm_subject = "Thank you for your review - SpareFinder"
        html_user = f"""
<p>Hi {payload.name.strip()},</p>
<p>Thank you for taking the time to review SpareFinder. Your feedback helps us improve.</p>
<p><strong>Rating:</strong> {payload.rating}/5</p>
<p><strong>Title:</strong> {payload.title.strip()}</p>
<p>You can view reviews here: <a href="{frontend_url}/reviews">{frontend_url}/reviews</a></p>
<p>— SpareFinder Team</p>
"""
        text_user = (
            f"Hi {payload.name.strip()},\n\n"
            "Thank you for taking the time to review SpareFinder. Your feedback helps us improve.\n\n"
            f"Rating: {payload.rating}/5\n"
            f"Title: {payload.title.strip()}\n\n"
            f"View reviews: {frontend_url}/reviews\n\n"
            "— SpareFinder Team\n"
        )
        _send_email(to_email=str(payload.email), subject=confirm_subject, html=html_user, text=text_user)
    except Exception:
        pass

    return api_ok(
        status_code=201,
        message="Review submitted successfully! Thank you for your feedback.",
        data={
            "review": {"id": inserted.get("id"), "rating": payload.rating, "title": payload.title.strip(), "submittedAt": inserted.get("created_at") or now},
            "emailSent": email_sent,
        },
    )


# -----------------------
# Analysis reviews (authenticated)
# -----------------------


class AnalysisReviewCreateBody(BaseModel):
    job_id: str = Field(min_length=1, max_length=255)
    job_type: str = Field(min_length=1, max_length=32)
    part_search_id: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    feedback_type: Optional[str] = None
    helpful_features: Optional[list[str]] = None
    improvement_suggestions: Optional[str] = None

    @field_validator("job_type", mode="before")
    @classmethod
    def normalize_job_type(cls, value: Any) -> str:
        return _normalize_job_type(str(value) if value is not None else None)


@router.get("/analysis")
async def list_analysis_reviews(user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    rows = (
        supabase.table("analysis_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    # Frontend expects `result.data?.data || []`
    return api_ok(data={"data": rows})


@router.post("/analysis")
async def create_analysis_review(payload: AnalysisReviewCreateBody, user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()

    # Soft validation for feedback_type (keep backwards compatible if UI changes)
    allowed_feedback = {"accuracy", "speed", "usability", "general"}
    feedback_type = payload.feedback_type if payload.feedback_type in allowed_feedback else (payload.feedback_type or None)
    part_search_id = _normalize_part_search_id(payload.part_search_id)
    helpful_features = payload.helpful_features if payload.helpful_features else []

    row = {
        "user_id": user.id,
        "job_id": payload.job_id.strip(),
        "job_type": _normalize_job_type(payload.job_type),
        "part_search_id": part_search_id,
        "rating": payload.rating,
        "comment": payload.comment,
        "feedback_type": feedback_type,
        "helpful_features": helpful_features,
        "improvement_suggestions": payload.improvement_suggestions,
    }

    try:
        inserted = await run_in_threadpool(
            lambda: _insert_analysis_review_row(supabase, row)
        )
        if not inserted:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "review_save_failed",
                    "message": "Review was not saved",
                },
            )
        return JSONResponse(
            status_code=201,
            content=api_ok(
                message="Review submitted successfully!",
                data=inserted,
            ),
        )
    except Exception as e:
        return _analysis_review_error_response(e)


@router.delete("/analysis/{reviewId}")
async def delete_analysis_review(reviewId: str, user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    supabase.table("analysis_reviews").delete().eq("id", reviewId).eq("user_id", user.id).execute()
    return api_ok(message="Review deleted successfully")




