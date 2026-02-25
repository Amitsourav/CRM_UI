import type { LeadStage, CallDisposition, TaskType, TaskStatus } from "@/types";

export const STAGE_CONFIG: Record<
  LeadStage,
  { label: string; color: string; bgClass: string; textClass: string; order: number }
> = {
  lead: { label: "New Lead", color: "bg-slate-500", bgClass: "bg-slate-100", textClass: "text-slate-700", order: 0 },
  called: { label: "Called", color: "bg-blue-500", bgClass: "bg-blue-100", textClass: "text-blue-700", order: 1 },
  connected: { label: "Connected", color: "bg-yellow-500", bgClass: "bg-yellow-100", textClass: "text-yellow-700", order: 2 },
  qualified_lead: { label: "Qualified", color: "bg-purple-500", bgClass: "bg-purple-100", textClass: "text-purple-700", order: 3 },
  won: { label: "Won", color: "bg-green-500", bgClass: "bg-green-100", textClass: "text-green-700", order: 4 },
  lost: { label: "Lost", color: "bg-red-500", bgClass: "bg-red-100", textClass: "text-red-700", order: 5 },
};

export const VALID_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  lead: ["called", "lost"],
  called: ["connected", "lost"],
  connected: ["qualified_lead", "lost"],
  qualified_lead: ["won", "lost"],
  won: [],
  lost: ["lead"],
};

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
