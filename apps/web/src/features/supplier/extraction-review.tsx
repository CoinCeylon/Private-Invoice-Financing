import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Field, Notice, Panel } from '../../components/ui/ledger'
import { amountIn, decimalAmount, formatMoney, parseMinorUnits } from '../../lib/money'
import type { SupplierInvoice } from '../../lib/api'
import { Document } from '../invoice/documents'
import { positiveAmount } from '../invoice/forms'
import type { InvoiceActions } from '../invoice/queries'

const schema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Enter the invoice number.').max(50),
  amount: positiveAmount,
  currency: z.enum(['LKR', 'USD']),
  term: z.string().refine((value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 365,
    'Enter a term between 1 and 365 days.'),
})

export function ExtractionReview({ invoice, actions }: { invoice: SupplierInvoice; actions: InvoiceActions }) {
  const { fields, documents } = invoice
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceNumber: fields.invoiceNumber,
      amount: decimalAmount(fields.amount),
      currency: fields.amount.currency,
      term: String(fields.termDays),
    },
  })

  const extracted = documents.invoice.fields.amount
  const expected = documents.purchaseOrder.fields.amount
  const difference = Math.abs(extracted.minorUnits - expected.minorUnits)

  return (
    <Panel title="Review extracted fields" subtitle="Check the simulated extraction before sending it to the buyer.">
      {difference > 0 && extracted.currency === expected.currency && (
        <Notice tone="warning" title={`${formatMoney(amountIn(expected.currency, difference))} difference`}>
          The extracted invoice total differs from the purchase order total of <span className="mono">{formatMoney(expected)}</span>.
        </Notice>
      )}
      <div className="review-grid">
        <Document document={documents.invoice} title="Invoice" />
        <form className="form-stack" noValidate onSubmit={handleSubmit((value) => actions.run({
          type: 'submit-for-review',
          fields: {
            invoiceNumber: value.invoiceNumber,
            amount: amountIn(value.currency, parseMinorUnits(value.amount) ?? 0),
            termDays: Number(value.term),
          },
        }))}>
          <Field label="Invoice number" name="invoice-number" error={errors.invoiceNumber?.message}>
            <input id="invoice-number" aria-invalid={Boolean(errors.invoiceNumber)} aria-describedby={errors.invoiceNumber ? 'invoice-number-error' : undefined} {...register('invoiceNumber')} />
          </Field>
          <div className="field-grid">
            <Field label="Currency" name="invoice-currency" error={errors.currency?.message}>
              <select id="invoice-currency" {...register('currency')}><option>LKR</option><option>USD</option></select>
            </Field>
            <div className={documents.lowConfidence.includes('amount') ? 'low-confidence' : undefined}>
              <Field label="Invoice amount" name="invoice-amount" error={errors.amount?.message}
                hint={documents.lowConfidence.includes('amount') ? 'Low confidence' : undefined}>
                <input id="invoice-amount" inputMode="decimal" className="mono" aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? 'invoice-amount-error' : documents.lowConfidence.includes('amount') ? 'invoice-amount-hint' : undefined}
                  {...register('amount')} />
              </Field>
            </div>
          </div>
          <Field label="Payment term in days" name="invoice-term" error={errors.term?.message}>
            <input id="invoice-term" inputMode="numeric" aria-invalid={Boolean(errors.term)} aria-describedby={errors.term ? 'invoice-term-error' : undefined} {...register('term')} />
          </Field>
          <div className="action-row">
            <Button variant="primary" type="submit" disabled={actions.busy}>
              {actions.busy ? 'Sending…' : 'Send for buyer review'}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  )
}
