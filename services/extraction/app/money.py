"""Money and date parsing.

Amounts are always integer minor units (cents) so they match the API and the
Midnight commitment. Floats are never used for money.
"""
from __future__ import annotations

import re
from collections import Counter
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

# A number like 120,000.00 / 120000 / 1,20,000.50 / 2,500. Two decimals at most.
_AMOUNT_RE = re.compile(r"(?<![\w.,])(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?(?![\d,]|\.\d)")

_LKR_RE = re.compile(r"\bLKR\b|\bSLR\b|\bRs\.?(?=[\s\d])|\bRupees\b", re.IGNORECASE)
_USD_RE = re.compile(r"\bUSD\b|US\$|\$", re.IGNORECASE)


def parse_amount(text: str) -> int | None:
    """Return the last amount in `text` as minor units, or None.

    Handles "LKR 120,000.00", "Rs. 120,000/=", "USD 2,500" and "$2,500.50".
    The last amount is used because labels such as "Total (2 items)" put
    other numbers first.
    """
    cleaned = text.replace("/=", "").replace(" ", " ")
    matches = list(_AMOUNT_RE.finditer(cleaned))
    if not matches:
        return None
    whole, cents = matches[-1].group(1), matches[-1].group(2) or "0"
    try:
        value = Decimal(whole.replace(",", "")) + Decimal(cents.ljust(2, "0")) / 100
    except InvalidOperation:
        return None
    return int(value * 100)


def parse_number(text: str) -> Decimal | None:
    """Parse a plain quantity such as "5,000" or "2.5"."""
    try:
        return Decimal(text.replace(",", "").strip())
    except InvalidOperation:
        return None


def detect_currency(text: str) -> str | None:
    """Most frequently mentioned currency in the text: "LKR", "USD" or None."""
    counts = Counter({"LKR": len(_LKR_RE.findall(text)), "USD": len(_USD_RE.findall(text))})
    currency, n = counts.most_common(1)[0]
    return currency if n > 0 else None


def format_minor(minor: int, currency: str | None) -> str:
    sign = "-" if minor < 0 else ""
    value = Decimal(abs(minor)) / 100
    return f"{sign}{currency or ''} {value:,.2f}".strip()


_MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec"
DATE_PATTERN = (
    r"(\d{4}-\d{1,2}-\d{1,2}"
    r"|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}"
    rf"|\d{{1,2}}\s+(?:{_MONTHS})[a-z]*\.?,?\s+\d{{4}}"
    rf"|(?:{_MONTHS})[a-z]*\.?\s+\d{{1,2}},?\s+\d{{4}})"
)
_DATE_RE = re.compile(DATE_PATTERN, re.IGNORECASE)

_FORMATS = ["%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y"]


def parse_date(text: str) -> date | None:
    """Parse the first date in `text`. Numeric dates are read day-first (DD/MM/YYYY),
    as is usual in Sri Lanka."""
    m = _DATE_RE.search(text)
    if not m:
        return None
    raw = m.group(1).replace(",", " ").replace(".", " " if re.search("[a-zA-Z]", m.group(1)) else ".")
    raw = re.sub(r"\s+", " ", raw).strip()
    numeric = re.fullmatch(r"(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})", raw)
    if numeric:
        day, month, year = (int(g) for g in numeric.groups())
        try:
            return date(year, month, day)
        except ValueError:
            return None
    raw = raw.replace("Sept", "Sep").replace("sept", "sep")
    for fmt in _FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None
