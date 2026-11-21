import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Field, Notice, Panel } from '../../components/ui/ledger'
import type { BuyerInvoice } from '../../lib/api'
import { amountIn, decimalAmount, formatMoney, parseMinorUnits } from '../../lib/money'
import { DocumentTabs } from '../invoice/documents'
import { positiveAmount } from '../invoice/forms'
import type { InvoiceActions } from '../invoice/queries'

const schema = z.object({ amount: positiveAmount, accepted: z.boolean().refine(Boolean, 'Accept the terms to sign.') })

export function ApprovalReview({ invoice, actions }: { invoice: BuyerInvoice; actions: InvoiceActions }) {
  const { amount } = invoice.fields
  const { documents } = invoice
  const orderAmount = documents.purchaseOrder.fields.amount
  const receiptAmount = documents.deliveryReceipt.fields.amount
  const sameCurrency = amount.currency === orderAmount.currency && amount.currency === receiptAmount.currency
  const mismatch = !sameCurrency || amount.minorUnits !== orderAmount.minorUnits || amount.minorUnits !== receiptAmount.minorUnits
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: decimalAmount(amount), accepted: false },
  })

  return (
    <Panel title="Review and approve" subtitle="Check the invoice against the purchase order and delivery receipt before signing.">
      {mismatch && (
        <Notice tone="warning" title="Invoice total differs from supporting documents">
          Confirm the correct amount before you sign the approval.
        </Notice>
      )}
      <div className="review-grid">
        <DocumentTabs documents={documents} />
        <form className="form-stack" noValidate onSubmit={handleSubmit((values) => actions.run({
          type: 'approve',
          amount: amountIn(amount.currency, parseMinorUnits(values.amount) ?? 0),
          acceptedTerms: values.accepted,
        }))}>
          <dl className="ledger-fields">
            <div><dt>Invoice submitted</dt><dd className="mono">{formatMoney(amount)}</dd></div>
            <div><dt>Purchase order</dt><dd className="mono">{formatMoney(orderAmount)}</dd></div>
            <div><dt>Delivery receipt</dt><dd className="mono">{formatMoney(receiptAmount)}</dd></div>
          </dl>
          <Field label={`Approved amount in ${amount.currency}`} name="approved-amount" error={errors.amount?.message}>
            <input id="approved-amount" inputMode="decimal" className="mono"
              aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'approved-amount-error' : undefined}
              {...register('amount')} />
          </Field>
          {mismatch && sameCurrency && orderAmount.minorUnits === receiptAmount.minorUnits && (
            <Button variant="ghost" className="inline-action" onClick={() =>
              setValue('amount', decimalAmount(orderAmount), { shouldDirty: true, shouldValidate: true })
            }>Use purchase order amount</Button>
          )}
          <fieldset className="terms-box">
            <legend>Late-payment terms</legend>
            <p>A late payment can incur a penalty in addition to the approved invoice amount.</p>
            <label className="checkbox-label">
              <input type="checkbox" aria-invalid={Boolean(errors.accepted)}
                aria-describedby={errors.accepted ? 'late-terms-error' : undefined} {...register('accepted')} />
              I accept the late-payment terms
            </label>
            {errors.accepted && <p className="field-error" id="late-terms-error" role="alert">{errors.accepted.message}</p>}
          </fieldset>
          <div className="action-row">
            <Button type="submit" variant="primary" disabled={actions.busy}>{actions.busy ? 'Signing…' : 'Approve and sign'}</Button>
          </div>
        </form>
      </div>
    </Panel>
  )
}
