"""History routes for upload history and past jobs."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok, api_error
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/uploads")
async def get_upload_history(
    user: CurrentUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=500),
    offset: Optional[int] = Query(default=None, ge=0),
    status: Optional[str] = Query(default=None),
):
    """
    Get upload history for the current user.
    Returns a list of past part searches/uploads.
    Supports both page-based and offset-based pagination.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Calculate offset from page if offset not provided
        if offset is None:
            offset = (page - 1) * limit

        # Build query
        query = (
            supabase.table("part_searches")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        # Filter by status if provided
        if status:
            query = query.eq("analysis_status", status)

        result = query.execute()

        uploads = result.data if result.data else []

        # Get total count for pagination
        count_query = supabase.table("part_searches").select("id", count="exact").eq("user_id", user_id)
        if status:
            count_query = count_query.eq("analysis_status", status)
        
        count_result = count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(uploads)

        return api_ok(
            data={
                "uploads": uploads,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "page": page,
                    "totalPages": (total_count + limit - 1) // limit,  # Ceiling division
                    "hasMore": (offset + len(uploads)) < total_count,
                }
            }
        )

    except Exception as e:
        print(f"❌ Error fetching upload history: {e}")
        return api_error("Failed to fetch upload history", status_code=500)


@router.get("/uploads/{upload_id}")
async def get_upload_details(
    upload_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Get details for a specific upload/search.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get the upload
        result = (
            supabase.table("part_searches")
            .select("*")
            .eq("id", upload_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            return api_error("Upload not found", status_code=404)

        return api_ok(data=result.data)

    except Exception as e:
        print(f"❌ Error fetching upload details: {e}")
        return api_error("Failed to fetch upload details", status_code=500)


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Delete a specific upload/search.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Verify ownership before deleting
        check_result = (
            supabase.table("part_searches")
            .select("id")
            .eq("id", upload_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not check_result.data:
            return api_error("Upload not found or unauthorized", status_code=404)

        # Delete the upload
        delete_result = (
            supabase.table("part_searches")
            .delete()
            .eq("id", upload_id)
            .eq("user_id", user_id)
            .execute()
        )

        return api_ok(data={"message": "Upload deleted successfully", "id": upload_id})

    except Exception as e:
        print(f"❌ Error deleting upload: {e}")
        return api_error("Failed to delete upload", status_code=500)


@router.get("/stats")
async def get_history_stats(user: CurrentUser = Depends(get_current_user)):
    """
    Get statistics about upload history.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Get all uploads
        result = supabase.table("part_searches").select("*").eq("user_id", user_id).execute()

        uploads = result.data if result.data else []

        # Calculate stats
        total_uploads = len(uploads)
        completed = len([u for u in uploads if u.get("analysis_status") == "completed"])
        failed = len([u for u in uploads if u.get("analysis_status") == "failed"])
        pending = len([u for u in uploads if u.get("analysis_status") == "pending"])
        processing = len([u for u in uploads if u.get("analysis_status") == "processing"])

        return api_ok(
            data={
                "total": total_uploads,
                "completed": completed,
                "failed": failed,
                "pending": pending,
                "processing": processing,
                "successRate": (completed / total_uploads * 100) if total_uploads > 0 else 0,
            }
        )

    except Exception as e:
        print(f"❌ Error fetching history stats: {e}")
        return api_error("Failed to fetch history stats", status_code=500)

