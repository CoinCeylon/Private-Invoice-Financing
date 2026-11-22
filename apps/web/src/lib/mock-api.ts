import type {
  ChainEntry, InvoiceAction, InvoiceDetail, InvoiceFields, InvoiceStatus, InvoiceSummary,
  InvoiceVeilApi, PaymentInstruction, PaymentReceipt, ProofStage, Settlement, SlipSource,
  TimelineEntry,
} from './api'
import { relativeDate, validDay } from './dates'
import { validateDocumentFile } from './documents'
import { amountIn } from './money'
import type { Money } from './money'
import { buyerName, createDraft, recordStatus, sampleId, seedInvoices, supplierName, trackRecord, transactionId } from './mock-fixtures'
import type { MockChainEntry, MockInvoice } from './mock-fixtures'
import { validQuote } from './offers'
import { isLender, participants } from './roles'
import type { Role } from './roles'

const chainDelay = 3_000
const proofLocalAt = 850
const proofChainAt = 1_750
const slipDelay = 1_250

const listingStatuses = new Set<InvoiceStatus>(['Listed', 'Offers received'])
const receiptStatuses = new Set<InvoiceStatus>([
  'Advance paid', 'Payment instructed', 'Slip uploaded', 'Paid by buyer – awaiting lender', 'Late', 'Disputed',
])

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function threshold(invoice: MockInvoice) {
  const { currency } = invoice.fields.amount
  return amountIn(currency, currency === 'LKR' ? 10_000_000 : 200_000)
}

function addChain(
  invoice: MockInvoice,
  now: number,
  network: ChainEntry['network'],
  title: string,
  description: string,
) {
  invoice.chain.push({
    network,
    title,
    description,
    at: now,
    confirmationAt: now + chainDelay,
    transactionId: transactionId(),
  })
}

function chainView(entry: MockChainEntry, now: number): ChainEntry {
  const { title, description, network, transactionId } = entry
  return {
    title, description, network, transactionId,
    status: now >= entry.confirmationAt ? 'Confirmed' : 'Pending',
  }
}

function proofStage(invoice: MockInvoice, now: number): ProofStage | null {
  if (invoice.proofStartedAt === null) return null
  const proof = invoice.chain.find(({ network }) => network === 'Midnight')
  if (proof && now >= proof.confirmationAt) return 'complete'
  const elapsed = now - invoice.proofStartedAt
  if (elapsed >= proofChainAt) return 'chain'
  if (elapsed >= proofLocalAt) return 'local'
  return 'commitment'
}

function sync(invoice: MockInvoice, now: number) {
  const started = invoice.proofStartedAt
  if (invoice.status === 'Available' && started !== null && now >= started + proofChainAt) {
    if (!invoice.chain.some(({ network }) => network === 'Midnight')) {
      addChain(invoice, started + proofChainAt, 'Midnight', 'Minimum value proof',
        'Zero-knowledge proof of the invoice threshold')
    }
    if (proofStage(invoice, now) === 'complete') {
      recordStatus(invoice, 'Eligible', started + proofChainAt + chainDelay)
    }
  }

  const slip = invoice.slip
  if (slip?.value.result === 'pending' && now >= slip.completesAt) {
    slip.value.result = slip.matches ? 'match' : 'mismatch'
    if (slip.matches && invoice.status === 'Slip uploaded') {
      recordStatus(invoice, 'Paid by buyer – awaiting lender', slip.completesAt)
    }
  }

  const close = invoice.chain.find(({ title }) => title === 'Invoice closed')
  if (invoice.status === 'Balance sent' && close && now >= close.confirmationAt) {
    recordStatus(invoice, 'Closed', close.confirmationAt)
  }
}

function canView(role: Role, invoice: MockInvoice) {
  if (role === 'supplier') return true
  if (role === 'buyer') return invoice.status !== 'Draft'
  return listingStatuses.has(invoice.status) ||
    invoice.selectedLender === role ||
    invoice.offers.some(({ lender }) => lender === role)
}

