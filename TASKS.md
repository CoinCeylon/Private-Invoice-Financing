# invoice-veil: Task List

UniHack 2026 · Private invoice financing on Cardano and Midnight
Last updated: **27 Nov 2026** (roles rearranged: one owner for all AI work, independent tracks, one integrator)

`[x]` done · `[ ]` to do · current progress lives in `PROGRESS.md`

## Roles (from 27 Nov)

| Person | Owns | Folders they write |
|---|---|---|
| **P1** | **All AI work** (invoice and slip reading, document checks, accuracy, AI stretch items) **and integration lead** | `services/extraction`, then the integration branch |
| **P2** | Backend: API, database, access rules, `http-api.ts` client, Dockerfiles, deployment | `apps/api`, `packages/shared`, `apps/web/src/lib/http-api*.ts` |
| **P3** | Cardano: Aiken registry validator and its off-chain library | `contracts/cardano` |
| **P4** | Midnight: minimum-value circuit and the proof library | `contracts/midnight`, `packages/proof-verifier` |
| **P5** | Frontend screens, wallet connect, research interviews, pitch deck and demo video | `apps/web` (except `http-api*.ts`), `research/` |

## How we work

1. **Contracts first (by 28 Nov).** Everyone agrees the interfaces in Stage 0 once. After that nobody
   waits for anybody else.
2. **Independent build (to 3 Dec).** Each person works alone on their own branch (`p<N>/<topic>`), touching only
   their own folders, against **fakes** of everyone else's module. Each module ships with its own tests and a
   standalone demo (script, CLI or mock-backed screen) that proves it works without the others.
3. **Hand-off (3 Dec, 11:59 PM).** Each person merges their module to `main` with a short "how to use"
   section in its README (entry points, env vars, example call, known limits). The hand-off checklist
   below must be ticked.
4. **Integration (4–7 Dec), P1 only.** P1 wires the real modules together on `p1/integration` and replaces
   the fakes. Others stay on call: P1 files bugs against a module, its owner fixes them in their own folder.
   Nobody else edits the wiring.
5. **Second round.** Should items are built the same way: alone to 10 Dec, then P1 integrates 10–11 Dec.

Changing a frozen interface after 28 Nov needs P1's OK, because P1 is the one who has to make it fit.

## Key dates

| Date | Milestone |
|---|---|
| **28 Nov** | **Interfaces frozen (Stage 0)** |
| 30 Nov | Contracts and proof work alone, two interviews done |
| **3 Dec, 11:59 PM** | **Hand-off: every module merged with its README and standalone demo** |
| 4–7 Dec | P1 integrates: approve → register → prove → offers → pledge → settle |
| **5 Dec, 11:59 PM** | **Organizer GitHub access confirmed** |
| **8 Dec** | **Core checkpoint: every Must item works end to end** |
| 10 Dec | Should items handed off; P1 integrates 10–11 Dec; cloud deployment |
| 13 Dec | Video, README and release checks finished |
| **14 Dec, 12:00 noon** | **Submission deadline** |
| 17 Dec | Finale |

---

## Done so far (until 25 Nov)

<details>
<summary>Planning, environment and starter projects</summary>

- [x] Project plan revision 3, repository name `invoice-veil`, roles assigned, team decisions agreed
- [x] Tech stack agreed: React + Vite, Express + TypeScript, PostgreSQL + Prisma, Python for OCR, Aiken, Compact
- [x] Docker Compose: PostgreSQL 16, Midnight proof server 9.0.2 (port 6300), extraction service
- [x] `.env.example`, `.gitignore`, `.gitattributes` (LF), pinned tool versions, dev container with Docker volumes
- [x] Root `package.json` and `pnpm-workspace.yaml`
- [x] Web app: Vite + React + TypeScript, TanStack Router with role switcher, screens for all four roles on `mock-api.ts`
- [x] Web: upload and extraction review screen with low-confidence fields, buyer approval screen with PO and receipt checks
- [x] API: Express + TypeScript on port 4000, Prisma 7 with `organizations` and `invoices`, `/health`
- [x] `packages/shared` with `formatMinor`, used by the API
- [x] Seed script with Gampaha Packaging, Market Buyer, Lender A and Lender B
- [x] First real read path: `GET /invoices?role=` with per-role visibility, web list uses it with `VITE_INVOICE_API=http`
- [x] `POST /extract/invoice` proxied through the API to the extraction service (supplier only, size limit)
- [x] Extraction service: invoice and slip reading, checks, deskewing, 26 tests, evaluation script, 10 fictional samples
- [x] `apps/api/src/generated/` ignored, pull requests #1–#3 merged
- [x] README with idea, demo story and how-to-run steps

</details>

---

