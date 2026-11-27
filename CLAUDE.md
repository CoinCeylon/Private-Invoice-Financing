# CLAUDE.md

invoice-veil: private invoice financing on Cardano (registry, one pledge per invoice) and Midnight
(zero-knowledge minimum-value proof). UniHack 2026. See `README.md` for the idea and `TASKS.md` for the plan.

## Start of every session (required)

- **Read `PROGRESS.md` first**, before any other work, so you know the current state, owners and blockers.
- After finishing meaningful work, update `PROGRESS.md` (area table, next up, log entry with the date).

## Git rules (strict)

- **Never commit, push, or open pull requests yourself.** Leave every change uncommitted for the user to review.
- **Never add Claude as a co-author** (no `Co-Authored-By: Claude ...` lines, no "Generated with Claude Code" footers) in anything you draft.
- If asked to draft a commit message, follow the existing style: short, imperative, capitalised, no prefix
  (e.g. `Add API starter with Prisma and shared package`). Branches are `p<N>/<topic>` (e.g. `p2/api-starter`).

## Layout

| Path | What | Stack |
|---|---|---|
| `apps/web` | Frontend (all four roles) | React 19 + Vite, TanStack Router + Query, Tailwind 4, Radix, react-hook-form + zod, vitest, oxlint |
| `apps/api` | Backend | Express 5 + TypeScript (ESM, NodeNext), Prisma 7 with `@prisma/adapter-pg`, PostgreSQL 16 |
| `packages/shared` | Code shared by web and API (`@invoice-veil/shared`) | TypeScript, built to `dist/` |
| `services/extraction` | Invoice / bank-slip OCR, called only by the API | Python 3.12, FastAPI, pdfplumber, Tesseract, pytest |
| `contracts/cardano`, `contracts/midnight` | Not started yet | Aiken, Compact |

pnpm workspace (`apps/*`, `packages/*`). Docker Compose runs Postgres and the Midnight proof server;
the dev container (`.devcontainer/`) pins every tool version.

## Commands

```bash
pnpm --filter web dev | build | lint | test     # localhost:5173
pnpm --filter api dev | build                   # localhost:4000, GET /health
pnpm --filter api db:migrate | db:generate
pnpm --filter @invoice-veil/shared build        # build before the API uses it
cd services/extraction && pytest -q             # uvicorn app.main:app --port 8000
```

## Code conventions

**TypeScript in `apps/web`:** single quotes, no semicolons, 2-space indent, trailing commas in multi-line lists.
`import type` for types. Kebab-case file names (`quote-panel.tsx`). Code grouped by role under
`src/features/{supplier,buyer,lender,invoice}`, generic UI in `src/components/ui`, logic in `src/lib`.
Tests sit next to the file as `*.test.ts(x)`. Unions from `as const` arrays (`roles`, `invoiceStatuses`).

**TypeScript in `apps/api` and `packages/shared`:** double quotes, semicolons, 2-space indent,
ESM with `.js` extensions on relative imports. Prisma models are PascalCase, mapped to snake_case
tables and columns with `@map` / `@@map`. `src/generated/` is Prisma output: don't edit it by hand.

**Python in `services/extraction`:** module docstrings, `from __future__ import annotations`,
Pydantic schemas in `schemas.py`, private helpers prefixed `_`, tests in `tests/`.

**Domain rules (everywhere):**
- Money is always integer **minor units** (cents), never floats. Web uses `{ minorUnits, currency }`;
  the DB uses `amount_minor BIGINT`. Currencies are `LKR` and `USD`.
- Rates, fees and shares are **basis points** (`advanceBps`, `feeBps`, `recourseBps`).
- Module interfaces (commitment, Cardano registry, Midnight prover, extraction shapes, HTTP routes) are frozen in
  `docs/interfaces.md` and typed in `packages/shared/src`. Don't change them without the user's OK.
- The web app talks to the backend only through the `InvoiceVeilApi` interface in `apps/web/src/lib/api.ts`
  (currently implemented by `mock-api.ts`). Keep new backend work shaped to that contract.
- Privacy is the product: the buyer never sees offers or fees, a lender never sees another lender's offer,
  documents go only to the selected lender. Don't leak these through API responses.

## Data and secrets

- **Fictional data only** (Gampaha Packaging, Market Buyer, Lender A, Lender B). No real companies, people or invoices.
- Never write seed phrases, private keys, API keys or `.env` values into the repo. Only `.env.example` is committed.
- Blockchains are test networks (Cardano preprod, Midnight testnet). No real money.
