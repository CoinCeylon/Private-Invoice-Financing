import { describe, expect, it } from 'vitest'
import { relativeDate } from './dates'
import { createMockApi } from './mock-api'
import { offerA, offerB, sampleId } from './mock-fixtures'
import { amountIn } from './money'

describe('mock invoice workflow', () => {
  it('withholds sealed terms from the buyer and opens documents only to the selected lender', async () => {
    const api = createMockApi({ latency: 0 })
    const buyer = await api.getInvoice('buyer', sampleId)
    expect(buyer?.status).toBe('Listed')
    expect(JSON.stringify(buyer)).not.toMatch(/feeBps|advanceBps|recourseBps|offers received|offer selected/i)
    expect(await api.getInvoice('lender-b', sampleId)).toMatchObject({
      amount: { visibility: 'hidden' }, ownOffer: offerB, financing: null, supplier: null,
    })

    const choices = await Promise.allSettled([
      api.act('supplier', sampleId, { type: 'select-offer', lender: 'lender-a' }),
      api.act('supplier', sampleId, { type: 'select-offer', lender: 'lender-b' }),
    ])
    expect(choices.map(({ status }) => status)).toEqual(['fulfilled', 'rejected'])
    expect(await api.getInvoice('lender-a', sampleId)).toMatchObject({
      amount: { visibility: 'visible', money: amountIn('LKR', 12_000_000) },
      ownOffer: offerA,
      financing: { commitmentVerified: true, documents: { invoice: { name: 'invoice-0042.pdf' } } },
    })
    expect(await api.getInvoice('lender-b', sampleId)).toMatchObject({
      amount: { visibility: 'hidden' }, ownOffer: offerB, financing: null,
    })
    expect(JSON.stringify(await api.getInvoice('buyer', sampleId)))
      .not.toMatch(/feeBps|advanceBps|recourseBps|offers received|offer selected/i)
  })

  it('requires lender confirmation after a successful slip match and waits for chain closure', async () => {
    let time = Date.parse('2026-11-21T12:00:00Z')
    const api = createMockApi({ latency: 0, now: () => time })
    const id = await api.uploadInvoice('supplier')

    expect(await api.getInvoice('buyer', id)).toBeNull()
    await api.act('supplier', id, {
      type: 'submit-for-review', fields: { invoiceNumber: 'GP-E2E', amount: amountIn('LKR', 15_000_000), termDays: 45 },
    })
    await api.act('buyer', id, { type: 'approve', amount: amountIn('LKR', 12_000_000), acceptedTerms: true })
    await api.act('supplier', id, { type: 'generate-proof' })
    expect(await api.getInvoice('supplier', id)).toMatchObject({ proof: 'commitment' })
    time += 5000
    expect(await api.getInvoice('supplier', id)).toMatchObject({ proof: 'complete', status: 'Eligible' })
    await api.act('supplier', id, { type: 'list' })
    await api.act('lender-a', id, { type: 'quote', terms: offerA })
    await api.act('supplier', id, { type: 'select-offer', lender: 'lender-a' })
    await expect(api.act('lender-b', id, { type: 'sign-pledge' })).rejects.toThrow()
    await api.act('lender-a', id, { type: 'sign-pledge' })
    await expect(api.act('lender-a', id, { type: 'sign-pledge' })).rejects.toThrow()
    await expect(api.act('lender-a', id, { type: 'send-advance' })).rejects.toThrow(/confirm/)
    time += 3100
    await api.act('lender-a', id, { type: 'send-advance' })
    await api.act('buyer', id, { type: 'instruct-payment' })
    await api.act('buyer', id, { type: 'upload-slip', source: { kind: 'demo', matches: false } })
    time += 1300
    expect(await api.getInvoice('buyer', id)).toMatchObject({ slip: { result: 'mismatch' }, confirmedPayment: null })
    await api.act('buyer', id, { type: 'upload-slip', source: { kind: 'demo', matches: true } })
    time += 1300
    expect(await api.getInvoice('buyer', id)).toMatchObject({
      slip: { result: 'match' }, status: 'Paid by buyer – awaiting lender', confirmedPayment: null,
    })
    await expect(api.act('lender-a', id, { type: 'send-balance' })).rejects.toThrow(/Confirm/)
    await api.act('lender-a', id, {
      type: 'confirm-payment', receipt: { amount: amountIn('LKR', 12_000_000), arrivalDate: relativeDate(0, time) },
    })
    await api.act('lender-a', id, { type: 'send-balance' })
    expect(await api.getInvoice('supplier', id)).toMatchObject({ status: 'Balance sent' })
    time += 3100
    expect(await api.getInvoice('supplier', id)).toMatchObject({ status: 'Closed', settlement: { closed: true } })
  })

  it('rejects a second pledge for a re-uploaded invoice reference', async () => {
    let time = Date.parse('2026-11-21T12:00:00Z')
    const api = createMockApi({ latency: 0, now: () => time })
    const id = await api.uploadInvoice('supplier')
    const amount = amountIn('LKR', 12_000_000)
    await api.act('supplier', id, {
      type: 'submit-for-review', fields: { invoiceNumber: ' gp-0029 ', amount, termDays: 45 },
    })
    await api.act('buyer', id, { type: 'approve', amount, acceptedTerms: true })
    await api.act('supplier', id, { type: 'generate-proof' })
    time += 5000
    await api.act('supplier', id, { type: 'list' })
    await api.act('lender-a', id, { type: 'quote', terms: offerA })
    await api.act('supplier', id, { type: 'select-offer', lender: 'lender-a' })

    await expect(api.act('lender-a', id, { type: 'sign-pledge' })).rejects.toThrow(/already financed/)
    expect(await api.getInvoice('supplier', id)).toMatchObject({ status: 'Offer selected' })
  })

  it('keeps the late penalty split and default fixture within their role views', async () => {
    const api = createMockApi({ latency: 0 })
    expect(await api.getInvoice('supplier', 'INV-2026-0037')).toMatchObject({
      status: 'Late', late: { days: 10, penalty: amountIn('LKR', 60_000) }, supplierPenalty: amountIn('LKR', 13_500),
    })
    expect(await api.getInvoice('lender-a', 'INV-2026-0037')).toMatchObject({
      financing: { lenderPenalty: amountIn('LKR', 46_500) },
    })
    expect(await api.getInvoice('lender-b', 'INV-2026-0029')).toMatchObject({ status: 'Defaulted' })
  })
})
