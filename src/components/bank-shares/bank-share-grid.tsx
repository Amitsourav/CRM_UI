"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { LeadStageBadge } from "@/components/leads/lead-stage-badge";
import { formatLoanAmount } from "@/lib/loan-amount";
import { BankShareCell } from "./bank-share-cell";
import type { BankShareGridRow } from "@/types";

/**
 * The five lead columns are frozen so the bank block can scroll under them.
 * `left` offsets are cumulative widths and must stay in sync with `width` —
 * Tailwind needs both as literal classes, so they live together here.
 *
 * Freezing kicks in at `lg` only: 670px of pinned columns on a phone would
 * leave no room for the banks, so small screens scroll the whole table.
 */
const FROZEN_COLUMNS = [
  { key: "name", label: "Student", width: "w-[180px] min-w-[180px]", left: "lg:left-0" },
  { key: "phone", label: "Number", width: "w-[130px] min-w-[130px]", left: "lg:left-[180px]" },
  { key: "counsellor", label: "Counsellor", width: "w-[130px] min-w-[130px]", left: "lg:left-[310px]" },
  { key: "stage", label: "Stage", width: "w-[130px] min-w-[130px]", left: "lg:left-[440px]" },
  { key: "loan", label: "Loan amount", width: "w-[100px] min-w-[100px]", left: "lg:left-[570px]" },
] as const;

const BANK_COL = "w-[92px] min-w-[92px]";
// Opaque background is required on frozen cells — the scrolling bank block
// passes underneath them.
const CELL_BG = "bg-card group-hover:bg-muted/50";

interface BankShareGridProps {
  rows: BankShareGridRow[];
  /** Column order, from the response. Never a hard-coded list. */
  banks: string[];
}

export function BankShareGrid({ rows, banks }: BankShareGridProps) {
  return (
    <div className="relative max-h-[calc(100vh-19rem)] overflow-auto rounded-md border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {FROZEN_COLUMNS.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-0 z-30 border-b bg-muted px-3 py-2 text-left text-xs font-semibold whitespace-nowrap lg:sticky",
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
                className={cn(
                  "sticky top-0 z-20 border-b bg-muted px-2 py-2 text-center text-xs font-semibold",
                  BANK_COL
                )}
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
                  "z-10 border-b px-3 py-2 lg:sticky",
                  FROZEN_COLUMNS[0].width,
                  FROZEN_COLUMNS[0].left,
                  CELL_BG
                )}
              >
                <Link
                  href={`/leads/${row.lead_id}`}
                  className="block truncate font-medium hover:underline"
                  title={row.full_name}
                >
                  {row.full_name}
                </Link>
                {row.serial_no != null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    #{row.serial_no}
                  </span>
                )}
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-2 tabular-nums whitespace-nowrap lg:sticky",
                  FROZEN_COLUMNS[1].width,
                  FROZEN_COLUMNS[1].left,
                  CELL_BG
                )}
              >
                {row.phone ? (
                  <a href={`tel:${row.phone}`} className="hover:underline">
                    {row.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-2 lg:sticky",
                  FROZEN_COLUMNS[2].width,
                  FROZEN_COLUMNS[2].left,
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
                  "z-10 border-b px-3 py-2 lg:sticky",
                  FROZEN_COLUMNS[3].width,
                  FROZEN_COLUMNS[3].left,
                  CELL_BG
                )}
              >
                <LeadStageBadge stage={row.current_stage} />
              </td>

              <td
                className={cn(
                  "z-10 border-b px-3 py-2 whitespace-nowrap lg:sticky lg:border-r",
                  FROZEN_COLUMNS[4].width,
                  FROZEN_COLUMNS[4].left,
                  CELL_BG
                )}
              >
                {formatLoanAmount(row.loan_amount)}
              </td>

              {banks.map((bank) => (
                <td
                  key={bank}
                  className={cn(
                    "border-b px-2 py-2 transition-colors group-hover:bg-muted/50",
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
    <div className="overflow-hidden rounded-md border">
      <div className="flex gap-3 border-b bg-muted px-3 py-2.5">
        {FROZEN_COLUMNS.map((col) => (
          <div key={col.key} className={cn("h-4 animate-pulse rounded bg-muted-foreground/20", col.width)} />
        ))}
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn("h-4 animate-pulse rounded bg-muted-foreground/20", BANK_COL)}
          />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex gap-3 border-b px-3 py-3 last:border-b-0">
          {FROZEN_COLUMNS.map((col) => (
            <div
              key={col.key}
              className={cn("h-5 animate-pulse rounded bg-muted", col.width)}
            />
          ))}
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={cn("h-7 animate-pulse rounded-md bg-muted", BANK_COL)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
