/**
 * Frappe returns datetimes as `YYYY-MM-DD HH:mm:ss.ffffff` — a space separator and
 * microsecond precision. `new Date(...)` tolerates that in Chrome but not in Safari,
 * which matters for a PWA that is mostly used from phones. Normalising to ISO first
 * makes parsing behave the same everywhere, and a missing value renders as an em dash
 * rather than "Invalid Date".
 */

const PLACEHOLDER = "—";

export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "2026-09-01 13:11:44.452192" -> "2026-09-01T13:11:44.452"
  const normalised = String(value)
    .trim()
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+$/, "$1");

  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTime(value: string | number | Date | null | undefined): number {
  return parseDate(value)?.getTime() ?? 0;
}

export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString(undefined, options) : PLACEHOLDER;
}

export function formatTime(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  const d = parseDate(value);
  return d ? d.toLocaleTimeString(undefined, options) : PLACEHOLDER;
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  return d
    ? d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : PLACEHOLDER;
}
