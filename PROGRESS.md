# invoice-veil: Progress

Where the project stands right now. `TASKS.md` is the plan; this file is the state.
**Update it at the end of every work session** (what changed, what is next, what is blocked).

Last updated: **28 Nov 2026**

## Stage

**Stage 1 (independent build).** Stage 0 interfaces were fixed on 28 Nov without a meeting: `docs/interfaces.md`. Roles were rearranged on 27 Nov:
P1 owns all AI work and integrates everyone's modules; P2 backend, P3 Cardano, P4 Midnight,
P5 frontend and research. Hand-off of every module is due **3 Dec, 11:59 PM**.

## By area

| Area | Owner | State |
|---|---|---|
| Dev environment | – | Done. Compose runs Postgres 16, Midnight proof server (6300) and the extraction service. Dev container pins all tools and keeps `node_modules` / `.venv` in Docker volumes. |
| Frontend `apps/web` | P5 | Far along on mocks. Role switcher, ledger overview, invoice list, upload + extraction review, buyer approval, proof panel, quote panel, offer comparison, settlement tracker, slip upload, track record. Runs on `mock-api.ts`; `http-api.ts` implements only `listInvoices`. Wallet button is mocked (no real CIP-30 yet). |
| Backend `apps/api` | P2 | Started. `/health`, `GET /invoices?role=` with per-role visibility, `POST /extract/invoice` proxy (supplier only, 10 MB limit). Tables: `organizations`, `invoices` only. Seed script for the four demo organizations. Status codes, labels, `Currency` and `Money` now come from `@invoice-veil/shared` (no local copies). No offers, documents, settlement or chain code yet. |
| Shared `packages/shared` | P2 | Stage 0 interfaces in place: money, status codes and `actionRules`, commitment format, `CardanoRegistry`, `MinimumValueProver`, extraction types, HTTP routes. `FakeRegistry` and `FakeProver` in `@invoice-veil/shared/fakes` pass the acceptance scenario (smoke-tested 28 Nov, no test runner in the package yet). Not used by the web app yet. |
| AI `services/extraction` | P1 | Working. FastAPI with `/extract/invoice`, `/check/invoice`, `/extract/slip`; deskewing; 26 tests; 10 fictional samples with truth files; `metrics.json` shows 100% field accuracy on those samples. `/extract/slip` already matches a slip against a payment instruction. Harder samples and the LKR 150,000 vs 120,000 demo case still to do. |
| Cardano `contracts/cardano` | P3 | Not started (folder does not exist yet). No preprod wallets or spike recorded. |
| Midnight `contracts/midnight` | P4 | Not started (folder does not exist yet). Proof server runs in Compose. No spike recorded. |
| Research | P5 | No interviews recorded yet. Two are due by 30 Nov. |

## Next up

- Everyone: read your section of `docs/interfaces.md`, raise problems with P1 by 29 Nov.
- P3 and P4: tool spikes (faucet wallets, first transaction / first proof). These are the biggest risk.
- P2: remaining tables and routes behind `InvoiceVeilApi`, with `CHAIN_MODE=fake`; use shared `actionRules` when building `act`.
- P5: change the mock's USD threshold to 100,000 minor units to match `MIN1K_USD_V1`.

## Risks and blockers

- Cardano and Midnight work has not started and is 6 days from hand-off.
- Organizer GitHub access must be confirmed by 5 Dec, 11:59 PM.

## Branches

- `main`: everything above.
- `Invoice-List-Slice-Nadil` (local and remote): older slice of the invoice list work; check whether it is already in `main` before deleting.

## Log

- **28 Nov**: API uses `statusLabels`, `listingStatusCodes`, `Currency`, `Money` and `isCurrency` from `@invoice-veil/shared` instead of its own copies (build and 10 API tests pass).
- **28 Nov**: Stage 0 fixed without a meeting: `docs/interfaces.md`, interface types and fakes in `packages/shared`, chain env var names in `.env.example`.
- **27 Nov**: Roles rearranged (P1 = AI + integration lead), `TASKS.md` rewritten into independent tracks with a 3 Dec hand-off, this file added, README Team and Folders tables updated.
- **24 Nov**: Extraction service added to Compose and proxied through the API; dev container deps moved to Docker volumes; seed script and first real read path (`GET /invoices`); README how-to-run.
- **22–23 Nov**: Starter projects merged (web, API + shared, extraction service).
