# Stage 0 agreements (frozen 28 Nov 2026)

These are the fixed decisions every module is built against. **You do not need a meeting**: read your own
section and "The flow", build against it, and test with the fakes. The TypeScript versions live in
`packages/shared/src` and are the source of truth if this page and the code ever disagree.

**Changing anything here:** ask P1 first (P1 integrates, so P1 has to make it fit). If your module cannot
meet the interface, write down what differs in your hand-off notes.

| If you are | Read | You build | You test against |
|---|---|---|---|
| P1 (AI) | [Extraction](#5-extraction-service-p1) | `services/extraction` | its own tests and samples |
| P2 (backend) | everything, especially [HTTP](#6-http-routes-p2--p5) and [What the API stores](#7-what-the-api-stores-p2) | `apps/api`, `apps/web/src/lib/http-api.ts` | `FakeRegistry`, `FakeProver`, the real extraction service |
| P3 (Cardano) | [Commitment](#2-the-invoice-commitment-everyone) and [Cardano](#3-cardano-registry-p3) | `contracts/cardano`, `packages/cardano-registry` | Aiken tests, a preprod script |
| P4 (Midnight) | [Commitment](#2-the-invoice-commitment-everyone) and [Midnight](#4-midnight-proof-p4) | `contracts/midnight`, `packages/proof-verifier` | Compact tests, a testnet script |
| P5 (web) | [The flow](#1-the-flow) and [HTTP](#6-http-routes-p2--p5) | `apps/web` screens | `mock-api.ts` (unchanged) |

---

## 1. The flow

One invoice from upload to close. "API" means `apps/api`; it is the only thing that talks to the chains
and to the extraction service.

| # | Who acts (web) | Action | What the API does | Chain |
|---|---|---|---|---|
| 1 | Supplier | uploads invoice | stores file, `documentHash = sha256(file)`, calls `/extract/invoice`, saves fields + low-confidence flags | – |
| 2 | Supplier | `submit-for-review` | saves the confirmed fields | – |
| 3 | Buyer | `approve` | runs `/check/invoice` against the buyer's PO and receipt, computes `invoiceKey`, makes a `salt`, `commitment = prover.computeCommitment(...)`, calls `registry.register` signed by the buyer | **Cardano**: entry `Available` |
| 4 | Supplier | `generate-proof` | `prover.prove(commitment, fields, salt, thresholdFor(currency))`, stores progress | **Midnight**: commitment recorded as proven |
| 5 | Supplier | `list` | status `Listed` | – |
| 6 | Lenders | `quote` | a lender's view sets `provenMinimum` only if `prover.verify` is true **and** `registry.getEntry` shows `Available` with the same commitment. Offers stored sealed | – |
| 7 | Supplier | `select-offer` | selected lender now gets documents, fields and salt, and runs the **opening check**: recompute the commitment and compare with Cardano | – |
| 8 | Selected lender | `sign-pledge` | `registry.pledge(invoiceKey, lenderKeyHash)` signed by supplier + lender | **Cardano**: `Pledged` to that lender |
| 9 | Selected lender | `send-advance` | records the advance (off-platform transfer) | – |
| 10 | Buyer | `instruct-payment` | reads the payee lender **from Cardano** and builds the payment instruction | – |
| 11 | Buyer | `upload-slip` | calls `/extract/slip` with the instruction, stores match result | – |
| 12 | Selected lender | `confirm-payment` | records the arrival | – |
| 13 | Selected lender | `send-balance` | `registry.close(invoiceKey)` signed by the lender | **Cardano**: `Closed` |

**Double financing (the demo's punchline):** the supplier uploads the same invoice again. It gets the same
`invoiceKey`, so `register` fails with `already-registered` and the API links the new record to the existing
entry. When a lender tries to pledge it, the **validator** refuses because the entry is already `Pledged`
(`script-rejected`). The API answers 409 `already-financed`.

Every action's allowed role and status is in `actionRules` (`packages/shared/src/status.ts`). It mirrors
`runAction` in `apps/web/src/lib/mock-api.ts`, which stays the behaviour reference.

---

## Decisions

| # | Decision |
|---|---|
| D1 | **The API runs all chain and proof work** (Node, server side). The browser never builds transactions or proofs. |
| D2 | **Signing for the Must demo uses four server-side test wallets** (supplier, buyer, Lender A, Lender B) whose seed phrases sit in each person's local `.env` only. The wallet button in the web app shows a real CIP-30 wallet's address and balance. Browser signing is a stretch goal; the interface already allows it (`Signer`). |
| D3 | **Midnight proving also runs in the API** with one supplier test wallet and the proof server on port 6300. The platform sees the amount anyway; the privacy is from lenders and the public. |
| D4 | One **commitment** ties the two chains together. Only P4's `computeCommitment` produces it; everyone else treats it as 32 opaque bytes. |
| D5 | Thresholds are fixed by currency: `MIN100K_LKR_V1` (LKR 100,000) and `MIN1K_USD_V1` (USD 1,000). The circuit hard-codes them. |
| D6 | `CHAIN_MODE=fake` (default) makes the API use `FakeRegistry` and `FakeProver`; `CHAIN_MODE=real` uses P3's and P4's libraries. P1 flips this during integration. |
| D7 | Chain provider for Cardano is **Blockfrost** (preprod) through **Mesh**. |
| D8 | `InvoiceVeilApi` in `apps/web/src/lib/api.ts` is **frozen**. The web app and API meet only there. |
| D9 | All money in minor units; `bigint` inside libraries, `number` (safe integer) in JSON. Rates in basis points. |

---

## 2. The invoice commitment (everyone)

Code: `packages/shared/src/commitment.ts`.

```
invoiceKey   = SHA-256( "<buyer organization id>|<invoice number, trimmed, spaces collapsed, upper case>" )
documentHash = SHA-256( invoice file bytes as stored by the API )
salt         = 32 random bytes, made once at buyer approval, kept by the API
commitment   = persistentHash<InvoiceCommitmentV1>(fields)          // Compact, P4's library only

struct InvoiceCommitmentV1 {
  version:      Uint<8>    // 1
  invoiceKey:   Bytes<32>
  amountMinor:  Uint<64>   // approved amount
  currency:     Uint<8>    // LKR = 1, USD = 2
  dueDateDays:  Uint<32>   // days since 1970-01-01 UTC
  documentHash: Bytes<32>
  salt:         Bytes<32>
}
```

- All hex is lower case, no `0x`. `invoiceKey` and `commitment` are 32 bytes (64 hex characters).
- `invoiceKey` is public (it names the Cardano entry). Everything else stays private.
- The salt is shared only with the selected lender, for the opening check.
- Amending an approved invoice makes a new commitment with a **new salt** and calls `registry.amend`.

---

## 3. Cardano registry (P3)

Code: `packages/shared/src/cardano.ts` (`CardanoRegistry`). Deliver as workspace package
`@invoice-veil/cardano-registry` in `packages/cardano-registry`, exporting
`createCardanoRegistry(config): CardanoRegistry`. Validator in `contracts/cardano`.

**On chain:** one UTxO per invoice at the registry script, holding a registry token whose asset name is
`invoiceKey`, with this datum:

```
RegistryDatum { invoiceKey, commitment, supplier: VerificationKeyHash, buyer: VerificationKeyHash,
                lender: Option<VerificationKeyHash>, state, version: Int }
state = Available | Pledged | Defaulted | Closed | Cancelled
```

| Call | From state | To state | Must be signed by |
|---|---|---|---|
| `register` (mints token) | – | Available | buyer |
| `amend` | Available | Available, version + 1 | buyer + supplier |
| `pledge` | Available | Pledged (lender set) | supplier + lender |
| `markDefaulted` | Pledged | Defaulted | lender |
| `close` | Pledged, Defaulted | Closed | lender |
| `cancel` | Available | Cancelled | buyer + supplier |

Closed and Cancelled are final: the validator refuses any spend. Every rule above is enforced **by the
validator**, not by the library. In particular `pledge` must not check the state itself: the demo needs
the validator's own refusal (`script-rejected`).

**Library rules:**
- Build calls return an `UnsignedTx` (`cbor`, `txId`, `requiredSigners`). `submit` takes witness sets.
  `signAndSubmit(registry, tx, signers)` in shared does the collecting.
- Provide `createDemoSigner(mnemonic): Promise<Signer>` for the server-side wallets (D2).
- `listEvents(afterSlot)` returns events oldest first; `(txId, kind)` is unique so replays can be ignored.
- Throw only `RegistryError` with one of: `already-registered`, `not-found`, `script-rejected`,
  `missing-signature`, `insufficient-funds`, `provider-unavailable`, `submit-failed`.
- `FakeRegistry` in `packages/shared/src/fakes.ts` behaves exactly like this; make your library pass the
  same scenario (§ 8 below).

---

## 4. Midnight proof (P4)

Code: `packages/shared/src/midnight.ts` (`MinimumValueProver`). Deliver in `packages/proof-verifier` as
`@invoice-veil/proof-verifier`, exporting `createMinimumValueProver(config): MinimumValueProver`.
Contract in `contracts/midnight`.

**Contract:** ledger `proven: Map<Bytes<32>, Uint<8>>` (commitment → threshold code). Circuit
`proveMinimum(commitment, thresholdCode)` takes the `InvoiceCommitmentV1` fields as witnesses and asserts:

1. `persistentHash(fields) == commitment` → else `commitment-mismatch`
2. currency matches the threshold → else `wrong-currency`
3. `amountMinor >= minimum` → else `below-threshold`

then records the commitment in `proven`.

| Threshold | Code | Currency | Minimum (minor units) |
|---|---|---|---|
| `MIN100K_LKR_V1` | 1 | LKR | 10,000,000 |
| `MIN1K_USD_V1` | 2 | USD | 100,000 |

**Library rules:**
- `computeCommitment` is pure and local (no network) and must match the circuit byte for byte.
- `prove(..., onProgress)` calls `onProgress("local")` after the local proof and `onProgress("chain")` once
  submitted; the web app's `ProofStage` follows this.
- `verify` only reads the ledger; it never needs private fields.
- Throw only `ProofError`: `below-threshold`, `wrong-currency`, `commitment-mismatch`,
  `proof-server-unavailable`, `submit-failed`.
- Required tests: LKR 120,000 passes; LKR 80,000 fails; any altered field fails.

---

## 5. Extraction service (P1)

Code: `packages/shared/src/extraction.ts` mirrors `services/extraction/app/schemas.py`. These response
shapes are frozen; P1 may add fields but not rename or remove them.

| Endpoint | Input | Output |
|---|---|---|
| `POST /extract/invoice` | multipart `file` (PDF, PNG, JPEG, ≤ 10 MB) | `InvoiceExtraction` |
| `POST /check/invoice` | JSON `CheckRequest` (confirmed invoice, PO, delivery receipt) | `CheckResult` |
| `POST /extract/slip` | multipart `file` + optional `instruction` (JSON string `SlipInstruction`) | `SlipExtraction` |

Mapping rules the API applies (helpers in shared):
- `lowConfidenceFields`: a field is flagged when confidence is `low` or `missing`
  (`invoice_number` → `invoiceNumber`, `total_minor` → `amount`, `terms_days` → `termDays`).
- `slipResult`: only `match.status === "match"` counts as a match; `mismatch` and `unreadable` both show as
  mismatch, with `reasons[].message` as the reasons.
- The demo case: an invoice reading LKR 150,000 against a PO and receipt for LKR 120,000 must return
  `ok: false` with an `error` discrepancy that has `difference_minor: 3000000`.
- PO and delivery receipt are the **buyer's** records, seeded in the database for the demo, matched by
  `po_reference`. They are not uploaded by the supplier.

---

## 6. HTTP routes (P2 → P5)

Code: `packages/shared/src/http.ts`. Every route takes `?role=supplier|buyer|lender-a|lender-b` (no sign-in
yet). Bodies and responses are the types in `apps/web/src/lib/api.ts`.

| `InvoiceVeilApi` method | Route | Success |
|---|---|---|
| `getLedgerSnapshot(role)` | `GET /ledger-snapshot` | `LedgerSnapshot`; 404 → `null` |
| `listInvoices(role)` | `GET /invoices` | `InvoiceSummary[]` |
| `getInvoice(role, id)` | `GET /invoices/:id` | `InvoiceDetail`; 404 → `null` |
| `uploadInvoice(role, file?)` | `POST /invoices` (multipart, optional `file`) | 201 `{ "id": "..." }` |
| `act(role, id, action)` | `POST /invoices/:id/actions` | 204 |
| (document viewer) | `GET /invoices/:id/documents/:kind` | file bytes |

- `act` sends the `InvoiceAction` as JSON. For `upload-slip` with a real file: multipart with a JSON string
  field `action` (the action minus the `File`) and a `file` field.
- `kind` is `invoice`, `purchase-order`, `delivery-receipt` or `slip`.
- Errors are JSON `{ "error": "<sentence for the user>", "code": "..." }`. `http-api.ts` throws
  `new Error(error)` so screens show the same messages as with the mock.

| Status | When | `code` |
|---|---|---|
| 400 | bad input | `invalid-input` |
| 403 | role may not do this | `forbidden` |
| 404 | missing **or not visible** (never say which) | `not-found` |
| 409 | wrong status, or refused on chain | `wrong-status`, `already-financed`, `proof-failed` |
| 502 | extraction or chain provider failed | `extraction-failed`, `chain-unavailable` |

**Visibility (never leak through any route):** the buyer never sees offers or fees; a lender sees only its
own offer; amounts, supplier name, documents and salt go only to the selected lender (from
`Offer selected`). The mock's `canView`, `canReadAmount` and `project` are the reference.

`ledgerSnapshot` returns the most recently updated invoice that the role can see and that is registered on
Cardano. Chain entries use the titles in `chainEntryTitles` (`status.ts`).

---

## 7. What the API stores (P2)

Besides the existing tables, per invoice: `invoice_key`, `document_hash`, `salt` (never returned except to
the selected lender), `commitment`, `cardano_utxo_ref`, `registry_state`, `proof_threshold_id`,
`proof_tx_id`, `proof_stage`. Plus tables for documents, offers, purchase orders, delivery receipts,
payments and `chain_events` (unique on `tx_id, kind`) as listed in `TASKS.md`.

Demo organizations keep their fixed ids (`apps/api/src/demo-organizations.ts`). Their Cardano key hashes
come from the demo wallets in real mode and from `fakeKeyHashes` in fake mode.

---

## 8. Shared acceptance scenario

Each chain library must pass this, the same scenario the fakes pass:

1. Register an LKR 120,000 invoice, signed by the buyer → `Available`.
2. Prove against `MIN100K_LKR_V1` → `verify` is true. Proving altered fields fails; LKR 80,000 fails.
3. Pledge to Lender A, signed by supplier + Lender A → `Pledged`, `lender` = Lender A.
4. Pledge to Lender B → `script-rejected`.
5. Submit a close with no signatures → `missing-signature`. Close signed by Lender A → `Closed`.
6. `listEvents()` → `registered, pledged, closed`, oldest first.

---

## 9. Environment variables

Names are fixed; values go only in your local `.env` (never committed). Testnet wallets only.

| Variable | Used by | Meaning |
|---|---|---|
| `CHAIN_MODE` | API | `fake` (default) or `real` |
| `CARDANO_NETWORK` | P3 | `preprod` |
| `BLOCKFROST_PROJECT_ID` | P3 | your own free preprod key |
| `CARDANO_SUPPLIER_MNEMONIC`, `CARDANO_BUYER_MNEMONIC`, `CARDANO_LENDER_A_MNEMONIC`, `CARDANO_LENDER_B_MNEMONIC` | P3, API | demo test wallets (D2) |
| `MIDNIGHT_PROOF_SERVER_URL` | P4 | `http://localhost:6300` (`http://proof-server:6300` in the dev container) |
| `MIDNIGHT_INDEXER_URL`, `MIDNIGHT_NODE_URL` | P4 | Midnight testnet endpoints |
| `MIDNIGHT_WALLET_SEED` | P4, API | supplier's Midnight test wallet (D3) |
| `MIDNIGHT_CONTRACT_ADDRESS` | P4, API | deployed minimum-value contract |

---

## 10. Known limits (say these honestly in the README)

- The registry cannot stop two **different** registry entries for one invoice by itself: uniqueness of
  `invoiceKey` relies on the buyer signing registration only once and the API refusing a second one. What
  the chain does enforce is one pledge per entry.
- The API sees invoice amounts; zero knowledge hides them from lenders and the public, not from the platform.
- Demo signing uses server-held test wallets.
