"""Generate fictional invoices and bank slips for tests, evaluation and the demo.

All companies, banks, accounts and references are invented.

    python scripts/make_samples.py

Writes PDFs (with a text layer), "scanned" PNG/JPEG images and ground-truth
JSON files into samples/ and samples/truth/.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent / "samples"
TRUTH = ROOT / "truth"

# A document is a list of rows; each row is a list of (x position 0-1, text).
Row = list[tuple[float, str]]


def invoice_rows(d: dict) -> list[Row]:
    rows: list[Row] = [
        [(0.06, d["supplier"])],
        [(0.06, d["supplier_address"])],
        [(0.06, "VAT Reg No: 114-000000-7000")],
        [],
        [(0.06, "TAX INVOICE")],
        [],
        [(0.06, f"Invoice No: {d['invoice_number']}"), (0.55, f"Invoice Date: {d['invoice_date_text']}")],
        [(0.06, f"PO No: {d['po']}"), (0.55, f"Payment Terms: Net {d['terms']} days")],
    ]
    if d.get("due_text"):
        rows.append([(0.55, f"Due Date: {d['due_text']}")])
    rows += [
        [],
        [(0.06, "Bill To:")],
        [(0.06, d["buyer"])],
        [(0.06, d["buyer_address"])],
        [],
        [(0.06, "Description"), (0.55, "Qty"), (0.68, "Unit Price"), (0.84, "Amount")],
    ]
    for desc, qty, unit, amount in d["items"]:
        rows.append([(0.06, desc), (0.55, qty), (0.68, unit), (0.84, amount)])
    rows.append([])
    for label, value in d["totals"]:
        rows.append([(0.55, label), (0.84, value)])
    rows += [[], [(0.06, "Thank you for your business.")]]
    return rows


def write_pdf(rows: list[Row], path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    y = height - 60
    for row in rows:
        for x, text in row:
            c.setFont("Helvetica-Bold" if text in ("TAX INVOICE", "FUND TRANSFER CONFIRMATION") else "Helvetica", 10)
            c.drawString(x * width, y, text)
        y -= 18
    c.save()


def write_scan(rows: list[Row], path: Path, seed: int, angle: float = 0.6) -> None:
    random.seed(seed)
    width, height = 1700, 60 + 44 * len(rows) + 120
    img = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=30)
    y = 60
    for row in rows:
        for x, text in row:
            draw.text((x * width, y), text, fill=random.randint(15, 45), font=font)
        y += 44
    for _ in range(width * height // 400):  # speckle noise
        draw.point((random.randrange(width), random.randrange(height)), fill=random.randint(120, 200))
    img = img.rotate(angle, expand=True, fillcolor=255, resample=Image.Resampling.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    if path.suffix == ".jpg":
        img.save(path, quality=72)
    else:
        img.save(path)


def write_photo(rows: list[Row], path: Path, seed: int) -> None:
    """A rougher "phone photo": 4 degrees of tilt, blur, low resolution, heavy JPEG."""
    tmp = path.with_suffix(".tmp.png")
    write_scan(rows, tmp, seed=seed, angle=4.0)
    img = Image.open(tmp).filter(ImageFilter.GaussianBlur(1.5))
    img = img.resize((900, int(img.height * 900 / img.width)))
    img.save(path, quality=60)
    tmp.unlink()


def slip_rows(s: dict) -> list[Row]:
    rows: list[Row] = [
        [(0.06, s["bank"])],
        [(0.06, s["title"])],
        [],
        [(0.06, f"{s['date_label']}: {s['date_text']}")],
        [(0.06, "From Account: 0011 2233 4455")],
        [(0.06, f"Beneficiary Name: {s['beneficiary']}")],
        [(0.06, s["account_line"])],
        [(0.06, f"Amount: {s['amount_text']}")],
        [(0.06, s["reference_line"])],
        [(0.06, "Status: Successful")],
    ]
    return rows


INVOICES = [
    dict(
        name="invoice_0042", formats=["pdf", "scan_png", "photo_jpg"],
        supplier="Gampaha Packaging (Pvt) Ltd", supplier_address="No. 12, Station Road, Gampaha",
        buyer="Market Buyer (Pvt) Ltd", buyer_address="45 Harbour Lane, Colombo 03",
        invoice_number="INV-2026-0042", invoice_date_text="20/11/2026", po="PO-7781", terms=45,
        due_text="04/01/2027",
        items=[("Corrugated boxes 40x30x30 cm", "5,000", "30.00", "150,000.00")],
        totals=[("Subtotal", "150,000.00"), ("Total LKR", "150,000.00")],
        truth=dict(invoice_number="INV-2026-0042", invoice_date="2026-11-20", due_date="2027-01-04",
                   terms_days=45, po_reference="PO-7781", currency="LKR", subtotal_minor=15000000,
                   total_minor=15000000, buyer_name="Market Buyer (Pvt) Ltd",
                   supplier_name="Gampaha Packaging (Pvt) Ltd"),
    ),
    dict(
        name="invoice_0043", formats=["pdf"],
        supplier="Gampaha Packaging (Pvt) Ltd", supplier_address="No. 12, Station Road, Gampaha",
        buyer="Colombo Fresh Mart (Pvt) Ltd", buyer_address="8 Lotus Avenue, Colombo 07",
        invoice_number="INV-2026-0043", invoice_date_text="15 November 2026", po="PO-7802", terms=30,
        due_text="15 December 2026",
        items=[("Printed paper bags (large)", "2,000", "30.00", "60,000.00"),
               ("Kraft tape rolls", "400", "30.00", "12,000.00")],
        totals=[("Subtotal", "72,000.00"), ("VAT (18%)", "12,960.00"), ("Total LKR", "84,960.00")],
        truth=dict(invoice_number="INV-2026-0043", invoice_date="2026-11-15", due_date="2026-12-15",
                   terms_days=30, po_reference="PO-7802", currency="LKR", subtotal_minor=7200000,
                   tax_minor=1296000, total_minor=8496000, buyer_name="Colombo Fresh Mart (Pvt) Ltd",
                   supplier_name="Gampaha Packaging (Pvt) Ltd"),
    ),
    dict(
        name="invoice_0044_usd", formats=["pdf"],
        supplier="Gampaha Packaging (Pvt) Ltd", supplier_address="No. 12, Station Road, Gampaha",
        buyer="Northwind Retail Ltd", buyer_address="Unit 4, Example Park, Leeds, UK",
        invoice_number="INV-2026-0044", invoice_date_text="2026-11-18", po="NW-PO-5521", terms=60,
        due_text="2027-01-17",
        items=[("Moulded pulp egg trays", "10,000", "0.25", "2,500.00")],
        totals=[("Total USD", "2,500.00")],
        truth=dict(invoice_number="INV-2026-0044", invoice_date="2026-11-18", due_date="2027-01-17",
                   terms_days=60, po_reference="NW-PO-5521", currency="USD", total_minor=250000,
                   buyer_name="Northwind Retail Ltd", supplier_name="Gampaha Packaging (Pvt) Ltd"),
    ),
    dict(
        name="invoice_0045", formats=["scan_jpg"],
        supplier="Gampaha Packaging (Pvt) Ltd", supplier_address="No. 12, Station Road, Gampaha",
        buyer="Market Buyer (Pvt) Ltd", buyer_address="45 Harbour Lane, Colombo 03",
        invoice_number="INV-2026-0045", invoice_date_text="22/11/2026", po="PO-7790", terms=45,
        due_text=None,
        items=[("Pallet wrap film", "25", "1,820.00", "45,500.00")],
        totals=[("Total", "Rs. 45,500/=")],
        truth=dict(invoice_number="INV-2026-0045", invoice_date="2026-11-22", due_date="2027-01-06",
                   terms_days=45, po_reference="PO-7790", currency="LKR", total_minor=4550000,
                   buyer_name="Market Buyer (Pvt) Ltd", supplier_name="Gampaha Packaging (Pvt) Ltd"),
    ),
]

LENDER_A_ACCOUNT = "8001 2345 6789"
SLIPS = [
    dict(
        name="slip_ok", format="png", bank="Demo Commercial Bank (fictional)", title="FUND TRANSFER CONFIRMATION",
        date_label="Transaction Date", date_text="04/01/2027", beneficiary="Lender A Finance PLC",
        account_line=f"Beneficiary Account No: {LENDER_A_ACCOUNT}", amount_text="LKR 120,000.00",
        reference_line="Payment Reference: INV-7Q4K-01",
        instruction=dict(amount_minor=12000000, currency="LKR", destination_account=LENDER_A_ACCOUNT,
                         reference="INV-7Q4K-01"),
        truth=dict(amount_minor=12000000, currency="LKR", transfer_date="2027-01-04",
                   reference="INV-7Q4K-01", status="match", codes=[]),
    ),
    dict(
        name="slip_wrong_reference", format="png", bank="Demo Commercial Bank (fictional)",
        title="FUND TRANSFER CONFIRMATION", date_label="Transaction Date", date_text="04/01/2027",
        beneficiary="Lender A Finance PLC", account_line="Beneficiary Account No: XXXX XXXX 6789",
        amount_text="LKR 120,000.00", reference_line="Remarks: January payment",
        instruction=dict(amount_minor=12000000, currency="LKR", destination_account=LENDER_A_ACCOUNT,
                         reference="INV-7Q4K-01"),
        truth=dict(amount_minor=12000000, currency="LKR", transfer_date="2027-01-04", status="mismatch",
                   codes=["ACCOUNT_PARTIAL", "REFERENCE_MISSING"]),
    ),
    dict(
        name="slip_short", format="png", bank="Demo Commercial Bank (fictional)", title="FUND TRANSFER CONFIRMATION",
        date_label="Transaction Date", date_text="05/01/2027", beneficiary="Lender A Finance PLC",
        account_line=f"Beneficiary Account No: {LENDER_A_ACCOUNT}", amount_text="LKR 100,000.00",
        reference_line="Payment Reference: INV-7Q4K-01",
        instruction=dict(amount_minor=12000000, currency="LKR", destination_account=LENDER_A_ACCOUNT,
                         reference="INV-7Q4K-01"),
        truth=dict(amount_minor=10000000, currency="LKR", transfer_date="2027-01-05",
                   reference="INV-7Q4K-01", status="mismatch", codes=["AMOUNT_SHORT"]),
    ),
    dict(
        name="slip_international", format="pdf", bank="Example International Bank (fictional)",
        title="INTERNATIONAL PAYMENT ADVICE", date_label="Value Date", date_text="17 Jan 2027",
        beneficiary="Lender A Finance PLC", account_line="IBAN: GB29 NWBK 6016 1331 9268 19",
        amount_text="USD 2,500.00", reference_line="Payment Reference: INV-9M2P-01",
        instruction=dict(amount_minor=250000, currency="USD", destination_account="GB29NWBK60161331926819",
                         reference="INV-9M2P-01"),
        truth=dict(amount_minor=250000, currency="USD", transfer_date="2027-01-17",
                   reference="INV-9M2P-01", status="match", codes=[]),
    ),
]

# Extra inputs for the deterministic checks on the demo invoice.
CHECK_0042 = {
    "purchase_order": {
        "reference": "PO-7781", "currency": "LKR", "total_minor": 15000000,
        "line_items": [{"description": "Corrugated boxes 40x30x30 cm", "quantity": "5000",
                        "unit_price_minor": 3000, "amount_minor": 15000000}],
    },
    "delivery_receipt": {
        "reference": "GRN-3309",
        "lines": [{"description": "Corrugated boxes 40x30x30 cm", "quantity_received": "4000"}],
    },
}


def main() -> None:
    ROOT.mkdir(exist_ok=True)
    TRUTH.mkdir(exist_ok=True)
    for i, inv in enumerate(INVOICES):
        rows = invoice_rows(inv)
        files = []
        for fmt in inv["formats"]:
            if fmt == "pdf":
                path = ROOT / f"{inv['name']}.pdf"
                write_pdf(rows, path)
            elif fmt == "photo_jpg":
                path = ROOT / f"{inv['name']}_photo.jpg"
                write_photo(rows, path, seed=7)
            else:
                ext = "png" if fmt == "scan_png" else "jpg"
                path = ROOT / f"{inv['name']}_scan.{ext}"
                write_scan(rows, path, seed=i)
            files.append(path.name)
        (TRUTH / f"{inv['name']}.json").write_text(
            json.dumps({"kind": "invoice", "files": files, "fields": inv["truth"]}, indent=2) + "\n")
    for i, slip in enumerate(SLIPS):
        rows = slip_rows(slip)
        path = ROOT / f"{slip['name']}.{slip['format']}"
        write_pdf(rows, path) if slip["format"] == "pdf" else write_scan(rows, path, seed=100 + i, angle=-0.4)
        (TRUTH / f"{slip['name']}.json").write_text(json.dumps(
            {"kind": "slip", "files": [path.name], "instruction": slip["instruction"], "fields": slip["truth"]},
            indent=2) + "\n")
    (TRUTH / "check_invoice_0042.json").write_text(json.dumps(CHECK_0042, indent=2) + "\n")
    print(f"Wrote samples to {ROOT}")


if __name__ == "__main__":
    main()
