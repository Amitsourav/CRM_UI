/**
 * `loan_amount` is a string in **lakhs** ("17.5"), but legacy rows still hold
 * free text ("19 L", "20 lakh", "TBD"). Anything that parses as a leading
 * number is normalised to "₹17.5 L"; anything else is echoed back verbatim so
 * a human can still read it, rather than rendering "₹NaN L".
 */
export function formatLoanAmount(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "number") {
    return Number.isFinite(value) ? `₹${trimZeros(value)} L` : "—";
  }

  const text = value.trim();
  if (!text) return "—";

  // Leading number, optionally with commas — "17.5", "19 L", "1,20,000".
  const match = text.match(/^-?[\d,]*\.?\d+/);
  if (!match) return text;

  const parsed = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return text;

  // A trailing unit we don't understand ("19 Cr") is left alone — only bare
  // numbers and an explicit lakh suffix are safe to restate as lakhs.
  const rest = text.slice(match[0].length).trim();
  if (rest && !/^(l|lakh|lakhs|lac|lacs)\.?$/i.test(rest)) return text;

  return `₹${trimZeros(parsed)} L`;
}

function trimZeros(value: number): string {
  return String(Number(value.toFixed(2)));
}
