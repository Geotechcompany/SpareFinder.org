"""Currency helpers for regional supplier intelligence."""

from __future__ import annotations

import re
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
    "KES": 129.0,
    "NGN": 1550.0,
    "GHS": 15.5,
    "TZS": 2600.0,
    "UGX": 3800.0,
    "EGP": 49.0,
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
    "kenya": "KES",
    "nigeria": "NGN",
    "ghana": "GHS",
    "tanzania": "TZS",
    "uganda": "UGX",
    "egypt": "EGP",
    "china": "CNY",
    "south korea": "KRW",
    "thailand": "THB",
    "malaysia": "MYR",
    "philippines": "PHP",
    "pakistan": "PKR",
    "poland": "PLN",
    "czech republic": "CZK",
    "czechia": "CZK",
}

CURRENCY_SYMBOLS: dict[str, str] = {
    "GBP": "£",
    "USD": "$",
    "EUR": "€",
    "JPY": "¥",
    "INR": "₹",
    "ZAR": "R",
    "KES": "KSh",
    "NGN": "₦",
    "GHS": "GH₵",
    "AUD": "A$",
    "CAD": "C$",
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
    symbol_hint = CURRENCY_SYMBOLS.get(code, code)
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


def _detect_line_currency(line: str) -> str:
    if "£" in line or re.search(r"\bGBP\b", line, re.I):
        return "GBP"
    if "€" in line or re.search(r"\bEUR\b", line, re.I):
        return "EUR"
    if "₹" in line or re.search(r"\bINR\b", line, re.I):
        return "INR"
    if "¥" in line or re.search(r"\bJPY\b", line, re.I):
        return "JPY"
    if "KSh" in line or re.search(r"\bKES\b", line, re.I):
        return "KES"
    if "$" in line or re.search(r"\bUSD\b", line, re.I):
        return "USD"
    return "USD"


def _format_converted_amount(amount: float, currency: str) -> str:
    code = (currency or "GBP").upper()
    sym = CURRENCY_SYMBOLS.get(code, f"{code} ")
    rounded = round(amount)
    if code in ("JPY", "INR", "KES", "NGN", "UGX", "TZS"):
        return f"{sym}{rounded:,}"
    return f"{sym}{rounded:,}"


def convert_prices_in_report(report_text: str, target_currency: Optional[str]) -> str:
    """Convert price amounts in report markdown to the user's currency."""
    if not report_text or not target_currency:
        return report_text

    target = target_currency.strip().upper()
    text = re.sub(
        r"(\*\*Currency:\*\*\s*)[A-Z]{3}",
        rf"\1{target}",
        report_text,
        flags=re.IGNORECASE,
    )

    amount_pattern = re.compile(r"([£$€₹]|KSh\s?|R\s?)?([\d,]+(?:\.\d+)?)")

    def convert_line(line: str) -> str:
        if not re.search(r"[£$€₹]|KSh|\b(GBP|USD|EUR|KES)\b", line, re.I):
            return line
        source = _detect_line_currency(line)

        def repl(match: re.Match[str]) -> str:
            raw = match.group(0)
            numeric = float(match.group(2).replace(",", ""))
            converted = convert_amount(numeric, source, target)
            return _format_converted_amount(converted, target)

        return amount_pattern.sub(repl, line)

    return "\n".join(convert_line(line) for line in text.split("\n"))
