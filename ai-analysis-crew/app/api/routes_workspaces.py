"""Workspace CRUD and switching for dashboard multi-tenant UX."""

from __future__ import annotations

import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from ..email_sender import send_basic_email_smtp, send_email_via_email_service
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


WorkspaceMemberRole = Literal["owner", "admin", "member"]
WorkspaceInviteRole = Literal["admin", "member"]

INVITE_EXPIRY_DAYS = 7
_TEAM_SCHEMA_MISSING = (
    "Team invitations are not set up. Run docs/sql/create_workspace_team_invitations.sql "
    "in the Supabase SQL Editor, then retry."
)


class WorkspaceInviteBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    role: WorkspaceInviteRole = "member"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class WorkspaceMemberRoleBody(BaseModel):
    role: WorkspaceInviteRole


class WorkspaceInviteAcceptBody(BaseModel):
    token: str = Field(..., min_length=16, max_length=128)


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


def _app_base_url() -> str:
    return (
        os.getenv("SPAREFINDER_APP_URL")
        or os.getenv("VITE_APP_URL")
        or os.getenv("APP_URL")
        or "https://sparefinder.org"
    ).strip().rstrip("/")


def _is_missing_team_table_error(exc: BaseException) -> bool:
    parts = [str(exc)]
    for attr in ("message", "code", "details"):
        val = getattr(exc, attr, None)
        if val is not None:
            parts.append(str(val))
    combined = " ".join(parts).lower()
    return "workspace_invitations" in combined and (
        "42p01" in combined
        or "42703" in combined
        or "pgrst204" in combined
        or "does not exist" in combined
        or "schema cache" in combined
    )


async def _get_workspace_membership(
    supabase: Any, workspace_id: str, user_id: str
) -> dict[str, Any] | None:
    res = await run_in_threadpool(
        lambda: supabase.table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def _can_manage_team(role: str) -> bool:
    return role in ("owner", "admin")


def _member_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    profile = row.get("profiles") or {}
    return {
        "userId": str(row.get("user_id") or ""),
        "role": str(row.get("role") or "member"),
        "joinedAt": row.get("joined_at"),
        "email": profile.get("email") or "",
        "fullName": profile.get("full_name") or "",
        "avatarUrl": profile.get("avatar_url"),
    }


def _invitation_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id") or ""),
        "email": row.get("email") or "",
        "role": row.get("role") or "member",
        "expiresAt": row.get("expires_at"),
        "acceptedAt": row.get("accepted_at"),
        "createdAt": row.get("created_at"),
    }


async def _count_workspace_owners(supabase: Any, workspace_id: str) -> int:
    res = await run_in_threadpool(
        lambda: supabase.table("workspace_members")
        .select("user_id", count="exact")
        .eq("workspace_id", workspace_id)
        .eq("role", "owner")
        .execute()
    )
    return int(getattr(res, "count", None) or len(res.data or []))


def _send_workspace_invite_email(
    *,
    to_email: str,
    workspace_name: str,
    inviter_name: str,
    role: str,
    invite_url: str,
) -> bool:
    role_label = "Admin" if role == "admin" else "Member"
    subject = f"You've been invited to {workspace_name} on SpareFinder"
    text = (
        f"Hi,\n\n"
        f"{inviter_name} invited you to join the \"{workspace_name}\" workspace on SpareFinder as {role_label}.\n\n"
        f"Accept the invitation:\n{invite_url}\n\n"
        f"This link expires in {INVITE_EXPIRY_DAYS} days.\n\n"
        f"— SpareFinder"
    )
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 560px; line-height: 1.5;">
  <p>Hi,</p>
  <p><strong>{inviter_name}</strong> invited you to join <strong>{workspace_name}</strong> on SpareFinder as <strong>{role_label}</strong>.</p>
  <p><a href="{invite_url}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Accept invitation</a></p>
  <p style="font-size:13px;color:#64748b;">Or copy this link: {invite_url}</p>
  <p style="font-size:13px;color:#64748b;">This link expires in {INVITE_EXPIRY_DAYS} days.</p>
  <p>— SpareFinder</p>
