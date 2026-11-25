"""Request and response models. Amounts are integer minor units (cents)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

Confidence = Literal["high", "medium", "low", "missing"]
Currency = Literal["LKR", "USD"]


class ExtractedField(BaseModel):
    value: Any = None
    confidence: Confidence = "missing"
    source_line: str | None = Field(None, description="Text line the value was read from")


class DocumentInfo(BaseModel):
    source: Literal["pdf_text", "ocr", "mixed"]
    pages: int
    ocr_confidence: float | None


class ExtractedLineItem(BaseModel):
    description: str
    quantity: Decimal
    unit_price_minor: int
    amount_minor: int
    arithmetic_ok: bool


class InvoiceExtraction(BaseModel):
    extractor_version: str
    document: DocumentInfo
    fields: dict[str, ExtractedField]
    line_items: list[ExtractedLineItem]
    review_reasons: list[str]


# ---- Deterministic checks ---------------------------------------------------

class LineItem(BaseModel):
    description: str
    quantity: Decimal
    unit_price_minor: int
    amount_minor: int


class InvoiceFields(BaseModel):
    """The invoice as confirmed (or corrected) by a person."""
    invoice_number: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    terms_days: int | None = None
    currency: Currency | None = None
    subtotal_minor: int | None = None
    tax_minor: int | None = None
    total_minor: int | None = None
    po_reference: str | None = None
    line_items: list[LineItem] = []


class PurchaseOrder(BaseModel):
    reference: str
    currency: Currency
    total_minor: int
    line_items: list[LineItem] = []


class ReceiptLine(BaseModel):
    description: str
    quantity_received: Decimal


class DeliveryReceipt(BaseModel):
    reference: str | None = None
    lines: list[ReceiptLine]


class CheckRequest(BaseModel):
    invoice: InvoiceFields
    purchase_order: PurchaseOrder | None = None
    delivery_receipt: DeliveryReceipt | None = None


class Discrepancy(BaseModel):
    code: str
    severity: Literal["error", "warning"]
    message: str
    difference_minor: int | None = None


class CheckResult(BaseModel):
    ok: bool
    discrepancies: list[Discrepancy]


# ---- Bank slips -------------------------------------------------------------

class PaymentInstruction(BaseModel):
    """What the buyer was told to pay (from the API's payment instruction)."""
    amount_minor: int
    currency: Currency
    destination_account: str
    reference: str


class SlipReason(BaseModel):
    code: str
    severity: Literal["error", "warning"]
    message: str


class SlipMatch(BaseModel):
    status: Literal["match", "mismatch", "unreadable"]
    reasons: list[SlipReason]
    note: str = (
        "A slip is evidence only. The invoice is paid only when the lender "
        "confirms the money arrived."
    )


class SlipExtraction(BaseModel):
    extractor_version: str
    document: DocumentInfo
    fields: dict[str, ExtractedField]
    match: SlipMatch | None = None
