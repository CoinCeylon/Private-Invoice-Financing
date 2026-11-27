// Interface of the Cardano registry library (P3, `packages/cardano-registry`).
// The API (P2) codes against this interface, using FakeRegistry until P1 swaps in the real one.
// Frozen in Stage 0 (docs/interfaces.md).

import type { Hex, Hex32 } from "./commitment.js";

/** Payment key hash of a wallet: 28 bytes, lower-case hex (56 characters). */
export type KeyHash = string;
export type TxId = Hex32;

/** On-chain state of one invoice. Closed and Cancelled are final: the validator refuses any further spend. */
export const registryStates = ["Available", "Pledged", "Defaulted", "Closed", "Cancelled"] as const;
export type RegistryState = (typeof registryStates)[number];

/**
 * The datum at the registry script for one invoice. One UTxO per invoice, holding a registry token
 * whose asset name is `invoiceKey`.
 */
export interface RegistryEntry {
  invoiceKey: Hex32;
  commitment: Hex32;
  supplier: KeyHash;
  buyer: KeyHash;
  /** Set by the pledge; the buyer pays this lender. */
  lender: KeyHash | null;
  state: RegistryState;
  /** 0 at registration, +1 per amendment. */
  version: number;
  /** `<txId>#<index>` of the UTxO holding the entry now. */
  utxoRef: string;
}

export type RegistryEventKind = "registered" | "amended" | "pledged" | "defaulted" | "closed" | "cancelled";

export interface RegistryEvent {
  kind: RegistryEventKind;
  invoiceKey: Hex32;
  txId: TxId;
  /** Absolute slot. Events are returned in slot order; (txId, kind) is unique, which the indexer relies on. */
  slot: number;
  /** ISO 8601. */
  blockTime: string;
  /** The entry after this event. */
  entry: RegistryEntry;
}

/** A built transaction waiting for signatures. */
export interface UnsignedTx {
  /** Transaction CBOR. */
  cbor: Hex;
  txId: TxId;
  /** Every key that must sign before `submit`. */
  requiredSigners: KeyHash[];
}

/**
 * Something that can sign for one key: a server-side demo wallet (from `.env`, testnet only) or a
 * browser wallet through CIP-30 `signTx(cbor, true)`.
 */
export interface Signer {
  keyHash: KeyHash;
  /** Bech32 address (addr_test1...). */
  address: string;
  /** Returns the witness set CBOR for `tx`. */
  sign(tx: UnsignedTx): Promise<Hex>;
}

export interface ChainReceipt {
  txId: TxId;
  /** ISO 8601. */
  submittedAt: string;
}

/**
 * Who must sign each transaction (the validator enforces this, not the library):
 *
 * | Call          | Allowed from state    | New state  | Signers          |
 * |---------------|-----------------------|------------|------------------|
 * | register      | (none: mints token)   | Available  | buyer            |
 * | amend         | Available             | Available  | buyer + supplier |
 * | pledge        | Available             | Pledged    | supplier + lender|
 * | markDefaulted | Pledged               | Defaulted  | lender           |
 * | close         | Pledged, Defaulted    | Closed     | lender           |
 * | cancel        | Available             | Cancelled  | buyer + supplier |
 */
export interface CardanoRegistry {
  register(input: { invoiceKey: Hex32; commitment: Hex32; supplier: KeyHash; buyer: KeyHash }): Promise<UnsignedTx>;
  amend(invoiceKey: Hex32, newCommitment: Hex32): Promise<UnsignedTx>;
  /**
   * Must NOT pre-check the state off-chain. A second pledge has to be refused by the validator itself
   * (error code `script-rejected`), because that refusal is what the demo shows.
   */
  pledge(invoiceKey: Hex32, lender: KeyHash): Promise<UnsignedTx>;
  markDefaulted(invoiceKey: Hex32): Promise<UnsignedTx>;
  close(invoiceKey: Hex32): Promise<UnsignedTx>;
  cancel(invoiceKey: Hex32): Promise<UnsignedTx>;

  /** Adds the witness sets and submits. Throws `missing-signature` if a required signer is absent. */
  submit(tx: UnsignedTx, witnessSets: Hex[]): Promise<ChainReceipt>;
  /** Resolves when the transaction is in a block, or with `confirmed: false` after `timeoutMs` (default 120 s). */
  awaitConfirmation(txId: TxId, timeoutMs?: number): Promise<{ confirmed: boolean; slot: number | null }>;

  getEntry(invoiceKey: Hex32): Promise<RegistryEntry | null>;
  /** Every registry event after `afterSlot` (exclusive), oldest first. */
  listEvents(afterSlot?: number): Promise<RegistryEvent[]>;
}

export const registryErrorCodes = [
  "already-registered", "not-found", "script-rejected", "missing-signature", "insufficient-funds",
  "provider-unavailable", "submit-failed",
] as const;
export type RegistryErrorCode = (typeof registryErrorCodes)[number];

/** The only error type a CardanoRegistry throws. */
export class RegistryError extends Error {
  readonly code: RegistryErrorCode;
  /** Validator trace or provider message, for logs only. */
  readonly detail?: string;

  constructor(code: RegistryErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
    this.detail = detail;
  }
}

/** Collects a witness set from each required signer, then submits. */
export async function signAndSubmit(registry: CardanoRegistry, tx: UnsignedTx, signers: Signer[]): Promise<ChainReceipt> {
  const witnessSets: Hex[] = [];
  for (const keyHash of tx.requiredSigners) {
    const signer = signers.find((candidate) => candidate.keyHash === keyHash);
    if (!signer) throw new RegistryError("missing-signature", `No signer for key ${keyHash}.`);
    witnessSets.push(await signer.sign(tx));
  }
  return registry.submit(tx, witnessSets);
}
