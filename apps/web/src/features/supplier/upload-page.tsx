import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ScanLine } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { DocumentInput } from '../../components/ui/document-input'
import { LedgerMessage, Notice, PageIntro, Panel } from '../../components/ui/ledger'
import { invoiceVeilApi } from '../../lib/mock-api'
import { validateDocumentFile } from '../../lib/documents'

export function UploadPage() {
  const { role = 'supplier' } = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const client = useQueryClient()
  const [file, setFile] = useState<File>()
  const [fileError, setFileError] = useState<string>()
  const upload = useMutation({
    mutationFn: (document?: File) => invoiceVeilApi.uploadInvoice(role, document),
    onSuccess: async (id) => {
      void client.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Extraction complete')
      await navigate({ to: '/invoice/$invoiceId', params: { invoiceId: id }, search: { role } })
    },
    onError: (error) => toast.error(error.message),
  })

  function submit() {
    const error = file ? validateDocumentFile(file) : 'Choose an invoice file.'
    setFileError(error ?? undefined)
    if (!error) upload.mutate(file)
  }

  if (role !== 'supplier') {
    return (
      <div className="workspace-content workflow-page">
        <PageIntro title="Upload invoice" />
        <LedgerMessage title="Supplier access required" description="Switch to the supplier workspace to upload an invoice." />
        <Link to="/invoices" search={{ role }} className="text-link">Return to workspace</Link>
      </div>
    )
  }

  return (
    <div className="workspace-content workflow-page">
      <PageIntro title="Upload invoice" description="Upload the invoice, review the extracted fields, then send it to Market Buyer." />
      <div className="upload-grid">
        <Panel title="Invoice document" subtitle="Use the original invoice you issued to the buyer.">
          <form onSubmit={(event) => { event.preventDefault(); submit() }} className="form-stack">
            <DocumentInput
              label="Invoice file"
              file={file}
              onFile={(next) => { setFile(next); setFileError(next ? validateDocumentFile(next) ?? undefined : undefined) }}
              error={fileError}
            />
            {upload.error && <Notice tone="error" title={upload.error.message} />}
            <div className="action-row">
              <Button type="submit" variant="primary" disabled={upload.isPending}>
                <ScanLine aria-hidden="true" /> {upload.isPending ? 'Extracting fields…' : 'Upload and extract'}
              </Button>
              <Button disabled={upload.isPending} onClick={() => upload.mutate(undefined)}>Use sample invoice</Button>
            </div>
            {upload.isPending && (
              <>
                <p role="status" className="muted">Reading the invoice and checking it against the purchase order…</p>
                <div className="skeleton extraction-skeleton" aria-hidden="true" />
              </>
            )}
          </form>
        </Panel>
        <Panel title="Demo extraction" className="guidance-panel">
          <p>Try the sample invoice to see how a value of <strong className="mono">LKR 150,000.00</strong> is flagged against the purchase order for <strong className="mono">LKR 120,000.00</strong>.</p>
          <p>Extracted fields are simulated in this workspace. You can correct them before sending the invoice for review.</p>
        </Panel>
      </div>
    </div>
  )
}
