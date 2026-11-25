import { AlertCircle, FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import type { InvoiceStatus } from '../../lib/api'
import { Button } from './button'

export function PageIntro({ title, description, action }: {
  title: ReactNode
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="page-intro workflow-intro">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </header>
  )
}

export function Panel({ title, subtitle, children, className = '' }: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`workflow-panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const pending: InvoiceStatus[] = ['Late', 'Payment instructed', 'Awaiting buyer review', 'Paid by buyer – awaiting lender']
  const variant = status === 'Defaulted' || status === 'Disputed' ? 'error'
    : pending.includes(status) ? 'pending'
      : status === 'Draft' || status === 'Slip uploaded' ? 'neutral' : 'verified'

  return <span className={`pill pill--${variant} workflow-status`}><span className="status-dot" aria-hidden="true" />{status}</span>
}

export function LoadingLedger({ label = 'Loading invoice data' }: { label?: string }) {
  return (
    <>
      <p className="sr-only" role="status">{label}</p>
      <div className="skeleton-stack" aria-hidden="true">
        <div className="skeleton heading-skeleton" />
        <div className="skeleton content-skeleton" />
        <div className="skeleton content-skeleton" />
      </div>
    </>
  )
}

export function LedgerMessage({ title, description, retry, pending }: {
  title: string
  description: string
  retry?: () => void
  pending?: boolean
}) {
  const Icon = retry ? AlertCircle : FileText

  return (
    <div className={`ledger-message ${retry ? 'ledger-message--error' : ''}`}>
      <Icon aria-hidden="true" />
      <div role={retry ? 'alert' : undefined}><h2>{title}</h2><p>{description}</p></div>
      {retry && <Button onClick={retry} disabled={pending}>{pending ? 'Retrying…' : 'Retry'}</Button>}
    </div>
  )
}

export function Notice({ tone = 'info', title, children }: {
  tone?: 'info' | 'warning' | 'error'
  title: string
  children?: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <AlertCircle aria-hidden="true" />
      <div><strong>{title}</strong>{children && <div>{children}</div>}</div>
    </div>
  )
}

export function Field({ label, name, error, hint, children }: {
  label: string
  name: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${name}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
