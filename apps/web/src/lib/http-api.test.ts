import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './http-api'
import { createMockApi } from './mock-api'
import type { InvoiceSummary } from './api'

const summary: InvoiceSummary = {
  id: 'INV-2026-0042',
  buyer: 'Market Buyer',
  supplier: 'Gampaha Packaging',
  amount: { visibility: 'visible', money: { minorUnits: 12_000_000, currency: 'LKR' } },
  currency: 'LKR',
  termDays: 45,
  status: 'Awaiting buyer review',
  provenMinimum: null,
  needsUpdate: false,
}

describe('http invoice api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists invoices from the server for the active role', async () => {
    const fetch = vi.fn(async () => Response.json([summary]))
    vi.stubGlobal('fetch', fetch)

    const api = createHttpApi(createMockApi({ latency: 0 }))
    expect(await api.listInvoices('buyer')).toEqual([summary])
    expect(fetch).toHaveBeenCalledWith('/api/invoices?role=buyer', expect.anything())
  })

  it('shows the server error message when a request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Unknown role.' }, { status: 400 })))
    await expect(createHttpApi(createMockApi({ latency: 0 })).listInvoices('buyer')).rejects.toThrow('Unknown role.')
  })

  it('still uses the fallback for methods the server does not serve yet', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const api = createHttpApi(createMockApi({ latency: 0 }))
    expect(await api.getInvoice('supplier', 'INV-2026-0042')).toMatchObject({ id: 'INV-2026-0042' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