</body>
</html>"""
    ok = send_basic_email_smtp(to_email=to_email, subject=subject, html=html, text=text)
    if not ok:
        ok = send_email_via_email_service(
            to_email=to_email, subject=subject, html=html, text=text
        )
    return ok


async def _fetch_invitation_row_by_token(supabase: Any, token: str) -> dict[str, Any] | None:
    res = await run_in_threadpool(
        lambda: supabase.table("workspace_invitations")
        .select("id, email, role, expires_at, accepted_at, workspaces(id, name)")
        .eq("token", token.strip())
        .limit(1)
        .execute()
    )
    row = (res.data or [None])[0]
    return row if row else None


def _validate_invitation_row(row: dict[str, Any]) -> str | None:
    if row.get("accepted_at"):
        return "This invitation has already been accepted"
    expires_at = row.get("expires_at")
    if expires_at and str(expires_at) < datetime.now(timezone.utc).isoformat():
        return "This invitation has expired"
    return None


@router.get("/invitations/public-preview")
async def public_preview_workspace_invitation(
    token: str = Query(..., min_length=16, max_length=128),
):
    """Preview a pending workspace invitation without authentication (token is the secret)."""
    try:
        supabase = get_supabase_admin()
        row = await _fetch_invitation_row_by_token(supabase, token)
        if not row:
            return api_error("Invitation not found", status_code=404)
        invalid = _validate_invitation_row(row)
        if invalid:
            return api_error(invalid, status_code=410)

        ws = row.get("workspaces") or {}
        return api_ok(
            data={
                "invitation": {
                    "email": (row.get("email") or "").strip().lower(),
                    "role": row.get("role") or "member",
                    "expiresAt": row.get("expires_at"),
                },
                "workspace": {
                    "id": str(ws.get("id") or ""),
                    "name": ws.get("name") or "",
                },
            }
        )
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ public_preview_workspace_invitation: {exc}")
        return api_error("Failed to load invitation", status_code=500)


@router.get("/invitations/preview")
async def preview_workspace_invitation(
    token: str = Query(..., min_length=16, max_length=128),
    user: CurrentUser = Depends(get_current_user),
):
    """Preview a pending workspace invitation (authenticated)."""
    try:
        supabase = get_supabase_admin()
        row = await _fetch_invitation_row_by_token(supabase, token)
        if not row:
            return api_error("Invitation not found", status_code=404)
        invalid = _validate_invitation_row(row)
        if invalid:
            return api_error(invalid, status_code=410)

        invite_email = (row.get("email") or "").strip().lower()
        user_email = (user.email or "").strip().lower()
        ws = row.get("workspaces") or {}
        return api_ok(
            data={
                "invitation": {
                    "email": invite_email,
                    "role": row.get("role") or "member",
                    "expiresAt": row.get("expires_at"),
                },
                "workspace": {
                    "id": str(ws.get("id") or ""),
                    "name": ws.get("name") or "",
                },
                "emailMatches": bool(user_email and invite_email == user_email),
            }
        )
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ preview_workspace_invitation: {exc}")
        return api_error("Failed to load invitation", status_code=500)


@router.post("/invitations/accept")
async def accept_workspace_invitation(
    body: WorkspaceInviteAcceptBody,
    user: CurrentUser = Depends(get_current_user),
):
    """Accept a workspace invitation and join as admin/member."""
    try:
        supabase = get_supabase_admin()
        token = body.token.strip()
        res = await run_in_threadpool(
            lambda: supabase.table("workspace_invitations")
            .select("*")
            .eq("token", token)
            .limit(1)
            .execute()
        )
        row = (res.data or [None])[0]
        if not row:
            return api_error("Invitation not found", status_code=404)
        if row.get("accepted_at"):
            return api_error("This invitation has already been accepted", status_code=410)

        expires_at = row.get("expires_at")
        if expires_at:
            try:
                exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < datetime.now(timezone.utc):
                    return api_error("This invitation has expired", status_code=410)
            except ValueError:
                pass

        invite_email = (row.get("email") or "").strip().lower()
        user_email = (user.email or "").strip().lower()
        if not user_email or invite_email != user_email:
            return api_error(
                "This invitation was sent to a different email address. Sign in with the invited email to accept.",
                status_code=403,
            )

        workspace_id = str(row.get("workspace_id") or "")
        role = str(row.get("role") or "member")
        now = datetime.now(timezone.utc).isoformat()

        existing = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not existing:
            await run_in_threadpool(
                lambda: supabase.table("workspace_members")
                .insert(
                    {
                        "workspace_id": workspace_id,
                        "user_id": user.id,
                        "role": role,
                        "joined_at": now,
                    }
                )
                .execute()
            )

        await run_in_threadpool(
            lambda: supabase.table("workspace_invitations")
            .update({"accepted_at": now})
            .eq("id", row["id"])
            .execute()
        )

        ws_res = await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .select("*")
            .eq("id", workspace_id)
            .single()
            .execute()
        )
        member_role = str((existing or {}).get("role") or role)
        workspace = _workspace_row_to_dict(ws_res.data or {}, role=member_role)
        await _set_active_workspace(supabase, user.id, workspace_id)

        return api_ok(
            data={
                "workspace": workspace,
                "activeWorkspaceId": workspace_id,
                "alreadyMember": bool(existing),
            }
        )
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ accept_workspace_invitation: {exc}")
        return api_error("Failed to accept invitation", status_code=500)


@router.get("/{workspace_id}/members")
async def list_workspace_members(
    workspace_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)

        res = await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .select("user_id, role, joined_at, profiles(id, email, full_name, avatar_url)")
            .eq("workspace_id", workspace_id)
            .execute()
        )
        members = [_member_to_dict(row) for row in res.data or []]
        members.sort(
            key=lambda m: (
                {"owner": 0, "admin": 1, "member": 2}.get(m["role"], 3),
                (m.get("fullName") or m.get("email") or "").lower(),
            )
        )
        return api_ok(
            data={
                "members": members,
                "canManage": _can_manage_team(str(membership.get("role") or "")),
                "currentUserRole": str(membership.get("role") or "member"),
            }
        )
    except Exception as exc:
        print(f"❌ list_workspace_members: {exc}")
        return api_error("Failed to load team members", status_code=500)


@router.get("/{workspace_id}/invitations")
async def list_workspace_invitations(
    workspace_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)
        if not _can_manage_team(str(membership.get("role") or "")):
            return api_error("Not allowed to view invitations", status_code=403)

        res = await run_in_threadpool(
            lambda: supabase.table("workspace_invitations")
            .select("id, email, role, expires_at, accepted_at, created_at")
            .eq("workspace_id", workspace_id)
            .is_("accepted_at", "null")
            .order("created_at", desc=True)
            .execute()
        )
        now_iso = datetime.now(timezone.utc).isoformat()
        pending = [
            _invitation_to_dict(row)
            for row in res.data or []
            if not row.get("expires_at") or str(row.get("expires_at")) >= now_iso
        ]
        return api_ok(data={"invitations": pending})
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ list_workspace_invitations: {exc}")
        return api_error("Failed to load invitations", status_code=500)


@router.post("/{workspace_id}/invitations")
async def create_workspace_invitation(
    workspace_id: str,
    body: WorkspaceInviteBody,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)
        actor_role = str(membership.get("role") or "")
        if not _can_manage_team(actor_role):
            return api_error("Not allowed to invite teammates", status_code=403)

        email = body.email.strip().lower()
        if email == (user.email or "").strip().lower():
            return api_error("You are already in this workspace", status_code=400)

        member_res = await run_in_threadpool(
            lambda: supabase.table("profiles")
            .select("id, email")
            .ilike("email", email)
            .limit(1)
            .execute()
        )
        if member_res.data:
            existing_user_id = str(member_res.data[0].get("id") or "")
            already = await _get_workspace_membership(
                supabase, workspace_id, existing_user_id
            )
            if already:
                return api_error("This user is already a workspace member", status_code=409)

        ws_res = await run_in_threadpool(
            lambda: supabase.table("workspaces")
            .select("name")
            .eq("id", workspace_id)
            .single()
            .execute()
        )
        workspace_name = (ws_res.data or {}).get("name") or "your workspace"

        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat()
        invite_row = {
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "email": email,
            "role": body.role,
            "token": token,
            "invited_by": user.id,
            "expires_at": expires_at,
            "created_at": now.isoformat(),
        }

        await run_in_threadpool(
            lambda: supabase.table("workspace_invitations")
            .delete()
            .eq("workspace_id", workspace_id)
            .eq("email", email)
            .is_("accepted_at", "null")
            .execute()
        )
        insert_res = await run_in_threadpool(
            lambda: supabase.table("workspace_invitations").insert(invite_row).execute()
        )
        saved = (insert_res.data or [invite_row])[0]

        invite_url = f"{_app_base_url()}/invite/workspace?token={token}"
        inviter_name = (user.full_name or user.email or "A teammate").strip()
        email_sent = _send_workspace_invite_email(
            to_email=email,
            workspace_name=workspace_name,
            inviter_name=inviter_name,
            role=body.role,
            invite_url=invite_url,
        )

        return api_ok(
            data={
                "invitation": _invitation_to_dict(saved),
                "inviteUrl": invite_url,
                "emailSent": email_sent,
            }
        )
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ create_workspace_invitation: {exc}")
        return api_error("Failed to send invitation", status_code=500)


@router.delete("/{workspace_id}/invitations/{invitation_id}")
async def revoke_workspace_invitation(
    workspace_id: str,
    invitation_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)
        if not _can_manage_team(str(membership.get("role") or "")):
            return api_error("Not allowed to revoke invitations", status_code=403)

        await run_in_threadpool(
            lambda: supabase.table("workspace_invitations")
            .delete()
            .eq("id", invitation_id)
            .eq("workspace_id", workspace_id)
            .is_("accepted_at", "null")
            .execute()
        )
        return api_ok(data={"revoked": True})
    except Exception as exc:
        if _is_missing_team_table_error(exc):
            return api_error(_TEAM_SCHEMA_MISSING, status_code=503)
        print(f"❌ revoke_workspace_invitation: {exc}")
        return api_error("Failed to revoke invitation", status_code=500)


@router.patch("/{workspace_id}/members/{member_user_id}")
async def update_workspace_member_role(
    workspace_id: str,
    member_user_id: str,
    body: WorkspaceMemberRoleBody,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)
        actor_role = str(membership.get("role") or "")

        target = await _get_workspace_membership(supabase, workspace_id, member_user_id)
        if not target:
            return api_error("Member not found", status_code=404)

        target_role = str(target.get("role") or "")
        if target_role == "owner":
            return api_error("The workspace owner role cannot be changed here", status_code=403)
        if member_user_id == user.id:
            return api_error("You cannot change your own role", status_code=403)

        if actor_role == "admin":
            if target_role == "admin":
                return api_error("Admins cannot change other admins", status_code=403)
        elif actor_role != "owner":
            return api_error("Not allowed to change member roles", status_code=403)

        await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .update({"role": body.role})
            .eq("workspace_id", workspace_id)
            .eq("user_id", member_user_id)
            .execute()
        )

        res = await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .select("user_id, role, joined_at, profiles(id, email, full_name, avatar_url)")
            .eq("workspace_id", workspace_id)
            .eq("user_id", member_user_id)
            .single()
            .execute()
        )
        return api_ok(data={"member": _member_to_dict(res.data or {})})
    except Exception as exc:
        print(f"❌ update_workspace_member_role: {exc}")
        return api_error("Failed to update member role", status_code=500)


@router.delete("/{workspace_id}/members/{member_user_id}")
async def remove_workspace_member(
    workspace_id: str,
    member_user_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    try:
        supabase = get_supabase_admin()
        membership = await _get_workspace_membership(supabase, workspace_id, user.id)
        if not membership:
            return api_error("Workspace not found", status_code=404)
        actor_role = str(membership.get("role") or "")

        target = await _get_workspace_membership(supabase, workspace_id, member_user_id)
        if not target:
            return api_error("Member not found", status_code=404)

        target_role = str(target.get("role") or "")
        if target_role == "owner":
            owner_count = await _count_workspace_owners(supabase, workspace_id)
            if owner_count <= 1:
                return api_error("Cannot remove the last workspace owner", status_code=403)
        if target_role == "admin" and actor_role != "owner":
            return api_error("Only the owner can remove admins", status_code=403)
        if target_role == "member" and not _can_manage_team(actor_role):
            return api_error("Not allowed to remove members", status_code=403)
        if member_user_id == user.id and target_role == "owner":
            return api_error("Transfer ownership before leaving as owner", status_code=403)

        await run_in_threadpool(
            lambda: supabase.table("workspace_members")
            .delete()
            .eq("workspace_id", workspace_id)
            .eq("user_id", member_user_id)
            .execute()
        )
        return api_ok(data={"removed": True, "userId": member_user_id})
    except Exception as exc:
        print(f"❌ remove_workspace_member: {exc}")
        return api_error("Failed to remove member", status_code=500)
