"""Public service status and administrator-managed incident updates."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth_dependencies import CurrentUser, require_roles
from .responses import api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(tags=["status"])

IncidentStatus = Literal["investigating", "identified", "monitoring", "resolved"]
IncidentSeverity = Literal["minor", "major", "critical"]


class IncidentUpdateInput(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    status: IncidentStatus


class IncidentInput(IncidentUpdateInput):
    title: str = Field(min_length=1, max_length=240)
    severity: IncidentSeverity = "minor"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/status")
async def public_status():
    """Lightweight status summary for the public status page."""
    supabase = get_supabase_admin()
    try:
        active = (
            supabase.table("service_incidents")
            .select("id")
            .neq("status", "resolved")
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception:
        active = []
    return api_ok(
        {
            "status": "degraded" if active else "operational",
            "checked_at": _now(),
            "components": [
                {"name": "SpareFinder web application", "status": "operational"},
                {"name": "Analysis API", "status": "operational"},
            ],
        }
    )


@router.get("/incidents")
async def public_incidents(limit: int = Query(default=20, ge=1, le=100)):
    supabase = get_supabase_admin()
    rows = (
        supabase.table("service_incidents")
        .select("*")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )
    return api_ok({"incidents": rows})


@router.get("/admin/incidents")
async def admin_incidents(
    _admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    return await public_incidents(limit=100)


@router.post("/admin/incidents")
async def create_incident(
    payload: IncidentInput,
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    created_at = _now()
    row = {
        "title": payload.title.strip(),
        "severity": payload.severity,
        "status": payload.status,
        "started_at": created_at,
        "resolved_at": created_at if payload.status == "resolved" else None,
        "updates": [
            {
                "message": payload.message.strip(),
                "status": payload.status,
                "created_at": created_at,
                "author": admin.email,
            }
        ],
    }
    created = supabase.table("service_incidents").insert(row).execute().data or []
    return api_ok({"incident": created[0] if created else row})


@router.post("/admin/incidents/{incident_id}/updates")
async def add_incident_update(
    incident_id: str,
    payload: IncidentUpdateInput,
    admin: CurrentUser = Depends(require_roles("admin", "super_admin")),
):
    supabase = get_supabase_admin()
    existing = (
        supabase.table("service_incidents").select("updates").eq("id", incident_id).limit(1).execute().data
        or []
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    created_at = _now()
    updates: list[dict[str, Any]] = list(existing[0].get("updates") or [])
    updates.append(
        {
            "message": payload.message.strip(),
            "status": payload.status,
            "created_at": created_at,
            "author": admin.email,
        }
    )
    patch: dict[str, Any] = {"status": payload.status, "updates": updates}
    if payload.status == "resolved":
        patch["resolved_at"] = created_at
    updated = (
        supabase.table("service_incidents").update(patch).eq("id", incident_id).execute().data or []
    )
    return api_ok({"incident": updated[0] if updated else None})
