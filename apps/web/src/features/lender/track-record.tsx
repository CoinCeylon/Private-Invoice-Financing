import { Building2 } from 'lucide-react'
import { Panel } from '../../components/ui/ledger'
import type { BuyerTrackRecord } from '../../lib/api'
import { formatRate } from '../../lib/money'

export function TrackRecord({ buyer, record }: { buyer: string; record: BuyerTrackRecord }) {
  return (
    <Panel title="Buyer track record" className="track-record">
      <div className="track-buyer"><Building2 aria-hidden="true" />{buyer}</div>
      <dl className="ledger-fields">
        <div><dt>Invoices paid</dt><dd className="mono">{record.invoicesPaid}</dd></div>
        <div><dt>On time</dt><dd className="mono">{formatRate(record.onTimeBps)}</dd></div>
        <div><dt>Average days late</dt><dd className="mono">{record.averageDaysLate}</dd></div>
        <div><dt>Defaults</dt><dd className="mono">{record.defaults}</dd></div>
      </dl>
    </Panel>
  )
}
