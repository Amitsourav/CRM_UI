"use client";

import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRate, formatRupees } from "@/lib/money";
import { StatusBadge } from "./status-badge";
import type { DisbursementRow } from "@/types";

/** Past this, an unpaid commission is worth chasing rather than waiting on. */
const AGEING_DAYS = 60;

function shortDate(value?: string | null): string {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yy") : value;
}

interface ReconciliationTableProps {
  rows: DisbursementRow[];
  onRecordPayment: (row: DisbursementRow) => void;
  onWriteOff: (row: DisbursementRow) => void;
  onToggleEarns: (row: DisbursementRow, earns: boolean) => void;
}

export function ReconciliationTable({
  rows,
  onRecordPayment,
  onWriteOff,
  onToggleEarns,
}: ReconciliationTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Lender</th>
            <th className="px-3 py-2 text-right font-medium">Disbursed</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Rate</th>
            <th className="px-3 py-2 text-center font-medium" title="Earns commission">
              Earns
            </th>
            <th className="px-3 py-2 text-right font-medium">Commission</th>
            <th className="px-3 py-2 text-right font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">Short</th>
            <th className="px-3 py-2 text-right font-medium">Age</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // Defaults on: only an explicit false turns a row off.
            const earns = row.earns_commission !== false;
            const ageing =
              row.days_outstanding != null &&
              row.days_outstanding > AGEING_DAYS &&
              row.status !== "paid" &&
              row.status !== "written_off";
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b last:border-b-0 hover:bg-muted/40",
                  !earns && "text-muted-foreground"
                )}
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/leads/${row.lead_id}`}
                    className="font-medium hover:underline"
                  >
                    {row.lead_name}
                  </Link>
                  {row.serial_no != null && (
                    <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                      #{row.serial_no}
                    </span>
                  )}
                  {/* Only surfaced when there is more than one — most files
                      release in a single go. */}
                  {row.tranche_no > 1 && (
                    <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                      tranche {row.tranche_no}
                    </span>
                  )}
                </td>
                {/* The full route, never shortened: "UC Axis" and "Axis
                    Direct (UC Code)" are the same bank at different rates. */}
                <td className="px-3 py-2 whitespace-nowrap">{row.bank_name}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatRupees(row.disbursed_amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {shortDate(row.disbursed_on)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatRate(row.commission_rate)}
                </td>
                {/* Untick and the commission goes to zero while the rate above
                    stays put, so the row still shows what it would have been
                    worth. */}
                <td className="px-3 py-2 text-center">
                  <Checkbox
                    checked={earns}
                    onCheckedChange={(next) => onToggleEarns(row, next === true)}
                    aria-label={`${row.lead_name} earns commission`}
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {earns ? (
                    formatRupees(row.commission_amount)
                  ) : (
                    <span
                      className="text-muted-foreground"
                      title="Marked as not earning commission"
                    >
                      ₹0
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatRupees(row.amount_received)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap",
                    row.status === "short_paid" && "font-semibold text-red-600"
                  )}
                >
                  {formatRupees(row.shortfall)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono tabular-nums",
                    ageing && "font-semibold text-red-600"
                  )}
                >
                  {row.days_outstanding != null ? `${row.days_outstanding}d` : "—"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={`Actions for ${row.lead_name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onRecordPayment(row)}>
                        Record payment
                      </DropdownMenuItem>
                      {row.status !== "written_off" && (
                        <DropdownMenuItem onClick={() => onWriteOff(row)}>
                          Write off
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/leads/${row.lead_id}`}>Open lead</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
