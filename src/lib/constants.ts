import type {
  BankStatus,
  CallDisposition,
  LeadStage,
  TaskStatus,
  TaskType,
} from "@/types";

export type StageConfigEntry = {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  order: number;
};

export type CompanySlug = "fundmycampus" | "admitverse";

export const ADMITVERSE_SLUG = "admitverse";

const FMC_STAGES_LIST: LeadStage[] = [
  "created",
  "contacted",
  "dnp",
  "qualified",
  "processing",
  "docs_pending",
  "logged_in",
  "sanctioned",
  "pf_paid",
  "disbursed",
  "opportunity",
  "lost",
];

const ADMITVERSE_STAGES_LIST: LeadStage[] = [
  "created",
  "contacted",
  "dnp_pre_qualified",
  "connected",
  "qualified",
  "opportunity",
  "dnp_post_qualified",
  "processing",
  "important",
  "partial_docs_collected",
  "docs_collected",
  "application_done",
  "conditional_draft",
  "ucol",
  "deposit_paid",
  "cas_received",
  "visa_applied",
  "enrolled",
  "lost",
];

const FMC_STAGE_CONFIG: Partial<Record<LeadStage, StageConfigEntry>> = {
  // Active 12-stage FMC pipeline (post-2026-05 revamp).
  created: { label: "Created", color: "bg-slate-500", bgClass: "bg-slate-100", textClass: "text-slate-700", order: 0 },
  contacted: { label: "Contacted", color: "bg-blue-400", bgClass: "bg-blue-50", textClass: "text-blue-700", order: 1 },
  dnp: { label: "DNP", color: "bg-orange-500", bgClass: "bg-orange-100", textClass: "text-orange-700", order: 2 },
  qualified: { label: "Qualified", color: "bg-indigo-500", bgClass: "bg-indigo-100", textClass: "text-indigo-700", order: 3 },
  processing: { label: "Processing", color: "bg-indigo-600", bgClass: "bg-indigo-100", textClass: "text-indigo-800", order: 4 },
  docs_pending: { label: "Docs Pending", color: "bg-amber-500", bgClass: "bg-amber-100", textClass: "text-amber-800", order: 5 },
  logged_in: { label: "Logged In", color: "bg-cyan-500", bgClass: "bg-cyan-100", textClass: "text-cyan-800", order: 6 },
  sanctioned: { label: "Sanctioned", color: "bg-teal-500", bgClass: "bg-teal-100", textClass: "text-teal-700", order: 7 },
  pf_paid: { label: "PF Paid", color: "bg-emerald-500", bgClass: "bg-emerald-100", textClass: "text-emerald-700", order: 8 },
  disbursed: { label: "Disbursed", color: "bg-green-700", bgClass: "bg-green-200", textClass: "text-green-900", order: 9 },
  opportunity: { label: "Opportunity", color: "bg-purple-400", bgClass: "bg-purple-50", textClass: "text-purple-700", order: 10 },
  lost: { label: "Lost", color: "bg-red-500", bgClass: "bg-red-100", textClass: "text-red-700", order: 11 },
  // Legacy FMC stages (kept so historical stage_log badges still render with a
  // sensible label/color; not in FMC_STAGES_LIST so they don't render as columns).
  lead: { label: "New Lead", color: "bg-slate-500", bgClass: "bg-slate-100", textClass: "text-slate-700", order: 100 },
  called: { label: "Called", color: "bg-blue-500", bgClass: "bg-blue-100", textClass: "text-blue-700", order: 101 },
  connected: { label: "Connected", color: "bg-yellow-500", bgClass: "bg-yellow-100", textClass: "text-yellow-700", order: 102 },
  qualified_lead: { label: "Qualified (legacy)", color: "bg-purple-500", bgClass: "bg-purple-100", textClass: "text-purple-700", order: 103 },
  won: { label: "Won", color: "bg-green-500", bgClass: "bg-green-100", textClass: "text-green-700", order: 104 },
};

