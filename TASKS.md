# invoice-veil: Task List

UniHack 2026 · Private invoice financing on Cardano and Midnight
Last updated: **25 Nov 2026**

`[x]` done · `[ ]` to do · **P1** frontend · **P2** backend · **P3** Cardano · **P4** Midnight · **P5** document AI and research

## Key dates

| Date | Milestone |
|---|---|
| 23 Nov | Starter projects merged, tool spikes pass |
| 30 Nov | Contracts and proof work alone, two interviews done |
| 4 Dec | First integration: approve → register → prove → pledge |
| **5 Dec, 11:59 PM** | **Organizer GitHub access confirmed** |
| 7 Dec | Offers, disclosure, blocked double financing, settlement |
| **8 Dec** | **Core checkpoint: every Must item works end to end** |
| 10 Dec | Should items, cloud deployment, outside review |
| 13 Dec | Video, README and release checks finished |
| **14 Dec, 12:00 noon** | **Submission deadline** |
| 17 Dec | Finale |

---

## Phase 1: Planning and team setup

- [x] Project plan revision 3 (payments, late payment, default, revenue, currencies, track records)
- [x] Repository name chosen: `invoice-veil`
- [x] Roles P1–P5 assigned
- [x] Team meeting held and decisions agreed (stack, preprod, cents and basis points, fictional data only)
- [x] Tech stack agreed: React + Vite, Express + TypeScript, PostgreSQL + Prisma, Python for OCR, Aiken, Compact
- [ ] Task board set up in GitHub Projects with an owner on every card
- [ ] Daily 15-minute check-in time fixed

## Phase 2: Development environment

- [x] Docker Compose: PostgreSQL 16 (healthy) and Midnight proof server 9.0.2 (listening on 6300)
- [x] `.env.example` committed, `.env` kept local
- [x] `.gitignore` covering secrets, Node, Python, Aiken and Compact output
- [x] Tool versions pinned: Node 22.23.5, pnpm 12.21.0, Python 3.12.16, Aiken 1.1.24, Compact 0.36.1 (CLI 0.5.1)
- [x] Dev container builds, and every tool prints its pinned version
- [x] Root `package.json` and `pnpm-workspace.yaml`
- [x] `postgresql-client` added to the dev-container Dockerfile
- [x] `DATABASE_URL` added to `docker-compose.dev.yml`
- [x] `.gitattributes` with LF line endings committed
- [x] Dev container keeps `node_modules` and `.venv` in Docker volumes (the Windows bind mount stalled Prisma and vitest)
- [ ] Versions table in the README
- [ ] Setup tagged `setup-complete`
- [ ] Fresh-clone test by a teammate in under 30 minutes

## Phase 3: Starter projects (by 23 Nov)

**P1: `apps/web`**
- [x] Vite + React + TypeScript app runs on `localhost:5173`
- [ ] Supplier / Buyer / Lender placeholder page
- [ ] Build and lint pass, pull request merged

**P2: `apps/api` and `packages/shared`**
- [x] `packages/shared` with `formatMinor`, built and imported by the API
- [x] Express + TypeScript API runs on port 4000
- [x] Prisma 7.10.1 set up, `organizations` and `invoices` tables migrated
- [x] `/health` checked with `curl` and showing `"database":"connected"`
- [ ] Shared function used in the web app
- [ ] `apps/api/src/generated/` in `.gitignore`, pull request merged

**P3: `contracts/cardano`**
- [ ] `aiken new`, `aiken check` and `aiken build` pass, `plutus.json` committed

**P4: `contracts/midnight`**
- [ ] Example contract compiles with `compact compile`

**P5: `services/extraction`**
- [x] Extraction service written: invoice and slip reading, checks, deskewing, 26 tests, evaluation script
- [x] Fictional samples and truth files (5 invoices, 1 tilted photo, 4 slips)
- [ ] Added to the repo, tests pass inside the dev container
- [ ] Pull request merged

## Phase 4: Tool spikes (22–23 Nov)

**P3: Cardano**
- [ ] Two test wallets on preprod, funded from the faucet
- [ ] Mesh script sends test ADA between the wallets
- [ ] Lock and unlock at the starter Aiken validator
- [ ] Transaction IDs saved

**P4: Midnight**
- [ ] Test wallet funded from the Midnight faucet
- [ ] Example contract deployed with Midnight.js and the local proof server
- [ ] One function called, generating a real proof
- [ ] Contract address and transaction ID saved

