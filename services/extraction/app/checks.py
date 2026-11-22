"""Deterministic checks on a confirmed invoice.

No AI here: plain arithmetic and matching against the purchase order and the
delivery receipt, with specific reasons the buyer can act on.
"""
from __future__ import annotations

import re
from datetime import timedelta
from difflib import SequenceMatcher

from .money import format_minor
from .schemas import CheckRequest, CheckResult, Discrepancy


def _norm_ref(ref: str | None) -> str:
    return re.sub(r"[^A-Z0-9]", "", (ref or "").upper())


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def check_invoice(req: CheckRequest) -> CheckResult:
    inv, po, receipt = req.invoice, req.purchase_order, req.delivery_receipt
    cur = inv.currency
    out: list[Discrepancy] = []

    def add(code: str, severity: str, message: str, diff: int | None = None) -> None:
        out.append(Discrepancy(code=code, severity=severity, message=message, difference_minor=diff))

    for name in ("invoice_number", "invoice_date", "due_date", "currency", "total_minor"):
        if getattr(inv, name) is None:
            add("MISSING_FIELD", "error", f"{name.replace('_', ' ')} is required.")

    for item in inv.line_items:
        expected = int(item.quantity * item.unit_price_minor)
        if expected != item.amount_minor:
            add("LINE_ARITHMETIC", "error",
                f"'{item.description}': {item.quantity} x {format_minor(item.unit_price_minor, cur)} is "
                f"{format_minor(expected, cur)}, not {format_minor(item.amount_minor, cur)}.",
                item.amount_minor - expected)

    if inv.line_items:
        lines_sum = sum(i.amount_minor for i in inv.line_items)
        target = inv.subtotal_minor if inv.subtotal_minor is not None else (
            inv.total_minor - (inv.tax_minor or 0) if inv.total_minor is not None else None)
        if target is not None and lines_sum != target:
            add("LINE_ITEMS_SUM", "error",
                f"Line items add up to {format_minor(lines_sum, cur)}, but the invoice says "
                f"{format_minor(target, cur)}.", target - lines_sum)

    if inv.subtotal_minor is not None and inv.total_minor is not None:
        expected_total = inv.subtotal_minor + (inv.tax_minor or 0)
        if expected_total != inv.total_minor:
            add("TOTAL_ARITHMETIC", "error",
                f"Subtotal plus tax is {format_minor(expected_total, cur)}, but the total is "
                f"{format_minor(inv.total_minor, cur)}.", inv.total_minor - expected_total)

    if inv.invoice_date and inv.terms_days is not None and inv.due_date:
        expected_due = inv.invoice_date + timedelta(days=inv.terms_days)
        if expected_due != inv.due_date:
            add("DUE_DATE_TERMS", "warning",
                f"{inv.terms_days}-day terms from {inv.invoice_date} give {expected_due}, "
                f"but the due date is {inv.due_date}.")

    if po:
        if _norm_ref(inv.po_reference) != _norm_ref(po.reference):
            add("PO_REFERENCE", "error",
                f"Invoice refers to purchase order '{inv.po_reference or 'none'}', expected '{po.reference}'.")
        if cur and cur != po.currency:
            add("CURRENCY", "error", f"Invoice is in {cur} but the purchase order is in {po.currency}.")
        if inv.total_minor is not None and inv.total_minor > po.total_minor:
            add("PO_AMOUNT_EXCEEDED", "error",
                f"Invoice total {format_minor(inv.total_minor, cur)} exceeds the purchase order total "
                f"{format_minor(po.total_minor, po.currency)}.", inv.total_minor - po.total_minor)

    if receipt:
        for item in inv.line_items:
            best = max(receipt.lines, key=lambda r: _similar(r.description, item.description), default=None)
            if best is None or _similar(best.description, item.description) < 0.6:
                add("RECEIPT_ITEM_MISSING", "warning",
                    f"'{item.description}' is not on the delivery receipt.")
                continue
            if item.quantity > best.quantity_received:
                short = item.quantity - best.quantity_received
                value = int(short * item.unit_price_minor)
                add("RECEIPT_QUANTITY_SHORT", "error",
                    f"'{item.description}': invoiced {item.quantity}, received {best.quantity_received}. "
                    f"The invoice is {format_minor(value, cur)} more than what was delivered.", value)

    return CheckResult(ok=not any(d.severity == "error" for d in out), discrepancies=out)
