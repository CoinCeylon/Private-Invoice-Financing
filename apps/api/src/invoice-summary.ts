// Turns invoice rows into the web app's InvoiceSummary shape (apps/web/src/lib/api.ts),
// applying the per-role visibility rules on the server so hidden data never leaves the API.
import { isCurrency, statusLabels } from "@invoice-veil/shared";
import type { Currency, Money, StatusCode, StatusLabel } from "@invoice-veil/shared";
import type { DemoRole } from "./demo-organizations.js";

export interface InvoiceRow {
  reference: string;
  currency: string;
  amountMinor: bigint;
  dueDate: Date;
  status: string;
  createdAt: Date;
  supplier: { name: string };
  buyer: { name: string };
}

export type VisibleAmount = { visibility: "hidden" } | { visibility: "visible"; money: Money };

export interface InvoiceSummary {
  id: string;
  buyer: string;
  supplier: string | null;
  amount: VisibleAmount;
  currency: Currency;
  termDays: number;
  status: StatusLabel;
  provenMinimum: Money | null;
  needsUpdate: boolean;
  lenderAssigned?: boolean;
}

const dayMs = 86_400_000;

function isLender(role: DemoRole): boolean {
  return role === "lender-a" || role === "lender-b";
}

function toCurrency(value: string): Currency {
  if (isCurrency(value)) return value;
  throw new Error(`Unsupported currency: ${value}`);
}

function toStatusCode(value: string): StatusCode {
  if (Object.hasOwn(statusLabels, value)) return value as StatusCode;
  throw new Error(`Unknown invoice status: ${value}`);
}

function toMinorUnits(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Invoice amount does not fit in a safe integer.");
  }
  return Number(value);
}

/** Whole days from the day the invoice was created to its due date. */
function termDays(createdAt: Date, dueDate: Date): number {
  const created = Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate());
  return Math.round((dueDate.getTime() - created) / dayMs);
}

/** The buyer never learns that offers exist: it sees an open listing as "Listed". */
function statusFor(role: DemoRole, code: StatusCode): StatusLabel {
  if (role === "buyer" && (code === "OFFERS_RECEIVED" || code === "OFFER_SELECTED")) return statusLabels.LISTED;
  return statusLabels[code];
}

export function toInvoiceSummary(role: DemoRole, row: InvoiceRow): InvoiceSummary {
  const currency = toCurrency(row.currency);
  const code = toStatusCode(row.status);
  // No lender is selected yet in this slice, so a lender never sees the amount or the supplier.
  const visible = !isLender(role);

  return {
    id: row.reference,
    ...(isLender(role) ? { lenderAssigned: false } : {}),
    buyer: row.buyer.name,
    supplier: visible ? row.supplier.name : null,
    amount: visible
      ? { visibility: "visible", money: { minorUnits: toMinorUnits(row.amountMinor), currency } }
      : { visibility: "hidden" },
    currency,
    termDays: termDays(row.createdAt, row.dueDate),
    status: statusFor(role, code),
    provenMinimum: null,
    needsUpdate: false,
  };
}
