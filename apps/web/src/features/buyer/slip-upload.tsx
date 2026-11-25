import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { DocumentInput } from '../../components/ui/document-input'
import { Panel } from '../../components/ui/ledger'
import type { PaymentSlip } from '../../lib/api'
import { validateDocumentFile } from '../../lib/documents'
import type { InvoiceActions } from '../invoice/queries'
import { SlipResult } from '../invoice/slip-result'

export function SlipUpload({ slip, canUpload, actions }: {
  slip: PaymentSlip | null
  canUpload: boolean
  actions: InvoiceActions
}) {
  const [file, setFile] = useState<File>()
  const [error, setError] = useState<string>()
  const busy = actions.busy || slip?.result === 'pending'

  function upload() {
    const issue = file ? validateDocumentFile(file) : 'Choose a transfer slip.'
    setError(issue ?? undefined)
    if (file && !issue) actions.run({ type: 'upload-slip', source: { kind: 'upload', file } })
  }

  return (
    <Panel title="Transfer slip" subtitle={canUpload ? 'Upload the slip after making the bank transfer. Matching is simulated in this workspace.' : undefined}>
      {slip && <SlipResult slip={slip} />}
      {canUpload && (
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); upload() }}>
          <DocumentInput label="Bank transfer slip" file={file} error={error}
            onFile={(next) => { setFile(next); setError(next ? validateDocumentFile(next) ?? undefined : undefined) }} />
          <div className="action-row">
            <Button type="submit" variant="primary" disabled={busy}>Upload slip</Button>
            <Button disabled={busy} onClick={() => actions.run({ type: 'upload-slip', source: { kind: 'demo', matches: true } })}>Use matching sample</Button>
            <Button disabled={busy} onClick={() => actions.run({ type: 'upload-slip', source: { kind: 'demo', matches: false } })}>Use mismatched sample</Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
