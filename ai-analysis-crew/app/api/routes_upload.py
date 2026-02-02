"""Upload routes for crew analysis jobs and file uploads."""

from __future__ import annotations

from typing import Any, Optional
import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException

from .auth_dependencies import CurrentUser, get_current_user
from .plan_enforcement import check_upload_limit
from .responses import api_ok, api_error
from .supabase_admin import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])


@router.get("/crew-analysis-jobs")
async def get_crew_analysis_jobs(user: CurrentUser = Depends(get_current_user)):
    """
    Get all crew analysis jobs for the current user.
    Returns jobs from the crew_analysis_jobs table.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Fetch crew analysis jobs for this user
        result = (
            supabase.table("crew_analysis_jobs")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        jobs = result.data if result.data else []

        return api_ok(data=jobs)

    except Exception as e:
        error_message = str(e)
        print(f"❌ Failed to fetch crew analysis jobs: {e}")

        # Return empty array if table doesn't exist yet (code 42P01)
        if "42P01" in error_message or "does not exist" in error_message.lower():
            return api_ok(data=[], message="No crew analysis jobs found")

        return api_error("Failed to fetch jobs", status_code=500)


@router.get("/crew-analysis-jobs/{job_id}")
async def get_crew_analysis_job(
    job_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Get a specific crew analysis job by ID.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Fetch the specific job
        result = (
            supabase.table("crew_analysis_jobs")
            .select("*")
            .eq("id", job_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            return api_error("Job not found", status_code=404)

        return api_ok(data=result.data)

    except Exception as e:
        print(f"❌ Failed to fetch crew analysis job: {e}")
        return api_error("Failed to fetch job", status_code=500)


@router.post("/crew-analysis")
async def create_crew_analysis_job(
    image: UploadFile = File(...),
    keywords: Optional[str] = Form(None),
    user_country: Optional[str] = Form(None),
    user_region: Optional[str] = Form(None),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Create a new crew analysis job and start analysis immediately.
    Uploads the image, creates a job entry in the database, and starts processing.
    Plan-gated: upload count must not exceed tier limit for the current period.
    """
    import asyncio
    import uuid
    
    try:
        # Enforce plan upload limit (strict: user cannot exceed their tier limit)
        allowed, current, limit = await check_upload_limit(user.id, user.role)
        if not allowed:
            return api_error(
                f"Upload limit reached for your plan ({current}/{limit} this period). Upgrade to get more analyses.",
                status_code=403,
            )

        supabase = get_supabase_admin()
        user_id = user.id
        user_email = user.email

        # Read image data
        image_data = await image.read()
        
        # Generate job ID (use UUID if database doesn't auto-generate)
        job_id = str(uuid.uuid4())

        # Upload image to Supabase Storage
        import os
        from pathlib import Path
        
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        image_url = None
        if supabase_url and supabase_key:
            try:
                # Generate unique filename with job_id
                file_ext = Path(image.filename).suffix or ".jpg"
                storage_filename = f"crew_analysis_{job_id}{file_ext}"
                storage_path = f"crew-analysis/{user_id}/{storage_filename}"
                bucket_name = "sparefinder"
                
                # Upload to Supabase Storage
                upload_result = supabase.storage.from_(bucket_name).upload(
                    storage_path,
                    image_data,
                    file_options={
                        "content-type": image.content_type or "image/jpeg",
                        "x-upsert": "false"
                    }
                )
                
                if upload_result:
                    # Get public URL - handle different response formats
                    try:
                        public_url_response = supabase.storage.from_(bucket_name).get_public_url(storage_path)
                        # Handle different response formats
                        if isinstance(public_url_response, dict):
                            image_url = public_url_response.get("publicUrl") or public_url_response.get("url")
                        elif hasattr(public_url_response, 'data'):
                            image_url = public_url_response.data.get("publicUrl") if isinstance(public_url_response.data, dict) else str(public_url_response.data)
                        else:
                            image_url = str(public_url_response)
                        
                        # Fallback: construct URL manually if needed
                        if not image_url or image_url.startswith("None"):
                            image_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{storage_path}"
                        
                        logger.info(f"✅ Image uploaded to Supabase Storage: {image_url}")
                    except Exception as url_error:
                        logger.warning(f"Could not get public URL, constructing manually: {url_error}")
                        image_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{storage_path}"
                        logger.info(f"✅ Image uploaded (using manual URL): {image_url}")
                else:
                    logger.warning(f"⚠️ Image upload returned no result, using placeholder")
                    image_url = f"placeholder_url/{image.filename}"
            except Exception as upload_error:
                logger.error(f"❌ Failed to upload image to Supabase Storage: {upload_error}")
                image_url = f"placeholder_url/{image.filename}"
        else:
            logger.warning("⚠️ Supabase credentials not configured, using placeholder URL")
            image_url = f"placeholder_url/{image.filename}"
        
        # Create job entry
        job_data = {
            "id": job_id,
            "user_id": user_id,
            "user_email": user_email,
            "image_url": image_url,
            "image_name": image.filename,
            "keywords": keywords or "",
            "status": "pending",
            "progress": 0,
        }

        result = (
            supabase.table("crew_analysis_jobs")
            .insert(job_data)
            .execute()
        )

        if not result.data:
            return api_error("Failed to create job", status_code=500)

        job = result.data[0]
        # Use the actual ID from the database (in case it was auto-generated)
        job_id = job.get("id") or job_id

        # Start analysis in background immediately
        from ..main import run_analysis_background
        
        asyncio.create_task(
            run_analysis_background(
                job_id,
                user_email,
                image_data,
                keywords or "",
                user_country=user_country or None,
                user_region=user_region or None,
            )
        )

        return api_ok(
            data={
                "jobId": job_id,
                "imageUrl": image_url,
                "job": job,
            },
            message="Crew analysis job created and started successfully"
        )

    except Exception as e:
        logger.error(f"❌ Failed to create crew analysis job: {e}")
        return api_error(f"Failed to create job: {str(e)}", status_code=500)


@router.delete("/crew-analysis/{job_id}")
async def delete_crew_analysis_job(
    job_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Delete a crew analysis job.
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Verify ownership before deleting
        check_result = (
            supabase.table("crew_analysis_jobs")
            .select("id")
            .eq("id", job_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not check_result.data:
            return api_error("Job not found or unauthorized", status_code=404)

        # Delete the job
        delete_result = (
            supabase.table("crew_analysis_jobs")
            .delete()
            .eq("id", job_id)
            .eq("user_id", user_id)
            .execute()
        )

        return api_ok(
            data={"message": "Job deleted successfully", "id": job_id}
        )

    except Exception as e:
        print(f"❌ Failed to delete crew analysis job: {e}")
        return api_error("Failed to delete job", status_code=500)


@router.patch("/crew-analysis/{job_id}")
async def update_crew_analysis_job(
    job_id: str,
    update_data: dict,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Update a crew analysis job (status, progress, etc.).
    """
    try:
        supabase = get_supabase_admin()
        user_id = user.id

        # Verify ownership
        check_result = (
            supabase.table("crew_analysis_jobs")
            .select("id")
            .eq("id", job_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if not check_result.data:
            return api_error("Job not found or unauthorized", status_code=404)

        # Update the job
        result = (
            supabase.table("crew_analysis_jobs")
            .update(update_data)
            .eq("id", job_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            return api_error("Failed to update job", status_code=500)

        return api_ok(data=result.data[0])

    except Exception as e:
        print(f"❌ Failed to update crew analysis job: {e}")
        return api_error("Failed to update job", status_code=500)


