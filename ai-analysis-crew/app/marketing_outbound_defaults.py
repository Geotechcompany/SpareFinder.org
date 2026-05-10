"""Shared marketing defaults: settings row + default outbound campaign resolution."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_marketing_settings_row(supabase: Any) -> dict[str, Any]:
    """Load or bootstrap marketing_settings.defaults."""
    r = supabase.table("marketing_settings").select("*").eq("setting_key", "defaults").execute()
    if r.data:
        return r.data[0]
    supabase.table("marketing_settings").insert(
        {
            "setting_key": "defaults",
            "setting_value": {
                "serp_query_templates": [],
                "serp_results_per_query": 10,
                "google_search_provider": "serper",
                # In-process scheduler (see marketing_scheduled_tasks); 0 = off until set in admin.
                "scheduled_discover_interval_sec": 0,
                "scheduled_send_interval_sec": 0,
                "scheduled_discover_max_queries": 3,
                "scheduled_send_batch": 20,
            },
        }
    ).execute()
    r2 = supabase.table("marketing_settings").select("*").eq("setting_key", "defaults").execute()
    return (r2.data or [{}])[0]


def default_campaign_id_for_new_leads(supabase: Any) -> str | None:
    """
    Campaign for new or orphan leads when none is passed explicitly.
    Settings pin → unpaused highest priority → any campaign (so rows are not left without a campaign).
    """
    try:
        row = get_marketing_settings_row(supabase)
        val = row.get("setting_value") or {}
        explicit = str(val.get("default_outbound_campaign_id") or "").strip()
        if explicit:
            chk = supabase.table("marketing_campaigns").select("id").eq("id", explicit).limit(1).execute()
            if chk.data:
                return explicit
        r = (
            supabase.table("marketing_campaigns")
            .select("id")
            .eq("is_paused", False)
            .order("priority", desc=True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = r.data or []
        if rows:
            return str(rows[0]["id"])
        r_any = (
            supabase.table("marketing_campaigns")
            .select("id")
            .order("priority", desc=True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows_any = r_any.data or []
        return str(rows_any[0]["id"]) if rows_any else None
    except Exception as e:
        logger.warning("default_campaign_id_for_new_leads: %s", e)
        return None
