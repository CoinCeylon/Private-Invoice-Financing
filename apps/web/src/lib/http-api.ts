import type { InvoiceSummary, InvoiceVeilApi } from './api'
import { invoiceVeilApi as mockApi } from './mock-api'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `The server answered ${response.status}.`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

/**
 * Real backend for the methods the API already serves; everything else still goes to `fallback`.
 * Move one method at a time from the fallback to a real request.
 */
export function createHttpApi(fallback: InvoiceVeilApi, baseUrl = '/api'): InvoiceVeilApi {
  return {
    ...fallback,
    listInvoices: (role, signal) =>
      getJson<InvoiceSummary[]>(`${baseUrl}/invoices?role=${encodeURIComponent(role)}`, signal),
  }
}

// Set VITE_INVOICE_API=http to use the real API. The mock stays the default so the full demo keeps working
// until the remaining methods move to the server.
export const invoiceVeilApi: InvoiceVeilApi = import.meta.env.VITE_INVOICE_API === 'http'
  ? createHttpApi(mockApi)
  : mockApi