function canReadAmount(role: Role, invoice: MockInvoice) {
  return !isLender(role) || invoice.selectedLender === role
}

function buyerStatus(status: InvoiceStatus): InvoiceStatus {
  return status === 'Offers received' || status === 'Offer selected' ? 'Listed' : status
}

function summarize(role: Role, invoice: MockInvoice, now: number): InvoiceSummary {
  const visible = canReadAmount(role, invoice)
  return {
    id: invoice.id,
    ...(isLender(role) ? { trackRecord, lenderAssigned: invoice.selectedLender === role } : {}),
    buyer: buyerName,
    supplier: visible ? supplierName : null,
    amount: visible ? { visibility: 'visible', money: invoice.fields.amount } : { visibility: 'hidden' },
    currency: invoice.fields.amount.currency,
    termDays: invoice.fields.termDays,
    status: role === 'buyer' ? buyerStatus(invoice.status) : invoice.status,
    provenMinimum: proofStage(invoice, now) === 'complete' ? threshold(invoice) : null,
    needsUpdate: invoice.chain.some(({ confirmationAt }) => confirmationAt > now) ||
      (invoice.status === 'Available' && invoice.proofStartedAt !== null) ||
      invoice.slip?.value.result === 'pending',
  }
}

function paymentInstruction(invoice: MockInvoice): PaymentInstruction | null {
  if (!invoice.selectedLender || !invoice.dueDate || !invoice.instructed) return null
  const lender = invoice.selectedLender
  const { currency, minorUnits } = invoice.fields.amount
  const penalty = invoice.late ? invoice.late.lenderMinor + invoice.late.supplierMinor : 0
  return {
    lender: participants[lender].name,
    bank: lender === 'lender-a' ? 'Demo Commercial Bank' : 'Demo Mercantile Bank',
    branch: 'Colombo',
    account: lender === 'lender-a' ? '0042 0000 6901' : '0042 0000 6902',
    reference: `IV-${invoice.id.slice(-4)}-${lender === 'lender-a' ? 'A' : 'B'}`,
    amount: amountIn(currency, minorUnits + penalty),
    dueDate: invoice.dueDate,
  }
}

function settlement(invoice: MockInvoice): Settlement {
  return {
    advancePaid: invoice.advancePaid,
    buyerSubmitted: invoice.slip?.value.result === 'match' || invoice.receipt !== null,
    lenderConfirmed: invoice.receipt !== null,
    balanceSent: invoice.balanceSent,
    closed: invoice.status === 'Closed',
  }
}

function pledgeConfirmed(invoice: MockInvoice, now: number): boolean {
  return invoice.chain.some(({ title, confirmationAt }) => title === 'Pledge recorded' && now >= confirmationAt)
}

function timeline(role: Role, invoice: MockInvoice, now: number): TimelineEntry[] {
  const allowPrivate = canReadAmount(role, invoice)
  const items: TimelineEntry[] = invoice.history.flatMap(({ status, at }, index) => {
    if (role === 'buyer' && (status === 'Draft' || buyerStatus(status) !== status)) return []
    if (!allowPrivate && !listingStatuses.has(status) &&
      !['Offer selected', 'Pledged', 'Defaulted', 'Closed'].includes(status)) return []

    return [{ kind: 'workflow', id: `workflow-${index}`, title: status, at: new Date(at).toISOString() }]
  })
  for (const record of invoice.chain) {
    items.push({
      kind: 'chain', id: record.transactionId, at: new Date(record.at).toISOString(),
      chain: chainView(record, now),
    })
  }
  return items.sort((left, right) => left.at.localeCompare(right.at))
}

