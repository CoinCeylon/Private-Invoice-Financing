import { Check, Circle, LoaderCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Notice, Panel } from '../../components/ui/ledger'
import type { ProofStage, SupplierInvoice } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import type { InvoiceActions } from '../invoice/queries'

const steps: Array<{ stage: ProofStage; label: string; description: string }> = [
  { stage: 'commitment', label: 'Create commitment', description: 'Bind the approved amount to the invoice reference.' },
  { stage: 'local', label: 'Generate local proof', description: 'Prove the amount meets the threshold.' },
  { stage: 'chain', label: 'Confirm on Midnight', description: 'Record the verified result on the network.' },
]

export function ProofPanel({ invoice, actions }: { invoice: SupplierInvoice; actions: InvoiceActions }) {
  const active = invoice.proof === 'complete' ? steps.length : steps.findIndex(({ stage }) => stage === invoice.proof)
  const below = invoice.fields.amount.minorUnits < invoice.proofMinimum.minorUnits

  return (
    <Panel title="Generate eligibility proof" subtitle={`Prove this invoice meets the ${formatMoney(invoice.proofMinimum)} minimum.`}>
      <ol className="proof-steps" aria-label="Proof progress">
        {steps.map(({ stage, label, description }, index) => {
          const done = active > index
          const current = active === index
          const Icon = done ? Check : current ? LoaderCircle : Circle

          return (
            <li key={stage} data-state={done ? 'complete' : current ? 'active' : 'pending'} aria-current={current ? 'step' : undefined}>
              <span className="step-indicator"><Icon aria-hidden="true" /></span>
              <div><h3>{label}</h3><p>{description}</p></div>
              <span className="step-status">{done ? 'Complete' : current ? 'In progress' : 'Pending'}</span>
            </li>
          )
        })}
      </ol>
      {below && <Notice tone="warning" title="The approved amount is below the proof minimum." />}
      <div className="action-row">
        {invoice.status === 'Eligible' ? (
          <Button variant="primary" disabled={actions.busy} onClick={() => actions.run({ type: 'list' })}>
            {actions.busy ? 'Listing…' : 'List invoice'}
          </Button>
        ) : (
          <Button variant="primary" disabled={actions.busy || active >= 0 || below} onClick={() => actions.run({ type: 'generate-proof' })}>
            {actions.busy ? 'Starting…' : active >= 0 ? 'Generating proof…' : 'Generate proof'}
          </Button>
        )}
      </div>
    </Panel>
  )
}
