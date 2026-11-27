// Money rules shared by every module. Amounts are integer minor units (cents), never floats.

export const currencies = ["LKR", "USD"] as const;
export type Currency = (typeof currencies)[number];

/** Same shape as `Money` in apps/web/src/lib/money.ts. `minorUnits` must be a safe integer. */
export interface Money {
  minorUnits: number;
  currency: Currency;
}

export function isCurrency(value: unknown): value is Currency {
  return currencies.some((currency) => currency === value);
}

/** formatMinor(12000000, "LKR") -> "LKR 120,000.00" */
export function formatMinor(minor: number | bigint, currency: Currency = "LKR"): string {
  const value = BigInt(minor);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = (abs / 100n).toLocaleString("en-US");
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${currency} ${whole}.${cents}`;
}

/** Basis points: 10000 bps = 100%. Rounds down to whole minor units. */
export function applyBps(minor: bigint, bps: number): bigint {
  if (!Number.isInteger(bps)) throw new RangeError("Basis points must be an integer.");
  return (minor * BigInt(bps)) / 10_000n;
}
