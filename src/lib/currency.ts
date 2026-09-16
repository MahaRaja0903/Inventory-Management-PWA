/**
 * Indian Rupee formatting.
 *
 * `en-IN` groups by lakh/crore (1,23,456.00), which is what the studio's books use —
 * so this is a locale change, not just a symbol swap.
 */

export const CURRENCY_CODE = "INR";
export const CURRENCY_SYMBOL = "₹";

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `formatCurrency(1234.5)` -> "₹1,234.50". Non-numeric input renders as ₹0.00. */
export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value);
  return formatter.format(Number.isFinite(n) ? n : 0);
}

/** Same, without the decimals — for dense tiles and chart labels. */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const n = Number(value);
  return compactFormatter.format(Number.isFinite(n) ? n : 0);
}
