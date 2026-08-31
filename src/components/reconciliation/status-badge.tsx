"use client";

import { cn } from "@/lib/utils";
import type { ReconciliationStatus } from "@/types";

/**
 * The two that are money — `to_bill` (never invoiced) and `short_paid` (they
 * paid less than owed) — carry the warm colours, so a screenful of rows shows
 * where the problems are without reading a word.
 */
export const STATUS_META: Record<
  ReconciliationStatus,
  { label: string; dot: string; chip: string }
> = {
  to_bill: {
    label: "To bill",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900",
  },
  billed: {
    label: "Billed",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-900",
  },
  short_paid: {
    label: "Short paid",
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900",
  },
  paid: {
    label: "Paid",
    dot: "bg-green-600",
    chip: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-200 dark:border-green-900",
  },
  written_off: {
    label: "Written off",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export const STATUS_ORDER: ReconciliationStatus[] = [
  "to_bill",
  "short_paid",
  "billed",
  "paid",
  "written_off",
];

export function StatusBadge({ status }: { status: ReconciliationStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.billed;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
