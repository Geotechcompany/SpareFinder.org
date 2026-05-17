"""History routes for upload history (workspace-scoped)."""

from __future__ import annotations

from typing import Optional
from io import StringIO
import csv

from fastapi import APIRouter, Depends, Query, Response

from .responses import api_ok, api_error
from .supabase_admin import get_supabase_admin
from .workspace_dependencies import (
    WorkspaceScope,
    get_workspace_scope,
    workspace_delete,
    workspace_select,
)

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/uploads")
async def get_upload_history(
    scope: WorkspaceScope = Depends(get_workspace_scope),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=500),
    offset: Optional[int] = Query(default=None, ge=0),
    status: Optional[str] = Query(default=None),
):
    try:
        supabase = get_supabase_admin()

        if offset is None:
            offset = (page - 1) * limit

        query = (
            workspace_select(supabase, "part_searches", scope)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if status:
            query = query.eq("analysis_status", status)

        result = query.execute()
        uploads = result.data if result.data else []

        count_query = workspace_select(
            supabase, "part_searches", scope, "id", count="exact"
        )
        if status:
            count_query = count_query.eq("analysis_status", status)

        count_result = count_query.execute()
        total_count = (
            count_result.count if hasattr(count_result, "count") else len(uploads)
        )

        return api_ok(
            data={
                "uploads": uploads,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "page": page,
                    "totalPages": (total_count + limit - 1) // limit,
                    "hasMore": (offset + len(uploads)) < total_count,
                },
            }
        )

    except Exception as e:
        print(f"❌ Error fetching upload history: {e}")
        return api_error("Failed to fetch upload history", status_code=500)


@router.get("/uploads/{upload_id}")
async def get_upload_detail(
    upload_id: str,
    scope: WorkspaceScope = Depends(get_workspace_scope),
):
    try:
        supabase = get_supabase_admin()

        result = (
            workspace_select(supabase, "part_searches", scope)
            .eq("id", upload_id)
            .single()
            .execute()
        )

        if not result.data:
            return api_error("Upload not found", status_code=404)

        return api_ok(data=result.data)

    except Exception as e:
        print(f"❌ Error fetching upload detail: {e}")
        return api_error("Failed to fetch upload", status_code=500)


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: str,
    scope: WorkspaceScope = Depends(get_workspace_scope),
):
    try:
        supabase = get_supabase_admin()

        check = (
            workspace_select(supabase, "part_searches", scope, "id")
            .eq("id", upload_id)
            .single()
            .execute()
        )

        if not check.data:
            return api_error("Upload not found", status_code=404)

        workspace_delete(supabase, "part_searches", scope).eq("id", upload_id).execute()

        return api_ok(data={"message": "Upload deleted", "id": upload_id})

    except Exception as e:
        print(f"❌ Error deleting upload: {e}")
        return api_error("Failed to delete upload", status_code=500)


@router.get("/stats")
async def get_history_stats(scope: WorkspaceScope = Depends(get_workspace_scope)):
    try:
        supabase = get_supabase_admin()
        result = workspace_select(supabase, "part_searches", scope).execute()
        uploads = result.data if result.data else []

        total = len(uploads)
        completed = len(
            [u for u in uploads if (u.get("analysis_status") or "").lower() == "completed"]
        )

        return api_ok(
            data={
                "total": total,
                "completed": completed,
                "successRate": (completed / total * 100) if total else 0,
            }
        )

    except Exception as e:
        print(f"❌ Error fetching history stats: {e}")
        return api_error("Failed to fetch history stats", status_code=500)


@router.get("/export")
async def export_history(
    scope: WorkspaceScope = Depends(get_workspace_scope),
    format: str = Query(default="csv"),
):
    try:
        supabase = get_supabase_admin()
        result = (
            workspace_select(supabase, "part_searches", scope)
            .order("created_at", desc=True)
            .execute()
        )
        uploads = result.data if result.data else []

        if format.lower() != "csv":
            return api_error("Only CSV export is supported", status_code=400)

        output = StringIO()
        if uploads:
            fieldnames = list(uploads[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for row in uploads:
                writer.writerow(row)

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=upload_history.csv"},
        )

    except Exception as e:
        print(f"❌ Error exporting history: {e}")
        return api_error("Failed to export history", status_code=500)
