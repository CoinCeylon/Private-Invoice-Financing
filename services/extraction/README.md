# Extraction service (P5)

Reads invoices and bank slips for invoice-veil. Python 3.12, FastAPI, pdfplumber and Tesseract.
Called only by the Express API, never by browsers.

| Endpoint | Input | Output |
|---|---|---|
| `GET /health` | - | status, version, Tesseract version |
| `POST /extract/invoice` | `file` (PDF, PNG or JPEG, max 10 MB) | fields with confidence, line items, review reasons |
| `POST /check/invoice` | JSON: confirmed `invoice`, optional `purchase_order` and `delivery_receipt` | `ok` and discrepancies with codes |
| `POST /extract/slip` | `file`, optional form field `instruction` (JSON) | slip fields and, with an instruction, a match result |

Amounts are integer minor units (cents). Quantities are returned as strings (decimals).
Each field has a confidence: `high`, `medium`, `low` or `missing`. Show `medium` and below for review.

**Rules:** the buyer confirms or corrects every extracted value before it is used. A slip match is
evidence only; the invoice is paid only when the lender confirms the money arrived.

## Run (inside the dev container)

```bash
cd services/extraction
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Test and evaluate

```bash
python scripts/make_samples.py     # regenerate fictional samples (already committed)
pytest -q                          # unit and end-to-end tests
python scripts/evaluate.py --json  # field accuracy on the frozen sample set
```

Accuracy is measured on fictional, team-made samples. Say so whenever you quote it.

## How it works

1. **Text:** digital PDFs use their text layer. Scans and photos are upscaled, straightened (deskew) and
   read with Tesseract; the mean OCR confidence lowers field confidence when a scan is poor.
2. **Fields:** labelled patterns (invoice number, dates, PO, terms, totals, parties, line items), then
   cross-checks: subtotal + tax = total, quantity x unit price = amount, due date from terms if missing.
3. **Checks:** plain arithmetic and matching against the purchase order and delivery receipt.
4. **Slips:** amount, currency, date, destination account (including masked accounts and IBANs) and the
   payment reference, compared with the payment instruction.

## Discrepancy and slip codes

Invoice: `MISSING_FIELD`, `LINE_ARITHMETIC`, `LINE_ITEMS_SUM`, `TOTAL_ARITHMETIC`, `DUE_DATE_TERMS`,
`PO_REFERENCE`, `CURRENCY`, `PO_AMOUNT_EXCEEDED`, `RECEIPT_ITEM_MISSING`, `RECEIPT_QUANTITY_SHORT`.

Slip: `AMOUNT_UNREADABLE`, `AMOUNT_SHORT`, `AMOUNT_OVER`, `CURRENCY`, `ACCOUNT_UNREADABLE`,
`ACCOUNT_PARTIAL`, `ACCOUNT_MISMATCH`, `REFERENCE_MISSING`, `DATE_UNREADABLE`.
