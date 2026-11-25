import { LockKeyhole } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { LedgerMessage, Panel } from '../../components/ui/ledger'
import type { SupplierInvoice } from '../../lib/api'
import { formatMoney, formatRate } from '../../lib/money'
import { bestOffer, calculateOffer } from '../../lib/offers'
import { participants } from '../../lib/roles'
import type { InvoiceActions } from '../invoice/queries'

export function OfferComparison({ invoice, actions }: { invoice: SupplierInvoice; actions: InvoiceActions }) {
  const amount = invoice.fields.amount
  const best = bestOffer(amount, invoice.offers)

  return (
    <Panel title="Sealed offers" subtitle="Compare how much you receive now and after the buyer pays.">
      {invoice.offers.length === 0 ? (
        <LedgerMessage title="Waiting for offers" description="Lenders can submit quotes while this invoice is listed." />
      ) : (
        <div className="offer-grid">
          {invoice.offers.map((offer) => {
            const figures = calculateOffer(amount, offer)
            const name = participants[offer.lender].name
            const selected = invoice.selectedLender === offer.lender

            return (
              <article className="offer-card" key={offer.lender} data-best={best?.lender === offer.lender}>
                <div className="offer-card-heading">
                  <h3><LockKeyhole aria-hidden="true" /> {name}</h3>
                  {(selected || best?.lender === offer.lender) &&
                    <span className="pill pill--verified">{selected ? 'Selected' : 'Best value'}</span>}
                </div>
                <p className="offer-total"><span>Net cash to supplier</span><strong className="mono">{formatMoney(figures.net)}</strong></p>
                <dl className="ledger-fields offer-fields">
                  <div><dt>Advance <span className="mono">({formatRate(offer.advanceBps)})</span></dt><dd className="mono">{formatMoney(figures.advance)}</dd></div>
                  <div><dt>Fee <span className="mono">({formatRate(offer.feeBps)})</span></dt><dd className="mono">{formatMoney(figures.fee)}</dd></div>
                  <div><dt>Balance after payment</dt><dd className="mono">{formatMoney(figures.balance)}</dd></div>
                  <div><dt>Recourse share</dt><dd className="mono">{formatRate(offer.recourseBps)}</dd></div>
                </dl>
                {invoice.status === 'Offers received' && (
                  <ConfirmDialog
                    trigger={<Button variant={best?.lender === offer.lender ? 'primary' : 'outline'} disabled={actions.busy}>Select offer</Button>}
                    title={`Select ${name}?`}
                    description={`${name} will be granted access to the invoice documents. Your total proceeds are ${formatMoney(figures.net)} after the buyer pays.`}
                    confirm="Confirm selection"
                    onConfirm={() => actions.run({ type: 'select-offer', lender: offer.lender })}
                  />
                )}
              </article>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
