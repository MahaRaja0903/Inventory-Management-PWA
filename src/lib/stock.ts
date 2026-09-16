import { StockStatus } from "../types";

/**
 * Stock status is derived from quantity, never stored independently.
 *
 * It used to be whatever the caller happened to send, which meant items created
 * through the app were stamped "Out of Stock" regardless of quantity and never moved
 * off it as stock was sold down.
 */
export const LOW_STOCK_THRESHOLD = 5;

export function deriveStockStatus(quantity: number | string | null | undefined): StockStatus {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return "Out of Stock";
  if (qty <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}
