# Invoice-Veil

Private invoice financing on Cardano and Midnight. Lenders compete for an invoice without seeing it, and only the chosen lender gets the documents.

> Our project for **UniHack 2026**.

## The idea in 3 lines

1. Lenders compete to give money for an invoice, **without seeing the invoice**.
2. When one lender wins, **no other lender can take the same invoice**.
3. The buyer pays **only the winning lender**.

---

## The problem

A small company (the **supplier**) sells boxes to a supermarket (the **buyer**).

The supermarket says: _"I will pay you LKR 120,000 in 45 days."_

But the supplier needs money **now** to pay workers and buy materials.

So the supplier goes to a **lender** (a bank or finance company). The lender:

- gives money **now** (for example LKR 90,000)
- gets paid back **later** by the supermarket
- keeps a small **fee** for this service

This is called **invoice financing**.

### Two big problems

**Problem 1: Privacy.**
To find the best price, the supplier must send the invoice to many lenders. Then everyone sees private business details: prices, items and customers.

**Problem 2: Cheating.**
A dishonest supplier can take the **same invoice** to two lenders and get money **twice**.
This is a real problem. In 2025, a big US company called **First Brands** went bankrupt. People claim that some of its invoices were financed more than once.

---

## Our solution

| Step | Who               | What happens                                                                              |
| ---- | ----------------- | ----------------------------------------------------------------------------------------- |
| 1    | Supplier          | Uploads the invoice. AI reads it.                                                         |
| 2    | Buyer             | Checks the invoice and says "yes, this is real".                                          |
| 3    | Supplier          | **Midnight** proves "this invoice is at least LKR 100,000". The real amount stays secret. |
| 4    | Lenders           | See the proof and send offers. They do **not** see the invoice.                           |
| 5    | Supplier          | Picks the best offer. **Only that lender** sees the full invoice.                         |
| 6    | Supplier + Lender | **Cardano** records "this invoice now belongs to Lender A".                               |
| 7    | Supplier          | If they try to give it to Lender B, **Cardano says NO**.                                  |
| 8    | Buyer             | Pays **only Lender A**, the lender Cardano shows.                                         |

---

## Why two blockchains?

### Midnight: the secret keeper 🔒

Midnight can **prove something is true without showing the details**.
This is called a **zero-knowledge proof**.

> It's like proving you are over 18 **without** showing your birthday.

**In our app:** Midnight proves _"this invoice is at least LKR 100,000"_.
The real amount (LKR 120,000) stays hidden.
Lenders trust this proof and send offers without seeing the invoice.

### Cardano: the public notice board 📋

Cardano keeps a **shared record that nobody can secretly change**.

**In our app:** Cardano keeps a list of invoices. Each invoice has a status:

| Status        | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| **Available** | No lender has it yet.                                |
| **Pledged**   | One lender owns it now.                              |
| **Closed**    | It is paid and finished. It can never be used again. |
| **Cancelled** | It was stopped before any lender took it.            |

**The strict rule:** an invoice can become "Pledged" **only once**.
A second try fails, and the buyer looks at this board to know whom to pay.

### In one line

> **Midnight keeps the amount secret while lenders compete. Cardano makes sure only one lender wins, and the buyer pays that lender.**

---

## An example with numbers

All companies and numbers are **fake**, for the demo only.

- **Supplier:** Gampaha Packaging
- **Buyer:** Market Buyer
- **Lenders:** Lender A and Lender B

| Step                                    | Amount                          |
| --------------------------------------- | ------------------------------- |
| Invoice approved by the buyer           | LKR 120,000 (pay in 45 days)    |
| Midnight proves                         | "at least LKR 100,000"          |
| Lender A offers                         | 75% now, 2.5% fee               |
| Lender B offers                         | 70% now, 3.0% fee               |
| Supplier picks                          | **Lender A** (better deal)      |
| Lender A pays the supplier now          | LKR 90,000                      |
| Lender A's fee                          | LKR 3,000                       |
| Buyer pays Lender A after 45 days       | LKR 120,000                     |
| Lender A keeps                          | LKR 93,000 (90,000 + 3,000 fee) |
| Lender A sends the rest to the supplier | LKR 27,000                      |
| **The supplier gets in total**          | **LKR 117,000**                 |

With Lender B, the supplier would get only LKR 84,000 now and pay a LKR 3,600 fee.

---

## Who uses the app?

| User         | What they do                                                                   |
| ------------ | ------------------------------------------------------------------------------ |
| **Supplier** | Uploads the invoice, makes the proof, compares offers and picks one lender.    |
| **Buyer**    | Checks the invoice is real, approves it, and pays the recorded lender.         |
| **Lender**   | Checks the proof, sends an offer, and (if picked) reads the invoice and signs. |
| **Operator** | Sets up demo companies and helps when something breaks.                        |

---

## What the demo shows

1. AI reads a scanned invoice and finds a mistake: it says **150,000**, but the order says **120,000**. The buyer fixes it.
2. The buyer approves the invoice, and it is saved on **Cardano**.
3. **Midnight** proves "at least LKR 100,000" and hides the real amount.
4. Lender A and Lender B send offers without seeing the invoice.
5. The supplier picks Lender A. **Only Lender A** can open the documents.
6. Lender A and the supplier sign. Cardano records Lender A.
7. The buyer's payment screen shows **"Pay Lender A"**.
8. The supplier tries to use Lender B's offer too, and **Cardano rejects it**. ✅

---

## Tech stack

| Part                    | Tool                  |
| ----------------------- | --------------------- |
| Website                 | Next.js + TypeScript  |
| Server (API)            | TypeScript            |
| Database                | PostgreSQL            |
| Reading invoices (AI)   | Python + OCR          |
| Cardano smart contract  | Aiken + Mesh          |
| Midnight smart contract | Compact + Midnight.js |

## Folders

```
apps/web                  → the website (P1)
services/api              → the server and database (P2)
services/extraction       → AI that reads invoices (P5)
contracts/cardano         → Cardano contract (P3)
contracts/midnight        → Midnight contract (P4)
packages/proof-verifier   → lender checks (P4)
packages/shared           → shared types and formats
fixtures                  → fake test invoices
docs                      → setup and design notes
research                  → interview notes (no real names)
```

## Team

| Person | Job                                    |
| ------ | -------------------------------------- |
| **P1** | Website, screens, demo video           |
| **P2** | Server, database, access rules         |
| **P3** | Cardano contract                       |
| **P4** | Midnight contract and proofs           |
| **P5** | AI invoice reading and user interviews |

---

## How to run

_Coming soon._ We will add the steps here when the code is ready.

---

## Important notes

- **Everything is fake.** All companies, invoices and money are for the demo only.
- **No real money.** Payments are simulated. The blockchains are **test networks**.
- **Limit:** we protect only lenders that use our app. A lender outside the app is not recorded, so the buyer will not pay it.

---

## Key dates

| Date                | What                   |
| ------------------- | ---------------------- |
| 5 Dec, 11:59 PM     | GitHub access deadline |
| 10 Dec              | Demo ready             |
| **14 Dec, 12 noon** | **Final submission**   |
| 17 Dec              | Finale                 |

---

## More information

- `CLAUDE.md`: project rules for the team and for Claude
- `TASKS.md`: day-by-day task list
- `Private_Invoice_Financing_Project_and_Five_Person_Plan_Rev2.pdf`: the full plan

## License

Apache 2.0
