import { CircleCheck, Clock3 } from 'lucide-react'
import { Notice } from '../../components/ui/ledger'
import type { PaymentSlip } from '../../lib/api'
import { formatMoney } from '../../lib/money'

export function SlipResult({ slip }: { slip: PaymentSlip }) {
  if (slip.result === 'pending') {
    return <p className="processing-message" role="status"><Clock3 aria-hidden="true" /> Checking amount and payment reference…</p>
  }

  return (
    <div className="slip-result" aria-live="polite">
      {slip.result === 'match' ? (
        <div className="notice notice--info">
          <CircleCheck aria-hidden="true" />
          <div><strong>Amount and reference match</strong><p>The recorded lender must confirm that the transfer arrived.</p></div>
        </div>
      ) : (
        <Notice tone="warning" title="Payment slip mismatch">
          <ul>{slip.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </Notice>
      )}
      <dl className="ledger-fields">
        <div><dt>Slip file</dt><dd>{slip.fileName}</dd></div>
        <div><dt>Extracted amount</dt><dd className="mono">{slip.amount ? formatMoney(slip.amount) : 'Unavailable'}</dd></div>
        <div><dt>Extracted reference</dt><dd className="mono">{slip.reference ?? 'Unavailable'}</dd></div>
      </dl>
    </div>
  )
}

