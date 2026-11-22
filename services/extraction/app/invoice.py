"""Read invoice fields from document text.

Rules first: labelled fields ("Invoice No:", "Due Date:", "Total") are found with
patterns, then cross-checked. Every field gets a confidence so the review screen
can highlight what a person should check. Nothing here is final: the buyer
confirms or corrects every value.
"""
from __future__ import annotations

import re
from datetime import timedelta

from .money import DATE_PATTERN, detect_currency, parse_amount, parse_date, parse_number
from .schemas import ExtractedField, ExtractedLineItem
from .text import DocumentText

_REF = r"([A-Z0-9][A-Z0-9\-/]{2,})"
_I = re.IGNORECASE

INVOICE_NO = re.compile(rf"invoice\s*(?:no\.?|number|num\.?|#)\s*[:#.]?\s*{_REF}", _I)
PO_REF = re.compile(
    rf"(?:\bP\.?\s?O\.?|purchase\s+order)\s*(?:no\.?|number|#|ref(?:erence)?\.?)?\s*[:#.]?\s*{_REF}", _I
)
INVOICE_DATE = re.compile(rf"(?:invoice\s+date|date\s+of\s+issue|issue\s+date|^date)\s*[:.]?\s*{DATE_PATTERN}", _I)
DUE_DATE = re.compile(rf"(?:due\s+date|payment\s+due|due\s+on)\s*[:.]?\s*{DATE_PATTERN}", _I)
TERMS = re.compile(r"(?:terms|credit\s+period)\s*[:.]?\s*(?:net\s*)?(\d{1,3})\s*days|\bnet\s*(\d{1,3})\b", _I)
TOTAL = re.compile(r"\b(grand\s+total|total\s+due|total\s+payable|amount\s+due|balance\s+due|total)\b", _I)
SUBTOTAL = re.compile(r"\bsub\s*-?\s*total\b", _I)
TAX = re.compile(r"\b(vat|tax|sscl|gst)\b", _I)
SUPPLIER_LABEL = re.compile(r"^\s*(?:from|supplier|seller|vendor|issued\s+by)\s*[:]\s*(.*)$", _I)
BUYER_LABEL = re.compile(r"^\s*(?:bill(?:ed)?\s+to|buyer|customer|sold\s+to|to)\s*[:]\s*(.*)$", _I)
LINE_ITEM = re.compile(
    r"^(?P<desc>[A-Za-z].*?)\s+(?P<qty>\d[\d,]*(?:\.\d+)?)\s+"
    r"(?P<unit>\d[\d,]*(?:\.\d{1,2})?)\s+(?P<amount>\d[\d,]*(?:\.\d{1,2})?)\s*$"
)
NOT_A_NAME = re.compile(r"invoice|tax|date|page|^\W*$", _I)


def _lower(conf: str) -> str:
    return {"high": "medium", "medium": "low"}.get(conf, conf)


def _first(pattern: re.Pattern[str], lines: list[str]) -> tuple[re.Match[str], str] | None:
    for line in lines:
        m = pattern.search(line)
        if m:
            return m, line
    return None


def _name_after_label(pattern: re.Pattern[str], lines: list[str]) -> tuple[str, str] | None:
    for i, line in enumerate(lines):
        m = pattern.match(line)
        if not m:
            continue
        rest = m.group(1).strip()
        if rest and not NOT_A_NAME.search(rest):
            return rest, line
        if i + 1 < len(lines) and not NOT_A_NAME.search(lines[i + 1]):
            return lines[i + 1].strip(), lines[i + 1]
    return None


def _amount_line(lines: list[str], wanted: re.Pattern[str], exclude: re.Pattern[str] | None) -> tuple[int, str] | None:
    """Last line matching `wanted` (and not `exclude`) that contains an amount."""
    found = None
    for line in lines:
        if not wanted.search(line) or (exclude and exclude.search(line)):
            continue
        if re.search(r"reg(istration)?\.?\s*(no|number)", line, _I):
            continue  # "VAT Reg No: 1234..." is not an amount
        amount = parse_amount(line)
        if amount is not None:
            found = (amount, line)
    return found


