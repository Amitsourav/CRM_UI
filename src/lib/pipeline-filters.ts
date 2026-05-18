// Filter state for the FMC pipeline Kanban. Each field corresponds
// to a query-string param on /leads (currently) — backend accepts
// these and returns the same paginated shape. URL is the source of
// truth so deep links like /pipeline?loan_min=20&loan_max=50 work.

export interface PipelineFilters {
  q?: string;
  agent_id?: string;
  source_id?: string;
  campaign_id?: string;
  loan_min?: string; // numeric, lakhs
  loan_max?: string;
  country?: string;
  intake?: string;
  bank?: string;
  // Comma-separated list of tag strings.
  tags?: string;
  // YYYY-MM-DD; backend handles parsing.
  created_after?: string;
  created_before?: string;
  due_after?: string;
  due_before?: string;
  is_important?: "true" | "";
}

export const PIPELINE_FILTER_KEYS: (keyof PipelineFilters)[] = [
  "q",
  "agent_id",
  "source_id",
  "campaign_id",
  "loan_min",
  "loan_max",
  "country",
  "intake",
  "bank",
  "tags",
  "created_after",
  "created_before",
  "due_after",
  "due_before",
  "is_important",
];

// Reads filter state from URL searchParams (or any string param
// reader). Returns only fields that are present and non-empty.
export function parseFiltersFromParams(
  get: (key: string) => string | null
): PipelineFilters {
  const f: PipelineFilters = {};
  for (const key of PIPELINE_FILTER_KEYS) {
    const v = get(key);
    if (v == null || v === "") continue;
    if (key === "is_important") {
      f.is_important = v === "true" ? "true" : "";
    } else {
      (f as Record<string, string>)[key] = v;
    }
  }
  return f;
}

// Builds a URLSearchParams from filter state — empty fields are
// skipped so the URL doesn't carry noise.
export function buildFilterSearchParams(
  filters: PipelineFilters
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of PIPELINE_FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
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

// Count of active filters (used for the "Filters (N)" button badge).
export function countActiveFilters(filters: PipelineFilters): number {
  let n = 0;
  for (const k of PIPELINE_FILTER_KEYS) {
    const v = filters[k];
    if (v === undefined || v === null || v === "") continue;
    // loan_min + loan_max count as one "Budget" filter.
    if (k === "loan_max" && (filters.loan_min ?? "") !== "") continue;
    // The created/due range pairs each count as one.
    if (k === "created_before" && (filters.created_after ?? "") !== "") continue;
    if (k === "due_before" && (filters.due_after ?? "") !== "") continue;
    n += 1;
  }
  return n;
}
