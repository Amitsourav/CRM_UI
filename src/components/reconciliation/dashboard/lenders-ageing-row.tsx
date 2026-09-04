"use client";

import { cn } from "@/lib/utils";
import { formatPercent, formatRupees } from "@/lib/money";
import type { AgeingBucket, DashboardAgeing, DashboardLender } from "@/types";
import type { DrilldownTarget } from "./drilldown-drawer";

const BUCKET_LABELS: Record<AgeingBucket, string> = {
  "0_30": "0–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  over_90: "90+ days",
  no_date: "Cannot be aged — no disbursement date",
};

// Render order is fixed: no_date last and set apart, because it isn't an age.
const BUCKET_ORDER: AgeingBucket[] = [
  "0_30",
  "31_60",
  "61_90",
  "over_90",
  "no_date",
];

interface LendersAgeingRowProps {
  lenders: DashboardLender[];
  ageing: DashboardAgeing;
  onDrilldown: (target: DrilldownTarget) => void;
}

export function LendersAgeingRow({
  lenders,
  ageing,
  onDrilldown,
}: LendersAgeingRowProps) {
  const byBucket = new Map(ageing.buckets.map((b) => [b.bucket, b]));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="li-card overflow-hidden">
        <div className="li-hairline border-b px-5 py-3">
          <h3 className="li-title">Who owes what</h3>
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="li-hairline li-eyebrow border-b text-left">
                <th className="px-3 py-2 font-medium">Lender</th>
                <th className="px-3 py-2 text-right font-medium">Rel.</th>
                <th className="px-3 py-2 text-right font-medium">Disbursed</th>
                <th className="px-3 py-2 text-right font-medium">Owed</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
                <th className="px-3 py-2 text-right font-medium">Collected</th>
              </tr>
            </thead>
            <tbody>
              {/* Given already sorted by what's owed. Re-sorting would lose
                  that ordering and tell a different story. */}
              {lenders.map((lender) => (
                <tr
                  key={lender.bank_name}
                  className="cursor-pointer li-hairline border-b last:border-b-0 hover:bg-[var(--li-surface-soft)]"
                  onClick={() =>
                    onDrilldown({
                      segment: "lender",
                      value: lender.bank_name,
                      label: lender.bank_name,
                    })
                  }
                >
                  <td className="px-3 py-1.5 font-medium">{lender.bank_name}</td>
                  <td className="px-3 py-1.5 li-num text-right li-mute">
                    {lender.tranches}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                    {formatRupees(lender.disbursed_total)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 li-num text-right whitespace-nowrap",
                      lender.outstanding_total > 0 && "text-[var(--li-ink)]"
                    )}
                  >
                    {formatRupees(lender.outstanding_total)}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right li-mute">
                    {formatPercent(lender.share_of_disbursed_pct, 1)}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right li-mute">
                    {formatPercent(lender.collected_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="li-card overflow-hidden">
        <div className="li-hairline border-b px-5 py-3">
          <h3 className="li-title">How old it is</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="li-hairline li-eyebrow border-b text-left">
              <th className="px-3 py-2 font-medium">Age</th>
              <th className="px-3 py-2 text-right font-medium">Releases</th>
              <th className="px-3 py-2 text-right font-medium">Owed</th>
            </tr>
          </thead>
          <tbody>
            {BUCKET_ORDER.map((bucket) => {
              const row = byBucket.get(bucket);
              if (!row) return null;
              const undateable = bucket === "no_date";
              const old = bucket === "over_90";
              return (
                <tr
                  key={bucket}
                  onClick={() =>
                    onDrilldown({
                      segment: "ageing_bucket",
                      value: bucket,
                      label: BUCKET_LABELS[bucket],
                    })
                  }
                  className={cn(
                    "cursor-pointer li-hairline border-b last:border-b-0 hover:bg-[var(--li-surface-soft)]",
                    // Not an error and not an age — it holds the majority of
                    // what's owed here, so it's set apart rather than hidden.
                    // Not an age and not an error — it holds the majority of
                    // what's owed, so it's set apart by surface and a marked
                    // edge rather than by a colour this palette doesn't have.
                    undateable &&
                      "bg-[var(--li-surface-soft)] [box-shadow:inset_3px_0_0_var(--li-amber)]"
                  )}
                >
                  <td className="px-3 py-1.5">{BUCKET_LABELS[bucket]}</td>
                  <td className="px-3 py-1.5 li-num text-right">
                    {row.tranches}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 li-num text-right whitespace-nowrap",
                      old && "text-[var(--li-rose)]"
                    )}
                  >
                    {formatRupees(row.outstanding)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Ageing floors each row at zero, so an overpayment on one tranche
            can't cancel a shortfall on another. It reads slightly above the
            funnel's net figure on purpose. */}
        <p className="border-t px-3 py-2 text-xs li-mute">
          {formatRupees(ageing.total_outstanding)} chaseable. Sums each
          release&apos;s own shortfall, so it can read a little above the net
          outstanding figure.
        </p>
      </div>
    </div>
  );
}
