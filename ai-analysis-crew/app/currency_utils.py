"""Currency helpers for regional supplier intelligence."""

from __future__ import annotations

from typing import Optional

# Approximate rates vs USD for display conversion (updated periodically).
RATES_FROM_USD: dict[str, float] = {
    "USD": 1.0,
    "GBP": 0.79,
    "EUR": 0.92,
    "CAD": 1.36,
    "AUD": 1.53,
    "NZD": 1.67,
    "JPY": 149.0,
    "INR": 83.0,
    "ZAR": 18.5,
    "AED": 3.67,
    "SAR": 3.75,
    "CHF": 0.88,
    "SEK": 10.5,
    "NOK": 10.8,
    "DKK": 6.9,
    "SGD": 1.34,
    "HKD": 7.82,
    "MXN": 17.0,
    "BRL": 5.0,
}

COUNTRY_TO_CURRENCY: dict[str, str] = {
    "united kingdom": "GBP",
    "uk": "GBP",
    "great britain": "GBP",
    "england": "GBP",
    "scotland": "GBP",
    "wales": "GBP",
    "northern ireland": "GBP",
    "united states": "USD",
    "usa": "USD",
    "us": "USD",
    "canada": "CAD",
    "australia": "AUD",
    "new zealand": "NZD",
    "ireland": "EUR",
    "france": "EUR",
    "germany": "EUR",
    "spain": "EUR",
    "italy": "EUR",
    "netherlands": "EUR",
    "belgium": "EUR",
    "portugal": "EUR",
    "india": "INR",
    "japan": "JPY",
    "south africa": "ZAR",
    "united arab emirates": "AED",
    "uae": "AED",
    "saudi arabia": "SAR",
    "switzerland": "CHF",
    "sweden": "SEK",
    "norway": "NOK",
    "denmark": "DKK",
    "singapore": "SGD",
    "hong kong": "HKD",
    "mexico": "MXN",
    "brazil": "BRL",
}


def currency_for_country(country: str) -> str:
    """Map a country name to ISO currency code."""
    key = (country or "").strip().lower()
    if not key:
        return "GBP"
    if key in COUNTRY_TO_CURRENCY:
        return COUNTRY_TO_CURRENCY[key]
    for name, code in COUNTRY_TO_CURRENCY.items():
        if name in key or key in name:
            return code
    return "GBP"


def currency_instruction(currency: Optional[str]) -> str:
    """Prompt block requiring prices in the user's currency."""
    code = (currency or "").strip().upper()
    if not code:
        return ""
    symbol_hint = {"GBP": "£", "USD": "$", "EUR": "€"}.get(code, code)
    return f"""
        **MANDATORY CURRENCY: User location currency is {code}.**
        - Quote ALL prices in {code} only (use {symbol_hint} where appropriate).
        - If source prices are in another currency, convert to {code} using current approximate exchange rates.
        - Price range format example: {symbol_hint}1,800 - {symbol_hint}2,600 ({code})
        """


def convert_amount(amount: float, from_currency: str, to_currency: str) -> float:
    """Convert a numeric amount between currencies using USD as pivot."""
    src = (from_currency or "USD").strip().upper()
    dst = (to_currency or "GBP").strip().upper()
    if src == dst:
        return amount
    src_rate = RATES_FROM_USD.get(src, 1.0)
    dst_rate = RATES_FROM_USD.get(dst, 1.0)
    usd = amount / src_rate if src_rate else amount
    return usd * dst_rate
