// TypeScript mirror of the extraction service's responses (services/extraction/app/schemas.py).
// The API (P2) depends on exactly these fields; P1 keeps them stable. Frozen in Stage 0.
// Python uses snake_case, so these types do too. The API converts to the web app's shapes.

import type { Currency } from "./money.js";

export type Confidence = "high" | "medium" | "low" | "missing";

export interface ExtractedField<T = unknown> {
  value: T | null;
  confidence: Confidence;
  source_line: string | null;
}

export interface DocumentInfo {
  source: "pdf_text" | "ocr" | "mixed";
  pages: number;
  ocr_confidence: number | null;
}

export interface ExtractedLineItem {
  description: string;
  /** Decimal, serialised as a string by Pydantic. */
  quantity: string;
  unit_price_minor: number;
  amount_minor: number;
  arithmetic_ok: boolean;
}

/** Keys always present in `InvoiceExtraction.fields` (value null when not found). */
export interface InvoiceExtractionFields {
  invoice_number: ExtractedField<string>;
  invoice_date: ExtractedField<string>;
  due_date: ExtractedField<string>;
  terms_days: ExtractedField<number>;
  currency: ExtractedField<Currency>;
  subtotal_minor: ExtractedField<number>;
  tax_minor: ExtractedField<number>;
  total_minor: ExtractedField<number>;
  po_reference: ExtractedField<string>;
  supplier_name: ExtractedField<string>;
  buyer_name: ExtractedField<string>;
}

/** POST /extract/invoice (multipart `file`). */
export interface InvoiceExtraction {
  extractor_version: string;
  document: DocumentInfo;
  fields: InvoiceExtractionFields;
  line_items: ExtractedLineItem[];
  review_reasons: string[];
}

/** POST /check/invoice body. */
export interface CheckRequest {
  invoice: {
    invoice_number?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    terms_days?: number | null;
    currency?: Currency | null;
    subtotal_minor?: number | null;
    tax_minor?: number | null;
    total_minor?: number | null;
    po_reference?: string | null;
    line_items?: Array<{ description: string; quantity: string; unit_price_minor: number; amount_minor: number }>;
  };
  purchase_order?: {
    reference: string;
    currency: Currency;
    total_minor: number;
    line_items?: Array<{ description: string; quantity: string; unit_price_minor: number; amount_minor: number }>;
  } | null;
  delivery_receipt?: { reference?: string | null; lines: Array<{ description: string; quantity_received: string }> } | null;
}

export interface Discrepancy {
  code: string;
  severity: "error" | "warning";
  message: string;
  difference_minor: number | null;
}

/** POST /check/invoice response. `ok` is false if any discrepancy has severity "error". */
export interface CheckResult {
  ok: boolean;
  discrepancies: Discrepancy[];
}

/** Sent as the JSON string form field `instruction` with POST /extract/slip. */
export interface SlipInstruction {
  amount_minor: number;
  currency: Currency;
  destination_account: string;
  reference: string;
}

export interface SlipExtractionFields {
  amount_minor: ExtractedField<number>;
  currency: ExtractedField<Currency>;
  destination_account: ExtractedField<string>;
  beneficiary_name: ExtractedField<string>;
  reference: ExtractedField<string>;
  transfer_date: ExtractedField<string>;
}

export interface SlipMatch {
  status: "match" | "mismatch" | "unreadable";
  reasons: Array<{ code: string; severity: "error" | "warning"; message: string }>;
  note: string;
}

/** POST /extract/slip (multipart `file` + optional `instruction`). `match` is null without an instruction. */
export interface SlipExtraction {
  extractor_version: string;
  document: DocumentInfo;
  fields: SlipExtractionFields;
  match: SlipMatch | null;
}

/** Web field names that can be flagged in `InvoiceDocuments.lowConfidence`. */
export type ReviewField = "invoiceNumber" | "amount" | "termDays";

/**
 * Agreed rule: a field is flagged for review when its confidence is "low" or "missing".
 * invoice_number -> invoiceNumber, total_minor -> amount, terms_days -> termDays.
 */
export function lowConfidenceFields(extraction: InvoiceExtraction): ReviewField[] {
  const unsure = (field: ExtractedField) => field.confidence === "low" || field.confidence === "missing";
  const flagged: ReviewField[] = [];
  if (unsure(extraction.fields.invoice_number)) flagged.push("invoiceNumber");
  if (unsure(extraction.fields.total_minor)) flagged.push("amount");
  if (unsure(extraction.fields.terms_days)) flagged.push("termDays");
  return flagged;
}

/** Agreed rule for the web app's PaymentSlip.result: only "match" counts as a match. */
export function slipResult(match: SlipMatch | null): "match" | "mismatch" {
  return match?.status === "match" ? "match" : "mismatch";
}
