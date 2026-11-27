// HTTP routes between apps/web (http-api.ts) and apps/api. Frozen in Stage 0 (docs/interfaces.md).
// Every route takes `?role=supplier|buyer|lender-a|lender-b` until there is real sign-in.
// Bodies and responses are the types in apps/web/src/lib/api.ts.

export const routes = {
  /** -> LedgerSnapshot, or 404 when the role can see no registered invoice (http-api returns null). */
  ledgerSnapshot: "/ledger-snapshot",
  /** GET -> InvoiceSummary[]. POST (supplier, multipart, optional `file`) -> 201 { id }. */
  invoices: "/invoices",
  /** GET -> InvoiceDetail, or 404 when missing or not visible to the role (http-api returns null). */
  invoice: (id: string) => `/invoices/${encodeURIComponent(id)}`,
  /**
   * POST an InvoiceAction -> 204.
   * JSON body, except `upload-slip` with `source.kind === "upload"`: multipart with a JSON string field
   * `action` (the action without the File) and a `file` field.
   */
  actions: (id: string) => `/invoices/${encodeURIComponent(id)}/actions`,
  /** GET the original file. kind: invoice | purchase-order | delivery-receipt | slip. Same visibility as the data. */
  document: (id: string, kind: DocumentKind) => `/invoices/${encodeURIComponent(id)}/documents/${kind}`,
} as const;

export const documentKinds = ["invoice", "purchase-order", "delivery-receipt", "slip"] as const;
export type DocumentKind = (typeof documentKinds)[number];

/**
 * Every error response is JSON `{ error, code? }`. `error` is a sentence safe to show the user;
 * http-api.ts throws `new Error(error)`.
 *
 * 400 bad input · 403 role may not do this · 404 missing or not visible (never reveal which)
 * 409 wrong status or refused on chain · 502 extraction or chain provider failed
 */
export interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
}

export const apiErrorCodes = [
  "invalid-input", "forbidden", "not-found", "wrong-status", "already-financed", "proof-failed",
  "extraction-failed", "chain-unavailable",
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];
