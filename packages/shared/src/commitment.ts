// The invoice commitment: the one value Cardano and Midnight both know about an invoice.
// Frozen in Stage 0 (docs/interfaces.md). Version 1.

import type { Currency } from "./money.js";

/** Lower-case hex, no 0x prefix. Hex32 is 32 bytes (64 characters). */
export type Hex = string;
export type Hex32 = string;

export const commitmentVersion = 1;

/** Currency as stored inside the commitment (Compact `Uint<8>`). */
export const currencyCodes: Record<Currency, number> = { LKR: 1, USD: 2 };

/**
 * The private fields hidden behind the commitment. Only the supplier, buyer, API and the
 * selected lender ever see these. Matches the Compact struct `InvoiceCommitmentV1`:
 *
 *   struct InvoiceCommitmentV1 {
 *     version: Uint<8>;        // always 1
 *     invoiceKey: Bytes<32>;
 *     amountMinor: Uint<64>;
 *     currency: Uint<8>;       // currencyCodes
 *     dueDateDays: Uint<32>;   // days since 1970-01-01 (UTC)
 *     documentHash: Bytes<32>;
 *     salt: Bytes<32>;
 *   }
 *   commitment = persistentHash<InvoiceCommitmentV1>(...)
 */
export interface CommitmentFieldsV1 {
  /** From `invoiceKey()`. Public: it is also the Cardano registry key. */
  invoiceKey: Hex32;
  /** The amount the buyer approved. */
  amountMinor: bigint;
  currency: Currency;
  /** YYYY-MM-DD. */
  dueDate: string;
  /** SHA-256 of the invoice file exactly as stored by the API. */
  documentHash: Hex32;
}

/** Proof thresholds. The circuit hard-codes this table so a supplier cannot invent a lower one. */
export const thresholds = {
  MIN100K_LKR_V1: { id: "MIN100K_LKR_V1", code: 1, currency: "LKR", minimumMinor: 10_000_000n },
  MIN1K_USD_V1: { id: "MIN1K_USD_V1", code: 2, currency: "USD", minimumMinor: 100_000n },
} as const satisfies Record<string, { id: string; code: number; currency: Currency; minimumMinor: bigint }>;

export type ThresholdId = keyof typeof thresholds;

/** The threshold an invoice is proven against is decided by its currency alone. */
export function thresholdFor(currency: Currency): (typeof thresholds)[ThresholdId] {
  return currency === "LKR" ? thresholds.MIN100K_LKR_V1 : thresholds.MIN1K_USD_V1;
}

export function dueDateDays(dueDate: string): number {
  const time = Date.parse(`${dueDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(time)) {
    throw new RangeError("dueDate must be YYYY-MM-DD.");
  }
  return time / 86_400_000;
}

export function toHex(bytes: Uint8Array): Hex {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: Uint8Array<ArrayBuffer> | string): Promise<Hex32> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

/** 32 random bytes. The API makes one salt per invoice at buyer approval and keeps it private. */
export function randomHex32(): Hex32 {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Normalised invoice number: trimmed, inner spaces collapsed, upper case. */
export function normaliseInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Public registry key of an invoice: SHA-256 of `<buyer organization id>|<normalised invoice number>`.
 * The same invoice uploaded twice gets the same key, which is how double financing is caught.
 */
export function invoiceKey(buyerOrganizationId: string, invoiceNumber: string): Promise<Hex32> {
  return sha256Hex(`${buyerOrganizationId}|${normaliseInvoiceNumber(invoiceNumber)}`);
}
