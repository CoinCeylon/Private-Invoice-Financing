import "dotenv/config";
import express from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { formatMinor } from "@invoice-veil/shared";
import { demoOrganizations, isDemoRole } from "./demo-organizations.js";
import type { DemoRole } from "./demo-organizations.js";
import { listingStatusCodes, toInvoiceSummary } from "./invoice-summary.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", example: formatMinor(12_000_000, "LKR") });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

/** Which invoices each role may list. Mirrors canView in apps/web/src/lib/mock-api.ts. */
function invoiceFilter(role: DemoRole) {
  switch (role) {
    case "supplier":
      return { supplierId: demoOrganizations.supplier.id };
    case "buyer":
      return { buyerId: demoOrganizations.buyer.id, status: { not: "DRAFT" } };
    case "lender-a":
    case "lender-b":
      return { status: { in: listingStatusCodes } };
  }
}

// No sign-in yet: the web app's role switcher sends the acting role.
app.get("/invoices", async (req, res) => {
  const { role } = req.query;
  if (!isDemoRole(role)) {
    res.status(400).json({ error: "Query parameter role must be supplier, buyer, lender-a or lender-b." });
    return;
  }

  const rows = await prisma.invoice.findMany({
    where: invoiceFilter(role),
    include: { supplier: { select: { name: true } }, buyer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map((row) => toInvoiceSummary(role, row)));
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));