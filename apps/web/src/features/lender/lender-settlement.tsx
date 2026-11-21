import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { Field, Notice, Panel } from '../../components/ui/ledger'
import type { InvoiceStatus, LenderInvoice, PaymentInstruction } from '../../lib/api'
import { formatDate, relativeDate, validDay } from '../../lib/dates'
import { amountIn, decimalAmount, formatMoney, parseMinorUnits } from '../../lib/money'
import { SlipResult } from '../invoice/slip-result'
import { positiveAmount } from '../invoice/forms'
import type { InvoiceActions } from '../invoice/queries'

const settlementSchema = z.object({
  amount: positiveAmount,
  date: z.string().refine((value) => validDay(value) && value <= relativeDate(0), 'Enter a valid date on or before today.'),
})

function ConfirmTransfer({ payment, status, actions }: {
  payment: PaymentInstruction
  status: InvoiceStatus
  actions: InvoiceActions
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof settlementSchema>>({
    resolver: zodResolver(settlementSchema),
    defaultValues: { amount: decimalAmount(payment.amount), date: relativeDate(0) },
  })

  return (
    <form className="form-stack" noValidate onSubmit={handleSubmit((values) => actions.run({
      type: 'confirm-payment',
      receipt: {
        arrivalDate: values.date,
        amount: amountIn(payment.amount.currency, parseMinorUnits(values.amount) ?? 0),
      },
    }))}>
      <div className="field-grid">
        <Field label={`Amount received in ${payment.amount.currency}`} name="received-amount" error={errors.amount?.message}>
          <input id="received-amount" inputMode="decimal" className="mono" aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'received-amount-error' : undefined} {...register('amount')} />
        </Field>
        <Field label="Arrival date" name="arrival-date" error={errors.date?.message}>
          <input id="arrival-date" type="date" max={relativeDate(0)} aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'arrival-date-error' : undefined} {...register('date')} />
        </Field>
      </div>
      <div className="action-row">
        <Button type="submit" variant="primary" disabled={actions.busy}>{actions.busy ? 'Submitting…' : 'Confirm transfer received'}</Button>
        {status !== 'Disputed' && (
          <ConfirmDialog
            trigger={<Button disabled={actions.busy}>Report not received</Button>}
            title="Report payment not received?"
            description="This records a payment dispute. You can confirm the transfer if it arrives later."
            confirm="Report not received"
            onConfirm={() => actions.run({ type: 'report-not-received' })}
          />
        )}
      </div>
    </form>
  )
}

export function LenderSettlement({ invoice, financing, balance, actions }: {
  invoice: LenderInvoice
  financing: NonNullable<LenderInvoice['financing']>
  balance: string
  actions: InvoiceActions
}) {
  const { payment, receipt, slip } = financing
  const canConfirm = payment && !receipt && slip?.result !== 'pending' && invoice.status !== 'Defaulted'

  return (
    <Panel title="Settlement" subtitle={receipt ? undefined : "Check your bank account before confirming the buyer’s transfer."}>
      {!payment && <Notice title="Waiting for payment instructions">The buyer can retrieve the instructions after the advance is sent.</Notice>}
      {slip && <SlipResult slip={slip} />}
      {canConfirm && <ConfirmTransfer payment={payment} status={invoice.status} actions={actions} />}
      {receipt && <Notice title="Transfer confirmed">
        <span className="mono">{formatMoney(receipt.amount)}</span> received on {formatDate(receipt.arrivalDate)}.
      </Notice>}
      {invoice.status === 'Payment confirmed' && (
        <ConfirmDialog
          trigger={<Button variant="primary" disabled={actions.busy}>Send balance</Button>}
          title="Send the supplier balance?"
          description={`Record ${balance} as the balance sent to the supplier and submit the invoice closure to Cardano.`}
          confirm="Record balance sent"
          onConfirm={() => actions.run({ type: 'send-balance' })}
        />
      )}
      {invoice.status === 'Balance sent' && <p className="muted" role="status">Balance sent. Waiting for Cardano to confirm closure.</p>}
    </Panel>
  )
}
