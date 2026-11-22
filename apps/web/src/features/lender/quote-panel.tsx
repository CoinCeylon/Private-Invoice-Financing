import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Field, LedgerMessage, Panel } from '../../components/ui/ledger'
import type { LenderInvoice } from '../../lib/api'
import { formatRate, parseMinorUnits } from '../../lib/money'
import { rate } from '../invoice/forms'
import type { InvoiceActions } from '../invoice/queries'

const schema = z.object({
  advance: rate.refine((value) => (parseMinorUnits(value) ?? 0) > 0, 'Enter an advance greater than 0%.'),
  fee: rate,
  recourse: rate,
}).refine(({ advance, fee }) => (parseMinorUnits(advance) ?? 0) + (parseMinorUnits(fee) ?? 0) <= 10_000, {
  path: ['fee'], message: 'Advance and fee together cannot exceed 100%.',
})

const quoteFields = [
  { name: 'advance', label: 'Advance (%)' },
  { name: 'fee', label: 'Fee (%)' },
  { name: 'recourse', label: 'Recourse share (%)' },
] as const

export function QuotePanel({ invoice, actions }: { invoice: LenderInvoice; actions: InvoiceActions }) {
  const offer = invoice.ownOffer
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: offer ? {
      advance: formatRate(offer.advanceBps).slice(0, -1),
      fee: formatRate(offer.feeBps).slice(0, -1),
      recourse: formatRate(offer.recourseBps).slice(0, -1),
    } : { advance: '', fee: '', recourse: '50' },
  })

  return (
    <Panel title="Sealed quote" subtitle="The supplier can compare your quote with the quotes they receive.">
      {offer && (
        <dl className="quote-summary">
          <div><dt>Advance</dt><dd className="mono">{formatRate(offer.advanceBps)}</dd></div>
          <div><dt>Fee</dt><dd className="mono">{formatRate(offer.feeBps)}</dd></div>
          <div><dt>Recourse share</dt><dd className="mono">{formatRate(offer.recourseBps)}</dd></div>
        </dl>
      )}
      {invoice.canQuote ? (
        <form className="form-stack" noValidate onSubmit={handleSubmit((values) => actions.run({
          type: 'quote',
          terms: {
            advanceBps: parseMinorUnits(values.advance) ?? 0,
            feeBps: parseMinorUnits(values.fee) ?? 0,
            recourseBps: parseMinorUnits(values.recourse) ?? 0,
          },
        }))}>
          <div className="quote-field-grid">
            {quoteFields.map(({ name, label }) => (
              <Field key={name} label={label} name={`quote-${name}`} error={errors[name]?.message}>
                <input id={`quote-${name}`} inputMode="decimal" className="mono"
                  aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `quote-${name}-error` : undefined}
                  {...register(name)} />
              </Field>
            ))}
          </div>
          <div className="action-row">
            <Button variant="primary" type="submit" disabled={actions.busy}>
              <LockKeyhole aria-hidden="true" /> {actions.busy ? 'Sealing…' : offer ? 'Update sealed quote' : 'Send sealed quote'}
            </Button>
          </div>
        </form>
      ) : !offer && <LedgerMessage title="Quote window closed" description="This invoice is no longer accepting quotes." />}
    </Panel>
  )
}
