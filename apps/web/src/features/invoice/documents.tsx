import { FileText } from 'lucide-react'
import { Tabs } from 'radix-ui'
import { useLayoutEffect, useRef } from 'react'
import type { DocumentPreview, InvoiceDocuments } from '../../lib/api'
import { formatMoney } from '../../lib/money'

function FilePreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  const pdf = useRef<HTMLObjectElement>(null)
  const download = useRef<HTMLAnchorElement>(null)
  const isImage = /\.(png|jpe?g|webp)$/i.test(file.name)

  useLayoutEffect(() => {
    const url = URL.createObjectURL(isImage ? file : new Blob([file], { type: 'application/pdf' }))
    image.current?.setAttribute('src', url)
    pdf.current?.setAttribute('data', url)
    download.current?.setAttribute('href', url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <div className="uploaded-preview">
      {isImage
        ? <img ref={image} alt={`Preview of ${file.name}`} />
        : (
          <object ref={pdf} type="application/pdf" aria-label={`Preview of ${file.name}`}>
            <p>Use the download link to view this PDF.</p>
          </object>
        )}
      <a ref={download} className="text-link" download={file.name}>Download original document</a>
    </div>
  )
}

export function Document({ document, title }: { document: DocumentPreview; title: string }) {
  return (
    <figure className="document-preview">
      <figcaption><FileText aria-hidden="true" /><span>{document.name}</span></figcaption>
      {document.file ? <FilePreview file={document.file} /> : (
        <div className="document-paper">
          <p className="document-paper-title">{title}</p>
          <span className="mono document-number">{document.fields.invoiceNumber}</span>
          <dl>
            <div><dt>Supplier</dt><dd>Gampaha Packaging</dd></div>
            <div><dt>Buyer</dt><dd>Market Buyer</dd></div>
            <div><dt>Payment term</dt><dd>{document.fields.termDays} days</dd></div>
            <div><dt>Total</dt><dd className="mono">{formatMoney(document.fields.amount)}</dd></div>
          </dl>
        </div>
      )}
    </figure>
  )
}

export function DocumentTabs({ documents }: { documents: InvoiceDocuments }) {
  const tabs = [
    { value: 'invoice', label: 'Invoice', document: documents.invoice },
    { value: 'order', label: 'Purchase order', document: documents.purchaseOrder },
    { value: 'receipt', label: 'Delivery receipt', document: documents.deliveryReceipt },
  ]

  return (
    <Tabs.Root defaultValue="invoice" className="document-tabs">
      <Tabs.List className="tab-bar" aria-label="Invoice documents">
        {tabs.map(({ value, label }) => <Tabs.Trigger key={value} value={value}>{label}</Tabs.Trigger>)}
      </Tabs.List>
      {tabs.map(({ value, label, document }) => (
        <Tabs.Content key={value} value={value}><Document title={label} document={document} /></Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
