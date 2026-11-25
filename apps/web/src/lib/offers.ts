import type { Offer, QuoteTerms } from './api'
import { amountIn } from './money'
import type { Money } from './money'

export const platformFeeBps = 50

export function validQuote({ advanceBps, feeBps, recourseBps }: QuoteTerms): boolean {
  return [advanceBps, feeBps, recourseBps].every((rate) =>
    Number.isInteger(rate) && rate >= 0 && rate <= 10_000
  ) && advanceBps > 0 && advanceBps + feeBps <= 10_000
}

function applyRate(amount: Money, basisPoints: number): number {
  return Number((BigInt(amount.minorUnits) * BigInt(basisPoints) + 5_000n) / 10_000n)
}

export function calculateOffer(amount: Money, terms: QuoteTerms) {
  const { currency, minorUnits } = amount
  const fee = applyRate(amount, terms.feeBps)
  const advance = Math.min(applyRate(amount, terms.advanceBps), minorUnits - fee)
  return {
    advance: amountIn(currency, advance),
    fee: amountIn(currency, fee),
    balance: amountIn(currency, minorUnits - advance - fee),
    net: amountIn(currency, minorUnits - fee),
    platformFee: amountIn(currency, applyRate(amount, platformFeeBps)),
  }
}

export function bestOffer(amount: Money, offers: Offer[]): Offer | undefined {
  return offers.reduce<Offer | undefined>((best, offer) => {
    if (!best) return offer
    const candidate = calculateOffer(amount, offer)
    const current = calculateOffer(amount, best)
    return candidate.net.minorUnits > current.net.minorUnits ||
      (candidate.net.minorUnits === current.net.minorUnits &&
        candidate.advance.minorUnits > current.advance.minorUnits) ? offer : best
  }, undefined)
}
