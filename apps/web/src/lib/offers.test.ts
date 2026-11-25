import { describe, expect, it } from 'vitest'
import { amountIn } from './money'
import { offerA, offerB } from './mock-fixtures'
import { bestOffer, calculateOffer } from './offers'

describe('offer comparison', () => {
  const amount = amountIn('LKR', 12_000_000)

  it('includes the closing balance and keeps the platform fee on the lender side', () => {
    expect(calculateOffer(amount, offerA)).toEqual({
      advance: amountIn('LKR', 9_000_000),
      fee: amountIn('LKR', 300_000),
      balance: amountIn('LKR', 2_700_000),
      net: amountIn('LKR', 11_700_000),
      platformFee: amountIn('LKR', 60_000),
    })
    expect(calculateOffer(amount, offerB)).toMatchObject({
      advance: amountIn('LKR', 8_400_000),
      fee: amountIn('LKR', 360_000),
      balance: amountIn('LKR', 3_240_000),
      net: amountIn('LKR', 11_640_000),
    })
    expect(bestOffer(amount, [offerB, offerA])).toBe(offerA)
  })

  it('settles USD and handles a rounding tie at the invoice ceiling', () => {
    expect(calculateOffer(amountIn('USD', 250_000), { advanceBps: 8000, feeBps: 200, recourseBps: 5000 })).toMatchObject({
      advance: amountIn('USD', 200_000),
      fee: amountIn('USD', 5_000),
      balance: amountIn('USD', 45_000),
      net: amountIn('USD', 245_000),
    })
    expect(calculateOffer(amountIn('USD', 1), {
      advanceBps: 5000, feeBps: 5000, recourseBps: 5000,
    }).balance.minorUnits).toBe(0)
  })
})
