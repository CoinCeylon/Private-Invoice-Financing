import type { InvoiceStatus } from '../../lib/api'

const settlementStatuses: InvoiceStatus[] = [
  'Offer selected', 'Pledged', 'Advance paid', 'Payment instructed', 'Slip uploaded',
  'Paid by buyer – awaiting lender', 'Payment confirmed', 'Late', 'Disputed', 'Balance sent', 'Closed',
]

export function isSettlementStatus(status: InvoiceStatus) {
  return settlementStatuses.includes(status)
}
