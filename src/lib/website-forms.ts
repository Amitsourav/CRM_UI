// Presentation helpers for the Website Leads inbox.
//
// Two rules govern this file:
//
//  1. `form_name` from the API is the source of truth for labels. Nothing
//     here invents a display name — the maps below only drive chip *colour*
//     and grouping, so a brand can ship a new form without a frontend change.
//  2. Payload keys are rendered generically. The lists here only improve the
//     ordering and labelling of keys we happen to know about; unknown keys
//     still render, just alphabetically after the known ones.

import type { WebsiteSubmissionStatus } from "@/types";

/* ── Form chips ── */

// The two highest-intent forms across both brands: a submitted loan
// application and a booked DMAT mock. These are near-certain real leads, so
// they get a distinct amber chip that reads differently from the blue/violet
// enquiry forms at a glance.
const HIGH_INTENT_FORM_KEYS: ReadonlySet<string> = new Set([
  "fmc_loan_application",
  "av_dmat_mock",
]);

const HIGH_INTENT_CHIP =
  "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800";

// Admitverse forms — violet family.
const AV_FORM_KEYS: ReadonlySet<string> = new Set([
  "av_contact",
  "av_homepage",
  "av_mobile_popup",
  "av_gdpi",
  "av_gdpi_hero",
  "av_germany",
  "av_dmat_mock",
]);

const AV_CHIP =
  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900";

// FundMyCampus forms — blue family.
const FMC_FORM_KEYS: ReadonlySet<string> = new Set([
  "fmc_contact",
  "fmc_hero_modal",
  "fmc_eligibility",
  "fmc_landing",
  "fmc_signup",
  "fmc_loan_application",
]);

const FMC_CHIP =
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900";

// Anything unrecognised — a form shipped on the site before this list was
// updated. Neutral, still legible.
const UNKNOWN_CHIP =
  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

/** Tailwind classes for a form chip. Colour only — the label is `form_name`. */
export function getFormChipClasses(formKey: string): string {
  if (HIGH_INTENT_FORM_KEYS.has(formKey)) return HIGH_INTENT_CHIP;
  if (AV_FORM_KEYS.has(formKey)) return AV_CHIP;
  if (FMC_FORM_KEYS.has(formKey)) return FMC_CHIP;
  return UNKNOWN_CHIP;
}

export function isHighIntentForm(formKey: string): boolean {
  return HIGH_INTENT_FORM_KEYS.has(formKey);
}

/* ── Status badges ── */

export const SUBMISSION_STATUS_LABELS: Record<WebsiteSubmissionStatus, string> =
  {
    new: "New",
    converted: "Converted",
    duplicate: "Duplicate",
    spam: "Spam",
  };

export const SUBMISSION_STATUS_CLASSES: Record<WebsiteSubmissionStatus, string> =
  {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    converted: "bg-green-100 text-green-800 border-green-300",
    duplicate: "bg-amber-50 text-amber-800 border-amber-200",
    spam: "bg-slate-100 text-slate-600 border-slate-200",
  };

/* ── Payload rendering ── */

// Keys given dedicated UI in the drawer, so they're skipped by the generic
// definition list to avoid showing the same value twice.
export const PAYLOAD_KEYS_RENDERED_SEPARATELY: ReadonlySet<string> = new Set([
  "admin_url", // → "Open in FMC admin" button
  "phone_raw", // → prominent callout (the only contact number we have)
]);

// Preferred display order for keys we know about. Anything not listed sorts
// alphabetically after these — new form fields still appear, just at the end.
const PAYLOAD_KEY_ORDER: string[] = [
  // FMC loan application — the meat of the record.
  "loan_amount",
  "loan_type",
  "loan_status",
  "target_country",
  "target_college",
  "course_name",
  "has_collateral",
  // Admitverse enquiry fields.
  "interested_country",
  "study_level",
  "subject",
  "package",
  "intake",
  "preferred_time",
  "referred_by",
  // Attribution / plumbing — useful but low signal, so last.
  "landing_source",
  "referral_code",
  "submitted_at",
  "session_id",
  "fmc_user_id",
  "fmc_loan_id",
  "website_lead_id",
];

// Acronyms that Title Case would otherwise mangle ("Gdpi", "Dmat", "Url").
const ACRONYMS: Record<string, string> = {
  id: "ID",
  url: "URL",
  utm: "UTM",
  dmat: "DMAT",
  gdpi: "GDPI",
  cas: "CAS",
  fmc: "FMC",
  av: "AV",
};

/** `interested_country` → "Interested Country"; `fmc_loan_id` → "FMC Loan ID". */
export function payloadKeyLabel(key: string): string {
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Orders payload entries for display and drops the ones with dedicated UI.
 * Empty values are kept — "the form asked and the visitor left it blank" is
 * itself information during triage.
 */
export function orderedPayloadEntries(
  payload: Record<string, unknown> | null | undefined
): Array<[string, unknown]> {
  if (!payload) return [];
  const entries = Object.entries(payload).filter(
    ([key]) => !PAYLOAD_KEYS_RENDERED_SEPARATELY.has(key)
  );
  const rank = (key: string) => {
    const i = PAYLOAD_KEY_ORDER.indexOf(key);
    return i === -1 ? PAYLOAD_KEY_ORDER.length : i;
  };
  return entries.sort(([a], [b]) => {
    const byRank = rank(a) - rank(b);
    return byRank !== 0 ? byRank : a.localeCompare(b);
  });
}

/**
 * Renders an arbitrary payload value as a string. Forms post whatever they
 * like, so this has to survive booleans, numbers, nulls, arrays and nested
 * objects without throwing.
 */
export function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) {
    return value.length === 0
      ? "—"
      : value.map((v) => formatPayloadValue(v)).join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** True for values worth rendering as a clickable link in the payload list. */
export function isUrlValue(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}