function project(role: Role, invoice: MockInvoice, now: number): InvoiceDetail {
  const summary = summarize(role, invoice, now)
  const hasAccess = canReadAmount(role, invoice)
  const { currency } = invoice.fields.amount
  const base = {
    ...summary,
    dueDate: hasAccess ? invoice.dueDate : null,
    timeline: timeline(role, invoice, now),
    late: hasAccess && invoice.late ? {
      days: invoice.late.days,
      penalty: amountIn(currency, invoice.late.lenderMinor + invoice.late.supplierMinor),
    } : null,
  }

  if (role === 'supplier') {
    return {
      ...base, viewer: role, documents: invoice.documents, fields: invoice.fields, proof: proofStage(invoice, now),
      proofMinimum: threshold(invoice), offers: invoice.offers, selectedLender: invoice.selectedLender, settlement: settlement(invoice),
      supplierPenalty: invoice.late ? amountIn(currency, invoice.late.supplierMinor) : null,
    }
  }
  if (role === 'buyer') {
    return {
      ...base, viewer: role, documents: invoice.documents, fields: invoice.fields,
      instruction: paymentInstruction(invoice), slip: invoice.slip?.value ?? null, confirmedPayment: invoice.receipt,
    }
  }
  return {
    ...base, viewer: role, trackRecord,
    ownOffer: invoice.offers.find(({ lender }) => lender === role) ?? null,
    canQuote: listingStatuses.has(invoice.status),
    financing: invoice.selectedLender === role ? {
      documents: invoice.documents, fields: invoice.fields,
      commitmentVerified: proofStage(invoice, now) === 'complete',
      pledgeConfirmed: pledgeConfirmed(invoice, now),
      settlement: settlement(invoice),
      payment: paymentInstruction(invoice),
      slip: invoice.slip?.value ?? null, receipt: invoice.receipt,
      lenderPenalty: invoice.late ? amountIn(currency, invoice.late.lenderMinor) : null,
    } : null,
  }
}

function validateAmount(amount: Money) {
  requireCondition(
    (amount.currency === 'LKR' || amount.currency === 'USD') &&
      Number.isSafeInteger(amount.minorUnits) && amount.minorUnits > 0,
    'Enter a positive amount with no more than two decimal places.',
  )
}

function validateFields(fields: InvoiceFields) {
  validateAmount(fields.amount)
  requireCondition(fields.invoiceNumber.trim().length > 0 && fields.invoiceNumber.length <= 50,
    'Enter an invoice number up to 50 characters.')
  requireCondition(Number.isInteger(fields.termDays) && fields.termDays >= 1 && fields.termDays <= 365,
    'Enter a payment term between 1 and 365 days.')
}

function requireValidDocument(file: File) {
  const issue = validateDocumentFile(file)
  if (issue) throw new Error(issue)
}

function acceptSlip(invoice: MockInvoice, source: SlipSource, now: number) {
  if (source.kind === 'upload') requireValidDocument(source.file)
  const instruction = paymentInstruction(invoice)
  requireCondition(instruction, 'Payment instructions must be issued before uploading a slip.')
  requireCondition(invoice.slip?.value.result !== 'pending', 'A slip is already being checked.')

  const matches = source.kind === 'demo' ? source.matches : !/mismatch|incorrect|invalid/i.test(source.file.name)
  const amount = matches ? instruction.amount : amountIn(instruction.amount.currency,
    Math.max(0, instruction.amount.minorUnits - 100_000))
  const reference = matches ? instruction.reference : 'UNRECOGNIZED'
  const fileName = source.kind === 'upload' ? source.file.name : matches ? 'transfer-matched.pdf' : 'transfer-mismatch.pdf'
  invoice.slip = {
    value: {
      fileName, amount, reference, result: 'pending', reasons: matches ? [] : [
        'Transfer amount differs from the amount due.',
        'Payment reference does not match the instruction.',
      ],
    },
    completesAt: now + slipDelay,
    matches,
  }
  recordStatus(invoice, 'Slip uploaded', now)
}

