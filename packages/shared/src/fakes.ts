// In-memory stand-ins for the Cardano and Midnight libraries. They follow the same rules as the real
// validator and circuit, so the API can be built and tested end to end before the chains exist.
// Import from "@invoice-veil/shared/fakes". Never used in the real demo.

import {
  currencyCodes, dueDateDays, randomHex32, sha256Hex, thresholds,
} from "./commitment.js";
import type { CommitmentFieldsV1, Hex, Hex32, ThresholdId } from "./commitment.js";
import { RegistryError } from "./cardano.js";
import type {
  CardanoRegistry, ChainReceipt, KeyHash, RegistryEntry, RegistryEvent, RegistryEventKind, RegistryState,
  Signer, TxId, UnsignedTx,
} from "./cardano.js";
import { ProofError } from "./midnight.js";
import type { MinimumValueProver, ProofCheck, ProofProgress, ProofReceipt } from "./midnight.js";

/** Fixed fake key hashes for the four demo organizations (not real wallets). */
export const fakeKeyHashes = {
  supplier: "a1".repeat(28),
  buyer: "b2".repeat(28),
  "lender-a": "c3".repeat(28),
  "lender-b": "d4".repeat(28),
} as const satisfies Record<string, KeyHash>;

const fakeWitnessPrefix = "fake-witness:";

export function fakeSigner(keyHash: KeyHash): Signer {
  return {
    keyHash,
    address: `addr_test1_fake_${keyHash.slice(0, 12)}`,
    async sign(tx) {
      return `${fakeWitnessPrefix}${keyHash}:${tx.txId}`;
    },
  };
}

interface PendingTx {
  kind: RegistryEventKind;
  invoiceKey: Hex32;
  requiredSigners: KeyHash[];
  /** Re-checked at submit, like the validator at evaluation. Returns the new entry. */
  apply(current: RegistryEntry | null, txId: TxId): RegistryEntry;
}

function rejected(message: string): never {
  throw new RegistryError("script-rejected", message, "fake validator");
}

function requireState(entry: RegistryEntry | null, allowed: RegistryState[]): RegistryEntry {
  if (!entry) throw new RegistryError("not-found", "This invoice is not registered on Cardano.");
  if (!allowed.includes(entry.state)) {
    rejected(`The registry validator refused the transaction: the invoice is ${entry.state}.`);
  }
  return entry;
}

export class FakeRegistry implements CardanoRegistry {
  private readonly entries = new Map<Hex32, RegistryEntry>();
  private readonly events: RegistryEvent[] = [];
  private readonly pending = new Map<TxId, PendingTx>();
  private slot = 1_000;

  async register(input: { invoiceKey: Hex32; commitment: Hex32; supplier: KeyHash; buyer: KeyHash }) {
    if (this.entries.has(input.invoiceKey)) {
      throw new RegistryError("already-registered", "This invoice is already registered on Cardano.");
    }
    return this.build({
      kind: "registered", invoiceKey: input.invoiceKey, requiredSigners: [input.buyer],
      apply: (current, txId) => {
        if (current) throw new RegistryError("already-registered", "This invoice is already registered on Cardano.");
        return { ...input, lender: null, state: "Available", version: 0, utxoRef: `${txId}#0` };
      },
    });
  }

  async amend(invoiceKey: Hex32, newCommitment: Hex32) {
    const entry = requireState(this.entries.get(invoiceKey) ?? null, ["Available"]);
    return this.build({
      kind: "amended", invoiceKey, requiredSigners: [entry.buyer, entry.supplier],
      apply: (current, txId) => {
        const live = requireState(current, ["Available"]);
        return { ...live, commitment: newCommitment, version: live.version + 1, utxoRef: `${txId}#0` };
      },
    });
  }

  async pledge(invoiceKey: Hex32, lender: KeyHash) {
    const entry = requireState(this.entries.get(invoiceKey) ?? null, ["Available"]);
    return this.build({
      kind: "pledged", invoiceKey, requiredSigners: [entry.supplier, lender],
      apply: (current, txId) => ({ ...requireState(current, ["Available"]), lender, state: "Pledged", utxoRef: `${txId}#0` }),
    });
  }

  async markDefaulted(invoiceKey: Hex32) {
    const entry = requireState(this.entries.get(invoiceKey) ?? null, ["Pledged"]);
    return this.build({
      kind: "defaulted", invoiceKey, requiredSigners: [entry.lender as KeyHash],
      apply: (current, txId) => ({ ...requireState(current, ["Pledged"]), state: "Defaulted", utxoRef: `${txId}#0` }),
    });
  }

