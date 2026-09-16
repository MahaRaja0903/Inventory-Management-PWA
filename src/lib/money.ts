/**
 * Server-side Indian Rupee formatting, for the text of generated notifications.
 * The browser-facing formatter lives in `src/lib/currency.ts`.
 */

export const CURRENCY_SYMBOL = "₹";

export function formatAmount(value: number | string | null | undefined): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `${CURRENCY_SYMBOL}${safe.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