function confirmReceipt(invoice: MockInvoice, receipt: PaymentReceipt, now: number) {
  const instruction = paymentInstruction(invoice)
  requireCondition(instruction, 'Payment instructions are required to confirm a transfer.')
  requireCondition(invoice.slip?.value.result !== 'pending', 'Wait for the slip check to finish.')
  validateAmount(receipt.amount)
  requireCondition(receipt.amount.currency === instruction.amount.currency &&
    receipt.amount.minorUnits === instruction.amount.minorUnits, 'The amount received must match the payment instruction.')
  requireCondition(validDay(receipt.arrivalDate) && receipt.arrivalDate <= relativeDate(0, now),
    'Enter a valid arrival date on or before today.')
  invoice.receipt = receipt
  recordStatus(invoice, 'Payment confirmed', now)
}

function runAction(
  role: Role, invoice: MockInvoice, action: InvoiceAction, now: number, invoices: MockInvoice[],
) {
  const status = invoice.status
  const selected = isLender(role) && invoice.selectedLender === role

  switch (action.type) {
    case 'submit-for-review':
      requireCondition(role === 'supplier' && status === 'Draft', 'This invoice is no longer a supplier draft.')
      validateFields(action.fields)
      invoice.fields = { ...action.fields, invoiceNumber: action.fields.invoiceNumber.trim() }
      recordStatus(invoice, 'Awaiting buyer review', now)
      return
    case 'approve':
      requireCondition(role === 'buyer' && status === 'Awaiting buyer review', 'This invoice is no longer awaiting buyer review.')
      requireCondition(action.acceptedTerms, 'Accept the late-payment terms before signing.')
      validateAmount(action.amount)
      requireCondition(action.amount.currency === invoice.fields.amount.currency, 'The currency must match the invoice.')
      invoice.fields = { ...invoice.fields, amount: action.amount }
      invoice.dueDate = relativeDate(invoice.fields.termDays, now)
      recordStatus(invoice, 'Available', now)
      addChain(invoice, now, 'Cardano preprod', 'Invoice registered', 'Buyer approval recorded in the invoice registry')
      return
    case 'generate-proof':
      requireCondition(role === 'supplier' && status === 'Available' && invoice.proofStartedAt === null,
        'A proof can only be started once for an approved invoice.')
      requireCondition(invoice.fields.amount.minorUnits >= threshold(invoice).minorUnits,
        'The approved amount is below the minimum required for proof.')
      invoice.proofStartedAt = now
      return
    case 'list':
      requireCondition(role === 'supplier' && status === 'Eligible', 'The proof must be confirmed before listing.')
      recordStatus(invoice, 'Listed', now)
      return
    case 'quote':
      requireCondition(isLender(role) && listingStatuses.has(status), 'This listing is closed to new quotes.')
      requireCondition(validQuote(action.terms), 'Enter valid quote percentages. Advance and fee together cannot exceed 100%.')
      invoice.offers = [...invoice.offers.filter(({ lender }) => lender !== role), { ...action.terms, lender: role }]
      recordStatus(invoice, 'Offers received', now)
      return
    case 'select-offer':
      requireCondition(role === 'supplier' && status === 'Offers received' &&
        invoice.selectedLender === null && invoice.offers.some(({ lender }) => lender === action.lender),
      'This offer is no longer available for selection.')
      invoice.selectedLender = action.lender
      recordStatus(invoice, 'Offer selected', now)
      return
    case 'sign-pledge': {
      requireCondition(selected && status === 'Offer selected' && proofStage(invoice, now) === 'complete',
        'Only the selected lender can sign an eligible, unpledged invoice.')
      const reference = invoice.fields.invoiceNumber.toLowerCase()
      requireCondition(!invoices.some((other) =>
        other !== invoice && other.fields.invoiceNumber.toLowerCase() === reference &&
        other.chain.some(({ title }) => title === 'Pledge recorded')
      ), 'Cardano rejected the pledge because this invoice is already financed.')
      recordStatus(invoice, 'Pledged', now)
      addChain(invoice, now, 'Cardano preprod', 'Pledge recorded', 'The invoice is pledged to the selected lender')
      return
    }
    case 'send-advance':
      requireCondition(selected && status === 'Pledged' && pledgeConfirmed(invoice, now),
        'Wait for the Cardano pledge to confirm before sending an advance.')
      invoice.advancePaid = true
      recordStatus(invoice, 'Advance paid', now)
      return
    case 'instruct-payment':
      requireCondition(role === 'buyer' && status === 'Advance paid' && pledgeConfirmed(invoice, now),
        'Payment instructions require a confirmed pledge and a sent advance.')
      invoice.instructed = true
      recordStatus(invoice, 'Payment instructed', now)
      return
    case 'upload-slip':
      requireCondition(role === 'buyer' && !invoice.receipt && receiptStatuses.has(status),
        'A slip can only be uploaded for an open payment.')
      acceptSlip(invoice, action.source, now)
      return
    case 'confirm-payment':
      requireCondition(selected && !invoice.receipt && receiptStatuses.has(status),
        'Only the recorded lender can confirm an open payment.')
      confirmReceipt(invoice, action.receipt, now)
      return
    case 'report-not-received':
      requireCondition(selected && invoice.instructed && !invoice.receipt && receiptStatuses.has(status) &&
        status !== 'Disputed' && invoice.slip?.value.result !== 'pending',
      'Only the recorded lender can report an open, unconfirmed transfer.')
      recordStatus(invoice, 'Disputed', now)
      return
    case 'send-balance':
      requireCondition(selected && status === 'Payment confirmed', 'Confirm the transfer before sending the balance.')
      invoice.balanceSent = true
      recordStatus(invoice, 'Balance sent', now)
      addChain(invoice, now, 'Cardano preprod', 'Invoice closed', 'Final settlement recorded in the invoice registry')
  }
}

