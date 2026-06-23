"""Resolve active workspace and membership for data-scoped API routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from .auth_dependencies import CurrentUser, get_current_user
from .http_errors import raise_service_unavailable
from .supabase_admin import get_supabase_admin
from .supabase_resilience import is_transient_http_error, run_supabase

_workspace_isolation_ready: bool | None = None


class WorkspaceScope(BaseModel):
    workspace_id: str
    user_id: str
    billing_user_id: str
    member_user_ids: list[str] = []


async def _fetch_active_workspace_id(user_id: str) -> str | None:
    supabase = get_supabase_admin()
    try:
        res = await run_in_threadpool(
            lambda: run_supabase(
                lambda: supabase.table("profiles")
                .select("active_workspace_id")
                .eq("id", user_id)
                .single()
                .execute()
            )
        )
    except Exception as exc:
        if is_transient_http_error(exc):
            raise_service_unavailable(exc)
        raise
    row = res.data or {}
    wid = str(row.get("active_workspace_id") or "").strip()
    return wid or None


async def is_workspace_member(user_id: str, workspace_id: str) -> bool:
    supabase = get_supabase_admin()
    try:
        res = await run_in_threadpool(
            lambda: run_supabase(
                lambda: supabase.table("workspace_members")
                .select("workspace_id")
                .eq("workspace_id", workspace_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        )
    except Exception as exc:
        if is_transient_http_error(exc):
            raise_service_unavailable(exc)
        raise
    return bool(res.data)


async def _fetch_workspace_member_user_ids(workspace_id: str) -> list[str]:
    supabase = get_supabase_admin()
    try:
        res = await run_in_threadpool(
            lambda: run_supabase(
                lambda: supabase.table("workspace_members")
                .select("user_id")
                .eq("workspace_id", workspace_id)
                .execute()
            )
        )
    except Exception as exc:
        if is_transient_http_error(exc):
            raise_service_unavailable(exc)
        raise
    ids: list[str] = []
    for row in res.data or []:
        uid = str(row.get("user_id") or "").strip()
        if uid and uid not in ids:
            ids.append(uid)
    return ids


async def _resolve_scope(
    user: CurrentUser,
    candidate: str,
) -> WorkspaceScope:
    from .plan_enforcement import resolve_billing_user_id

    billing_user_id, _ = await resolve_billing_user_id(
        user.id, user.role, candidate
    )
    member_user_ids = await _fetch_workspace_member_user_ids(candidate)
    if user.id not in member_user_ids:
        member_user_ids = [user.id, *member_user_ids]
    return WorkspaceScope(
        workspace_id=candidate,
        user_id=user.id,
        billing_user_id=billing_user_id,
        member_user_ids=member_user_ids,
    )


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
        if candidate and await is_workspace_member(user.id, candidate):
            return await _resolve_scope(user, candidate)
        if candidate:
            return await _resolve_scope(user, candidate)

    candidate = (x_workspace_id or "").strip() or await _fetch_active_workspace_id(user.id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workspace. Create or select a workspace first.",
        )

    if not await is_workspace_member(user.id, candidate):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace.",
        )

    return await _resolve_scope(user, candidate)


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


def _scope_member_user_ids(scope: WorkspaceScope) -> list[str]:
    member_ids = list(scope.member_user_ids or [])
    if scope.user_id and scope.user_id not in member_ids:
        member_ids.insert(0, scope.user_id)
    return member_ids or [scope.user_id]


def _legacy_workspace_user_filter(
    scope: WorkspaceScope, *, user_column: str = "user_id"
) -> str:
    """Legacy rows without workspace_id belong to any member of the workspace."""
    member_ids = _scope_member_user_ids(scope)
    if len(member_ids) == 1:
        return f"and(workspace_id.is.null,{user_column}.eq.{member_ids[0]})"
    in_list = ",".join(member_ids)
    return f"and(workspace_id.is.null,{user_column}.in.({in_list}))"


def workspace_or_filter(scope: WorkspaceScope, *, user_column: str = "user_id") -> str:
    wid = scope.workspace_id
    legacy = _legacy_workspace_user_filter(scope, user_column=user_column)
    return f"workspace_id.eq.{wid},{legacy}"


def row_accessible_in_workspace_scope(
    row: dict[str, Any],
    scope: WorkspaceScope,
    *,
    user_column: str = "user_id",
) -> bool:
    """Python-side access check (used when PostgREST or_/eq chains miss rows)."""
    row_user = str(row.get(user_column) or "").strip()
    if row_user == scope.user_id:
        return True

    member_ids = set(_scope_member_user_ids(scope))
    if scope.user_id not in member_ids:
        member_ids.add(scope.user_id)

    if not workspace_isolation_enabled():
        return row_user in member_ids

    row_ws = str(row.get("workspace_id") or "").strip() or None
    if row_ws:
        return row_ws == scope.workspace_id and scope.user_id in member_ids
    return row_user in member_ids


def apply_workspace_filter(query: Any, scope: WorkspaceScope, *, user_column: str = "user_id"):
    """
    Apply workspace isolation to a Supabase filter builder (after .select/.delete/.update).
    Falls back to user_id-only when workspace_id columns are not migrated yet.
    """
    member_ids = _scope_member_user_ids(scope)
    if not _probe_workspace_isolation():
        if len(member_ids) == 1:
            return query.eq(user_column, member_ids[0])
        return query.in_(user_column, member_ids)
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
