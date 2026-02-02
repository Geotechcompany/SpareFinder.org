"""Dashboard routes for stats, analytics, and activities."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok, api_error
from .supabase_admin import get_supabase_admin
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Redis cache TTL for stats (seconds) when REDIS_URL is set
STATS_CACHE_TTL = 30


@router.get("/stats")
async def get_dashboard_stats(user: CurrentUser = Depends(get_current_user)):
    """
    Get dashboard statistics for the current user.
    Returns total uploads, successful uploads, average confidence, etc.
    When REDIS_URL is set, responses are cached briefly to keep API fast under load.
    """
    try:
        user_id = user.id
        cache_key = f"dashboard:stats:{user_id}"

        try:
            from ..redis_client import cache_get, cache_set, is_redis_configured
            if is_redis_configured():
                cached = cache_get(cache_key)
                if cached is not None:
                    return api_ok(data=cached)
        except ImportError:
            pass

        supabase = get_supabase_admin()

        # This app stores analysis jobs in `crew_analysis_jobs` (not `part_searches`).
        jobs_result = (
            supabase.table("crew_analysis_jobs")
            .select("id,status,progress,created_at,completed_at")
            .eq("user_id", user_id)
            .execute()
        )

        if not jobs_result.data:
            return api_ok(
                data={
                    "totalUploads": 0,
                    "successfulUploads": 0,
                    "failedUploads": 0,
                    "avgConfidence": 0,
                    "avgProcessTime": 0,
                    "recentSearches": [],
                }
            )

        jobs = jobs_result.data
        total_uploads = len(jobs)
        successful_uploads = len([j for j in jobs if (j.get("status") or "").lower() == "completed"])
        failed_uploads = len([j for j in jobs if (j.get("status") or "").lower() == "failed"])

        # Calculate averages:
        # - Confidence: reuse `progress` (0..100) as the UI confidence proxy.
        # - Processing time: seconds between created_at and completed_at for completed jobs.
        #   Exclude outliers (> 2 hours) so one bad/corrupt row doesn't skew overview stats.
        MAX_PROCESSING_SECONDS = 7200  # 2 hours
        confidence_scores = []
        processing_seconds = []
        for j in jobs:
            prog = j.get("progress")
            if isinstance(prog, (int, float)):
                confidence_scores.append(float(prog))
            if (j.get("status") or "").lower() == "completed" and j.get("created_at") and j.get("completed_at"):
                try:
                    created = datetime.fromisoformat(str(j["created_at"]).replace("Z", "+00:00"))
                    completed = datetime.fromisoformat(str(j["completed_at"]).replace("Z", "+00:00"))
                    delta = (completed - created).total_seconds()
                    if 0 <= delta <= MAX_PROCESSING_SECONDS:
                        processing_seconds.append(delta)
                except Exception:
                    pass

        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        avg_process_time = sum(processing_seconds) / len(processing_seconds) if processing_seconds else 0

        # Recent jobs (last 5)
        recent_searches = sorted(jobs, key=lambda x: x.get("created_at", ""), reverse=True)[:5]

        data = {
            "totalUploads": total_uploads,
            "successfulUploads": successful_uploads,
            "failedUploads": failed_uploads,
            "avgConfidence": round(avg_confidence, 2),
            "avgProcessTime": round(avg_process_time, 2),
            "recentSearches": recent_searches,
        }

        try:
            from ..redis_client import cache_set, is_redis_configured
            if is_redis_configured():
                cache_set(cache_key, data, ttl_seconds=STATS_CACHE_TTL)
        except ImportError:
            pass

        return api_ok(data=data)

    except Exception as e:
        print(f"❌ Error fetching dashboard stats: {e}")
        return api_error("Failed to fetch dashboard stats", status_code=500)


@router.get("/recent-activities")
async def get_recent_activities(
    user: CurrentUser = Depends(get_current_user),
    limit: int = Query(default=5, ge=1, le=50)
):
    """
    Get recent activities/searches for the current user.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get recent crew analysis jobs
        result = (
            supabase.table("crew_analysis_jobs")
            .select("id,keywords,status,progress,created_at,completed_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        jobs = result.data if result.data else []

        # Frontend expects `{ activities: [...] }`
        activities = []
        for j in jobs:
            activities.append(
                {
                    "id": j.get("id"),
                    "resource_type": "upload",
                    "action": "Part analysis",
                    "created_at": j.get("completed_at") or j.get("created_at"),
                    "details": {
                        "description": (j.get("keywords") or "Part analysis"),
                        "status": j.get("status"),
                        "confidence": j.get("progress"),
                    },
                }
            )

        return api_ok(data={"activities": activities})

    except Exception as e:
        print(f"❌ Error fetching recent activities: {e}")
        return api_error("Failed to fetch recent activities", status_code=500)


@router.get("/analytics")
async def get_analytics(
    user: CurrentUser = Depends(get_current_user),
    days: int = Query(default=30, ge=1, le=365)
):
    """
    Get analytics data for the specified time period.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Calculate date range
        # Use UTC boundaries to avoid timezone drift between server and client.
        end_dt = datetime.utcnow()
        start_dt = end_dt - timedelta(days=days - 1)

        # Get jobs within date range
        result = await run_in_threadpool(
            lambda: (
                supabase.table("crew_analysis_jobs")
                .select("created_at,status,progress,completed_at")
                .eq("user_id", user_id)
                .gte("created_at", start_dt.isoformat())
                .lte("created_at", end_dt.isoformat())
                .execute()
            )
        )

        jobs = result.data if result.data else []

        # Build a 0-filled time series for the last N days so the chart always has a stable x-axis.
        # Frontend expects: {date, analyzedParts, completedAnalyses, completionRate, avgConfidence, avgProcessingSeconds}
        by_date: dict[str, dict[str, Any]] = {}
        for i in range(days):
            dt = (start_dt + timedelta(days=i)).date()
            key = dt.isoformat()
            by_date[key] = {
                "date": key,
                "analyzedParts": 0,
                "completedAnalyses": 0,
                "_confidence_sum": 0.0,
                "_confidence_n": 0,
                "_processing_sum": 0.0,
                "_processing_n": 0,
            }

        for s in jobs:
            created_at = s.get("created_at")
            if not created_at:
                continue
            date_key = str(created_at).split("T")[0]
            bucket = by_date.get(date_key)
            if not bucket:
                # Out of expected window; ignore.
                continue

            bucket["analyzedParts"] += 1
            if (s.get("status") or "").lower() == "completed":
                bucket["completedAnalyses"] += 1

            conf = s.get("progress")
            if conf is not None:
                try:
                    c = float(conf)
                    if c > 0:
                        bucket["_confidence_sum"] += c
                        bucket["_confidence_n"] += 1
                except Exception:
                    pass

            # processing seconds from created_at to completed_at
            if (s.get("status") or "").lower() == "completed" and s.get("completed_at"):
                try:
                    created = datetime.fromisoformat(str(s["created_at"]).replace("Z", "+00:00"))
                    completed = datetime.fromisoformat(str(s["completed_at"]).replace("Z", "+00:00"))
                    p = (completed - created).total_seconds()
                    if p > 0:
                        bucket["_processing_sum"] += p
                        bucket["_processing_n"] += 1
                except Exception:
                    pass

        series = []
        for day in sorted(by_date.keys()):
            bucket = by_date[day]
            analyzed = int(bucket["analyzedParts"] or 0)
            completed = int(bucket["completedAnalyses"] or 0)
            completion_rate = (completed / analyzed * 100.0) if analyzed else 0.0

            avg_conf = (
                (bucket["_confidence_sum"] / bucket["_confidence_n"])
                if bucket["_confidence_n"]
                else 0.0
            )
            avg_proc = (
                (bucket["_processing_sum"] / bucket["_processing_n"])
                if bucket["_processing_n"]
                else 0.0
            )

            series.append(
                {
                    "date": day,
                    "analyzedParts": analyzed,
                    "completedAnalyses": completed,
                    "completionRate": round(completion_rate, 2),
                    "avgConfidence": round(avg_conf, 2),
                    "avgProcessingSeconds": round(avg_proc, 2),
                }
            )

        return api_ok(
            data={
                "timeRange": f"{days}d",
                "series": series,
                "summary": {
                    "totalSearches": len(jobs),
                    "successRate": (
                        len([s for s in jobs if (s.get("status") or "").lower() == "completed"]) / len(jobs) * 100
                        if jobs else 0
                    ),
                }
            }
        )

    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")
        return api_error("Failed to fetch analytics", status_code=500)


@router.get("/performance-metrics")
async def get_performance_metrics(user: CurrentUser = Depends(get_current_user)):
    """
    Get performance metrics for the current user.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get all jobs
        result = (
            supabase.table("crew_analysis_jobs")
            .select("id,status,progress,created_at,completed_at")
            .eq("user_id", user_id)
            .execute()
        )

        searches = result.data if result.data else []

        if not searches:
            return api_ok(
                data={
                    "avgProcessingTime": 0,
                    "avgConfidence": 0,
                    "successRate": 0,
                    "totalSearches": 0,
                }
            )

        # Calculate metrics (exclude processing times > 2h so outliers don't skew overview)
        MAX_PROCESSING_SECONDS = 7200
        processing_times = []
        for s in searches:
            if (s.get("status") or "").lower() == "completed" and s.get("created_at") and s.get("completed_at"):
                try:
                    created = datetime.fromisoformat(str(s["created_at"]).replace("Z", "+00:00"))
                    completed = datetime.fromisoformat(str(s["completed_at"]).replace("Z", "+00:00"))
                    delta = (completed - created).total_seconds()
                    if 0 <= delta <= MAX_PROCESSING_SECONDS:
                        processing_times.append(delta)
                except Exception:
                    pass
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

        confidence_scores = [s.get("progress", 0) for s in searches if s.get("progress") is not None]
        avg_confidence = sum(float(x) for x in confidence_scores) / len(confidence_scores) if confidence_scores else 0

        successful = len([s for s in searches if (s.get("status") or "").lower() == "completed"])
        success_rate = (successful / len(searches) * 100) if searches else 0

        return api_ok(
            data={
                "avgProcessingTime": round(avg_processing_time, 2),
                "avgConfidence": round(avg_confidence, 2),
                "successRate": round(success_rate, 2),
                "matchRate": round(success_rate, 2),
                "totalSearches": len(searches),
                "totalUploads": len(searches),
                "avgResponseTime": int(round(avg_processing_time * 1000)) if avg_processing_time else 0,
                "metrics": {
                    "fastest": round(min(processing_times), 2) if processing_times else 0,
                    "slowest": round(max(processing_times), 2) if processing_times else 0,
                    "highestConfidence": round(max(confidence_scores), 2) if confidence_scores else 0,
                    "lowestConfidence": round(min(confidence_scores), 2) if confidence_scores else 0,
                }
            }
        )

    except Exception as e:
        print(f"❌ Error fetching performance metrics: {e}")
        return api_error("Failed to fetch performance metrics", status_code=500)