## Stage 0: Interfaces (27–28 Nov, everyone, one meeting)

Write each agreed interface as TypeScript types in `packages/shared` (P2 commits them) so fakes and real
modules have the same shape.

- [ ] **All** Invoice commitment format: which fields, their encoding, the hash, the salt (P4 drafts, P2 and P3 sign off)
- [ ] **All** `CardanoRegistry` interface: `register`, `amend`, `pledge`, `markDefaulted`, `close`, `cancel`, `getState`, `listEvents` (P3 drafts)
- [ ] **All** `MinimumValueProver` interface: `prove(invoice, salt, threshold)` and `verify(proof, commitment, threshold)` (P4 drafts)
- [ ] **All** Decide where transactions are built and signed (suggested: P3's library builds them in the API, the browser wallet signs)
- [ ] **All** Extraction response shape the API relies on, including how confidence maps to `lowConfidence` (P1 drafts)
- [ ] **All** HTTP routes behind every `InvoiceVeilApi` method and `InvoiceAction` in `apps/web/src/lib/api.ts` (P2 drafts)
- [ ] **P1** Task board in GitHub Projects with an owner on every card; daily 15-minute check-in time fixed

---

## Stage 1: Independent build (27 Nov – 3 Dec)

### P1: AI (finish by 3 Dec, then integrate)

- [ ] Extraction tests pass inside the dev container
- [ ] Demo case sample: scanned invoice that says LKR 150,000 against a PO and receipt for LKR 120,000, flagged by `/check/invoice`
- [ ] 3–5 harder samples added (blur, rotation, handwriting, other layouts), evaluation rerun, `metrics.json` updated
- [ ] Slip check against a payment instruction: amount, reference and payee, with clear mismatch reasons
- [ ] Confidence thresholds documented and tuned so only truly unsure fields come back as low confidence
- [ ] Extraction README "how to use" section and an honest AI description for the main README ("on fictional samples")
- [ ] Tag `setup-complete` once the dev container and Compose are confirmed stable

### P2: Backend

- [ ] Shared types in `packages/shared`: Stage 0 interfaces, amount encoding, invoice status codes
- [ ] Tables: `memberships`, `documents`, `invoice_versions`, `listings`, `offers`, `payments`, `chain_events`
- [ ] Every `InvoiceVeilApi` method served over HTTP: ledger snapshot, invoice detail per role, upload, `act`
- [ ] Every `InvoiceAction` as a state change with checks (who may do it, in which status)
- [ ] Upload: store the file, call extraction, save the review; slip upload calls `/extract/slip`
- [ ] Sealed offers: a lender sees only their own offer, the buyer sees no offers or fees
- [ ] Documents disclosed only to the selected lender, after the pledge
- [ ] Payment instruction with reference, settlement steps, buyer track record from history
- [ ] `FakeRegistry` and `FakeProver` used behind the Stage 0 interfaces, so the whole flow runs without chains
- [ ] Chain event indexer working against `FakeRegistry.listEvents`, replay creates no duplicates
- [ ] Visibility tests: buyer cannot see offers or fees, Lender B cannot see Lender A's offer or documents
- [ ] `apps/web/src/lib/http-api.ts` implements the full `InvoiceVeilApi`, tested with mocked `fetch`
- [ ] Shared function (`formatMinor` or the money types) used in the web app
- [ ] Web and API Dockerfiles; versions table in the README

### P3: Cardano

- [ ] `contracts/cardano`: `aiken new`, `aiken check` and `aiken build` pass, `plutus.json` committed
- [ ] Two test wallets on preprod, funded from the faucet (keys stay in `.env`, never in the repo)
- [ ] Registry validator: register, amend, pledge, Defaulted, close, cancel
- [ ] Aiken tests: unauthorized updates fail, a second pledge fails
- [ ] Off-chain TypeScript library (Mesh) that implements `CardanoRegistry` exactly as agreed
- [ ] Standalone script runs the full lifecycle on preprod, including a rejected second pledge; transaction IDs saved
- [ ] `getState` returns the recorded payee lender, `listEvents` returns history for the indexer
- [ ] README "how to use": env vars, script, example calls, known limits

### P4: Midnight

- [ ] `contracts/midnight`: example contract compiles with `compact compile`
- [ ] Test wallet funded from the Midnight faucet, example deployed with Midnight.js and the local proof server
- [ ] Minimum-value circuit with `MIN100K_LKR_V1`
- [ ] Tests: LKR 120,000 passes, LKR 80,000 fails, altered fields fail
- [ ] `packages/proof-verifier` implements `MinimumValueProver` (prove and verify) exactly as agreed
- [ ] Standalone script: commit, prove and verify on testnet; contract address and transaction IDs saved
- [ ] README "how to use": proof server, env vars, example calls, known limits

### P5: Frontend and research

- [ ] Every Must screen complete on `mock-api.ts`: sealed offers, offer comparison with net cash, disclosure,
      pledge signing, payment instruction, slip upload result, lender confirmation, balance, close
- [ ] Rejected second financing shown clearly (error from the chain, nothing changes in the app)
- [ ] Connect wallet with a real CIP-30 wallet on preprod (Mesh `BrowserWallet`): address and balance
- [ ] Proof progress and chain entries driven only by data from `InvoiceVeilApi` (no hard-coded states)
- [ ] Component tests for the role workflows; build, lint and tests pass
- [ ] Fresh-clone test by following the README, in under 30 minutes, with notes on what broke
- [ ] Two interviews done by 30 Nov (suppliers first)
- [ ] Demo script for the 3-minute video written against the README demo story

### Hand-off checklist (each person, by 3 Dec)

- [ ] Branch merged to `main`, only your own folders touched
- [ ] Tests pass in the dev container
- [ ] Standalone demo works on a fresh clone
- [ ] README "how to use" section written
- [ ] Anything that differs from the Stage 0 interfaces written down for P1

---

## Stage 2: Integration (4–7 Dec, P1)

**P1** wires the real modules in place of the fakes, on `p1/integration`:

- [ ] Web uses `VITE_INVOICE_API=http` for every screen
- [ ] Upload → extraction review → buyer approval with the AI check result
- [ ] Buyer approval registers the invoice on Cardano (state Available)
- [ ] Supplier generates the Midnight proof from the app
- [ ] Lender verifies the proof and the Cardano state before quoting
- [ ] Two sealed offers, one selected, documents disclosed only to the selected lender, opening check passes
- [ ] Pledge signed by lender and supplier, buyer's payee read from Cardano
- [ ] Second financing attempt fails on Cardano
- [ ] Payment instruction, slip upload, AI match, lender confirms, balance sent, supplier confirms, invoice closes
- [ ] Real chain events indexed, replay creates no duplicates

**P2–P5 during integration:** fix bugs P1 reports, in your own folder only. In the meantime start your
Stage 3 items alone.

- [ ] **P5** All interviews written up

## Checkpoint (8 Dec): Must items

- [ ] Document review works
- [ ] One Midnight proof
- [ ] Two sealed offers
- [ ] One pledge on Cardano
- [ ] Rejected second financing
- [ ] On-time bank-transfer settlement with slip upload and lender confirmation

---

## Stage 3: Should items (independent to 10 Dec, P1 integrates 10–11 Dec)

- [ ] **P2** Late-payment penalty: LKR 600 split LKR 465 and LKR 135, 3% cap
- [ ] **P2** Lender balance deadline and lender penalty
- [ ] **P2 / P3** Defaulted fixture with 50% recourse (supplier owes LKR 45,000), Defaulted state on Cardano
- [ ] **P4** USD 2,500 example with `MIN1K_USD_V1`
- [ ] **P5** Screens for late payment, penalties, Defaulted and USD; buyer track-record card on live data
- [ ] **P2** Deployed on a cloud VM with HTTPS (Docker Compose and Caddy)
- [ ] **P5** At least one outside review recorded
- [ ] **P1** Integrate all of the above on `p1/integration` and merge to `main`

**Stretch (only if the checkpoint passed)**
- [ ] **P1** Language-model fallback for unfamiliar invoice layouts
- [ ] **P1** Payment-delay forecast
- [ ] **P2 / P5** Deal ratings with fixed tags
- [ ] **P2** Kubernetes manifests

---

## Stage 4: Finish and submit (11–14 Dec)

- [ ] **P1** All tests pass on `main`, including the payments and visibility tests
- [ ] **P1** README pulled together: what it does, how to run, architecture, privacy limits, honest AI description
      (each owner writes their own section)
- [ ] **P1** README states the boundaries: off-platform financing, penalties not enforced by the app
- [ ] **P1** Extraction accuracy quoted as "on fictional samples"
- [ ] **P5** Revenue slide and pitch deck
- [ ] **P5** 3-minute demo video recorded and rehearsed
- [x] Apache 2.0 licence in the repo
- [ ] **All** No seed phrases, private keys or real data anywhere in the repo or its history
- [ ] **P1** Code pushed to the organizer repository
- [ ] **P1** **Submitted before 14 Dec, 12:00 noon**

## Research and evidence (P5, ongoing)

- [ ] Two suppliers interviewed
- [ ] One buyer-side finance or procurement person interviewed
- [ ] One lender interviewed (recourse share, subscription and 0.5% fee)
- [ ] Letter of interest requested
- [ ] Findings summarized, with permission for any quotes
