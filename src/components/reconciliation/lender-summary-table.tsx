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
            <th className="px-3 py-2 text-right font-medium">Files</th>
            <th className="px-3 py-2 text-right font-medium">Disbursed</th>
            <th className="px-3 py-2 text-right font-medium">Commission</th>
            <th className="px-3 py-2 text-right font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">TDS</th>
            <th className="px-3 py-2 text-right font-medium">Outstanding</th>
            <th className="px-3 py-2 text-right font-medium">Unbilled</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.bank_name}
              className="border-b last:border-b-0 hover:bg-muted/40"
            >
              <td className="px-3 py-2 font-medium">{row.bank_name}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
