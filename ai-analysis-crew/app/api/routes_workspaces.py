"""Workspace CRUD and switching for dashboard multi-tenant UX."""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .storage_uploads import (
    build_workspace_image_storage_path,
    normalize_image_content_type,
    upload_public_image,
    validate_workspace_image,
)
from .plan_enforcement import assert_can_create_workspace, get_workspace_quota
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class WorkspaceCreateBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class WorkspaceUpdateBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (base[:48] or "workspace")


def _unique_slug(supabase: Any, name: str) -> str:
    base = _slugify(name)
    candidate = base
    suffix = 0
    while True:
        res = (
            supabase.table("workspaces")
            .select("id")
            .eq("slug", candidate)
            .limit(1)
            .execute()
        )
        if not res.data:
            return candidate
        suffix += 1
        candidate = f"{base}-{suffix}"[:60]


def _workspace_row_to_dict(row: dict[str, Any], *, role: str | None = None) -> dict[str, Any]:
    image_url = row.get("image_url")
    return {
        "id": str(row.get("id") or ""),
        "name": row.get("name") or "",
        "slug": row.get("slug") or "",
        "role": role or "member",
        "imageUrl": image_url if isinstance(image_url, str) and image_url.strip() else None,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def _fetch_profile_company(supabase: Any, user_id: str) -> tuple[str | None, str | None]:
    res = await run_in_threadpool(
        lambda: supabase.table("profiles")
        .select("company, active_workspace_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    row = res.data or {}
    company = (row.get("company") or "").strip() or None
    active_id = str(row.get("active_workspace_id") or "").strip() or None
    return company, active_id


async def _set_active_workspace(supabase: Any, user_id: str, workspace_id: str) -> None:
    await run_in_threadpool(
        lambda: supabase.table("profiles")
        .update(
            {
                "active_workspace_id": workspace_id,
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
        .eq("id", user_id)
        .execute()
    )


async def _create_workspace_for_user(
    supabase: Any,
    user: CurrentUser,
    name: str,
    *,
    set_active: bool = True,
) -> dict[str, Any]:
    trimmed = (name or "").strip()
    if not trimmed:
        raise ValueError("Workspace name is required")

    slug = _unique_slug(supabase, trimmed)
    now = datetime.utcnow().isoformat()
    workspace_id = str(uuid.uuid4())

    workspace_row = {
        "id": workspace_id,
        "name": trimmed,
        "slug": slug,
        "created_by": user.id,
        "created_at": now,
        "updated_at": now,
    }

    await run_in_threadpool(
        lambda: supabase.table("workspaces").insert(workspace_row).execute()
    )
    await run_in_threadpool(
        lambda: supabase.table("workspace_members")
        .insert(
            {
                "workspace_id": workspace_id,
                "user_id": user.id,
                "role": "owner",
                "joined_at": now,
            }
        )
        .execute()
    )

    if set_active:
        await _set_active_workspace(supabase, user.id, workspace_id)
        # Keep profile.company in sync with primary workspace name for legacy gates
        await run_in_threadpool(
            lambda: supabase.table("profiles")
            .update({"company": trimmed, "updated_at": now})
            .eq("id", user.id)
            .execute()
        )

    return _workspace_row_to_dict(workspace_row, role="owner")


async def _list_user_workspaces(supabase: Any, user_id: str) -> list[dict[str, Any]]:
    res = await run_in_threadpool(
        lambda: supabase.table("workspace_members")
        .select("role, workspaces(id, name, slug, image_url, created_at, updated_at)")
        .eq("user_id", user_id)
        .execute()
    )
    out: list[dict[str, Any]] = []
    for row in res.data or []:
        ws = row.get("workspaces") or {}
        if not ws:
            continue
        out.append(_workspace_row_to_dict(ws, role=str(row.get("role") or "member")))
    out.sort(key=lambda w: (w.get("name") or "").lower())
    return out


async def _bootstrap_default_workspace(supabase: Any, user: CurrentUser) -> list[dict[str, Any]]:
    existing = await _list_user_workspaces(supabase, user.id)
    if existing:
        company, active_id = await _fetch_profile_company(supabase, user.id)
        active_ids = {w["id"] for w in existing}
        if active_id and active_id in active_ids:
            return existing
        # Pick first workspace or company-named match
        preferred = existing[0]
        if company:
            for w in existing:
                if (w.get("name") or "").strip().lower() == company.lower():
                    preferred = w
                    break
        await _set_active_workspace(supabase, user.id, preferred["id"])
        return existing

    company, _ = await _fetch_profile_company(supabase, user.id)
    if not company:
        # New users without a company name must create a workspace via onboarding.
        return []

    blocked = await assert_can_create_workspace(user)
    if blocked:
        return await _list_user_workspaces(supabase, user.id)

    await _create_workspace_for_user(supabase, user, company, set_active=True)
    return await _list_user_workspaces(supabase, user.id)


@router.get("")
async def list_workspaces(
    user: CurrentUser = Depends(get_current_user),
    bootstrap: bool = Query(True),
):
    """List workspaces for the current user. Bootstraps a default from company name when empty."""
    try:
        supabase = get_supabase_admin()
        workspaces = (
            await _bootstrap_default_workspace(supabase, user)
            if bootstrap
            else await _list_user_workspaces(supabase, user.id)
        )
        _, active_id = await _fetch_profile_company(supabase, user.id)
        if not active_id and workspaces:
            active_id = workspaces[0]["id"]
            await _set_active_workspace(supabase, user.id, active_id)

        active = next((w for w in workspaces if w["id"] == active_id), workspaces[0] if workspaces else None)
        quota = await get_workspace_quota(user.id, user.role)
        return api_ok(
            data={
                "workspaces": workspaces,
                "activeWorkspaceId": active_id,
                "activeWorkspace": active,
                "needsSetup": len(workspaces) == 0,
                "quota": quota,
            }
        )
    except Exception as exc:
        print(f"❌ list_workspaces: {exc}")
        return api_error("Failed to load workspaces", status_code=500)


@router.post("")
async def create_workspace(
    body: WorkspaceCreateBody,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        blocked = await assert_can_create_workspace(user)
        if blocked:
            return api_error(blocked, status_code=403)

        supabase = get_supabase_admin()
        workspace = await _create_workspace_for_user(
            supabase, user, body.name.strip(), set_active=True
        )
        workspaces = await _list_user_workspaces(supabase, user.id)
        quota = await get_workspace_quota(user.id, user.role)
        return api_ok(
            data={
                "workspace": workspace,
                "workspaces": workspaces,
                "activeWorkspaceId": workspace["id"],
                "activeWorkspace": workspace,
                "quota": quota,
            }
        )
    except ValueError as exc:
        return api_error(str(exc), status_code=400)
    except Exception as exc:
        print(f"❌ create_workspace: {exc}")
        return api_error("Failed to create workspace", status_code=500)


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: WorkspaceUpdateBody,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        member = await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .select("role")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        if not member.data:
            return api_error("Workspace not found", status_code=404)
        if str(member.data.get("role") or "") not in ("owner", "admin"):
            return api_error("Not allowed to rename this workspace", status_code=403)

        trimmed = body.name.strip()
        now = datetime.utcnow().isoformat()
        await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .update({"name": trimmed, "updated_at": now})
            .eq("id", workspace_id)
            .execute()
        )

        _, active_id = await _fetch_profile_company(supabase, user.id)
        if active_id == workspace_id:
            await run_in_threadpool(
                lambda: supabase.table("profiles")
                .update({"company": trimmed, "updated_at": now})
                .eq("id", user.id)
                .execute()
            )

        res = await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .select("*")
            .eq("id", workspace_id)
            .single()
            .execute()
        )
        workspace = _workspace_row_to_dict(
            res.data or {}, role=str(member.data.get("role") or "owner")
        )
        return api_ok(data={"workspace": workspace})
    except Exception as exc:
        print(f"❌ update_workspace: {exc}")
        return api_error("Failed to update workspace", status_code=500)


@router.post("/{workspace_id}/image")
async def upload_workspace_image(
    workspace_id: str,
    image: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    """Upload workspace logo/avatar (owner or admin only)."""
    try:
        supabase = get_supabase_admin()
        member = await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .select("role")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        if not member.data:
            return api_error("Workspace not found", status_code=404)
        if str(member.data.get("role") or "") not in ("owner", "admin"):
            return api_error("Not allowed to update this workspace image", status_code=403)

        image_data = await image.read()
        content_type = normalize_image_content_type(image.content_type)
        if not content_type:
            return api_error("Only JPEG, PNG, or WebP images are allowed", status_code=400)

        validation_error = validate_workspace_image(image_data=image_data, content_type=content_type)
        if validation_error:
            return api_error(validation_error, status_code=400)

        storage_path = build_workspace_image_storage_path(workspace_id, content_type)
        if not storage_path:
            return api_error("Invalid workspace id", status_code=400)

        image_url, upload_error = await run_in_threadpool(
            lambda: upload_public_image(
                supabase=supabase,
                storage_path=storage_path,
                image_data=image_data,
                content_type=content_type,
            )
        )
        if upload_error or not image_url:
            return api_error(upload_error or "Upload failed", status_code=500)

        now = datetime.utcnow().isoformat()
        await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .update({"image_url": image_url, "updated_at": now})
            .eq("id", workspace_id)
            .execute()
        )

        res = await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .select("*")
            .eq("id", workspace_id)
            .single()
            .execute()
        )
        workspace = _workspace_row_to_dict(
            res.data or {}, role=str(member.data.get("role") or "owner")
        )
        return api_ok(data={"workspace": workspace, "imageUrl": image_url})
    except Exception as exc:
        print(f"❌ upload_workspace_image: {exc}")
        return api_error("Failed to upload workspace image", status_code=500)


@router.post("/{workspace_id}/activate")
async def activate_workspace(
    workspace_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        member = await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .select("role, workspaces(id, name, slug, image_url, created_at, updated_at)")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user.id)
            .single()
            .execute()
        )
        if not member.data:
            return api_error("Workspace not found", status_code=404)

        await _set_active_workspace(supabase, user.id, workspace_id)
        ws = member.data.get("workspaces") or {}
        workspace = _workspace_row_to_dict(
            ws, role=str(member.data.get("role") or "member")
        )
        return api_ok(
            data={
                "activeWorkspaceId": workspace_id,
                "activeWorkspace": workspace,
            }
        )
    except Exception as exc:
        print(f"❌ activate_workspace: {exc}")
        return api_error("Failed to switch workspace", status_code=500)