def parse_invoice(doc: DocumentText) -> tuple[dict[str, ExtractedField], list[ExtractedLineItem], list[str]]:
    lines = [ln.strip() for ln in doc.text.splitlines() if ln.strip()]
    base = "high"
    reasons: list[str] = []
    if doc.ocr_confidence is not None and doc.ocr_confidence < 75:
        base = "medium"
        reasons.append(f"Scan quality is low (OCR confidence {doc.ocr_confidence}). Check every field.")

    fields: dict[str, ExtractedField] = {}

    def put(name: str, value, conf: str, line: str | None) -> None:
        fields[name] = ExtractedField(value=value, confidence=conf if value is not None else "missing", source_line=line)

    hit = _first(INVOICE_NO, lines)
    put("invoice_number", hit[0].group(1).upper() if hit else None, base, hit[1] if hit else None)

    hit = _first(PO_REF, lines)
    put("po_reference", hit[0].group(1).upper() if hit else None, base, hit[1] if hit else None)

    hit = _first(INVOICE_DATE, lines)
    invoice_date = parse_date(hit[0].group(1)) if hit else None
    put("invoice_date", invoice_date.isoformat() if invoice_date else None, base, hit[1] if hit else None)

    hit = _first(TERMS, lines)
    terms = int(hit[0].group(1) or hit[0].group(2)) if hit else None
    put("terms_days", terms, base, hit[1] if hit else None)

    hit = _first(DUE_DATE, lines)
    due_date = parse_date(hit[0].group(1)) if hit else None
    if due_date:
        put("due_date", due_date.isoformat(), base, hit[1])
    elif invoice_date and terms:
        computed = invoice_date + timedelta(days=terms)
        put("due_date", computed.isoformat(), _lower(base), None)
        reasons.append("Due date was not printed; calculated from the invoice date and payment terms.")
    else:
        put("due_date", None, base, None)


    hit = _name_after_label(SUPPLIER_LABEL, lines)
    if hit:
        put("supplier_name", hit[0], base, hit[1])
    else:  # fall back to the first line that looks like a company name
        top = next((ln for ln in lines[:4]
                    if not NOT_A_NAME.search(ln) and ":" not in ln and not re.search(r"\d{3}", ln)), None)
        company = top and re.search(r"\b(ltd|plc|pvt|inc|company|co\.)\b", top, _I)
        put("supplier_name", top, "medium" if company else "low", top)

    hit = _name_after_label(BUYER_LABEL, lines)
    put("buyer_name", hit[0] if hit else None, base, hit[1] if hit else None)

    subtotal = _amount_line(lines, SUBTOTAL, None)
    put("subtotal_minor", subtotal[0] if subtotal else None, base, subtotal[1] if subtotal else None)

    tax = _amount_line(lines, TAX, SUBTOTAL)
    if tax and TOTAL.search(tax[1]) and not re.search(r"\b(vat|tax)\s*\(?\d", tax[1], _I):
        tax = None  # a "Total incl. VAT" line is the total, not the tax
    put("tax_minor", tax[0] if tax else None, base, tax[1] if tax else None)

    total = _amount_line(lines, TOTAL, re.compile(r"sub\s*-?\s*total|\b(vat|tax)\s*\(", _I))
    put("total_minor", total[0] if total else None, base, total[1] if total else None)

    # Currency printed on the total line wins; otherwise the most mentioned one.
    currency = (detect_currency(total[1]) if total else None) or detect_currency(doc.text)
    put("currency", currency, base, total[1] if total and detect_currency(total[1]) else None)

    items: list[ExtractedLineItem] = []
    for line in lines:
        if TOTAL.search(line) or SUBTOTAL.search(line) or TAX.search(line):
            continue
        m = LINE_ITEM.match(line)
        if not m:
            continue
        qty = parse_number(m.group("qty"))
        unit = parse_amount(m.group("unit"))
        amount = parse_amount(m.group("amount"))
        if qty is None or unit is None or amount is None:
            continue
        items.append(
            ExtractedLineItem(
                description=m.group("desc").strip(),
                quantity=qty,
                unit_price_minor=unit,
                amount_minor=amount,
                arithmetic_ok=int(qty * unit) == amount,
            )
        )

    # Cross-checks that change confidence.
    if total and subtotal and fields["total_minor"].value is not None:
        expected = subtotal[0] + (tax[0] if tax else 0)
        if expected == total[0]:
            for name in ("subtotal_minor", "total_minor"):
                fields[name].confidence = "high"
        else:
            fields["total_minor"].confidence = "low"
            reasons.append("Subtotal plus tax does not equal the total.")
    if items and fields["total_minor"].value is not None and not subtotal:
        if sum(i.amount_minor for i in items) + (tax[0] if tax else 0) != total[0]:
            reasons.append("Line items do not add up to the total.")

    for name, label in (("invoice_number", "invoice number"), ("total_minor", "total"),
                        ("due_date", "due date"), ("buyer_name", "buyer")):
        if fields[name].value is None:
            reasons.append(f"Could not find the {label}. Enter it manually.")
    if any(not i.arithmetic_ok for i in items):
        reasons.append("A line item's quantity times unit price does not equal its amount.")

    return fields, items, reasons
