# TASKS — day by day

**Rule: make it simple and stupid.**

- **P1** = frontend and demo. **P2** = backend and database. **P3** = Cardano. **P4** = Midnight. **P5** = OCR and interviews.
- Tick `[x]` when a task is done.
- Each day ends with a ✅ **Check**. If the check fails, fix it before moving on.
- Today is **Fri 20 Nov**. Submit by **Mon 14 Dec, 12 noon**.

---

## Week 1 — Setup and small tests (20–23 Nov)

### Fri 20 Nov — Day 1: Start

- [ ] All: Read `CLAUDE.md`.
- [ ] All: Decide who is P1, P2, P3, P4, P5.
- [ ] All: Choose the project name.
- [ ] P1: Create the empty folders: `apps/web`, `services/api`, `services/extraction`, `contracts/cardano`, `contracts/midnight`, `packages/shared`, `packages/proof-verifier`, `fixtures`, `docs`, `research`.
- [ ] P1: Draw the screens on paper for the supplier, buyer and lender.
- [ ] P2: Install Node.js and PostgreSQL.
- [ ] P3: Install Aiken. Install a Cardano wallet. Get free test ADA from the faucet.
- [ ] P4: Read the Midnight compatibility page. Install the Compact compiler and the proof server (Docker).
- [ ] P5: Make a list of people to interview: 2 suppliers, 1 buyer finance person, 1 lender.
- [ ] P5: Send messages to book the interviews.

### Sat 21 Nov

- [ ] P1: Write a 1-page scope that covers who does what and the LKR 120,000 example.
- [ ] P1: Create the Next.js app in `apps/web` and show a "Hello" page.
- [ ] P2: Create the API in `services/api` with one `/health` endpoint.
- [ ] P2: Create an empty database.
- [ ] P3: Write a tiny Aiken contract that always says yes. Build it.
- [ ] P3: Lock some test ADA in it, then take it back. Save the transaction ID.
- [ ] P4: Run the Midnight "hello world" example on your laptop.
- [ ] P5: Make the main fake invoice (LKR 120,000), its purchase order and its delivery receipt.
- [ ] P5: Make a wrong copy of the invoice that says LKR 150,000.

### Sun 22 Nov

- [ ] P4: Write a tiny Compact circuit that checks "is the number ≥ 100,000?". Run it locally.
- [ ] P4: Write all tool versions in `docs/versions.md`.
- [ ] P2 + P3 + P4: Meet for 1 hour and agree on:
  - invoice_ref (random bytes)
  - money in cents
  - rates in basis points
  - UTC dates
  - policy `MIN100K_LKR_V1`
  - the status names
- [ ] P2: Put those types and constants in `packages/shared`.
- [ ] P1: Build a fake supplier dashboard with fake data.
- [ ] P5: Confirm the interview times.
- [ ] P5: Download the synthetic OCR dataset. Write down its link, date and license.

### Mon 23 Nov

- [ ] P4: Run the threshold circuit on the Midnight **testnet**. Save the address.
- [ ] P2 + P4: Make the test data file `fixtures/commitment-vectors.json` with a 120,000 case (pass) and an 80,000 case (fail).
- [ ] P2: Create the first tables: organizations, memberships, invoices, invoice_versions, documents.
- [ ] P1: Build fake buyer approval and lender listing screens.
- [ ] P3: Draw the invoice states: Available → Pledged → Closed, and Available → Cancelled.
- [ ] P5: Run the OCR tool on one fake invoice and print the text.

- ✅ **Check:** There is one Cardano test transaction, one Midnight proof and one shared invoice format, and the interviews are booked.

---

## Week 2 — Build the parts (24–30 Nov)

### Tue 24 Nov

- [ ] P2: Simple login. Each user belongs to one organization with one role (supplier, buyer or lender).
- [ ] P2: `POST /documents` uploads a file to private storage and returns a file ID.
- [ ] P1: The upload page calls `POST /documents`.
- [ ] P3: Aiken: make the "registry token" that can be created only once.
- [ ] P4: Fix the commitment field order: invoice_ref, version, currency, amount, due date, then the secret.
- [ ] P5: Read the text from a digital PDF.

### Wed 25 Nov

