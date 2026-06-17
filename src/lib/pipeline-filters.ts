// Filter state for the FMC pipeline Kanban. Field names match the
// backend's GET /api/v1/leads/by-stage query params exactly — keep
// them in sync.
//
// All filters are optional; the backend silently ignores unknown
// params, so a typo here doesn't error — it just stops filtering.

export interface PipelineFilters {
  q?: string;
  agent_id?: string;
  source_id?: string;
  campaign_id?: string;
  // Numeric, in lakhs.
  loan_min?: string;
  loan_max?: string;
  bank_name?: string;
  bank_status?: string;
  // Admitverse-only filters. The backend ignores these on FMC and ignores
  // FMC's loan_*/bank_*/dnp_* on AV.
  application_status?: string;
  university?: string;
  // Budget range (AV). Free numbers; backend parses. Currency defaults to
  // "INR" server-side when omitted.
  budget_min?: string;
  budget_max?: string;
  budget_currency?: string;
  target_country?: string;
  target_intake?: string;
  // Comma-separated in state; serialized as repeated tags= params.
  tags?: string;
  // YYYY-MM-DD; backend handles parsing.
  created_from?: string;
  created_to?: string;
  due_from?: string;
  due_to?: string;
  // Integer.
  dnp_min?: string;
  dnp_max?: string;
  important_only?: "true" | "";
  // Sort: FMC uses "loan_asc"/"loan_desc" (low → high / high → low); AV uses
  // "budget_asc"/"budget_desc". Omitted = backend default (newest first).
  // Leads with no amount sort to the bottom — backend handles it.
  sort_by?: "loan_asc" | "loan_desc" | "budget_asc" | "budget_desc";
  // Admin-only segmentation filter — restricted-view roles only see
  // their own leads, so this filter is meaningless for them.
  lead_segment?:
    | "unassigned"
    | "counsellor"
    | "pre_counsellor"
    | "campaign";
}

export const LEAD_SEGMENT_LABELS: Record<
  NonNullable<PipelineFilters["lead_segment"]>,
  string
> = {
  unassigned: "Unassigned",
  counsellor: "Has Counsellor",
  pre_counsellor: "Has Pre-Counsellor",
  campaign: "In Campaign",
};

// All keys that are simple single-value scalar params (i.e. not the
// special-cased `tags` field).
const SCALAR_FILTER_KEYS: (keyof PipelineFilters)[] = [
  "q",
  "agent_id",
  "source_id",
  "campaign_id",
  "loan_min",
  "loan_max",
  "bank_name",
  "bank_status",
  "application_status",
  "university",
  "budget_min",
  "budget_max",
  "budget_currency",
  "target_country",
  "target_intake",
  "created_from",
  "created_to",
  "due_from",
  "due_to",
  "dnp_min",
  "dnp_max",
  "important_only",
  "sort_by",
  "lead_segment",
];

// All keys including `tags` — used for "any filter set?" checks.
export const PIPELINE_FILTER_KEYS: (keyof PipelineFilters)[] = [
  ...SCALAR_FILTER_KEYS,
  "tags",
];

// Tags helper: state stores them as a single comma-separated string
// (because the UI input is a text field), but the backend wants
// repeated ?tags=foo&tags=bar params. These functions translate.
function splitTagsState(tagsCsv: string | undefined): string[] {
  if (!tagsCsv) return [];
  return tagsCsv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Reads filter state from URL searchParams (or any string param
// reader). Special-cases `tags` to read all repeated values via
// getAll so deep-links with ?tags=x&tags=y survive.
export function parseFiltersFromParams(
  get: (key: string) => string | null,
  getAll?: (key: string) => string[]
): PipelineFilters {
  const f: PipelineFilters = {};
  for (const key of SCALAR_FILTER_KEYS) {
    const v = get(key);
    if (v == null || v === "") continue;
    if (key === "important_only") {
      f.important_only = v === "true" ? "true" : "";
    } else if (key === "sort_by") {
      if (
        v === "loan_asc" ||
        v === "loan_desc" ||
        v === "budget_asc" ||
        v === "budget_desc"
      )
        f.sort_by = v;
    } else if (key === "lead_segment") {
      if (
        v === "unassigned" ||
        v === "counsellor" ||
        v === "pre_counsellor" ||
        v === "campaign"
      ) {
        f.lead_segment = v;
      }
    } else {
      (f as Record<string, string>)[key] = v;
    }
  }
  const tagValues = getAll ? getAll("tags") : [];
  if (tagValues.length > 0) {
    f.tags = tagValues.join(",");
  }
  return f;
}

// Builds a URLSearchParams from filter state. Empty fields are
// skipped so the URL stays tight. `tags` is split on commas and
// appended once per value to match the backend's expected shape.
export function buildFilterSearchParams(
  filters: PipelineFilters
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of SCALAR_FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  for (const tag of splitTagsState(filters.tags)) {
    params.append("tags", tag);
  }
  return params;
}

// True if any filter field is set.
export function hasActiveFilters(filters: PipelineFilters): boolean {
  return PIPELINE_FILTER_KEYS.some((k) => {
    const v = filters[k];
    return v !== undefined && v !== null && v !== "";
  });
}

// Count of active filters — used for the "Filters (N)" button badge.
// Range pairs (loan/created/due/dnp) count as one filter each.
export function countActiveFilters(filters: PipelineFilters): number {
  let n = 0;
  const counted = new Set<keyof PipelineFilters>();
  const countOnce = (...keys: (keyof PipelineFilters)[]) => {
    if (keys.some((k) => (filters[k] ?? "") !== "")) {
      for (const k of keys) counted.add(k);
      n += 1;
    }
  };
  countOnce("loan_min", "loan_max");
  // budget_currency is a modifier on the budget range, not its own filter.
  countOnce("budget_min", "budget_max", "budget_currency");
  countOnce("created_from", "created_to");
  countOnce("due_from", "due_to");
  countOnce("dnp_min", "dnp_max");
  for (const k of PIPELINE_FILTER_KEYS) {
    if (counted.has(k)) continue;
    // sort_by is a sort, not a filter — don't count it.
    if (k === "sort_by") continue;
    const v = filters[k];
    if (v !== undefined && v !== null && v !== "") n += 1;
  }
  return n;
}
