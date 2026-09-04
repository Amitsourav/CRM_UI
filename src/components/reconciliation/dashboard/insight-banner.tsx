"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { formatCompactRupees, formatRupees } from "@/lib/money";
import type { DashboardPipelineAhead, OpportunityRow } from "@/types";

interface InsightBannerProps {
  ahead: DashboardPipelineAhead;
  /** The largest single undrawn file, if the pipeline call has landed. */
  topOpportunity?: OpportunityRow;
  onOpen: () => void;
}

/**
 * The one thing worth acting on, stated in a sentence.
 *
 * Undrawn sanction is the book's biggest number and its least visible one —
 * money already approved that earns nothing until it is released. Naming the
 * largest single file makes it a task rather than a statistic.
 */
export function InsightBanner({
  ahead,
  topOpportunity,
  onOpen,
}: InsightBannerProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "var(--li-navy)" }}
    >
      <div className="flex items-start gap-4">
        <span
          className="li-tile shrink-0"
          style={{ background: "var(--li-navy-soft)" }}
        >
          <Sparkles className="h-4 w-4 text-[#a5a5f5]" />
        </span>
        <div>
          <p className="text-[17px] font-bold text-white">
            {formatCompactRupees(ahead.undrawn_total)} sanctioned capital is
            still undrawn
          </p>
          <p className="mt-1 text-[14px] text-[#aab1c9]">
            {topOpportunity ? (
              <>
                {topOpportunity.full_name} alone represents{" "}
                {formatCompactRupees(topOpportunity.pending)} pending.{" "}
              </>
            ) : null}
            {/* A floor, not an estimate — files with no lender rate are left
                out rather than counted as zero. */}
            {ahead.files_missing_rate > 0 && "At least "}
            {formatRupees(ahead.future_commission)} commission is yet to be
            collected.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full shrink-0 flex-col justify-between gap-6 rounded-xl border border-white/10 p-4 text-left transition-colors hover:bg-white/5 sm:w-[190px]"
        style={{ background: "var(--li-navy-soft)" }}
      >
        <span className="text-[13px] font-bold text-white">
          Open action plan
        </span>
        <ArrowRight className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
