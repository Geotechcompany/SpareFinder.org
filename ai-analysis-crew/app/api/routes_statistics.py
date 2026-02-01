"""Statistics and user analytics routes."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok, api_error
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("")
async def get_statistics(user: CurrentUser = Depends(get_current_user)):
    """
    Get user statistics including total uploads, success rate, etc.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Try to get from user_statistics table first
        stats_result = supabase.table("user_statistics").select("*").eq("user_id", user_id).execute()

        if stats_result.data and len(stats_result.data) > 0:
            statistics = stats_result.data[0]
            return api_ok(statistics=statistics)

        # If not found, calculate from part_searches
        searches_result = supabase.table("part_searches").select("*").eq("user_id", user_id).execute()

        if not searches_result.data or len(searches_result.data) == 0:
            # Return default statistics
            return api_ok(
                statistics={
                    "user_id": user_id,
                    "total_uploads": 0,
                    "successful_uploads": 0,
                    "failed_uploads": 0,
                    "avg_confidence_score": 0,
                    "avg_processing_time": 0,
                    "total_web_scraping_used": 0,
                    "updated_at": datetime.now().isoformat(),
                }
            )

        searches = searches_result.data
        total_uploads = len(searches)
        successful_uploads = len([s for s in searches if s.get("analysis_status") == "completed"])
        failed_uploads = len([s for s in searches if s.get("analysis_status") == "failed"])

        # Calculate averages
        confidence_scores = [s.get("confidence_score", 0) for s in searches if s.get("confidence_score")]
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0

        processing_times = [s.get("processing_time", 0) for s in searches if s.get("processing_time")]
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

        web_scraping_used = len([s for s in searches if s.get("web_scraping_used")])

        statistics = {
            "user_id": user_id,
            "total_uploads": total_uploads,
            "successful_uploads": successful_uploads,
            "failed_uploads": failed_uploads,
            "avg_confidence_score": round(avg_confidence, 2),
            "avg_processing_time": round(avg_processing_time, 2),
            "total_web_scraping_used": web_scraping_used,
            "updated_at": datetime.now().isoformat(),
        }

        return api_ok(statistics=statistics)

    except Exception as e:
        print(f"❌ Error fetching statistics: {e}")
        return api_error("Failed to fetch statistics", status_code=500)


@router.post("/refresh")
async def refresh_statistics(user: CurrentUser = Depends(get_current_user)):
    """
    Refresh user statistics by recalculating from part_searches.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get all searches for the user
        searches_result = supabase.table("part_searches").select("*").eq("user_id", user_id).execute()

        if not searches_result.data:
            return api_ok(message="No data to refresh")

        searches = searches_result.data
        total_uploads = len(searches)
        successful_uploads = len([s for s in searches if s.get("analysis_status") == "completed"])
        failed_uploads = len([s for s in searches if s.get("analysis_status") == "failed"])

        confidence_scores = [s.get("confidence_score", 0) for s in searches if s.get("confidence_score")]
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0

        processing_times = [s.get("processing_time", 0) for s in searches if s.get("processing_time")]
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

        web_scraping_used = len([s for s in searches if s.get("web_scraping_used")])

        # Upsert to user_statistics table
        statistics_data = {
            "user_id": user_id,
            "total_uploads": total_uploads,
            "successful_uploads": successful_uploads,
            "failed_uploads": failed_uploads,
            "avg_confidence_score": round(avg_confidence, 2),
            "avg_processing_time": round(avg_processing_time, 2),
            "total_web_scraping_used": web_scraping_used,
            "updated_at": datetime.now().isoformat(),
        }

        supabase.table("user_statistics").upsert(statistics_data).execute()

        return api_ok(message="Statistics refreshed successfully", statistics=statistics_data)

    except Exception as e:
        print(f"❌ Error refreshing statistics: {e}")
        return api_error("Failed to refresh statistics", status_code=500)


@router.post("/check-achievements")
async def check_achievements(user: CurrentUser = Depends(get_current_user)):
    """
    Optional: check/unlock achievements for the current user.

    The frontend calls this as a best-effort background action. If you don't
    have an achievements system yet, this endpoint can be a safe no-op that
    returns success.
    """
    try:
        # Placeholder for future logic (e.g. unlock achievements, send email, write notifications).
        return api_ok(message="Achievements checked", data={"unlocked": []})
    except Exception as e:
        print(f"❌ Error checking achievements: {e}")
        return api_error("Failed to check achievements", status_code=500)

