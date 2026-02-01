from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field

from ..email_sender import send_basic_email_smtp, send_email_via_email_service
from .auth_dependencies import CurrentUser, get_current_user
from .errors import ApiError
from .responses import api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _send_email(*, to_email: str, subject: str, html: str, text: str) -> bool:
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if ok:
        return True
    return send_email_via_email_service(to_email=to_email, subject=subject, html=html, text=text)


def _require_subscription_or_trial(*, user_id: str) -> None:
    supabase = get_supabase_admin()
    sub = (
        supabase.table("subscriptions")
        .select("tier, status, current_period_end")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
        .data
    )
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
    _require_subscription_or_trial(user_id=user.user_id)

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
    to_sales = _env("REVIEWS_TO_EMAIL", _env("CONTACT_TO_EMAIL", "sales@tpsinternational.co.uk"))
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
    job_type: str = Field(pattern=r"^(image|keyword|both)$")
    part_search_id: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    feedback_type: Optional[str] = None
    helpful_features: Optional[list[str]] = None
    improvement_suggestions: Optional[str] = None


@router.get("/analysis")
async def list_analysis_reviews(user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    rows = (
        supabase.table("analysis_reviews")
        .select("*")
        .eq("user_id", user.user_id)
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

    try:
        inserted = (
            supabase.table("analysis_reviews")
            .insert(
                [
                    {
                        "user_id": user.user_id,
                        "job_id": payload.job_id,
                        "job_type": payload.job_type,
                        "part_search_id": payload.part_search_id or None,
                        "rating": payload.rating,
                        "comment": payload.comment,
                        "feedback_type": feedback_type,
                        "helpful_features": payload.helpful_features,
                        "improvement_suggestions": payload.improvement_suggestions,
                    }
                ]
            )
            .select("*")
            .single()
            .execute()
            .data
        )
        return api_ok(status_code=201, message="Review submitted successfully!", data=inserted)
    except Exception as e:
        # Match frontend UX: return 200 with error="duplicate" so client can show dedicated toast.
        msg = str(e)
        if "23505" in msg or "duplicate" in msg.lower() or "unique" in msg.lower():
            return api_ok(status_code=200, data=None, extra={"success": False, "error": "duplicate", "message": "You have already reviewed this analysis"})
        raise


@router.delete("/analysis/{reviewId}")
async def delete_analysis_review(reviewId: str, user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    supabase.table("analysis_reviews").delete().eq("id", reviewId).eq("user_id", user.user_id).execute()
    return api_ok(message="Review deleted successfully")




