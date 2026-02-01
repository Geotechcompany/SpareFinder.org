from __future__ import annotations

from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends, Query

from .auth_dependencies import CurrentUser, get_current_user
from .responses import api_error, api_ok
from .supabase_admin import get_supabase_admin
from .supabase_helpers import supabase_count
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    user: CurrentUser = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
):
    supabase = get_supabase_admin()
    offset = (page - 1) * limit

    res = await run_in_threadpool(
        lambda: (
            supabase.table("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    )
    notifications = res.data if res and res.data else []
    total = await run_in_threadpool(
        lambda: supabase_count(table="notifications", filters=[("user_id", "eq", user.id)])
    )
    unread = await run_in_threadpool(
        lambda: supabase_count(
            table="notifications",
            filters=[("user_id", "eq", user.id), ("read", "eq", False)],
        )
    )

    return api_ok(
        data={
            "notifications": notifications or [],
            "pagination": {"page": page, "limit": limit, "total": total, "unreadCount": unread},
        }
    )


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    await run_in_threadpool(
        lambda: supabase.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", user.id)
        .execute()
    )
    return api_ok(message="Notification marked as read")


@router.patch("/mark-all-read")
async def mark_all_as_read(user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    await run_in_threadpool(
        lambda: supabase.table("notifications")
        .update({"read": True})
        .eq("user_id", user.id)
        .eq("read", False)
        .execute()
    )
    return api_ok(message="All notifications marked as read")


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()
    await run_in_threadpool(
        lambda: supabase.table("notifications")
        .delete()
        .eq("id", notification_id)
        .eq("user_id", user.id)
        .execute()
    )
    return api_ok(message="Notification deleted successfully")


@router.post("")
async def create_notification(
    payload: dict,
    user: CurrentUser = Depends(get_current_user),
):
    title = (payload.get("title") or "").strip()
    message = (payload.get("message") or "").strip()
    ntype = (payload.get("type") or "info").strip()
    action_url: Optional[str] = payload.get("action_url")

    if not title or not message:
        return api_error(status_code=400, error="invalid_request", message="Title and message are required")

    supabase = get_supabase_admin()
    res = await run_in_threadpool(
        lambda: (
            supabase.table("notifications")
            .insert(
                {
                    "user_id": user.id,
                    "title": title,
                    "message": message,
                    "type": ntype,
                    "action_url": action_url,
                    "read": False,
                }
            )
            .select("*")
            .single()
            .execute()
        )
    )
    return api_ok(status_code=201, message="Notification created successfully", data={"notification": res.data})


@router.get("/stats")
async def get_notification_stats(user: CurrentUser = Depends(get_current_user)):
    supabase = get_supabase_admin()

    total = await run_in_threadpool(
        lambda: supabase_count(table="notifications", filters=[("user_id", "eq", user.id)])
    )
    unread = await run_in_threadpool(
        lambda: supabase_count(
            table="notifications",
            filters=[("user_id", "eq", user.id), ("read", "eq", False)],
        )
    )

    types_res = await run_in_threadpool(
        lambda: supabase.table("notifications").select("type").eq("user_id", user.id).execute()
    )
    rows = types_res.data if types_res and types_res.data else []
    counter = Counter([r.get("type") for r in rows if isinstance(r, dict)])

    return api_ok(
        data={
            "total": total,
            "unread": unread,
            "read": max(0, total - unread),
            "byType": dict(counter),
        }
    )
