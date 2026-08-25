"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { LeadStageBadge } from "@/components/leads/lead-stage-badge";
import { formatLoanAmount } from "@/lib/loan-amount";
import { BankShareCell } from "./bank-share-cell";
import type { BankShareGridRow } from "@/types";

/**
 * The lead columns are frozen so the bank block can scroll under them.
 * `left` offsets are cumulative widths and must stay in sync with `width` —
 * Tailwind needs both as literal classes, so they live together here.
 *
 * Student folds name, serial and phone into one column: three separate
 * columns cost ~150px of frozen width, which is two bank columns you can no
 * longer see, and the phone is a detail you read once you've found the row.
 *
 * Freezing kicks in at `lg` only: on a phone the pinned block would leave no
 * room for the banks, so small screens scroll the whole table.
 */
const FROZEN_COLUMNS = [
  { key: "student", label: "Student", width: "w-[196px] min-w-[196px]", left: "lg:left-0" },
  { key: "counsellor", label: "Counsellor", width: "w-[124px] min-w-[124px]", left: "lg:left-[196px]" },
  { key: "stage", label: "Stage", width: "w-[128px] min-w-[128px]", left: "lg:left-[320px]" },
  { key: "loan", label: "Loan", width: "w-[86px] min-w-[86px]", left: "lg:left-[448px]" },
] as const;

const BANK_COL = "w-[78px] min-w-[78px]";
// Opaque background is required on frozen cells — the scrolling bank block
// passes underneath them.
const CELL_BG = "bg-card group-hover:bg-muted/40";
const HEAD_CELL =
  "sticky top-0 border-b bg-card px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground";

interface BankShareGridProps {
  rows: BankShareGridRow[];
  /** Column order, from the response. Never a hard-coded list. */
  banks: string[];
}

export function BankShareGrid({ rows, banks }: BankShareGridProps) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {FROZEN_COLUMNS.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  HEAD_CELL,
                  "z-30 lg:sticky",
                  col.width,
                  col.left,
                  i === FROZEN_COLUMNS.length - 1 && "lg:border-r"
                )}
              >
                {col.label}
              </th>
            ))}
            {banks.map((bank) => (
              <th
                key={bank}
                title={bank}
                className={cn(HEAD_CELL, "z-20 px-2 text-center font-mono", BANK_COL)}
              >
                <span className="block truncate">{bank}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lead_id} className="group">
              <td
                className={cn(
                  "z-10 border-b px-3 py-1.5 lg:sticky",
                  FROZEN_COLUMNS[0].width,
                  FROZEN_COLUMNS[0].left,
                  CELL_BG
                )}
              >
                <Link
                  href={`/leads/${row.lead_id}`}
                  className="block truncate font-medium leading-tight hover:underline"
                  title={row.full_name}
                >
                  {row.full_name}
                </Link>
                <div className="flex items-center gap-1.5 font-mono text-[11px] leading-tight text-muted-foreground">
                  {row.serial_no != null && (
                    <span className="tabular-nums">#{row.serial_no}</span>
                  )}
                  {row.serial_no != null && row.phone && (
                    <span className="text-foreground/20">·</span>
                  )}
                  {row.phone && (
                    <a
                      href={`tel:${row.phone}`}
                      className="truncate tabular-nums hover:text-foreground hover:underline"
                    >
                      {row.phone}
                    </a>
                  )}
                </div>
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-1.5 lg:sticky",
                  FROZEN_COLUMNS[1].width,
                  FROZEN_COLUMNS[1].left,
                  CELL_BG
                )}
              >
                {/* Null when the lead is unassigned. */}
                <span
                  className={cn(
                    "block truncate",
                    !row.counsellor_name && "text-muted-foreground"
                  )}
                  title={row.counsellor_name ?? undefined}
                >
                  {row.counsellor_name || "Unassigned"}
                </span>
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-1.5 lg:sticky",
                  FROZEN_COLUMNS[2].width,
                  FROZEN_COLUMNS[2].left,
                  CELL_BG
                )}
              >
                <LeadStageBadge stage={row.current_stage} />
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-1.5 font-mono text-[12px] tabular-nums whitespace-nowrap lg:sticky lg:border-r",
                  FROZEN_COLUMNS[3].width,
                  FROZEN_COLUMNS[3].left,
                  CELL_BG
                )}
              >
                {formatLoanAmount(row.loan_amount)}
              </td>

              {banks.map((bank) => (
                <td
                  key={bank}
                  className={cn(
                    "border-b px-1.5 py-1.5 transition-colors group-hover:bg-muted/40",
                    BANK_COL
                  )}
                >
                  <BankShareCell
                    leadId={row.lead_id}
                    leadName={row.full_name}
                    bankName={bank}
                    share={row.shares?.[bank]}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shown while the grid loads. The backing database runs 2–20s per request,
 * so this stands in for a real page rather than a spinner — the toolbar above
 * stays live and usable throughout.
 */
export function BankShareGridSkeleton({ columns = 12 }: { columns?: number }) {
  return (
    <div className="h-full overflow-hidden">
      <div className="flex gap-3 border-b px-3 py-2.5">
        {FROZEN_COLUMNS.map((col) => (
          <div
            key={col.key}
            className={cn("h-3 animate-pulse rounded bg-muted", col.width)}
          />
        ))}
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn("h-3 animate-pulse rounded bg-muted", BANK_COL)}
          />
        ))}
      </div>
      {Array.from({ length: 12 }).map((_, row) => (
        <div key={row} className="flex gap-3 border-b px-3 py-2.5">
          {FROZEN_COLUMNS.map((col) => (
            <div
              key={col.key}
              className={cn("h-5 animate-pulse rounded bg-muted", col.width)}
            />
          ))}
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={cn("h-7 animate-pulse rounded bg-muted", BANK_COL)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
