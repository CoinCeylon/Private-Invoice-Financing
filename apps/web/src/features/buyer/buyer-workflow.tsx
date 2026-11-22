import { Copy, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Notice, Panel } from '../../components/ui/ledger'
import type { BuyerInvoice, PaymentInstruction } from '../../lib/api'
import { copyToClipboard } from '../../lib/clipboard'
import { formatDate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { DocumentTabs } from '../invoice/documents'
import type { InvoiceActions } from '../invoice/queries'
import { ApprovalReview } from './approval-review'
import { SlipUpload } from './slip-upload'

function PaymentPanel({ instruction, confirmed }: { instruction: PaymentInstruction; confirmed: boolean }) {
  return (
    <Panel
      title={confirmed ? 'Payment record' : 'Payment instructions'}
      subtitle={confirmed ? 'Bank details recorded for the confirmed transfer.' : 'Use these bank details for the Cardano-recorded lender.'}
    >
      <div className="payment-destination">
        <div><span>{confirmed ? 'Recorded lender' : 'Pay to'}</span><strong><ShieldCheck aria-hidden="true" /> {instruction.lender}</strong></div>
        <div><span>{confirmed ? 'Amount received' : 'Amount due'}</span><strong className="mono">{formatMoney(instruction.amount)}</strong></div>
      </div>
      <dl className="ledger-fields">
        <div><dt>Bank</dt><dd>{instruction.bank}</dd></div>
        <div><dt>Branch</dt><dd>{instruction.branch}</dd></div>
        <div><dt>Account number</dt><dd className="mono">{instruction.account}</dd></div>
        <div><dt>Due date</dt><dd>{formatDate(instruction.dueDate)}</dd></div>
        <div>
          <dt>Payment reference</dt>
          <dd>
            <Button className="copy-id" variant="ghost" aria-label="Copy payment reference"
              onClick={() => void copyToClipboard(instruction.reference, 'Payment reference')}>
              <span className="mono">{instruction.reference}</span><Copy aria-hidden="true" />
            </Button>
          </dd>
        </div>
      </dl>
    </Panel>
  )
}

export function BuyerWorkflow({ invoice, actions }: { invoice: BuyerInvoice; actions: InvoiceActions }) {
  if (invoice.status === 'Awaiting buyer review') return <ApprovalReview invoice={invoice} actions={actions} />

  return (
    <>
      {invoice.status === 'Advance paid' && !invoice.instruction && (
        <Panel title="Payment instructions" subtitle="Retrieve the payment details for the recorded lender.">
          <Button variant="primary" disabled={actions.busy} onClick={() => actions.run({ type: 'instruct-payment' })}>
            {actions.busy ? 'Retrieving…' : 'Get payment instructions'}
          </Button>
        </Panel>
      )}
      {invoice.instruction && invoice.status !== 'Defaulted' && <PaymentPanel instruction={invoice.instruction} confirmed={invoice.confirmedPayment !== null} />}
      {invoice.late && <Notice tone="warning" title={`${invoice.late.days} days late`}>
        Late-payment penalty <span className="mono">{formatMoney(invoice.late.penalty)}</span>.
      </Notice>}
      {invoice.instruction && invoice.status !== 'Defaulted' && (invoice.slip || !invoice.confirmedPayment) && (
        <SlipUpload slip={invoice.slip} actions={actions} canUpload={!invoice.confirmedPayment} />
      )}
      {invoice.confirmedPayment && <Notice title="Payment confirmed by the lender">
        <span className="mono">{formatMoney(invoice.confirmedPayment.amount)}</span> received on {formatDate(invoice.confirmedPayment.arrivalDate)}.
      </Notice>}
      <Panel title="Supporting documents"><DocumentTabs documents={invoice.documents} /></Panel>
    </>
  )
}