export function createMockApi({
  now = Date.now, latency = 340,
}: { now?: () => number; latency?: number } = {}): InvoiceVeilApi {
  const invoices = seedInvoices(now())
  let nextId = 101

  return {
    async getLedgerSnapshot(role, signal) {
      await delay(latency, signal)
      const invoice = invoices.find(({ id }) => id === sampleId)
      if (!invoice || !canView(role, invoice)) return null
      const time = now()
      sync(invoice, time)
      const summary = summarize(role, invoice, time)
      return structuredClone({
        reference: invoice.id, buyer: summary.buyer, supplier: summary.supplier,
        status: summary.status, amount: summary.amount, provenMinimum: threshold(invoice),
        termDays: summary.termDays, chain: invoice.chain.map((entry) => chainView(entry, time)),
      })
    },
    async listInvoices(role, signal) {
      await delay(latency, signal)
      const time = now()
      for (const invoice of invoices) sync(invoice, time)
      return structuredClone(invoices.filter((invoice) => canView(role, invoice))
        .map((invoice) => summarize(role, invoice, time)))
    },
    async getInvoice(role, id, signal) {
      await delay(latency, signal)
      const invoice = invoices.find((record) => record.id === id)
      if (!invoice) return null
      const time = now()
      sync(invoice, time)
      return canView(role, invoice) ? structuredClone(project(role, invoice, time)) : null
    },
    async uploadInvoice(role, file) {
      await delay(latency * 2)
      requireCondition(role === 'supplier', 'Only a supplier can upload an invoice.')
      if (file) requireValidDocument(file)
      const id = `INV-2026-${String(nextId++).padStart(4, '0')}`
      invoices.unshift(createDraft(id, now(), file))
      return id
    },
    async act(role, id, action) {
      await delay(latency)
      const invoice = invoices.find((record) => record.id === id)
      const time = now()
      requireCondition(invoice, 'This invoice is unavailable.')
      sync(invoice, time)
      requireCondition(canView(role, invoice), 'This invoice is unavailable to the active role.')
      runAction(role, invoice, action, time, invoices)
    },
  }
}

export const invoiceVeilApi = createMockApi()
