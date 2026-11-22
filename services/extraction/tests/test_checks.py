import json
from pathlib import Path

from app.checks import check_invoice
from app.schemas import CheckRequest

TRUTH = Path(__file__).resolve().parent.parent / "samples" / "truth"

DEMO_INVOICE = {
    "invoice_number": "INV-2026-0042", "invoice_date": "2026-11-20", "due_date": "2027-01-04",
    "terms_days": 45, "currency": "LKR", "subtotal_minor": 15_000_000, "total_minor": 15_000_000,
    "po_reference": "PO-7781",
    "line_items": [{"description": "Corrugated boxes 40x30x30 cm", "quantity": "5000",
                    "unit_price_minor": 3000, "amount_minor": 15_000_000}],
}


def test_demo_invoice_is_30000_more_than_delivered():
    extra = json.loads((TRUTH / "check_invoice_0042.json").read_text())
    result = check_invoice(CheckRequest(invoice=DEMO_INVOICE, **extra))
    assert not result.ok
    short = [d for d in result.discrepancies if d.code == "RECEIPT_QUANTITY_SHORT"]
    assert len(short) == 1
    assert short[0].difference_minor == 3_000_000  # LKR 30,000
    assert "LKR 30,000.00" in short[0].message


def test_corrected_invoice_passes():
    extra = json.loads((TRUTH / "check_invoice_0042.json").read_text())
    corrected = dict(DEMO_INVOICE, subtotal_minor=12_000_000, total_minor=12_000_000, line_items=[
        {"description": "Corrugated boxes 40x30x30 cm", "quantity": "4000",
         "unit_price_minor": 3000, "amount_minor": 12_000_000}])
    result = check_invoice(CheckRequest(invoice=corrected, **extra))
    assert result.ok, result.discrepancies


def test_arithmetic_terms_and_po_errors():
    bad = dict(DEMO_INVOICE, due_date="2027-01-10", total_minor=15_500_000, po_reference="PO-9999",
               line_items=[{"description": "Corrugated boxes 40x30x30 cm", "quantity": "5000",
                            "unit_price_minor": 3000, "amount_minor": 14_000_000}])
    po = {"reference": "PO-7781", "currency": "LKR", "total_minor": 15_000_000}
    codes = {d.code for d in check_invoice(CheckRequest(invoice=bad, purchase_order=po)).discrepancies}
    assert {"LINE_ARITHMETIC", "LINE_ITEMS_SUM", "TOTAL_ARITHMETIC", "DUE_DATE_TERMS",
            "PO_REFERENCE", "PO_AMOUNT_EXCEEDED"} <= codes


def test_missing_fields():
    result = check_invoice(CheckRequest(invoice={}))
    assert sum(d.code == "MISSING_FIELD" for d in result.discrepancies) == 5
