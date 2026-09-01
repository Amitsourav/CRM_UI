"use client";

import { formatRupees } from "@/lib/money";
import type { LenderSummaryRow } from "@/types";

/** Who to chase this month, one row per lender. */
export function LenderSummaryTable({ rows }: { rows: LenderSummaryRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
            <th className="px-3 py-2 font-medium">Lender</th>
            <th className="px-3 py-2 text-right font-medium">Sanctioned</th>
            <th className="px-3 py-2 text-right font-medium">Gross theoretical</th>
            <th className="px-3 py-2 text-right font-medium">Files</th>
            <th className="px-3 py-2 text-right font-medium">Disbursed</th>
            <th className="px-3 py-2 text-right font-medium">Commission</th>
            <th className="px-3 py-2 text-right font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">TDS</th>
            <th className="px-3 py-2 text-right font-medium">Outstanding</th>
            <th className="px-3 py-2 text-right font-medium">Unbilled</th>
            <th className="px-3 py-2 text-right font-medium" title="Sanctioned files with no amount recorded — excluded from gross theoretical">
              No amount
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.bank_name}
              className="border-b last:border-b-0 hover:bg-muted/40"
            >
              {/* Full route name — the rate depends on it. */}
              <td className="px-3 py-2 font-medium">{row.bank_name}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.sanctioned_total)}
                {row.sanctioned_files != null && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({row.sanctioned_files})
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.gross_theoretical_revenue)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {row.files}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.disbursed_total)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.commission_total)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.received_total)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatRupees(row.tds_total)}
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                {formatRupees(row.outstanding_total)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {row.unbilled_count > 0 ? (
                  <span className="text-amber-600">{row.unbilled_count}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
              {/* Sanctioned files with no amount recorded — excluded from the
                  gross theoretical figure on this same row. */}
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {row.files_missing_amount ? (
                  <span className="text-amber-600">
                    {row.files_missing_amount}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