const ADMITVERSE_STAGE_CONFIG: Partial<Record<LeadStage, StageConfigEntry>> = {
  created: { label: "Created", color: "bg-gray-400", bgClass: "bg-gray-100", textClass: "text-gray-700", order: 0 },
  contacted: { label: "Contacted", color: "bg-blue-400", bgClass: "bg-blue-50", textClass: "text-blue-700", order: 1 },
  dnp_pre_qualified: { label: "DNP", color: "bg-orange-400", bgClass: "bg-orange-100", textClass: "text-orange-700", order: 2 },
  connected: { label: "Connected", color: "bg-blue-500", bgClass: "bg-blue-100", textClass: "text-blue-700", order: 3 },
  qualified: { label: "Qualified", color: "bg-indigo-500", bgClass: "bg-indigo-100", textClass: "text-indigo-700", order: 4 },
  opportunity: { label: "Opportunity (Future)", color: "bg-purple-400", bgClass: "bg-purple-50", textClass: "text-purple-700", order: 5 },
  dnp_post_qualified: { label: "DNP (Post-Q)", color: "bg-orange-500", bgClass: "bg-orange-100", textClass: "text-orange-800", order: 6 },
  processing: { label: "Processing", color: "bg-indigo-600", bgClass: "bg-indigo-100", textClass: "text-indigo-800", order: 7 },
  important: { label: "Important", color: "bg-yellow-500", bgClass: "bg-yellow-100", textClass: "text-yellow-700", order: 8 },
  partial_docs_collected: { label: "Partial Docs", color: "bg-cyan-400", bgClass: "bg-cyan-50", textClass: "text-cyan-700", order: 9 },
  docs_collected: { label: "Docs Collected", color: "bg-cyan-600", bgClass: "bg-cyan-100", textClass: "text-cyan-800", order: 10 },
  application_done: { label: "Application Done", color: "bg-teal-500", bgClass: "bg-teal-100", textClass: "text-teal-700", order: 11 },
  conditional_draft: { label: "Conditional Draft", color: "bg-teal-600", bgClass: "bg-teal-100", textClass: "text-teal-800", order: 12 },
  ucol: { label: "UCOL", color: "bg-emerald-500", bgClass: "bg-emerald-100", textClass: "text-emerald-700", order: 13 },
  deposit_paid: { label: "Deposit Paid", color: "bg-green-500", bgClass: "bg-green-100", textClass: "text-green-700", order: 14 },
  cas_received: { label: "CAS Received", color: "bg-green-600", bgClass: "bg-green-100", textClass: "text-green-800", order: 15 },
  visa_applied: { label: "Visa Applied", color: "bg-green-700", bgClass: "bg-green-200", textClass: "text-green-900", order: 16 },
  enrolled: { label: "Enrolled", color: "bg-green-800", bgClass: "bg-green-200", textClass: "text-green-900", order: 17 },
  lost: { label: "Lost", color: "bg-red-500", bgClass: "bg-red-100", textClass: "text-red-700", order: 18 },
};

const ADMITVERSE_TERMINAL_STAGES: ReadonlySet<LeadStage> = new Set(["lost", "enrolled"]);

// FMC: free movement except disbursed (terminal) and lost (admin-only reopen
// to Created — backend enforces the admin check, frontend just exposes it).
const FMC_TERMINAL_STAGES: ReadonlySet<LeadStage> = new Set(["disbursed"]);

const FALLBACK_STAGE_ENTRY: StageConfigEntry = {
  label: "Unknown",
  color: "bg-slate-400",
  bgClass: "bg-slate-100",
  textClass: "text-slate-700",
  order: 999,
};

function isAdmitverse(slug: string | null | undefined): boolean {
  return slug === ADMITVERSE_SLUG;
}

export function getStageList(slug: string | null | undefined): LeadStage[] {
  return isAdmitverse(slug) ? ADMITVERSE_STAGES_LIST : FMC_STAGES_LIST;
}

export function getStageConfigMap(
  slug: string | null | undefined
): Partial<Record<LeadStage, StageConfigEntry>> {
  return isAdmitverse(slug) ? ADMITVERSE_STAGE_CONFIG : FMC_STAGE_CONFIG;
}

export function getStageEntry(
  slug: string | null | undefined,
  stage: LeadStage
): StageConfigEntry {
  const map = getStageConfigMap(slug);
  return (
    map[stage] ??
    FMC_STAGE_CONFIG[stage] ??
    ADMITVERSE_STAGE_CONFIG[stage] ??
    FALLBACK_STAGE_ENTRY
  );
}

export function canTransition(
  slug: string | null | undefined,
  from: LeadStage,
  to: LeadStage
): boolean {
  if (from === to) return false;
  if (isAdmitverse(slug)) {
    if (ADMITVERSE_TERMINAL_STAGES.has(from)) return false;
    return ADMITVERSE_STAGE_CONFIG[to] !== undefined;
  }
  // FMC
  if (from === "lost") return to === "created";
  if (FMC_TERMINAL_STAGES.has(from)) return false;
  return FMC_STAGE_CONFIG[to] !== undefined && FMC_STAGES_LIST.includes(to);
}

