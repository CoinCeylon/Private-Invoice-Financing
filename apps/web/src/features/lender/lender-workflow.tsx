import { BadgeCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { Notice, Panel } from '../../components/ui/ledger'
import type { LenderInvoice } from '../../lib/api'
import { amountIn, formatMoney, formatRate } from '../../lib/money'
import { calculateOffer, platformFeeBps } from '../../lib/offers'
import { DocumentTabs } from '../invoice/documents'
import type { InvoiceActions } from '../invoice/queries'
import { SettlementTracker } from '../invoice/settlement-tracker'
import { LenderSettlement } from './lender-settlement'
import { QuotePanel } from './quote-panel'
import { TrackRecord } from './track-record'

export function LenderWorkflow({ invoice, actions }: { invoice: LenderInvoice; actions: InvoiceActions }) {
  const { financing, ownOffer } = invoice

  if (!financing || !ownOffer) {
    return (
      <>
        <QuotePanel invoice={invoice} actions={actions} />
        <TrackRecord buyer={invoice.buyer} record={invoice.trackRecord} />
      </>
    )
  }

  const figures = calculateOffer(financing.fields.amount, ownOffer)
  const supplierPenalty = invoice.late && financing.lenderPenalty
    ? invoice.late.penalty.minorUnits - financing.lenderPenalty.minorUnits : 0
  const balance = formatMoney(amountIn(figures.balance.currency, figures.balance.minorUnits + supplierPenalty))

  return (
    <>
      <Panel title="Financing review" subtitle="Review the contract figures and invoice documents.">
        {financing.commitmentVerified && (
          <p className="verified-line"><BadgeCheck aria-hidden="true" /> Commitment opening check passed</p>
        )}
        <dl className="ledger-fields">
          <div><dt>Advance <span className="mono">({formatRate(ownOffer.advanceBps)})</span></dt><dd className="mono">{formatMoney(figures.advance)}</dd></div>
          <div><dt>Financing fee <span className="mono">({formatRate(ownOffer.feeBps)})</span></dt><dd className="mono">{formatMoney(figures.fee)}</dd></div>
          <div><dt>Platform fee paid by lender <span className="mono">({formatRate(platformFeeBps)})</span></dt><dd className="mono">{formatMoney(figures.platformFee)}</dd></div>
          <div><dt>Supplier balance</dt><dd className="mono">{balance}</dd></div>
          <div><dt>Recourse share</dt><dd className="mono">{formatRate(ownOffer.recourseBps)}</dd></div>
        </dl>
        {financing.lenderPenalty && <Notice tone="warning" title="Your share of the late-payment penalty">
          <span className="mono">{formatMoney(financing.lenderPenalty)}</span> of <span className="mono">{invoice.late && formatMoney(invoice.late.penalty)}</span>.
        </Notice>}
        <DocumentTabs documents={financing.documents} />
        {invoice.status === 'Offer selected' && (
          <ConfirmDialog
            trigger={<Button variant="primary" disabled={actions.busy || !financing.commitmentVerified}>Sign pledge</Button>}
            title="Sign the Cardano pledge?"
            description="The invoice will be recorded against your lender account. An existing pledge can block duplicate financing."
            confirm="Sign and submit pledge"
            onConfirm={() => actions.run({ type: 'sign-pledge' })}
          />
        )}
        {invoice.status === 'Pledged' && (
          <Button variant="primary" disabled={actions.busy || !financing.pledgeConfirmed} onClick={() => actions.run({ type: 'send-advance' })}>
            {financing.pledgeConfirmed ? 'Record advance sent' : 'Waiting for Cardano confirmation…'}
          </Button>
        )}
      </Panel>
      {financing.settlement.advancePaid && invoice.status !== 'Defaulted' && (
        <LenderSettlement invoice={invoice} financing={financing} balance={balance} actions={actions} />
      )}
      {invoice.status !== 'Offer selected' && <SettlementTracker settlement={financing.settlement} />}
    </>
  )
}
