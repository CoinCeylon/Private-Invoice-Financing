import type {
  BuyerTrackRecord, ChainEntry, InvoiceDocuments, InvoiceFields, InvoiceStatus,
  Offer, PaymentReceipt, PaymentSlip,
} from './api'
import { relativeDate } from './dates'
import { amountIn } from './money'
import type { Currency } from './money'
import type { LenderRole } from './roles'

export interface MockChainEntry extends Omit<ChainEntry, 'status'> {
  at: number
  confirmationAt: number
}

export interface MockInvoice {
  id: string
  fields: InvoiceFields
  documents: InvoiceDocuments
  status: InvoiceStatus
  history: Array<{ status: InvoiceStatus; at: number }>
  chain: MockChainEntry[]
  dueDate: string | null
  proofStartedAt: number | null
  offers: Offer[]
  selectedLender: LenderRole | null
  advancePaid: boolean
  instructed: boolean
  slip: { value: PaymentSlip; completesAt: number; matches: boolean } | null
  receipt: PaymentReceipt | null
  balanceSent: boolean
  late: { days: number; supplierMinor: number; lenderMinor: number } | null
}

export const supplierName = 'Gampaha Packaging'
export const buyerName = 'Market Buyer'
export const sampleId = 'INV-2026-0042'
export const trackRecord: BuyerTrackRecord = {
  invoicesPaid: 48,
  onTimeBps: 9200,
  averageDaysLate: 3,
  defaults: 1,
}

export function transactionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createDraft(id: string, now: number, file?: File, currency: Currency = 'LKR'): MockInvoice {
  const suffix = id.slice(-4)
  const extracted = amountIn(currency, currency === 'LKR' ? 15_000_000 : 250_000)
  const expected = amountIn(currency, currency === 'LKR' ? 12_000_000 : 250_000)
  const fields = { invoiceNumber: `GP-${suffix}`, amount: extracted, termDays: currency === 'LKR' ? 45 : 30 }

  return {
    id,
    fields,
    documents: {
      invoice: { name: file?.name ?? `invoice-${suffix}.pdf`, file, fields },
      purchaseOrder: {
        name: `purchase-order-${suffix}.pdf`,
        fields: { ...fields, invoiceNumber: `PO-${suffix}`, amount: expected },
      },
      deliveryReceipt: {
        name: `delivery-receipt-${suffix}.pdf`,
        fields: { ...fields, invoiceNumber: `GRN-${suffix}`, amount: expected },
      },
      lowConfidence: currency === 'LKR' ? ['amount'] : [],
    },
    status: 'Draft',
    history: [{ status: 'Draft', at: now }],
    chain: [],
    dueDate: null,
    proofStartedAt: null,
    offers: [],
    selectedLender: null,
    advancePaid: false,
    instructed: false,
    slip: null,
    receipt: null,
    balanceSent: false,
    late: null,
  }
}

export function recordStatus(invoice: MockInvoice, status: InvoiceStatus, at: number) {
  if (invoice.status !== status) {
    invoice.status = status
    invoice.history.push({ status, at })
  }
}

export const offerA: Offer = { lender: 'lender-a', advanceBps: 7500, feeBps: 250, recourseBps: 5000 }
export const offerB: Offer = { lender: 'lender-b', advanceBps: 7000, feeBps: 300, recourseBps: 5000 }

export function seedInvoices(now: number): MockInvoice[] {
  const start = now - 60_000
  const day = 86_400_000
  const time = (step: number, origin = start) => origin + step * 1000

  function seeded(id: string, currency: Currency, offers: Offer[], origin = start): MockInvoice {
    const at = (step: number) => time(step, origin)
    const invoice = createDraft(id, origin, undefined, currency)
    recordStatus(invoice, 'Awaiting buyer review', at(1))
    invoice.fields = { ...invoice.fields, amount: invoice.documents.purchaseOrder.fields.amount }
    invoice.dueDate = relativeDate(invoice.fields.termDays, origin)
    recordStatus(invoice, 'Available', at(2))
    invoice.proofStartedAt = at(3)
    invoice.chain.push(
      {
        title: 'Invoice registered',
        description: 'Buyer approval recorded in the invoice registry',
        network: 'Cardano preprod',
        transactionId: transactionId(),
        at: at(2),
        confirmationAt: at(3),
      },
      {
        title: 'Minimum value proof',
        description: 'Zero-knowledge proof of the invoice threshold',
        network: 'Midnight',
        transactionId: id === sampleId
          ? '8e4a9f527c2df5160ea92c3c1f39395db6a4dcad50985b7f3d1429d154b82c91'
          : transactionId(),
        at: at(4),
        confirmationAt: at(5),
      },
    )
    recordStatus(invoice, 'Eligible', at(5))
    recordStatus(invoice, 'Listed', at(6))
    invoice.offers = offers
    recordStatus(invoice, 'Offers received', at(7))
    return invoice
  }

  function pledged(id: string, offer: Offer, daysFromDue: number): MockInvoice {
    const origin = start - (45 - daysFromDue) * day
    const at = (step: number) => time(step, origin)
    const invoice = seeded(id, 'LKR', [offer], origin)
    invoice.selectedLender = offer.lender
    invoice.dueDate = relativeDate(daysFromDue, now)
    recordStatus(invoice, 'Offer selected', at(8))
    recordStatus(invoice, 'Pledged', at(9))
    invoice.chain.push({
      title: 'Pledge recorded',
      description: 'The invoice is pledged to the selected lender',
      network: 'Cardano preprod',
      transactionId: transactionId(),
      at: at(9),
      confirmationAt: at(10),
    })
    invoice.advancePaid = true
    invoice.instructed = true
    recordStatus(invoice, 'Advance paid', at(10))
    recordStatus(invoice, 'Payment instructed', at(11))
    return invoice
  }

  const sample = seeded(sampleId, 'LKR', [offerA, offerB])
  const review = createDraft('INV-2026-0043', start)
  recordStatus(review, 'Awaiting buyer review', time(1))

  const late = pledged('INV-2026-0037', offerA, -10)
  late.late = { days: 10, lenderMinor: 46_500, supplierMinor: 13_500 }
  recordStatus(late, 'Late', now - 9 * day)

  const defaulted = pledged('INV-2026-0029', offerB, -72)
  recordStatus(defaulted, 'Defaulted', now - day)
  defaulted.chain.push({
    title: 'Default recorded',
    description: 'The unpaid pledge was recorded in default',
    network: 'Cardano preprod',
    transactionId: transactionId(),
    at: now - day,
    confirmationAt: now - day + 3000,
  })

  const exportInvoice = seeded('INV-2026-0044', 'USD', [
    { lender: 'lender-a', advanceBps: 8000, feeBps: 200, recourseBps: 5000 },
  ])

  return [sample, review, late, defaulted, exportInvoice]
}
