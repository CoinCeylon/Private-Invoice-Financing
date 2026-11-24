import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toInvoiceSummary } from "./invoice-summary.js";
import type { InvoiceRow } from "./invoice-summary.js";

const row: InvoiceRow = {
  reference: "INV-2026-0042",
  currency: "LKR",
  amountMinor: 12_000_000n,
  createdAt: new Date("2026-11-24T09:30:00Z"),
  dueDate: new Date("2027-01-08T00:00:00Z"),
  status: "AWAITING_BUYER_REVIEW",
  supplier: { name: "Gampaha Packaging" },
  buyer: { name: "Market Buyer" },
};

describe("toInvoiceSummary", () => {
  it("gives the supplier and buyer the amount in minor units and the term in days", () => {
    for (const role of ["supplier", "buyer"] as const) {
      assert.deepEqual(toInvoiceSummary(role, row), {
        id: "INV-2026-0042",
        buyer: "Market Buyer",
        supplier: "Gampaha Packaging",
        amount: { visibility: "visible", money: { minorUnits: 12_000_000, currency: "LKR" } },
        currency: "LKR",
        termDays: 45,
        status: "Awaiting buyer review",
        provenMinimum: null,
        needsUpdate: false,
      });
    }
  });

  it("hides the amount and the supplier from a lender that has not been selected", () => {
    const summary = toInvoiceSummary("lender-a", { ...row, status: "LISTED" });
    assert.deepEqual(summary.amount, { visibility: "hidden" });
    assert.equal(summary.supplier, null);
    assert.equal(summary.lenderAssigned, false);
    assert.doesNotMatch(JSON.stringify(summary), /12000000|Gampaha/);
  });

  it("never tells the buyer that offers exist", () => {
    assert.equal(toInvoiceSummary("buyer", { ...row, status: "OFFERS_RECEIVED" }).status, "Listed");
    assert.equal(toInvoiceSummary("buyer", { ...row, status: "OFFER_SELECTED" }).status, "Listed");
    assert.equal(toInvoiceSummary("supplier", { ...row, status: "OFFERS_RECEIVED" }).status, "Offers received");
  });

  it("rejects unknown statuses and currencies instead of guessing", () => {
    assert.throws(() => toInvoiceSummary("supplier", { ...row, status: "PAID" }), /Unknown invoice status/);
    assert.throws(() => toInvoiceSummary("supplier", { ...row, currency: "EUR" }), /Unsupported currency/);
  });
});
