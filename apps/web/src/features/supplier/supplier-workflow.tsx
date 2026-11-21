import { Notice } from '../../components/ui/ledger'
import type { SupplierInvoice } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import type { InvoiceActions } from '../invoice/queries'
import { SettlementTracker } from '../invoice/settlement-tracker'
import { ExtractionReview } from './extraction-review'
import { OfferComparison } from './offer-comparison'
import { ProofPanel } from './proof-panel'

export function SupplierWorkflow({ invoice, actions }: { invoice: SupplierInvoice; actions: InvoiceActions }) {
  if (invoice.status === 'Draft') return <ExtractionReview invoice={invoice} actions={actions} />
  if (invoice.status === 'Awaiting buyer review') {
    return <Notice title="Awaiting buyer review">Market Buyer must approve and sign the invoice before you can generate its proof.</Notice>
  }
  if (invoice.status === 'Available' || invoice.status === 'Eligible') {
    return <ProofPanel invoice={invoice} actions={actions} />
  }

  return (
    <>
      {invoice.selectedLender && <SettlementTracker settlement={invoice.settlement} />}
      {invoice.supplierPenalty && <Notice tone="warning" title="Your share of the late-payment penalty">
        <span className="mono">{formatMoney(invoice.supplierPenalty)}</span>
      </Notice>}
      <OfferComparison invoice={invoice} actions={actions} />
    </>
  )
}
