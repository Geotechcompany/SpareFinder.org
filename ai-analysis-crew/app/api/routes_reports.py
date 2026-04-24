"""Report routes for PDF download and share links."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote

import requests
from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/reports", tags=["reports"])


def _frontend_base_url(request: Request) -> str:
    configured = (
        os.getenv("FRONTEND_URL")
        or os.getenv("VITE_FRONTEND_URL")
        or os.getenv("APP_URL")
        or ""
    ).strip()
    if configured:
        return configured.rstrip("/")
    origin = request.headers.get("origin", "").strip()
    if origin:
        return origin.rstrip("/")
    return "https://sparefinder.org"


@router.post("/share/{job_id}")
async def create_share_link(
    job_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """Create a share URL for a user's own completed analysis job."""
    try:
        supabase = get_supabase_admin()
        result = await run_in_threadpool(
            lambda: supabase.table("crew_analysis_jobs")
            .select("id,user_id,status")
            .eq("id", job_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        job = result.data if result and result.data else None
        if not job:
            return api_error("Analysis job not found", status_code=404)
        if job.get("status") != "completed":
            return api_error("Only completed analyses can be shared", status_code=400)

        token = job_id
        share_url = f"{_frontend_base_url(request)}/share/{token}"
        return api_ok(data={"shareUrl": share_url, "token": token})
    except Exception as e:
        print(f"❌ Error creating share link: {e}")
        return api_error("Failed to create shareable link", status_code=500)


@router.get("/shared/{token}")
async def get_shared_analysis(token: str):
    """Return a public view of a shared analysis by token."""
    try:
        supabase = get_supabase_admin()
        # Token currently maps to the job UUID for backward compatibility.
        result = await run_in_threadpool(
            lambda: supabase.table("crew_analysis_jobs")
            .select(
                "id,user_email,image_url,keywords,status,result_data,pdf_url,created_at,completed_at"
            )
            .eq("id", token)
            .single()
            .execute()
        )
        job = result.data if result and result.data else None
        if not job:
            return api_error("Shared analysis not found", status_code=404)
        if job.get("status") != "completed":
            return api_error("Analysis is not available for sharing", status_code=404)
        return api_ok(data=job)
    except Exception as e:
        print(f"❌ Error fetching shared analysis: {e}")
        return api_error("Shared analysis not found", status_code=404)


@router.get("/pdf/{filename}")
async def download_pdf(filename: str):
    """Proxy PDF download from local temp or Supabase storage."""
    safe_name = Path(unquote(filename)).name
    if not safe_name:
        return api_error("Invalid PDF filename", status_code=400)

    # 1) Local temp fallback (dev/local worker output)
    local_temp_path = (
        Path(__file__).resolve().parents[2] / "temp" / safe_name
    )  # ai-analysis-crew/temp
    if local_temp_path.exists():
        data = local_temp_path.read_bytes()
        headers = {"Content-Disposition": f'attachment; filename="{safe_name}"'}
        return Response(content=data, media_type="application/pdf", headers=headers)

    # 2) Supabase public storage candidates
    supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip()
    buckets = []
    preferred = (os.getenv("SUPABASE_PDF_BUCKET") or "").strip()
    if preferred:
        buckets.append(preferred)
    buckets.extend(["documents", "sparefinder"])

    if not supabase_url:
        return api_error("PDF not found", status_code=404)

    seen = set()
    candidates = []
    for bucket in buckets:
        if not bucket or bucket in seen:
            continue
        seen.add(bucket)
        candidates.append(
            f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/reports/{safe_name}"
        )

    for url in candidates:
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200 and resp.content:
                headers = {"Content-Disposition": f'attachment; filename="{safe_name}"'}
                return Response(content=resp.content, media_type="application/pdf", headers=headers)
        except Exception:
            continue

    return api_error("PDF not found", status_code=404)
