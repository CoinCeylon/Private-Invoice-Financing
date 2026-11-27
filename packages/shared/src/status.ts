// Invoice statuses and the rules for every InvoiceAction. Frozen in Stage 0 (docs/interfaces.md).
// The web app's labels live in `invoiceStatuses` (apps/web/src/lib/api.ts); the database stores the codes.

export const statusLabels = {
  DRAFT: "Draft",
  AWAITING_BUYER_REVIEW: "Awaiting buyer review",
  AVAILABLE: "Available",
  ELIGIBLE: "Eligible",
  LISTED: "Listed",
  OFFERS_RECEIVED: "Offers received",
  OFFER_SELECTED: "Offer selected",
  PLEDGED: "Pledged",
  ADVANCE_PAID: "Advance paid",
  PAYMENT_INSTRUCTED: "Payment instructed",
  SLIP_UPLOADED: "Slip uploaded",
  PAID_BY_BUYER_AWAITING_LENDER: "Paid by buyer – awaiting lender",
  PAYMENT_CONFIRMED: "Payment confirmed",
  LATE: "Late",
  DISPUTED: "Disputed",
  BALANCE_SENT: "Balance sent",
  DEFAULTED: "Defaulted",
  CLOSED: "Closed",
} as const;

export type StatusCode = keyof typeof statusLabels;
export type StatusLabel = (typeof statusLabels)[StatusCode];

/** Statuses an unselected lender may see: the open listing. */
export const listingStatusCodes: StatusCode[] = ["LISTED", "OFFERS_RECEIVED"];

/** Statuses in which the buyer's payment is still open. */
export const openPaymentStatusCodes: StatusCode[] = [
  "ADVANCE_PAID", "PAYMENT_INSTRUCTED", "SLIP_UPLOADED", "PAID_BY_BUYER_AWAITING_LENDER", "LATE", "DISPUTED",
];

/** Same strings as `InvoiceAction["type"]` in apps/web/src/lib/api.ts. */
export const actionTypes = [
  "submit-for-review", "approve", "generate-proof", "list", "quote", "select-offer", "sign-pledge",
  "send-advance", "instruct-payment", "upload-slip", "confirm-payment", "report-not-received", "send-balance",
] as const;
export type ActionType = (typeof actionTypes)[number];

/** Who may perform an action. "selected-lender" is the lender the supplier picked. */
export type Actor = "supplier" | "buyer" | "any-lender" | "selected-lender";

/** Chain work an action triggers. The API runs it through CardanoRegistry or MinimumValueProver. */
export type ChainEffect = "cardano-register" | "midnight-prove" | "cardano-pledge" | "cardano-close";

export interface ActionRule {
  actor: Actor;
  /** The action is refused (HTTP 409) in any other status. */
  from: readonly StatusCode[];
  /** Status straight after the action. `null`: unchanged until the chain or a check finishes (see `then`). */
  to: StatusCode | null;
  /** Status once the chain work or check finishes successfully. */
  then?: StatusCode;
  chain?: ChainEffect;
}

/**
 * The full workflow. This mirrors runAction in apps/web/src/lib/mock-api.ts, which is the
 * behaviour reference for the API.
 */
export const actionRules: Record<ActionType, ActionRule> = {
  "submit-for-review": { actor: "supplier", from: ["DRAFT"], to: "AWAITING_BUYER_REVIEW" },
  approve: { actor: "buyer", from: ["AWAITING_BUYER_REVIEW"], to: "AVAILABLE", chain: "cardano-register" },
  "generate-proof": { actor: "supplier", from: ["AVAILABLE"], to: null, then: "ELIGIBLE", chain: "midnight-prove" },
  list: { actor: "supplier", from: ["ELIGIBLE"], to: "LISTED" },
  quote: { actor: "any-lender", from: listingStatusCodes, to: "OFFERS_RECEIVED" },
  "select-offer": { actor: "supplier", from: ["OFFERS_RECEIVED"], to: "OFFER_SELECTED" },
  "sign-pledge": { actor: "selected-lender", from: ["OFFER_SELECTED"], to: "PLEDGED", chain: "cardano-pledge" },
  "send-advance": { actor: "selected-lender", from: ["PLEDGED"], to: "ADVANCE_PAID" },
  "instruct-payment": { actor: "buyer", from: ["ADVANCE_PAID"], to: "PAYMENT_INSTRUCTED" },
  "upload-slip": {
    actor: "buyer", from: openPaymentStatusCodes, to: "SLIP_UPLOADED", then: "PAID_BY_BUYER_AWAITING_LENDER",
  },
  "confirm-payment": { actor: "selected-lender", from: openPaymentStatusCodes, to: "PAYMENT_CONFIRMED" },
  "report-not-received": {
    actor: "selected-lender", from: openPaymentStatusCodes.filter((code) => code !== "DISPUTED"), to: "DISPUTED",
  },
  "send-balance": {
    actor: "selected-lender", from: ["PAYMENT_CONFIRMED"], to: "BALANCE_SENT", then: "CLOSED", chain: "cardano-close",
  },
};

/** Titles of `ChainEntry` items shown in the web app, one per chain event kind. */
export const chainEntryTitles = {
  registered: "Invoice registered",
  amended: "Invoice amended",
  proven: "Minimum value proof",
  pledged: "Pledge recorded",
  defaulted: "Invoice defaulted",
  closed: "Invoice closed",
  cancelled: "Invoice cancelled",
} as const;
