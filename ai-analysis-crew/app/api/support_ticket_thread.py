"""Shared helpers for support_ticket_messages (admin + user ticket APIs)."""

from __future__ import annotations

from typing import Any


def fetch_ticket_messages_raw(
    supabase: Any, ticket_id: str, *, include_internal: bool
) -> list[dict[str, Any]]:
    """Load threaded messages; returns [] if table missing or query fails."""
    try:
        res = (
            supabase.table("support_ticket_messages")
            .select("id, ticket_id, body, is_internal, author_role, author_id, created_at")
            .eq("ticket_id", ticket_id)
            .order("created_at", desc=False)
            .execute()
        )
        rows: list[dict[str, Any]] = list(res.data or [])
    except Exception:
        return []
    if not include_internal:
        rows = [r for r in rows if not r.get("is_internal")]
    return rows


def enrich_ticket_messages_authors(supabase: Any, messages: list[dict[str, Any]]) -> None:
    """Add author_display in-place for UI."""
    ids = list({str(m["author_id"]) for m in messages if m.get("author_id")})
    by_id: dict[str, dict[str, Any]] = {}
    if ids:
        try:
            pr = supabase.table("profiles").select("id, full_name, email").in_("id", ids).execute()
            for p in pr.data or []:
                pid = p.get("id")
                if pid:
                    by_id[str(pid)] = p
        except Exception:
            pass
    for m in messages:
        role = m.get("author_role")
        aid = m.get("author_id")
        if aid and str(aid) in by_id:
            p = by_id[str(aid)]
            m["author_display"] = (p.get("full_name") or p.get("email") or "").strip() or (
                "Support" if role == "admin" else "Customer"
            )
        else:
            m["author_display"] = "Support" if role == "admin" else "Customer"
