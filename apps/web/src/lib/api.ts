import type { Money, Currency } from './money'
import type { LenderRole, Role } from './roles'

export const invoiceStatuses = [
  'Draft', 'Awaiting buyer review', 'Available', 'Eligible', 'Listed', 'Offers received',
  'Offer selected', 'Pledged', 'Advance paid', 'Payment instructed', 'Slip uploaded',
  'Paid by buyer – awaiting lender', 'Payment confirmed', 'Late', 'Disputed',
  'Balance sent', 'Defaulted', 'Closed',
] as const

export type InvoiceStatus = (typeof invoiceStatuses)[number]
export type Network = 'Midnight' | 'Cardano preprod'

export interface ChainEntry {
  title: string
  description: string
  network: Network
  status: 'Pending' | 'Confirmed'
  transactionId: string
}

export type VisibleAmount =
  | { visibility: 'hidden' }
  | { visibility: 'visible'; money: Money }

export interface LedgerSnapshot {
  reference: string
  supplier: string | null
  buyer: string
  status: InvoiceStatus
  amount: VisibleAmount
  provenMinimum: Money
  termDays: number
  chain: ChainEntry[]
}

export interface QuoteTerms {
  advanceBps: number
  feeBps: number
  recourseBps: number
}

export interface Offer extends QuoteTerms {
  lender: LenderRole
}

export interface InvoiceFields {
  invoiceNumber: string
  amount: Money
  termDays: number
}

export interface DocumentPreview {
  name: string
  file?: File
  fields: InvoiceFields
}

export interface InvoiceDocuments {
  invoice: DocumentPreview
  purchaseOrder: DocumentPreview
  deliveryReceipt: DocumentPreview
  lowConfidence: Array<'invoiceNumber' | 'amount' | 'termDays'>
}

export interface BuyerTrackRecord {
  invoicesPaid: number
  onTimeBps: number
  averageDaysLate: number
  defaults: number
}

export type TimelineEntry =
  | { kind: 'workflow'; id: string; title: InvoiceStatus; at: string }
  | { kind: 'chain'; id: string; at: string; chain: ChainEntry }

export type ProofStage = 'commitment' | 'local' | 'chain' | 'complete'

export interface LatePayment {
  days: number
  penalty: Money
}

export interface PaymentInstruction {
  lender: string
  bank: string
  branch: string
  account: string
  reference: string
  amount: Money
  dueDate: string
}

export type SlipSource =
  | { kind: 'upload'; file: File }
  | { kind: 'demo'; matches: boolean }

export interface PaymentSlip {
  fileName: string
  amount: Money | null
  reference: string | null
  result: 'pending' | 'match' | 'mismatch'
  reasons: string[]
}

export interface PaymentReceipt {
  amount: Money
  arrivalDate: string
}

export interface Settlement {
  advancePaid: boolean
  buyerSubmitted: boolean
  lenderConfirmed: boolean
  balanceSent: boolean
  closed: boolean
}

export interface InvoiceSummary {
  id: string
  buyer: string
  supplier: string | null
  amount: VisibleAmount
  currency: Currency
  termDays: number
  status: InvoiceStatus
  provenMinimum: Money | null
  needsUpdate: boolean
  trackRecord?: BuyerTrackRecord
  lenderAssigned?: boolean
}

interface InvoiceDetailBase extends InvoiceSummary {
  timeline: TimelineEntry[]
  dueDate: string | null
  late: LatePayment | null
}

export interface SupplierInvoice extends InvoiceDetailBase {
  viewer: 'supplier'
  documents: InvoiceDocuments
  fields: InvoiceFields
  proof: ProofStage | null
  proofMinimum: Money
  offers: Offer[]
  selectedLender: LenderRole | null
  settlement: Settlement
  supplierPenalty: Money | null
}

export interface BuyerInvoice extends InvoiceDetailBase {
  viewer: 'buyer'
  documents: InvoiceDocuments
  fields: InvoiceFields
  instruction: PaymentInstruction | null
  slip: PaymentSlip | null
  confirmedPayment: PaymentReceipt | null
}

export interface LenderInvoice extends InvoiceDetailBase {
  viewer: LenderRole
  trackRecord: BuyerTrackRecord
  ownOffer: Offer | null
  canQuote: boolean
  financing: {
    documents: InvoiceDocuments
    fields: InvoiceFields
    commitmentVerified: boolean
    pledgeConfirmed: boolean
    settlement: Settlement
    payment: PaymentInstruction | null
    slip: PaymentSlip | null
    receipt: PaymentReceipt | null
    lenderPenalty: Money | null
  } | null
}

export type InvoiceDetail = SupplierInvoice | BuyerInvoice | LenderInvoice

export type InvoiceAction =
  | { type: 'submit-for-review'; fields: InvoiceFields }
  | { type: 'approve'; amount: Money; acceptedTerms: boolean }
  | { type: 'generate-proof' }
  | { type: 'list' }
  | { type: 'quote'; terms: QuoteTerms }
  | { type: 'select-offer'; lender: LenderRole }
  | { type: 'sign-pledge' }
  | { type: 'send-advance' }
  | { type: 'instruct-payment' }
  | { type: 'upload-slip'; source: SlipSource }
  | { type: 'confirm-payment'; receipt: PaymentReceipt }
  | { type: 'report-not-received' }
  | { type: 'send-balance' }

export interface InvoiceVeilApi {
  getLedgerSnapshot(role: Role, signal?: AbortSignal): Promise<LedgerSnapshot | null>
  listInvoices(role: Role, signal?: AbortSignal): Promise<InvoiceSummary[]>
  getInvoice(role: Role, id: string, signal?: AbortSignal): Promise<InvoiceDetail | null>
  uploadInvoice(role: Role, file?: File): Promise<string>
  act(role: Role, id: string, action: InvoiceAction): Promise<void>
}
