"""Search routes for keyword-based part searches."""

from __future__ import annotations

import asyncio
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_ok, api_error

router = APIRouter(prefix="/search", tags=["search"])


class KeywordSearchRequest(BaseModel):
    keywords: list[str] | str
    user_email: Optional[str] = None


@router.post("/keywords")
async def search_keywords(
    payload: KeywordSearchRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Search for parts by keywords.
    Returns immediately with a job ID; DB insert and analysis run in background
    so the client is not blocked and can redirect right away.
    """
    import logging
    from ..database_storage import create_crew_job
    from ..main import run_analysis_background

    logger = logging.getLogger(__name__)
    try:
        # Get keywords - handle both string and array
        keywords_raw = payload.keywords
        if isinstance(keywords_raw, list):
            keywords = " ".join(str(k).strip() for k in keywords_raw if k)
        else:
            keywords = str(keywords_raw).strip() if keywords_raw else ""

        if not keywords:
            return api_error("Keywords are required", status_code=400)

        user_email = payload.user_email or user.email
        if not user_email or "@" not in user_email:
            return api_error("Valid email address is required", status_code=400)

        job_id = str(uuid.uuid4())

        async def _create_job_and_start_analysis() -> None:
            # Run blocking create_crew_job in executor so we don't block the loop
            loop = asyncio.get_event_loop()
            job_created = await loop.run_in_executor(
                None,
                lambda: create_crew_job(
                    job_id=job_id,
                    user_email=user_email,
                    keywords=keywords,
                    image_url=None,
                ),
            )
            if not job_created:
                logger.warning(
                    "Failed to create crew job entry for %s, but continuing with analysis",
                    job_id,
                )
            await run_analysis_background(job_id, user_email, None, keywords)

        # Fire-and-forget: do not await so we return the response immediately
        asyncio.create_task(_create_job_and_start_analysis())

        # Return immediately so the client can redirect without waiting for DB or analysis
        body = api_ok(
            data={
                "job_id": job_id,
                "message": "Keyword search scheduled successfully",
                "status": "processing",
            },
        )
        return JSONResponse(content=body, status_code=202)

    except Exception as e:
        logger.error("Error scheduling keyword search: %s", e)
        return api_error(f"Failed to schedule keyword search: {str(e)}", status_code=500)


@router.post("/keywords/schedule")
async def schedule_keyword_search(
    request: Request,
    user: Optional[CurrentUser] = Depends(get_current_user),
):
    """
    Schedule a keyword-only search (no image required).
    Returns immediately with a job ID for tracking.
    
    This is a legacy endpoint that accepts JSON body directly.
    Prefer using POST /api/search/keywords with the KeywordSearchRequest model.
    """
    try:
        # Parse JSON body
        body = await request.json()
        keywords_raw = body.get("keywords", "")
        user_email = body.get("user_email", "")

        # Handle keywords as either string or array
        if isinstance(keywords_raw, list):
            keywords = " ".join(str(k).strip() for k in keywords_raw if k)
        else:
            keywords = str(keywords_raw).strip() if keywords_raw else ""

        # Validate inputs
        if not keywords:
            return JSONResponse(
                status_code=400, content={"error": "Keywords are required"}
            )

        # Use authenticated user's email if available, otherwise require it in body
        if not user_email:
            if user:
                user_email = user.email
            else:
                return JSONResponse(
                    status_code=400, content={"error": "Valid email address is required"}
                )

        if not user_email or "@" not in user_email:
            return JSONResponse(
                status_code=400, content={"error": "Valid email address is required"}
            )

        # Generate unique job ID
        job_id = str(uuid.uuid4())

        # Create job entry in database first
        from ..database_storage import create_crew_job

        job_created = create_crew_job(
            job_id=job_id,
            user_email=user_email,
            keywords=keywords,
            image_url=None,
        )

        if not job_created:
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(
                f"⚠️ Failed to create crew job entry for {job_id}, but continuing with analysis"
            )

        # Start analysis in background (no image, only keywords)
        from ..main import run_analysis_background

        asyncio.create_task(
            run_analysis_background(
                job_id,
                user_email,
                None,  # No image data
                keywords,
            )
        )

        # Return job ID immediately
        return JSONResponse(
            status_code=202,
            content={
                "success": True,
                "job_id": job_id,
                "message": "Keyword search scheduled successfully",
                "status": "processing",
            },
        )

    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"❌ Error scheduling keyword search: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/keywords/status/{job_id}")
async def get_keyword_search_status(job_id: str):
    """
    Get the status of a keyword search job.
    """
    try:
        # Check job status in database
        from ..database_storage import get_crew_job_status

        job_status = get_crew_job_status(job_id)

        if not job_status:
            return api_error("Job not found", status_code=404)

        return api_ok(data=job_status)

    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"❌ Error getting job status: {e}")
        return api_error(f"Failed to get job status: {str(e)}", status_code=500)
