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

/**
 * Renders a figure the backend has already converted to lakhs. Accepts the
 * string-or-number both money shapes arrive in.
 */
export function formatLakhs(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return `${trimZeros(parsed)} L`;
}

/**
 * What to show in a lead's loan column.
 *
 * A lender that has paid its processing fee has committed a real figure, so
 * it wins over the student's asking number — and there can be more than one.
 * Most rows have none, including leads moved to `pf_paid` before the bank
 * became mandatory, so the asking figure is the ordinary fallback.
 */
export function formatCommittedLoan(
  askingAmount: string | number | null | undefined,
  pfPaidBanks: Array<{ bank_name: string; loan_amount_lakh: number | string }> | undefined
): string {
  if (pfPaidBanks?.length) {
    return pfPaidBanks
      .map((b) => `${formatLakhs(b.loan_amount_lakh)} (${b.bank_name})`)
      .join(", ");
  }
  return formatLoanAmount(askingAmount);
}
