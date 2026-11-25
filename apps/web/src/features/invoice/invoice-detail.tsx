import { Link, useParams, useSearch } from '@tanstack/react-router'
import { BadgeCheck, Clock3, Link2 } from 'lucide-react'
import { ChainChip } from '../../components/chain-chip'
import { LedgerMessage, LoadingLedger, Notice, PageIntro, Panel, StatusBadge } from '../../components/ui/ledger'
import { VeiledAmount } from '../../components/veiled-amount'
import type { InvoiceDetail, TimelineEntry } from '../../lib/api'
import { formatDate, formatTimestamp } from '../../lib/dates'
import { formatMoney, formatRate } from '../../lib/money'
import type { Role } from '../../lib/roles'
import { BuyerWorkflow } from '../buyer/buyer-workflow'
import { LenderWorkflow } from '../lender/lender-workflow'
import { SupplierWorkflow } from '../supplier/supplier-workflow'
import { useInvoice, useInvoiceActions } from './queries'
import { isSettlementStatus } from './status'

function InvoiceFacts({ invoice }: { invoice: InvoiceDetail }) {
  const terms = (
    <dl className="record-facts">
      <div><dt>Buyer</dt><dd>{invoice.buyer}</dd></div>
      {invoice.supplier && <div><dt>Supplier</dt><dd>{invoice.supplier}</dd></div>}
      <div><dt>Payment term</dt><dd><span className="mono">{invoice.termDays}</span> days</dd></div>
      {invoice.dueDate && <div><dt>Due date</dt><dd>{formatDate(invoice.dueDate)}</dd></div>}
      {invoice.amount.visibility === 'hidden' && <div><dt>Currency</dt><dd className="mono">{invoice.currency}</dd></div>}
      {invoice.provenMinimum && (
        <div className="proof-fact">
          <dt><BadgeCheck aria-hidden="true" /> Proven minimum</dt>
          <dd className="mono">{formatMoney(invoice.provenMinimum)}</dd>
        </div>
      )}
    </dl>
  )

  return (
    <section className="workflow-panel record-facts-panel" aria-label="Invoice terms">
      <div className="record-amount">
        <span>Invoice amount</span>
        <div className={invoice.amount.visibility === 'hidden' ? 'inline-veil' : undefined}>
          <VeiledAmount amount={invoice.amount} />
        </div>
      </div>
      {terms}
    </section>
  )
}

function InvoiceTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Panel title="Invoice timeline" className="timeline-panel">
      {entries.length === 0 ? <p className="muted">No events are available for this invoice.</p> : (
        <ol className="timeline">
          {entries.toReversed().map((event) => {
            const Icon = event.kind === 'chain' ? Link2 : Clock3
            return (
              <li key={event.id}>
                <span className="timeline-mark"><Icon aria-hidden="true" /></span>
                <div className="timeline-content">
                  <time dateTime={event.at}>{formatTimestamp(event.at)}</time>
                  <h3>{event.kind === 'chain' ? event.chain.title : event.title}</h3>
                  {event.kind === 'chain' && <ChainChip {...event.chain} />}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

function DefaultRecord({ invoice }: { invoice: InvoiceDetail }) {
  const selected = invoice.viewer === 'supplier'
    ? invoice.offers.find(({ lender }) => lender === invoice.selectedLender)
    : invoice.viewer === 'buyer' ? null : invoice.financing ? invoice.ownOffer : null

  return (
    <Notice tone="error" title="Invoice recorded in default">
      <p>The invoice reached default with an outstanding payment.</p>
      {selected && <p>Agreed recourse share <span className="mono">{formatRate(selected.recourseBps)}</span>.</p>}
    </Notice>
  )
}

export function InvoiceDetailPage() {
  const { role = 'supplier' } = useSearch({ from: '__root__' })
  const { invoiceId } = useParams({ from: '/invoice/$invoiceId' })
  return <InvoiceDetailView key={`${role}-${invoiceId}`} role={role} invoiceId={invoiceId} />
}

function InvoiceDetailView({ role, invoiceId }: { role: Role; invoiceId: string }) {
  const query = useInvoice(role, invoiceId)
  const actions = useInvoiceActions(role, invoiceId)
  const invoice = query.data
  const settlementView = invoice && (invoice.lenderAssigned ||
    (role === 'buyer' && isSettlementStatus(invoice.status)))
  const back = invoice?.status === 'Defaulted' ? '/defaulted' : settlementView ? '/settlement' : '/invoices'
  const backLabel = back === '/defaulted' ? 'Defaulted invoices'
    : back === '/settlement' ? role === 'buyer' ? 'Payments' : 'Financing & settlement'
      : role === 'buyer' ? 'Approvals' : role === 'supplier' ? 'My invoices' : 'Listing board'

  return (
    <div className="workspace-content workflow-page">
      <Link to={back} search={{ role }} className="text-link detail-back">
        {backLabel}
      </Link>
      <div className="detail-heading">
        <PageIntro title={<>Invoice <span className="mono detail-reference">{invoiceId}</span></>} action={invoice && <StatusBadge status={invoice.status} />} />
      </div>
      {query.isPending ? <LoadingLedger label="Loading invoice" /> : query.isError && !invoice ? (
        <LedgerMessage title="Invoice unavailable" description="The invoice record could not be loaded."
          retry={() => void query.refetch()} pending={query.isFetching} />
      ) : !invoice ? (
        <LedgerMessage title="Invoice unavailable to this role" description="Open an invoice from this workspace or switch to another demo role." />
      ) : (
        <>
          <InvoiceFacts key={`${invoice.id}-facts`} invoice={invoice} />
          <div className="detail-grid">
            <div className="workflow-stack" key={`${invoice.id}-${role}`}>
              {actions.error && <Notice tone="error" title={actions.error} />}
              {invoice.status === 'Defaulted' && <DefaultRecord invoice={invoice} />}
              {invoice.viewer === 'supplier' ? <SupplierWorkflow invoice={invoice} actions={actions} />
                : invoice.viewer === 'buyer' ? <BuyerWorkflow invoice={invoice} actions={actions} />
                  : <LenderWorkflow invoice={invoice} actions={actions} />}
            </div>
            <InvoiceTimeline entries={invoice.timeline} />
          </div>
        </>
      )}
    </div>
  )
}