**P1: Wallet**
- [ ] Wireframes of the main screens agreed by the team
- [ ] React Router with role pages and a role switcher
- [ ] Connect wallet button showing the preprod address and balance

## Phase 5: Foundations (24–27 Nov)

- [ ] **P2** Shared invoice format and amount encoding in `packages/shared`
- [ ] **P2** Tables: `memberships`, `documents`, `invoice_versions`, `listings`, `offers`
- [ ] **P2** Upload route: store file, call `/extract/invoice`, save the review
- [x] **P2** Seed script with Gampaha Packaging, Market Buyer, Lender A and Lender B
- [x] **P1 / P2** First real read path: `GET /invoices?role=` with per-role visibility, web list uses it with `VITE_INVOICE_API=http`
- [ ] **P1** Upload and extraction review screen with low-confidence fields highlighted
- [ ] **P1** Buyer approval screen showing PO and receipt checks
- [ ] **P4** Commitment format agreed with P2 and P3
- [ ] **P5** Extraction service added to Docker Compose

## Phase 6: Modules (28–30 Nov)

- [ ] **P3** Registry validator: register, amend, pledge, Defaulted, close, cancel
- [ ] **P3** Aiken tests for unauthorized updates and a second pledge
- [ ] **P4** Minimum-value circuit with `MIN100K_LKR_V1`
- [ ] **P4** LKR 120,000 passes, LKR 80,000 fails, altered fields fail
- [ ] **P5** 3–5 harder samples added, evaluation rerun
- [ ] **P5** Two interviews done (by 30 Nov)
- [ ] **P2 / P5** Web and API Dockerfiles

## Phase 7: First integration (1–4 Dec)

- [ ] Buyer approval registers the invoice on Cardano (state Available)
- [ ] Supplier generates the Midnight proof from the app
- [ ] Lender verifies the proof and the Cardano state before quoting
- [ ] Pledge signed by lender and supplier, buyer's payee read from Cardano
- [ ] **P2 / P3** Chain events indexed, replay creates no duplicates

## Phase 8: Offers and settlement (5–7 Dec)

- [ ] Sealed offers with advance, fee and recourse share
- [ ] Offer comparison with net cash, one offer selected
- [ ] Documents disclosed only to the selected lender, opening check passes
- [ ] Second financing attempt fails on Cardano
- [ ] Payment instruction with reference, slip upload, AI match result
- [ ] Lender confirms arrival, sends balance, supplier confirms, invoice closes
- [ ] Buyer cannot see offers or fees, Lender B cannot see Lender A's offer
- [ ] All interviews written up

## Checkpoint (8 Dec): Must items

- [ ] Document review works
- [ ] One Midnight proof
- [ ] Two sealed offers
- [ ] One pledge on Cardano
- [ ] Rejected second financing
- [ ] On-time bank-transfer settlement with slip upload and lender confirmation

## Phase 9: Should items and deployment (8–10 Dec)

- [ ] Late-payment penalty: LKR 600 split LKR 465 and LKR 135, 3% cap
- [ ] Lender balance deadline and lender penalty
- [ ] Defaulted fixture with 50% recourse (supplier owes LKR 45,000)
- [ ] USD 2,500 example with `MIN1K_USD_V1`
- [ ] Buyer track-record card
- [ ] Deployed on a cloud VM with HTTPS (Docker Compose and Caddy)
- [ ] At least one outside review recorded

**Stretch (only if the checkpoint passed)**
- [ ] Deal ratings with fixed tags
- [ ] Payment-delay forecast
- [ ] Language-model fallback for unfamiliar invoice layouts
- [ ] Kubernetes manifests

## Phase 10: Finish and submit (11–14 Dec)

- [ ] All tests pass, including the payments and visibility tests
- [ ] README: what it does, how to run, architecture, privacy limits, honest AI description
- [ ] README states the boundaries: off-platform financing, penalties not enforced by the app
- [ ] Extraction accuracy quoted as "on fictional samples"
- [ ] Revenue slide and pitch deck
- [ ] 3-minute demo video recorded and rehearsed
- [ ] Apache 2.0 licence in the repo
- [ ] No seed phrases, private keys or real data anywhere in the repo or its history
- [ ] Code pushed to the organizer repository
- [ ] **Submitted before 14 Dec, 12:00 noon**

## Research and evidence (P5, ongoing)

- [ ] Two suppliers interviewed
- [ ] One buyer-side finance or procurement person interviewed
- [ ] One lender interviewed (recourse share, subscription and 0.5% fee)
- [ ] Letter of interest requested
- [ ] Findings summarized, with permission for any quotes