"use client";

import { formatCompactRupees, formatPercent, formatRupees } from "@/lib/money";
import type { DashboardAgeing, DashboardPipelineAhead } from "@/types";

interface AheadOwedRowProps {
  ahead: DashboardPipelineAhead;
  ageing: DashboardAgeing;
  lenderCount: number;
}

/**
 * What's coming, and what's owed. The two halves of the same question: money
 * approved but not released, against money earned but not paid.
 *
 * The cream band is the design system's warm interlude — used once, to set
 * the forward-looking half apart from the debt beside it.
 */
export function AheadOwedRow({ ahead, ageing, lenderCount }: AheadOwedRowProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
      <div className="li-card p-6">
        <p className="li-eyebrow">Still to come</p>
        <p
          className="li-figure li-num mt-3"
          title={formatRupees(ahead.undrawn_total)}
        >
          {formatCompactRupees(ahead.undrawn_total)}
          <span className="li-secondary ml-2 text-[15px] font-normal">
            undrawn
          </span>
        </p>

        <p className="li-secondary mt-4 text-[15px]">
          {/* A floor, not an estimate — files whose lender has no rate are
              excluded rather than counted as zero. */}
          {ahead.files_missing_rate > 0 && <span>at least </span>}
          <span className="li-num text-[20px]">
            {formatRupees(ahead.future_commission)}
          </span>{" "}
          commission to come
        </p>

        <p className="li-mute mt-2 text-[13px]">
          {formatPercent(ahead.drawn_pct, 1)} of confirmed money drawn across{" "}
          {ahead.confirmed_files} files
          {ahead.files_missing_rate > 0 && (
            <> · {ahead.files_missing_rate} excluded for having no lender rate</>
          )}
        </p>
      </div>

      <div className="li-card p-6">
        <p className="li-eyebrow">Owed to us</p>
        <p className="li-figure li-num mt-3">
          {formatRupees(ageing.total_outstanding)}
        </p>
        <p className="li-secondary mt-4 text-[15px]">
          across {lenderCount} {lenderCount === 1 ? "lender" : "lenders"}
        </p>
        <p className="li-mute mt-2 text-[13px]">
          {formatPercent(ageing.undateable_pct)} can&apos;t be aged —{" "}
          {formatRupees(ageing.undateable_outstanding)} on releases with no date
        </p>
      </div>
    </div>
  );
}
