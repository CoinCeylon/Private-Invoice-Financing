export type Currency = "LKR" | "USD";

/** formatMinor(12000000, "LKR") -> "LKR 120,000.00" */
export function formatMinor(minor: number | bigint, currency: Currency = "LKR"): string {
  const value = BigInt(minor);
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = (abs / 100n).toLocaleString("en-US");
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${currency} ${whole}.${cents}`;
}