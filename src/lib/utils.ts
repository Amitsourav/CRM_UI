import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an FMC loan_amount (a plain numeric string in Lakhs).
 * - "30.00" → { display: "30" } (strips trailing .00)
 * - "30.5"  → { display: "30.5" } (keeps meaningful decimals)
 * - "300"   → { display: "300", crore: "3" } (≥100 → also crore equivalent)
 * - null / non-numeric → { display: "—" } (or raw string if non-empty)
 */
// Per-tenant lead serial — "#6,313" when set, null when missing.
export function formatLeadSerial(
  serial: number | null | undefined
): string | null {
  if (serial == null || !Number.isFinite(serial)) return null;
  return `#${serial.toLocaleString()}`;
}

export function formatLakhs(
  raw?: string | null
): { display: string; crore?: string } {
  if (raw == null) return { display: "—" };
  const trimmed = String(raw).trim();
  if (!trimmed) return { display: "—" };
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return { display: trimmed };
  // Number() strips trailing zeros after decimal; toFixed(2) caps precision.
  const display = String(Number(n.toFixed(2)));
  if (n >= 100) {
    const crore = String(Number((n / 100).toFixed(2)));
    return { display, crore };
  }
  return { display };
}
