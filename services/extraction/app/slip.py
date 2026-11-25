"""Read bank transfer slips and compare them with the payment instruction.

A match is only evidence. The lender's confirmation decides that money arrived.
"""
from __future__ import annotations

import re

from .money import DATE_PATTERN, detect_currency, format_minor, parse_amount, parse_date
from .schemas import ExtractedField, PaymentInstruction, SlipMatch, SlipReason
from .text import DocumentText

_I = re.IGNORECASE
AMOUNT = re.compile(r"\b(transfer\s+amount|amount\s+transferred|amount|debited|total)\b", _I)
DATE = re.compile(rf"\b(?:transaction|transfer|value|payment|posting)?\s*date\b\s*[:.]?\s*{DATE_PATTERN}", _I)
ACCOUNT = re.compile(
    r"\b(?:beneficiary|payee|to|credit(?:ed)?|recipient|destination)\s*(?:account|acct|a/c)\b"
    r"\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Z0-9Xx*][A-Z0-9Xx* \-]{5,})"
    r"|\bIBAN\s*[:.]?\s*([A-Z]{2}\d{2}[A-Z0-9 ]{10,})",
    _I,
)
REFERENCE = re.compile(
    r"\b(?:payment\s+reference|reference|ref\.?|remarks|narration|description|payment\s+details)"
    r"\s*(?:no\.?)?\s*[:.]?\s*(.+)$",
    _I,
)
BENEFICIARY = re.compile(r"\b(?:beneficiary|payee)\s*(?:name)?\s*[:]\s*([A-Za-z].+)$", _I)
INSTRUCTION_REF = re.compile(r"\bINV-[A-Z0-9]{3,}-\d{2}\b", _I)


def _norm(text: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def parse_slip(doc: DocumentText) -> dict[str, ExtractedField]:
    lines = [ln.strip() for ln in doc.text.splitlines() if ln.strip()]
    base = "medium" if doc.ocr_confidence is not None and doc.ocr_confidence < 75 else "high"
    fields: dict[str, ExtractedField] = {}

    def put(name: str, value, line: str | None, conf: str = base) -> None:
        fields[name] = ExtractedField(value=value, confidence=conf if value is not None else "missing", source_line=line)

    amount = None
    for line in lines:
        if AMOUNT.search(line) and not re.search(r"charge|fee|commission", line, _I):
            value = parse_amount(line)
            if value is not None:
                amount = (value, line)
                break
    put("amount_minor", amount[0] if amount else None, amount[1] if amount else None)
    # Prefer the currency printed on the amount line; other lines may mention fees in another currency.
    currency = (detect_currency(amount[1]) if amount else None) or detect_currency(doc.text)
    put("currency", currency, amount[1] if amount else None)

    date_hit = next(((DATE.search(ln), ln) for ln in lines if DATE.search(ln)), None)
    parsed = parse_date(date_hit[0].group(1)) if date_hit else None
    put("transfer_date", parsed.isoformat() if parsed else None, date_hit[1] if date_hit else None)

    acct = next(((ACCOUNT.search(ln), ln) for ln in lines if ACCOUNT.search(ln)), None)
    acct_value = (acct[0].group(1) or acct[0].group(2)).strip() if acct else None
    put("destination_account", acct_value, acct[1] if acct else None)

    ref = None
    for line in lines:
        m = INSTRUCTION_REF.search(line)
        if m:
            ref = (m.group(0).upper(), line)
            break
    if ref is None:
        hit = next(((REFERENCE.search(ln), ln) for ln in lines if REFERENCE.search(ln)), None)
        if hit:
            ref = (hit[0].group(1).strip(), hit[1])
    put("reference", ref[0] if ref else None, ref[1] if ref else None, base if ref and INSTRUCTION_REF.search(ref[0]) else "low")

    ben = next(((BENEFICIARY.search(ln), ln) for ln in lines if BENEFICIARY.search(ln)), None)
    put("beneficiary_name", ben[0].group(1).strip() if ben else None, ben[1] if ben else None)
    return fields


def match_slip(fields: dict[str, ExtractedField], expected: PaymentInstruction, full_text: str) -> SlipMatch:
    reasons: list[SlipReason] = []

    def add(code: str, severity: str, message: str) -> None:
        reasons.append(SlipReason(code=code, severity=severity, message=message))

    amount = fields["amount_minor"].value
    if amount is None:
        add("AMOUNT_UNREADABLE", "error", "Could not read the amount on the slip.")
    elif amount < expected.amount_minor:
        add("AMOUNT_SHORT", "error",
            f"Slip shows {format_minor(amount, expected.currency)}, "
            f"{format_minor(expected.amount_minor - amount, expected.currency)} less than required.")
    elif amount > expected.amount_minor:
        add("AMOUNT_OVER", "warning",
            f"Slip shows {format_minor(amount, expected.currency)}, more than the "
            f"{format_minor(expected.amount_minor, expected.currency)} required.")

    currency = fields["currency"].value
    if currency and currency != expected.currency:
        add("CURRENCY", "error", f"Slip is in {currency}, the instruction is in {expected.currency}.")

    account = fields["destination_account"].value
    want = _norm(expected.destination_account)
    if not account:
        add("ACCOUNT_UNREADABLE", "error", "Could not read the destination account.")
    else:
        got = _norm(account)
        visible = re.sub(r"[X*]", "", got)
        if got == want:
            pass
        elif visible and got != visible and want.endswith(visible) and len(visible) >= 4:
            add("ACCOUNT_PARTIAL", "warning",
                f"The slip masks the account number. The visible digits ({visible}) match.")
        else:
            add("ACCOUNT_MISMATCH", "error",
                f"Money was sent to account {account}, not the recorded lender's account.")

    want_ref = _norm(expected.reference)
    if want_ref not in _norm(fields["reference"].value) and want_ref not in _norm(full_text):
        add("REFERENCE_MISSING", "error",
            f"Payment reference {expected.reference} is not on the slip, so the payment cannot be matched "
            f"to this invoice automatically.")

    if fields["transfer_date"].value is None:
        add("DATE_UNREADABLE", "warning", "Could not read the transfer date. The lender's arrival date decides.")

    critical = {"AMOUNT_UNREADABLE", "ACCOUNT_UNREADABLE"}
    if any(r.code in critical for r in reasons) and amount is None:
        status = "unreadable"
    elif any(r.severity == "error" for r in reasons):
        status = "mismatch"
    else:
        status = "match"
    return SlipMatch(status=status, reasons=reasons)
