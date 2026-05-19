"""Resolve active workspace and membership for data-scoped API routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .supabase_admin import get_supabase_admin

_workspace_isolation_ready: bool | None = None


class WorkspaceScope(BaseModel):
    workspace_id: str
    user_id: str


async def _fetch_active_workspace_id(user_id: str) -> str | None:
    supabase = get_supabase_admin()
    res = await run_in_threadpool(
        lambda: supabase.table("profiles")
        .select("active_workspace_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    row = res.data or {}
    wid = str(row.get("active_workspace_id") or "").strip()
    return wid or None


async def _is_workspace_member(user_id: str, workspace_id: str) -> bool:
    supabase = get_supabase_admin()
    res = await run_in_threadpool(
        lambda: supabase.table("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(res.data)


async def get_workspace_scope(
    user: CurrentUser = Depends(get_current_user),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> WorkspaceScope:
    """
    Resolve the workspace used to scope reads/writes.
    Prefers X-Workspace-Id when the user is a member; otherwise profiles.active_workspace_id.
    """
    if user.role in ("admin", "super_admin"):
        # Admins may omit workspace; use header or profile default for dashboard preview.
        candidate = (x_workspace_id or "").strip() or await _fetch_active_workspace_id(user.id)
        if candidate and await _is_workspace_member(user.id, candidate):
            return WorkspaceScope(workspace_id=candidate, user_id=user.id)
        if candidate:
            return WorkspaceScope(workspace_id=candidate, user_id=user.id)

    candidate = (x_workspace_id or "").strip() or await _fetch_active_workspace_id(user.id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace. Create or select a workspace first.",
        )

    if not await _is_workspace_member(user.id, candidate):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace.",
        )

    return WorkspaceScope(workspace_id=candidate, user_id=user.id)


def _workspace_column_missing(exc: BaseException) -> bool:
    text = str(exc).lower()
    if "42703" in text or "pgrst204" in text:
        return True
    if "workspace_id" not in text:
        return False
    return any(
        marker in text
        for marker in (
            "does not exist",
            "could not find",
            "schema cache",
        )
    )


def workspace_isolation_enabled() -> bool:
    """True when workspace_id columns exist on analysis tables."""
    return _probe_workspace_isolation()


def _probe_workspace_isolation() -> bool:
    """Return True when workspace_id columns exist on crew_analysis_jobs."""
    global _workspace_isolation_ready
    if _workspace_isolation_ready is not None:
        return _workspace_isolation_ready

    supabase = get_supabase_admin()
    try:
        supabase.table("crew_analysis_jobs").select("workspace_id").limit(1).execute()
        _workspace_isolation_ready = True
    except Exception as exc:
        if _workspace_column_missing(exc):
            _workspace_isolation_ready = False
        else:
            # Network/transient errors: do not enable workspace columns
            _workspace_isolation_ready = False

    return _workspace_isolation_ready


def reset_workspace_isolation_probe() -> None:
    """Clear cached probe (e.g. after running DB migrations)."""
    global _workspace_isolation_ready
    _workspace_isolation_ready = None


def workspace_or_filter(scope: WorkspaceScope, *, user_column: str = "user_id") -> str:
    wid = scope.workspace_id
    uid = scope.user_id
    return f"workspace_id.eq.{wid},and(workspace_id.is.null,{user_column}.eq.{uid})"


def apply_workspace_filter(query: Any, scope: WorkspaceScope, *, user_column: str = "user_id"):
    """
    Apply workspace isolation to a Supabase filter builder (after .select/.delete/.update).
    Falls back to user_id-only when workspace_id columns are not migrated yet.
    """
    if not _probe_workspace_isolation():
        return query.eq(user_column, scope.user_id)
    return query.or_(workspace_or_filter(scope, user_column=user_column))


def workspace_select(
    supabase: Any,
    table: str,
    scope: WorkspaceScope,
    select: str = "*",
    *,
    user_column: str = "user_id",
    **select_kwargs: Any,
):
    query = supabase.table(table).select(select, **select_kwargs)
    return apply_workspace_filter(query, scope, user_column=user_column)


def workspace_delete(
    supabase: Any,
    table: str,
    scope: WorkspaceScope,
    *,
    user_column: str = "user_id",
):
    query = supabase.table(table).delete()
    return apply_workspace_filter(query, scope, user_column=user_column)


def workspace_update(
    supabase: Any,
    table: str,
    scope: WorkspaceScope,
    values: dict[str, Any],
    *,
    user_column: str = "user_id",
):
    query = supabase.table(table).update(values)
    return apply_workspace_filter(query, scope, user_column=user_column)
