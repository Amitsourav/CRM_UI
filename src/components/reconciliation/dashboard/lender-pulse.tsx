"use client";

import { formatCompactRupees, formatPercent } from "@/lib/money";
import type { DashboardLender } from "@/types";
import type { DrilldownTarget } from "./drilldown-drawer";

interface LenderPulseProps {
  lenders: DashboardLender[];
  onDrilldown: (target: DrilldownTarget) => void;
  onViewAll: () => void;
}

/**
 * Where the money is moving, in the order the API gives — pre-sorted by what
 * is owed, then by size. Re-sorting here would tell a different story from
 * the one the backend ranked.
 *
 * The bar is each lender's share of total disbursement, which is the
 * concentration risk in one glance: a book resting on two routes looks
 * different from one spread across twenty.
 */
export function LenderPulse({
  lenders,
  onDrilldown,
  onViewAll,
}: LenderPulseProps) {
  const top = lenders.slice(0, 6);

  return (
    <div className="li-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="li-eyebrow">Lender pulse</p>
          <h3 className="li-title mt-1">Where money is moving</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[13px] font-semibold text-[var(--li-accent)] hover:underline"
        >
          View all
        </button>
      </div>

      <div className="space-y-4">
        {top.map((lender, i) => (
          <button
            key={lender.bank_name}
            type="button"
            onClick={() =>
              onDrilldown({
                segment: "lender",
                value: lender.bank_name,
                label: lender.bank_name,
              })
            }
            className="block w-full text-left"
          >
            <div className="flex items-baseline gap-3">
              <span
                className="li-num flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{
                  background: "var(--li-surface-soft)",
                  color: "var(--li-ink-subtle)",
                }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {lender.bank_name}
              </span>
              <span className="li-num shrink-0 text-[14px] font-bold">
                {formatCompactRupees(lender.disbursed_total)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 pl-8">
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: "var(--li-surface-soft)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.min(lender.share_of_disbursed_pct ?? 0, 100)}%`,
                    background: "var(--li-accent)",
                  }}
                />
              </span>
              <span className="li-mute shrink-0 text-[12px]">
                {formatPercent(lender.share_of_disbursed_pct, 1)} of book
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
