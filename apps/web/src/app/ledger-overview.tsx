import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { AlertCircle, Braces, FileText, Fingerprint, ShieldCheck } from 'lucide-react'
import { ChainChip } from '../components/chain-chip'
import { Button } from '../components/ui/button'
import { StatusBadge } from '../components/ui/ledger'
import { VeiledAmount } from '../components/veiled-amount'
import type { ChainEntry, LedgerSnapshot } from '../lib/api'
import { invoiceVeilApi } from '../lib/mock-api'
import { formatMoney } from '../lib/money'
import type { Role } from '../lib/roles'

function InvoiceSnapshot({ invoice, role }: { invoice: LedgerSnapshot; role: Role }) {
  const amountIsVisible = invoice.amount.visibility === 'visible'

  return (
    <section className="invoice-card" id="invoice" tabIndex={-1} aria-labelledby="invoice-title">
      <div className="invoice-card-header">
        <span className="document-icon"><FileText aria-hidden="true" /></span>
        <div>
          <h2 id="invoice-title">Invoice snapshot</h2>
          <p className="invoice-reference mono">{invoice.reference}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <dl className="invoice-parties">
        {invoice.supplier && (
          <div>
            <dt>Supplier</dt>
            <dd>{invoice.supplier}</dd>
          </div>
        )}
        <div>
          <dt>Buyer</dt>
          <dd>{invoice.buyer}</dd>
        </div>
      </dl>

      <dl className="invoice-values">
        <div className="invoice-total">
          <dt>{amountIsVisible ? 'Invoice amount' : 'Proven minimum'}</dt>
          <dd>
            {amountIsVisible
              ? <VeiledAmount amount={invoice.amount} />
              : <span className="mono amount-value">{formatMoney(invoice.provenMinimum)}</span>}
          </dd>
        </div>
        <div className="invoice-facts">
          <div>
            <dt>{amountIsVisible ? 'Proven minimum' : 'Currency'}</dt>
            <dd className="mono">
              {amountIsVisible ? formatMoney(invoice.provenMinimum) : invoice.provenMinimum.currency}
            </dd>
          </div>
          <div>
            <dt>Payment term</dt>
            <dd><span className="mono">{invoice.termDays}</span> days</dd>
          </div>
        </div>
      </dl>
      <Link to="/invoice/$invoiceId" params={{ invoiceId: invoice.reference }} search={{ role }} className="text-link snapshot-link">
        Open invoice record
      </Link>
    </section>
  )
}

function Disclosure({ isPreview }: { isPreview: boolean }) {
  return (
    <section className="disclosure-card" aria-labelledby="disclosure-title">
      <div className="disclosure-header">
        <span className="disclosure-icon"><Fingerprint aria-hidden="true" /></span>
        <span className="disclosure-kicker">Private disclosure</span>
      </div>
      <h2 id="disclosure-title">{isPreview ? 'Lender preview' : 'Lender view'}</h2>
      <div className="disclosure-amount">
        <p>Invoice amount</p>
        <VeiledAmount amount={{ visibility: 'hidden' }} />
      </div>
      <div className="disclosure-note">
        <ShieldCheck aria-hidden="true" />
        <p>Lenders can verify the minimum. The selected lender can open the invoice once the supplier grants access.</p>
      </div>
    </section>
  )
}

function ChainActivity({ chain }: { chain: ChainEntry[] }) {
  return (
    <section className="chain-section" id="chain-activity" tabIndex={-1} aria-labelledby="chain-title">
      <h2 id="chain-title">Chain activity</h2>
      {chain.length === 0 ? (
        <p className="chain-empty">No transactions have been submitted for this invoice.</p>
      ) : (
        <ul className="chain-list" aria-label="Invoice transactions">
          {chain.map((entry) => {
            const Icon = entry.network === 'Midnight' ? ShieldCheck : Braces

            return (
              <li className="chain-row" key={entry.transactionId}>
                <div className="chain-record">
                  <span className="chain-record-icon"><Icon aria-hidden="true" /></span>
                  <div className="chain-record-text">
                    <h3>{entry.title}</h3>
                    <p>{entry.description}</p>
                  </div>
                </div>
                <ChainChip {...entry} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function LedgerSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">Loading ledger snapshot</p>
      <div aria-hidden="true">
        <div className="ledger-grid">
          <div className="skeleton skeleton-card" id="invoice" />
          <div className="skeleton skeleton-card" />
        </div>
        <div className="skeleton skeleton-activity" id="chain-activity" />
      </div>
    </>
  )
}

export function LedgerOverview() {
  const { role = 'supplier' } = useSearch({ from: '/' })
  const snapshot = useQuery({
    queryKey: ['ledgerSnapshot', role],
    queryFn: ({ signal }) => invoiceVeilApi.getLedgerSnapshot(role, signal),
    refetchInterval: (query) =>
      query.state.data?.chain.some((entry) => entry.status === 'Pending') ? 1_500 : false,
    retry: false,
  })
  const invoice = snapshot.data

  return (
    <div className="workspace-content">
      <div className="page-intro">
        <div>
          <h1>Ledger overview</h1>
          <p>Review the invoice and the proof that backs it.</p>
        </div>
        <span className="demo-label"><span aria-hidden="true" /> Demo workspace</span>
      </div>

      {snapshot.isPending ? (
        <LedgerSkeleton />
      ) : snapshot.isError && !invoice ? (
        <section className="ledger-message ledger-message--error">
          <AlertCircle aria-hidden="true" />
          <div role="alert">
            <h2>Ledger unavailable</h2>
            <p>The invoice snapshot could not be loaded.</p>
          </div>
          <Button onClick={() => void snapshot.refetch()} disabled={snapshot.isFetching}>
            {snapshot.isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </section>
      ) : !invoice ? (
        <section className="ledger-message">
          <FileText aria-hidden="true" />
          <div>
            <h2>No invoice to show</h2>
            <p>This workspace has no invoice snapshot yet.</p>
          </div>
        </section>
      ) : (
        <>
          <div className="ledger-grid">
            <InvoiceSnapshot invoice={invoice} role={role} />
            <Disclosure isPreview={invoice.amount.visibility === 'visible'} />
          </div>
          <ChainActivity chain={invoice.chain} />
        </>
      )}
    </div>
  )
}