  async close(invoiceKey: Hex32) {
    const entry = requireState(this.entries.get(invoiceKey) ?? null, ["Pledged", "Defaulted"]);
    return this.build({
      kind: "closed", invoiceKey, requiredSigners: [entry.lender as KeyHash],
      apply: (current, txId) => ({
        ...requireState(current, ["Pledged", "Defaulted"]), state: "Closed", utxoRef: `${txId}#0`,
      }),
    });
  }

  async cancel(invoiceKey: Hex32) {
    const entry = requireState(this.entries.get(invoiceKey) ?? null, ["Available"]);
    return this.build({
      kind: "cancelled", invoiceKey, requiredSigners: [entry.buyer, entry.supplier],
      apply: (current, txId) => ({ ...requireState(current, ["Available"]), state: "Cancelled", utxoRef: `${txId}#0` }),
    });
  }

  async submit(tx: UnsignedTx, witnessSets: Hex[]): Promise<ChainReceipt> {
    const pending = this.pending.get(tx.txId);
    if (!pending) throw new RegistryError("submit-failed", "Unknown or already submitted transaction.");
    for (const keyHash of pending.requiredSigners) {
      if (!witnessSets.includes(`${fakeWitnessPrefix}${keyHash}:${tx.txId}`)) {
        throw new RegistryError("missing-signature", `Missing signature from ${keyHash}.`);
      }
    }
    const entry = pending.apply(this.entries.get(pending.invoiceKey) ?? null, tx.txId);
    this.pending.delete(tx.txId);
    this.entries.set(entry.invoiceKey, entry);
    this.slot += 20;
    this.events.push({
      kind: pending.kind, invoiceKey: entry.invoiceKey, txId: tx.txId, slot: this.slot,
      blockTime: new Date().toISOString(), entry: { ...entry },
    });
    return { txId: tx.txId, submittedAt: new Date().toISOString() };
  }

  async awaitConfirmation(txId: TxId) {
    const event = this.events.find((candidate) => candidate.txId === txId);
    return { confirmed: event !== undefined, slot: event?.slot ?? null };
  }

  async getEntry(invoiceKey: Hex32) {
    const entry = this.entries.get(invoiceKey);
    return entry ? { ...entry } : null;
  }

  async listEvents(afterSlot = -1) {
    return this.events.filter(({ slot }) => slot > afterSlot).map((event) => ({ ...event, entry: { ...event.entry } }));
  }

  private build(pending: PendingTx): UnsignedTx {
    const txId = randomHex32();
    this.pending.set(txId, pending);
    return { cbor: `fake-cbor:${pending.kind}:${pending.invoiceKey}`, txId, requiredSigners: [...pending.requiredSigners] };
  }
}

export class FakeProver implements MinimumValueProver {
  readonly contractAddress = "fake-midnight-contract";
  private readonly proven = new Map<Hex32, { thresholdId: ThresholdId; txId: string }>();

  /** NOT the real persistentHash: a fake commitment only ever compares with other fake commitments. */
  async computeCommitment(fields: CommitmentFieldsV1, salt: Hex32): Promise<Hex32> {
    return sha256Hex([
      "fake-commitment-v1", fields.invoiceKey, fields.amountMinor.toString(), currencyCodes[fields.currency],
      dueDateDays(fields.dueDate), fields.documentHash, salt,
    ].join("|"));
  }

  async prove(
    commitment: Hex32,
    fields: CommitmentFieldsV1,
    salt: Hex32,
    thresholdId: ThresholdId,
    onProgress?: (stage: ProofProgress) => void,
  ): Promise<ProofReceipt> {
    const threshold = thresholds[thresholdId];
    if ((await this.computeCommitment(fields, salt)) !== commitment) {
      throw new ProofError("commitment-mismatch", "The invoice fields do not match the registered commitment.");
    }
    if (fields.currency !== threshold.currency) {
      throw new ProofError("wrong-currency", `Threshold ${thresholdId} is for ${threshold.currency}.`);
    }
    if (fields.amountMinor < threshold.minimumMinor) {
      throw new ProofError("below-threshold", "The approved amount is below the minimum required for proof.");
    }
    onProgress?.("local");
    const txId = randomHex32();
    onProgress?.("chain");
    this.proven.set(commitment, { thresholdId, txId });
    return { commitment, thresholdId, contractAddress: this.contractAddress, txId, provenAt: new Date().toISOString() };
  }

  async verify(commitment: Hex32, thresholdId: ThresholdId): Promise<ProofCheck> {
    const record = this.proven.get(commitment);
    const verified = record?.thresholdId === thresholdId;
    return { verified, thresholdId, txId: verified ? record.txId : null };
  }
}
