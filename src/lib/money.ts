/**
 * Rupee formatting for the reconciliation screens.
 *
 * The backend sends rupees and takes lakhs. Nothing here multiplies — the
 * conversion is the backend's, and a second one on this side would silently
 * inflate every figure by 100,000.
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** ₹30,00,000 — Indian grouping. Returns the dash for missing values. */
export function formatRupees(
  value: string | number | null | undefined,
  emptyAs = "—"
): string {
  const parsed = toNumber(value);
  if (parsed === null) return emptyAs;
  return INR.format(parsed);
}

/** Zero renders as ₹0 rather than a dash — "nothing received" is a fact. */
export function formatRupeesWithZero(
  value: string | number | null | undefined
): string {
  return toNumber(value) === null ? "—" : formatRupees(value);
}

export function rupeesToNumber(
  value: string | number | null | undefined
): number {
  return toNumber(value) ?? 0;
}

/** "1.50" → "1.5%". */
export function formatRate(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  return `${Number(parsed.toFixed(2))}%`;
}
