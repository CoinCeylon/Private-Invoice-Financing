import { CircleCheck, Clock3, Copy } from 'lucide-react'
import type { ChainEntry } from '../lib/api'
import { copyToClipboard } from '../lib/clipboard'
import { Button } from './ui/button'

export function ChainChip({ network, status, transactionId }: ChainEntry) {
  const isConfirmed = status === 'Confirmed'
  const Icon = isConfirmed ? CircleCheck : Clock3

  return (
    <div className="chain-chip" role="group" aria-label={`${network} transaction`}>
      <div className="chain-chip-summary">
        <span className="chain-network">{network}</span>
        <span aria-live="polite" className={`pill ${isConfirmed ? 'pill--verified' : 'pill--pending'}`}>
          <Icon aria-hidden="true" /> {status}
        </span>
      </div>
      <Button
        variant="ghost"
        className="copy-id"
        onClick={() => void copyToClipboard(transactionId, 'Transaction ID')}
        aria-label={`Copy ${network} transaction ID`}
        title={transactionId}
      >
        <span className="mono">{transactionId.slice(0, 6)}…{transactionId.slice(-4)}</span>
        <Copy aria-hidden="true" />
      </Button>
    </div>
  )
}
