from app.invoice import parse_invoice
from app.schemas import PaymentInstruction
from app.slip import match_slip, parse_slip
from app.text import DocumentText


def doc(text: str, conf: float | None = None) -> DocumentText:
    return DocumentText(text=text, source="ocr" if conf else "pdf_text", pages=1, ocr_confidence=conf)


INVOICE_TEXT = """Lanka Demo Traders Ltd
TAX INVOICE
Invoice No: INV-77
Invoice Date: 01/12/2026
P.O. Number: PO-1
Terms: Net 30 days
Bill To: Market Buyer (Pvt) Ltd
Widgets 10 1,000.00 10,000.00
Gadgets 2 2,500.00 5,000.00
Total LKR 15,000.00
"""


def test_invoice_text_with_computed_due_date():
    fields, items, reasons = parse_invoice(doc(INVOICE_TEXT))
    assert fields["invoice_number"].value == "INV-77"
    assert fields["po_reference"].value == "PO-1"
    assert fields["due_date"].value == "2026-12-31"
    assert fields["due_date"].confidence == "medium"
    assert fields["total_minor"].value == 1_500_000
    assert fields["buyer_name"].value == "Market Buyer (Pvt) Ltd"
    assert fields["supplier_name"].confidence == "medium"
    assert [i.amount_minor for i in items] == [1_000_000, 500_000]
    assert any("calculated" in r for r in reasons)


def test_low_ocr_confidence_lowers_fields():
    fields, _, reasons = parse_invoice(doc(INVOICE_TEXT, conf=60.0))
    assert fields["invoice_number"].confidence == "medium"
    assert any("Scan quality" in r for r in reasons)


def test_missing_total_is_reported():
    fields, _, reasons = parse_invoice(doc("Invoice No: X-100\nBill To: Someone Ltd"))
    assert fields["total_minor"].value is None
    assert any("total" in r for r in reasons)


SLIP_TEXT = """Demo Bank
Transaction Date: 04/01/2027
Beneficiary Account No: 8001 2345 6789
Amount: LKR 120,000.00
Bank charges: LKR 50.00
Payment Reference: INV-7Q4K-01
"""
EXPECTED = PaymentInstruction(amount_minor=12_000_000, currency="LKR",
                              destination_account="800123456789", reference="INV-7Q4K-01")


def test_slip_match():
    fields = parse_slip(doc(SLIP_TEXT))
    assert fields["amount_minor"].value == 12_000_000  # bank charge line is ignored
    assert match_slip(fields, EXPECTED, SLIP_TEXT).status == "match"


def test_slip_wrong_account_and_currency():
    text = SLIP_TEXT.replace("8001 2345 6789", "1111 2222 3333").replace("LKR 120,000.00", "USD 120,000.00")
    result = match_slip(parse_slip(doc(text)), EXPECTED, text)
    codes = {r.code for r in result.reasons}
    assert result.status == "mismatch"
    assert {"ACCOUNT_MISMATCH", "CURRENCY"} <= codes


def test_unreadable_slip():
    text = "blurry photo"
    assert match_slip(parse_slip(doc(text)), EXPECTED, text).status == "unreadable"
