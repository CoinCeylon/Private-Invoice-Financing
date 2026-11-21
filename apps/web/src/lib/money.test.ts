import { describe, expect, it } from 'vitest'
import { amountIn, formatMoney, formatRate, parseMinorUnits } from './money'

describe('ledger money', () => {
  it('formats LKR, USD, and negative minor units with exact cents', () => {
    expect(formatMoney(amountIn('LKR', 12_000_000))).toBe('LKR\u00a0120,000.00')
    expect(formatMoney(amountIn('USD', 250_001))).toBe('USD\u00a02,500.01')
    expect(formatMoney(amountIn('LKR', -9))).toBe('-LKR\u00a00.09')
    expect(formatMoney(amountIn('USD', Number.MAX_SAFE_INTEGER))).toBe('USD\u00a090,071,992,547,409.91')
    expect(() => formatMoney(amountIn('USD', 12.5))).toThrow(RangeError)
  })

  it('converts decimals and rates without floating-point money arithmetic', () => {
    expect(parseMinorUnits('0.01')).toBe(1)
    expect(parseMinorUnits('120000.01')).toBe(12_000_001)
    expect(parseMinorUnits('2.5')).toBe(250)
    expect(parseMinorUnits('2.500')).toBeNull()
    expect(parseMinorUnits('90071992547409.92')).toBeNull()
    expect(formatRate(250)).toBe('2.5%')
  })
})