export function getValidTransitions(
  slug: string | null | undefined,
  from: LeadStage
): LeadStage[] {
  if (isAdmitverse(slug)) {
    if (ADMITVERSE_TERMINAL_STAGES.has(from)) return [];
    return ADMITVERSE_STAGES_LIST.filter((s) => s !== from);
  }
  // FMC
  if (from === "lost") return ["created"];
  if (FMC_TERMINAL_STAGES.has(from)) return [];
  return FMC_STAGES_LIST.filter((s) => s !== from);
}

// Neither pipeline gates transitions on free-form notes anymore. `lost` still
// requires a `lost_reason` — handled separately by callers.
export function stageRequiresNotes(
  _slug: string | null | undefined,
  _stage: LeadStage
): boolean {
  return false;
}

export const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  dnp: "Did Not Pick",
  connected: "Connected",
  busy: "Busy",
  switched_off: "Switched Off",
  wrong_number: "Wrong Number",
  callback: "Callback Requested",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  follow_up: "Follow Up",
  call: "Call",
  meeting: "Meeting",
  document_collection: "Document Collection",
  application: "Application",
  other: "Other",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export const BANK_STATUS_LABELS: Record<BankStatus, string> = {
  applied: "Applied",
  docs_reviewed: "Docs Reviewed",
  under_review: "Under Review",
  loan_login: "Loan Login",
  sanctioned: "Sanctioned",
  pf_paid: "PF Paid",
  disbursed: "Disbursed",
};

// Used by pill-style badges; walks blue → green to mirror funnel progression.
// Hex colors mirroring the Tailwind classes used in STAGE_CONFIG. Used where
// Tailwind utility classes can't be applied (e.g. inline border-left-color).
const FMC_STAGE_HEX: Partial<Record<LeadStage, string>> = {
  created: "#64748b",          // slate-500
  contacted: "#60a5fa",        // blue-400
  dnp: "#f97316",              // orange-500
  qualified: "#6366f1",        // indigo-500
  processing: "#4f46e5",       // indigo-600
  docs_pending: "#f59e0b",     // amber-500
  logged_in: "#06b6d4",        // cyan-500
  sanctioned: "#14b8a6",       // teal-500
  pf_paid: "#10b981",          // emerald-500
  disbursed: "#15803d",        // green-700
  opportunity: "#c084fc",      // purple-400
  lost: "#ef4444",             // red-500
  // Legacy
  lead: "#64748b",
  called: "#3b82f6",
  connected: "#eab308",
  qualified_lead: "#a855f7",
  won: "#22c55e",
};

const ADMITVERSE_STAGE_HEX: Partial<Record<LeadStage, string>> = {
  created: "#9ca3af",                   // gray-400
  contacted: "#60a5fa",                 // blue-400
  dnp_pre_qualified: "#fb923c",         // orange-400
  connected: "#3b82f6",                 // blue-500
  qualified: "#6366f1",                 // indigo-500
  opportunity: "#c084fc",               // purple-400
  dnp_post_qualified: "#f97316",        // orange-500
  processing: "#4f46e5",                // indigo-600
  important: "#eab308",                 // yellow-500
  partial_docs_collected: "#22d3ee",    // cyan-400
  docs_collected: "#0891b2",            // cyan-600
  application_done: "#14b8a6",          // teal-500
  conditional_draft: "#0d9488",         // teal-600
  ucol: "#10b981",                      // emerald-500
  deposit_paid: "#22c55e",              // green-500
  cas_received: "#16a34a",              // green-600
  visa_applied: "#15803d",              // green-700
  enrolled: "#166534",                  // green-800
  lost: "#ef4444",                      // red-500
};

export function getStageHex(
  slug: string | null | undefined,
  stage: LeadStage
): string {
  const map = isAdmitverse(slug) ? ADMITVERSE_STAGE_HEX : FMC_STAGE_HEX;
  return map[stage] ?? FMC_STAGE_HEX[stage] ?? ADMITVERSE_STAGE_HEX[stage] ?? "#94a3b8";
}

export const BANK_STATUS_BADGE_CLASSES: Record<BankStatus, string> = {
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  docs_reviewed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  loan_login: "bg-cyan-50 text-cyan-700 border-cyan-200",
  sanctioned: "bg-teal-50 text-teal-700 border-teal-200",
  pf_paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disbursed: "bg-green-100 text-green-800 border-green-300",
};
