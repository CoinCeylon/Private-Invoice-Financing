// Interface of the Midnight proof library (P4, `packages/proof-verifier`).
// The API (P2) codes against this interface, using FakeProver until P1 swaps in the real one.
// Frozen in Stage 0 (docs/interfaces.md).

import type { CommitmentFieldsV1, Hex32, ThresholdId } from "./commitment.js";

export interface ProofReceipt {
  commitment: Hex32;
  thresholdId: ThresholdId;
  /** Address of the deployed minimum-value contract on Midnight testnet. */
  contractAddress: string;
  txId: string;
  /** ISO 8601. */
  provenAt: string;
}

export interface ProofCheck {
  /** True only if the Midnight ledger records `commitment` as proven against `thresholdId`. */
  verified: boolean;
  thresholdId: ThresholdId;
  txId: string | null;
}

/** Matches the web app's ProofStage after "commitment": local proof done, then on-chain. */
export type ProofProgress = "local" | "chain";

/**
 * Contract design (Compact):
 * - ledger `proven: Map<Bytes<32>, Uint<8>>`, commitment -> threshold code (see `thresholds`)
 * - circuit `proveMinimum(commitment: Bytes<32>, thresholdCode: Uint<8>)` with the private fields and
 *   salt as witnesses. It asserts:
 *     persistentHash(InvoiceCommitmentV1 { ... }) == commitment   -> else commitment-mismatch
 *     currency == threshold currency                              -> else wrong-currency
 *     amountMinor >= threshold minimum                            -> else below-threshold
 *   then inserts commitment -> thresholdCode into `proven`.
 */
export interface MinimumValueProver {
  /**
   * The commitment for these fields and salt, computed exactly as the circuit does.
   * Pure and local: no network. The API stores it on Cardano at registration, and the selected lender
   * recomputes it from the disclosed documents ("opening check").
   */
  computeCommitment(fields: CommitmentFieldsV1, salt: Hex32): Promise<Hex32>;

  /**
   * Proves `fields` open `commitment` and meet the threshold, and records it on Midnight.
   * The circuit must enforce every check; the library may also check first to fail fast.
   */
  prove(
    commitment: Hex32,
    fields: CommitmentFieldsV1,
    salt: Hex32,
    thresholdId: ThresholdId,
    onProgress?: (stage: ProofProgress) => void,
  ): Promise<ProofReceipt>;

  /** Reads the Midnight ledger. Never needs the private fields. */
  verify(commitment: Hex32, thresholdId: ThresholdId): Promise<ProofCheck>;
}

export const proofErrorCodes = [
  "below-threshold", "wrong-currency", "commitment-mismatch", "proof-server-unavailable", "submit-failed",
] as const;
export type ProofErrorCode = (typeof proofErrorCodes)[number];

/** The only error type a MinimumValueProver throws. */
export class ProofError extends Error {
  readonly code: ProofErrorCode;
  readonly detail?: string;

  constructor(code: ProofErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "ProofError";
    this.code = code;
    this.detail = detail;
  }
}
