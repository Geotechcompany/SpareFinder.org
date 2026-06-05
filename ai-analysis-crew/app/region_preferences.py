"""Load and resolve user region/currency preferences for analysis."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

from .currency_utils import currency_for_country
from .api.supabase_admin import get_supabase_admin


@dataclass(frozen=True)
class UserRegionPrefs:
    use_regional: bool = False
    country: str = ""
    region: str = ""
    currency: str = ""


def _safe_dict(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def fetch_user_region_prefs(user_id: Optional[str]) -> UserRegionPrefs:
    """Read region and currency preferences from the user's profile."""
    if not user_id:
        return UserRegionPrefs()
    try:
        supabase = get_supabase_admin()
        res = (
            supabase.table("profiles")
            .select("use_regional_suppliers, user_country, user_region, preferences")
            .eq("id", user_id)
            .single()
            .execute()
        )
        row = res.data if res and res.data else {}
        prefs = _safe_dict(row.get("preferences"))

        use_regional = row.get("use_regional_suppliers")
        if use_regional is None:
            use_regional = bool(prefs.get("useRegionalSuppliers"))

        country = (row.get("user_country") or prefs.get("userCountry") or "").strip()
        region = (row.get("user_region") or prefs.get("userRegion") or "").strip()
        currency = (prefs.get("userCurrency") or "").strip().upper()
        if not currency and country:
            currency = currency_for_country(country)

        return UserRegionPrefs(
            use_regional=bool(use_regional),
            country=country,
            region=region,
            currency=currency,
        )
    except Exception:
        return UserRegionPrefs()


def resolve_analysis_context(
    user_id: Optional[str],
    user_country: Optional[str] = None,
    user_region: Optional[str] = None,
    user_currency: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Resolve analysis region (only when regional suppliers enabled) and currency.

    Returns (country, region, currency). country/region are None when regional
    search is disabled; currency is resolved whenever available.
    """
    prefs = fetch_user_region_prefs(user_id) if user_id else UserRegionPrefs()

    country = (user_country or "").strip() or prefs.country
    region = (user_region or "").strip() or prefs.region
    if country:
        currency = currency_for_country(country)
    else:
        currency = (user_currency or prefs.currency or "").strip().upper()

    if prefs.use_regional and (country or region):
        return country or None, region or None, currency or None

    return None, None, currency or None


def format_region_label(
    country: Optional[str] = None,
    region: Optional[str] = None,
) -> str:
    """Build a display label e.g. 'Kenya, Nairobi County'."""
    parts = [x.strip() for x in (country or "", region or "") if x and x.strip()]
    return ", ".join(parts)


def inject_search_region_into_report(
    report_text: str,
    region_label: str,
    currency: Optional[str] = None,
) -> str:
    """
    Prepend a SEARCH REGION section to the report when not already present.
    Ensures PDF, email, and stored analysis show which area was searched.
    """
    text = (report_text or "").strip()
    if not region_label or not text:
        return report_text

    if "region searched" in text.lower():
        return text

    currency_line = f"\n- **Currency:** {currency}" if currency else ""
    header = (
        "✅ **SEARCH REGION**\n\n"
        f"- **Region searched:** {region_label}\n"
        f"- **Supplier scope:** Suppliers located in or primarily serving "
        f"{region_label} only{currency_line}\n\n"
        "---\n\n"
    )
    return header + text
