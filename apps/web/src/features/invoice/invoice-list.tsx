import { Link, useLocation, useSearch } from '@tanstack/react-router'
import { FilePlus2, FileText, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { LedgerMessage, LoadingLedger, PageIntro, StatusBadge } from '../../components/ui/ledger'
import type { InvoiceStatus, InvoiceSummary } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import { isLender } from '../../lib/roles'
import type { Role } from '../../lib/roles'
import { TrackRecord } from '../lender/track-record'
import { useInvoices } from './queries'
import { isSettlementStatus } from './status'

type ListView = 'work' | 'settlement' | 'defaulted'

const supplierActions: Partial<Record<InvoiceStatus, string>> = {
  Draft: 'Review extraction',
  'Awaiting buyer review': 'View review status',
  Available: 'Generate proof',
  Eligible: 'List invoice',
  Listed: 'View listing',
  'Offers received': 'Compare offers',
  'Offer selected': 'Track settlement',
  Closed: 'View invoice',
  Defaulted: 'View default record',
}

function nextAction(invoice: InvoiceSummary, role: Role, view: ListView): string {
  if (view === 'defaulted') return 'View default record'
  if (role === 'supplier') return supplierActions[invoice.status] ?? 'Track settlement'
  if (role === 'buyer') return invoice.status === 'Awaiting buyer review' ? 'Review invoice' : 'View payment'
  if (view === 'work') return 'View listing'
  return invoice.status === 'Offer selected' || invoice.status === 'Pledged' ? 'Review financing' : 'View settlement'
}

function belongsTo(invoice: InvoiceSummary, role: Role, view: ListView) {
  if (view === 'defaulted') return invoice.status === 'Defaulted'
  if (view === 'settlement') {
    return isSettlementStatus(invoice.status) && (!isLender(role) || invoice.lenderAssigned)
  }
  if (role === 'buyer') return invoice.status === 'Awaiting buyer review'
  if (isLender(role)) return invoice.status === 'Listed' || invoice.status === 'Offers received'
  return true
}

function pageCopy(role: Role, view: ListView) {
  if (view === 'defaulted') return {
    title: 'Defaulted invoices', description: 'Review invoices recorded in default and their on-chain history.',
  }
  if (view === 'settlement') {
    if (role === 'buyer') return { title: 'Payments', description: 'Find recorded payment instructions, slips, and confirmations.' }
    return { title: 'Settlement', description: 'Track pledged invoices, transfers, and final balances.' }
  }
  if (role === 'buyer') return { title: 'Approvals', description: 'Review and sign invoices submitted by your suppliers.' }
  if (isLender(role)) return { title: 'Listing board', description: 'Review proven invoice terms and submit a sealed quote.' }
  return { title: 'My invoices', description: 'Follow your invoices from extraction through proof, financing, and settlement.' }
}

function InvoiceRows({ invoices, role, view }: { invoices: InvoiceSummary[]; role: Role; view: ListView }) {
  const amountLabel = isLender(role) && view === 'work' ? 'Proven minimum' : 'Amount'

  return (
    <div className="table-frame">
      <table className="invoice-table">
        <thead><tr><th scope="col">Invoice</th><th scope="col">Status</th><th scope="col">{amountLabel}</th>
          <th scope="col">Term</th><th scope="col">Next action</th></tr></thead>
        <tbody>
          {invoices.map((invoice) => {
            const amount = isLender(role) && view === 'work' ? invoice.provenMinimum
              : invoice.amount.visibility === 'visible' ? invoice.amount.money : invoice.provenMinimum
            const action = nextAction(invoice, role, view)

            return (
              <tr key={invoice.id}>
                <th scope="row">
                  <div className="invoice-row-id">
                    <span className="row-icon"><FileText aria-hidden="true" /></span>
                    <div>
                      <span className="mono">{invoice.id}</span>
                      <span className="muted">{role === 'buyer' ? invoice.supplier : invoice.buyer}</span>
                    </div>
                  </div>
                </th>
                <td data-label="Status"><StatusBadge status={invoice.status} /></td>
                <td className="mono" data-label={amountLabel}>{amount ? formatMoney(amount) : invoice.currency}</td>
                <td className="term-cell" data-label="Term"><span className="mono">{invoice.termDays}</span> days</td>
                <td data-label="Next action">
                  <Button className="row-action" variant="outline" asChild>
                    <Link to="/invoice/$invoiceId" params={{ invoiceId: invoice.id }} search={{ role }}
                      aria-label={`${action} ${invoice.id}`}>{action}</Link>
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function InvoiceListPage() {
  const { role = 'supplier' } = useSearch({ from: '__root__' })
  const pathname = useLocation({ select: (location) => location.pathname })
  const view = pathname === '/defaulted' ? 'defaulted' : pathname === '/settlement' ? 'settlement' : 'work'
  const [search, setSearch] = useState('')
  const invoices = useInvoices(role)
  const rows = invoices.data?.filter((invoice) => belongsTo(invoice, role, view)) ?? []
  const query = search.trim().toLowerCase()
  const filtered = rows.filter(({ id, buyer, supplier, status, currency }) =>
    !query || [id, buyer, supplier, status, currency].some((value) => value?.toLowerCase().includes(query))
  )
  const listedBuyer = role !== 'supplier' && role !== 'buyer' && view === 'work'
    ? rows.find(({ trackRecord }) => trackRecord)
    : undefined

  return (
    <div className="workspace-content workflow-page">
      <PageIntro {...pageCopy(role, view)} action={role === 'supplier' && view === 'work' && (
        <Button asChild variant="primary"><Link to="/upload" search={{ role }}><FilePlus2 aria-hidden="true" />Upload invoice</Link></Button>
      )} />
      {invoices.isPending ? <LoadingLedger /> : invoices.isError && !invoices.data ? (
        <LedgerMessage title="Invoices unavailable" description="The ledger could not load this workspace."
          retry={() => void invoices.refetch()} pending={invoices.isFetching} />
      ) : (
        <div className={listedBuyer ? 'market-grid' : undefined}>
          <section className="invoice-list" aria-label="Invoices">
            {rows.length > 0 && (
              <div className="list-toolbar">
                <label className="search-control">
                  <Search aria-hidden="true" />
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoices" aria-label="Search invoices" />
                </label>
                <span className="muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}</span>
              </div>
            )}
            {filtered.length ? <InvoiceRows invoices={filtered} role={role} view={view} />
              : <LedgerMessage title={rows.length ? 'No matching invoices' : 'No invoices in this view'}
                description={rows.length ? 'Try a different invoice search.' : 'Invoices will appear as they reach this part of the workflow.'} />}
          </section>
          {listedBuyer?.trackRecord && <TrackRecord buyer={listedBuyer.buyer} record={listedBuyer.trackRecord} />}
        </div>
      )}
    </div>
  )
}