- [ ] P2: `POST /invoices` creates a draft invoice.
- [ ] P5: Find the invoice fields: number, supplier, buyer, currency, amount, dates, PO ref.
- [ ] P1: Review page with the PDF on the left and editable fields on the right.
- [ ] P3: Aiken: make the data type that holds the invoice list, then add the "Register" action.
- [ ] P4: Make the commitment give the same bytes in TypeScript and in Compact (use the test vectors).

### Thu 26 Nov

- [ ] P2: `POST /invoices/{id}/review` saves the corrected fields as a new version.
- [ ] P5: Mismatch check: compare the invoice total with the PO and the receipt, and return a reason.
- [ ] P1: Show the mismatch in red (150,000 vs 120,000).
- [ ] P3: Tests for Register:
  - a new invoice_ref passes
  - a used invoice_ref fails
  - a missing signature fails
- [ ] P4: Buyer commitment tool: fields go in, commitment bytes come out, and the secret is saved encrypted.

### Fri 27 Nov

- [ ] P2: Add the `audit_events` table. Log every view, edit and approve.
- [ ] P2 + P5: Connect the OCR worker to the API with a job ID and a job status.
- [ ] P1: Add the buyer "Approve" button.
- [ ] P3: Aiken: add the "Amend" action. It works only while Available, and the version goes up by 1.
- [ ] P4: Invoice circuit: rebuild the commitment from the secret inputs, check that it matches, and check that the amount is ≥ 10,000,000 cents.
- [ ] P5: Do interview 1.

- ✅ **Check:** Upload, read, review and buyer approve all work in the app.

### Sat 28 Nov

- [ ] P3: Aiken: add the "Pledge" action. It goes from Available to Pledged and saves the lender, the offer ID and the receipt hash.
- [ ] P3: Aiken: add the "Close" and "Cancel" actions.
- [ ] P4: Circuit tests:
  - 120,000 passes
  - 80,000 fails
  - a changed amount fails
- [ ] P2: Create the `listings` and `offers` tables.
- [ ] P1: Lender listing page, using fake data.
- [ ] P5: Do interview 2.

### Sun 29 Nov

- [ ] P3: Tests:
  - a second pledge fails
  - the token stays in one output
  - other invoices do not change
  - a closed invoice cannot come back
- [ ] P3: Mesh code that builds the "register" and "pledge" transactions.
- [ ] P4: Put the invoice circuit on the Midnight testnet. Save the address.
- [ ] P2: Create the `proof_results`, `disclosures` and `pledges` tables.
- [ ] P1: Offer comparison page that shows the net cash for each offer.
- [ ] P5: Test OCR on a blurry scan. Add a "type it by hand" fallback.

### Mon 30 Nov

- [ ] P3: Put the contract on the Cardano testnet. Register 1 invoice and pledge it. Save the transaction IDs.
- [ ] P4: Make a real proof for 120,000 on the testnet. Save the transaction ID.
- [ ] P2: Add the fake companies to the database: Gampaha Packaging, Market Buyer, Lender A, Lender B.
- [ ] P5: Write up interviews 1 and 2 (no real names).

- ✅ **Check:** Register and pledge work on Cardano. The right and wrong amounts behave correctly on Midnight. OCR shows editable fields. 2 interviews are done.

---

## Week 3 — Join everything (1–7 Dec)

### Tue 1 Dec

- [ ] P1 + P3: Connect a wallet in the web app.
- [ ] P1 + P3: The buyer and the supplier sign the "register" transaction from the app.
- [ ] P2: Read the Cardano state and save the events in `chain_events`, with no duplicates.
- [ ] P4: Start proof generation from the web app.
- [ ] P5: Help P4 make bad test data (wrong amounts, changed fields).

### Wed 2 Dec

- [ ] P4: Lender checker v1. It checks:
  - the right Midnight network and contract
  - the same invoice, version and commitment
  - the right policy
  - Cardano still says Available
- [ ] P2: `POST /proof-results/verify` calls the checker.
- [ ] P1: Proof screen with progress and a result link.
- [ ] P5: Book the lender walkthrough.

### Thu 3 Dec

- [ ] P4: Build the "verification receipt" as JSON and make its hash (digest).
- [ ] P3: The pledge transaction includes the receipt hash and the offer ID, and both signers sign the same transaction.
- [ ] P1: Signing screen that shows the invoice, version, offer and both parties.
- [ ] P5: Do interview 3.

