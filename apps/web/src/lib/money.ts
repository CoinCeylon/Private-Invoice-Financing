export type Currency = 'LKR' | 'USD'

export interface Money {
  minorUnits: number
  currency: Currency
}

const formatters = {
  LKR: createFormatter('LKR'),
  USD: createFormatter('USD'),
}

function createFormatter(currency: Currency) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  })
}

export function formatMoney({ minorUnits, currency }: Money): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new RangeError('Money must contain a safe integer number of minor units.')
  }

  const cents = BigInt(minorUnits)
  const whole = cents / 100n
  const remainder = cents % 100n
  const fraction = (remainder < 0n ? -remainder : remainder).toString().padStart(2, '0')
  // Preserve the minus sign when the amount is less than one major unit.
  const signedWhole = whole === 0n && cents < 0n ? -0 : whole

  return formatters[currency].formatToParts(signedWhole)
    .map((part) => part.type === 'fraction' ? fraction : part.value)
    .join('')
}

export function parseMinorUnits(text: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!match) return null

  const units = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))
  return units <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(units) : null
}

export function decimalAmount({ minorUnits }: Money): string {
  const units = BigInt(minorUnits)
  const absolute = units < 0n ? -units : units
  return `${units < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

export function formatRate(basisPoints: number): string {
  const whole = Math.trunc(basisPoints / 100)
  const fractional = String(basisPoints % 100).padStart(2, '0').replace(/0+$/, '')
  return `${whole}${fractional ? `.${fractional}` : ''}%`
}

export function amountIn(currency: Currency, minorUnits: number): Money {
  return { currency, minorUnits }
}
