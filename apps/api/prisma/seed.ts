// Fictional demo data only. Safe to run more than once: every row is upserted.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { demoOrganizations } from "../src/demo-organizations.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const termDays = 45;

async function main() {
  for (const organization of Object.values(demoOrganizations)) {
    await prisma.organization.upsert({
      where: { id: organization.id },
      update: { name: organization.name, role: organization.role },
      create: organization,
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dueDate = new Date(today);
  dueDate.setUTCDate(dueDate.getUTCDate() + termDays);

  const invoice = {
    reference: "INV-2026-0042",
    currency: "LKR",
    amountMinor: 12_000_000n,
    dueDate,
    status: "AWAITING_BUYER_REVIEW",
    supplierId: demoOrganizations.supplier.id,
    buyerId: demoOrganizations.buyer.id,
    createdAt: today,
  };

  await prisma.invoice.upsert({
    where: { buyerId_reference: { buyerId: invoice.buyerId, reference: invoice.reference } },
    update: invoice,
    create: invoice,
  });

  console.log("Seeded 4 organizations and invoice INV-2026-0042.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