### Fri 4 Dec

- [ ] All: Run the full path once in the app: approve, prove, check, pledge.
- [ ] P2: Mark transactions "Pending" until the chain confirms them.
- [ ] P1: Fix the bugs from the run.
- [ ] P5: Do interview 4.

- ✅ **Check:** The first pledge works through the app.

### Sat 5 Dec — ⚠️ GitHub access deadline, 11:59 PM

- [ ] **P1: Fill in the organizer GitHub access form in the MORNING. Check that all 5 accounts have access.**
- [ ] P2: `POST /listings` and `POST /listings/{id}/offers`.
- [ ] P1: Lender quote form works with the real API.
- [ ] P4: Opening check: rebuild the commitment from the shared fields and secret, then compare it with Cardano.
- [ ] P5: Lender walkthrough. Ask "Is this enough to make an offer?"

### Sun 6 Dec

- [ ] P2: `POST /offers/{id}/select` allows only one selected offer. The others become "Not selected". Only the selected lender gets document access.
- [ ] P2: Lender B tries to open the documents and gets "Access denied".
- [ ] P2 + P4: `POST /offers/{id}/confirm` runs the opening check and computes LKR 90,000 and LKR 3,000.
- [ ] P1: Review page for Lender A.
- [ ] P5: Ask one organization for a short letter of interest.

### Mon 7 Dec

- [ ] P3 + P1: The supplier tries Lender B's offer after A's pledge. The app shows "Already pledged" and a forced transaction fails. Save the proof of the failure.
- [ ] P3: A and B try at the same time, and only one wins.
- [ ] P2 + P3: `GET /invoices/{id}/payee` reads the lender from Cardano.
- [ ] P1: Buyer payment screen shows "Pay Lender A".
- [ ] P5: Write up all interviews.

- ✅ **Check:** Two lenders send offers. Only the selected one opens the documents. The second financing fails.

---

## Week 4 — Finish and submit (8–14 Dec)

### Tue 8 Dec — ⭐ Core checkpoint

- [ ] All: Run the full flow from start to end. Write down all bugs.
- [ ] All: Decide on the forecast. Default is **NO**: keep it simple.
- [ ] P2: Record the fake advance: LKR 90,000 to the supplier.
- [ ] P5: Measure OCR accuracy on the test invoices.

### Wed 9 Dec

- [ ] P2: Record the fake buyer payment: LKR 120,000 to Lender A, then LKR 27,000 back to the supplier.
- [ ] P3: Close transaction. A closed invoice cannot be pledged again.
- [ ] P2: Replay the events twice and check that nothing is duplicated.
- [ ] P1: Audit and settlement screen.
- [ ] P4: Look at the public chain data. The real amount must NOT be visible.
- [ ] P5: Write a 1-page evidence summary for the pitch.

### Thu 10 Dec — ⭐ Demo complete

- [ ] P1: Practise the 3-minute demo script.
- [ ] All: Ask an outside person to try the app. Write down their feedback.
- [ ] P2: Recovery tests: the wallet says no, the page refreshes, OCR stops.
- [ ] P4: Test restoring the commitment secret from backup.

### Fri 11 Dec

- [ ] All: Fix the top bugs from the feedback.
- [ ] P2: Setup guide in the README so the app runs on a new laptop.
- [ ] P3 + P4: Release file with contract addresses, versions and transaction IDs.

### Sat 12 Dec

- [ ] P1: Record the 2–4 minute demo video.
- [ ] P2: Run the app on a clean laptop using only the README.
- [ ] P5: Data notices (sources and licenses) and the evidence summary go into the repo.
- [ ] P2 + P4: Short doc that says what is private, what is public and who checks what.

### Sun 13 Dec

- [ ] All: Check that there are no secrets in the repo (`.env`, keys, seed phrases).
- [ ] P1: Add the Apache 2.0 license.
- [ ] P1: Final README with the video link and explorer links.
- [ ] All: Final check of everything.

### Mon 14 Dec — 🚨 SUBMIT BEFORE 12 NOON

- [ ] P1: Push the final files by **10 AM** to leave a safety buffer.
- [ ] P1: Open the repo and check that all files are visible.

### 15–17 Dec

- [ ] All: Practise the pitch and the judge questions. Keep the demo working. The finale is on 17 Dec.
