"use client";

import { cn } from "@/lib/utils";
import { formatPercent, formatRupees } from "@/lib/money";
import type { SourceRow, SourcesResponse } from "@/types";
import { QualityMatrix } from "./quality-matrix";
import type { DrilldownTarget } from "./drilldown-drawer";

interface SourcesTabProps {
  data: SourcesResponse;
  onDrilldown: (target: DrilldownTarget) => void;
}

/**
 * Which channels produce money.
 *
 * `students` counts only students who actually disbursed — counting every
 * lead carrying the source read as 8,651 students earning ₹83 each, which is
 * worse than no number.
 */
export function SourcesTab({ data, onDrilldown }: SourcesTabProps) {
  const rows = data.sources ?? [];
  const unattributed = data.unattributed;

  const cells = (row: SourceRow, muted = false) => (
    <>
      <td className={cn("px-3 py-1.5 font-medium", muted && "li-mute")}>
        {row.source_name}
      </td>
      <td className="px-3 py-1.5 li-num text-right">
        {row.students}
      </td>
      <td className="px-3 py-1.5 li-num text-right li-mute">
        {row.tranches}
      </td>
      <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
        {formatRupees(row.disbursed_total)}
      </td>
      <td className="px-3 py-1.5 li-num text-right li-mute">
        {formatPercent(row.share_of_disbursed_pct, 1)}
      </td>
      <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
        {formatRupees(row.commission_total)}
      </td>
      <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
        {formatRupees(row.revenue_per_student)}
      </td>
      <td className="px-3 py-1.5 li-num text-right">
        {formatPercent(row.collected_pct, 1)}
      </td>
    </>
  );

  return (
    <div className="space-y-4">
      <QualityMatrix sources={rows} unattributed={unattributed} />

      <div className="li-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="li-hairline li-eyebrow border-b text-left">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 text-right font-medium">Students</th>
                <th className="px-3 py-2 text-right font-medium">Rel.</th>
                <th className="px-3 py-2 text-right font-medium">Disbursed</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
                <th className="px-3 py-2 text-right font-medium">Commission</th>
                <th className="px-3 py-2 text-right font-medium">Per student</th>
                <th className="px-3 py-2 text-right font-medium">Collected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.source_id ?? row.source_name}
                  className="cursor-pointer li-hairline border-b last:border-b-0 hover:bg-[var(--li-surface-soft)]"
                  onClick={() =>
                    onDrilldown({
                      segment: "source",
                      value: row.source_id ?? row.source_name,
                      label: row.source_name,
                    })
                  }
                >
                  {cells(row)}
                </tr>
              ))}
            </tbody>
            {/* Separated and never ranked: unattributed is ~40% of
                disbursement, so heading a channel league table with it would
                be actively misleading. It is also the best argument for
                recording sources properly. */}
            {unattributed && (
              <tfoot>
                <tr
                  className="li-hairline cursor-pointer border-t-2 hover:bg-[var(--li-surface-soft)]"
                  style={{ background: "var(--li-surface-soft)" }}
                  onClick={() =>
                    onDrilldown({
                      segment: "source",
                      value: "unattributed",
                      label: "Unattributed",
                    })
                  }
                >
                  {cells(unattributed, true)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {unattributed && (
        <p className="li-mute text-[13px]">
          Unattributed sits outside the ranking on purpose — it is not a
          channel, it is{" "}
          {formatPercent(unattributed.share_of_disbursed_pct, 1)} of
          disbursement with no source recorded.
        </p>
      )}
    </div>
  );
}
