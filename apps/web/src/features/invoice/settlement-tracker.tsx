import { Check } from 'lucide-react'
import type { Settlement } from '../../lib/api'
import { Panel } from '../../components/ui/ledger'

export function SettlementTracker({ settlement }: { settlement: Settlement }) {
  const steps = [
    { label: 'Advance received', done: settlement.advancePaid },
    { label: 'Buyer paid', done: settlement.lenderConfirmed },
    { label: 'Lender confirmed', done: settlement.lenderConfirmed },
    { label: 'Balance received', done: settlement.balanceSent },
    { label: 'Closed', done: settlement.closed },
  ]

  return (
    <Panel title="Settlement tracker">
      <ol className="settlement-steps">
        {steps.map(({ label, done }, index) => {
          const active = !done && steps.findIndex((step) => !step.done) === index

          return (
            <li key={label} data-state={done ? 'complete' : active ? 'active' : 'pending'}>
              <span className="step-indicator">{done ? <Check aria-hidden="true" /> : index + 1}</span>
              <div>
                <span>{label}</span>
                {label === 'Buyer paid' && settlement.buyerSubmitted && !settlement.lenderConfirmed && (
                  <p className="muted">Slip matched. Awaiting lender confirmation.</p>
                )}
              </div>
              <span className="sr-only">{done ? 'Complete' : active ? 'In progress' : 'Pending'}</span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
