import { expect, it, vi } from 'vitest'
import { createMockApi } from '../../lib/mock-api'
import { offerA, sampleId } from '../../lib/mock-fixtures'

it('shows the recorded lender and bank details without exposing fees, quotes, or advance rates', async () => {
  let time = Date.parse('2026-11-21T12:00:00Z')
  const api = createMockApi({ latency: 0, now: () => time })
  await api.act('supplier', sampleId, { type: 'select-offer', lender: offerA.lender })
  await api.act(offerA.lender, sampleId, { type: 'sign-pledge' })
  time += 3100
  await api.act(offerA.lender, sampleId, { type: 'send-advance' })
  await api.act('buyer', sampleId, { type: 'instruct-payment' })
  const invoice = await api.getInvoice('buyer', sampleId)
  if (invoice?.viewer !== 'buyer') throw new Error('Buyer fixture is missing.')

  // Initialize the DOM inside the test so its cold start does not block the worker handshake.
  const { Window } = await import('happy-dom')
  const window = new Window()
  vi.stubGlobal('window', window)
  vi.stubGlobal('document', window.document)
  vi.stubGlobal('getComputedStyle', window.getComputedStyle.bind(window))
  vi.stubGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window))
  vi.stubGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window))
  try {
    const { cleanup, render, within } = await import('@testing-library/react/pure')
    const { BuyerWorkflow } = await import('./buyer-workflow')
    try {
      const { container } = render(<BuyerWorkflow invoice={invoice} actions={{ run: vi.fn(), busy: false, error: undefined }} />)
      const ui = within(container)

      expect(ui.getByRole('heading', { name: 'Payment instructions' })).toBeTruthy()
      expect(ui.getByText('Lender A')).toBeTruthy()
      expect(ui.getByRole('button', { name: 'Copy payment reference' })).toBeTruthy()
      expect(container.textContent).not.toMatch(/fee|offers?|recourse|75%|2\.5%/i)
    } finally {
      cleanup()
    }
  } finally {
    vi.unstubAllGlobals()
    window.close()
  }
}, 120_000)
