"use client";

import { Clock, IndianRupee, Landmark, TrendingUp } from "lucide-react";
import { formatCompactRupees, formatPercent, formatRupees } from "@/lib/money";
import type {
  DashboardFunnel,
  DashboardPipelineAhead,
  TheoreticalRevenue,
} from "@/types";

interface KpiRowProps {
  funnel: DashboardFunnel;
  ahead: DashboardPipelineAhead;
  theoretical?: TheoreticalRevenue | null;
  overdueCount?: number;
}

/**
 * The four numbers the book is judged on. Each carries one sub-line of
 * context, because a figure without its denominator invites the wrong
 * conclusion — 29% drawdown is the story, not ₹14.98 Cr on its own.
 */
export function KpiRow({
  funnel,
  ahead,
  theoretical,
  overdueCount,
}: KpiRowProps) {
  const cards = [
    {
      label: "Total sanctioned",
      value: formatCompactRupees(funnel.sanctioned_total),
      exact: formatRupees(funnel.sanctioned_total),
      icon: Landmark,
      tint: "var(--li-accent-soft)",
      fg: "var(--li-accent)",
      foot: (
        <>
          <span className="font-semibold text-[var(--li-ink)]">
            {funnel.sanctioned_files}
          </span>{" "}
          student files
        </>
      ),
    },
    {
      label: "Disbursed",
      value: formatCompactRupees(funnel.disbursed_total),
      exact: formatRupees(funnel.disbursed_total),
      icon: TrendingUp,
      tint: "var(--li-green-soft)",
      fg: "var(--li-green)",
      foot: (
        <>
          <span className="font-semibold text-[var(--li-ink)]">
            {formatPercent(ahead.drawn_pct)}
          </span>{" "}
          drawdown of sanction
        </>
      ),
    },
    {
      label: "Net theoretical revenue",
      value: theoretical
        ? formatCompactRupees(theoretical.net_theoretical_revenue)
        : "—",
      exact: theoretical
        ? formatRupees(theoretical.net_theoretical_revenue)
        : undefined,
      icon: IndianRupee,
      tint: "var(--li-surface-soft)",
      fg: "var(--li-ink-muted)",
      foot: theoretical ? (
        <>
          {formatCompactRupees(theoretical.gross_theoretical_revenue)} gross at
          full drawdown
        </>
      ) : (
        <>awaiting the revenue figures</>
      ),
    },
    {
      label: "Commission outstanding",
      value: formatCompactRupees(funnel.outstanding_total),
      exact: formatRupees(funnel.outstanding_total),
      icon: Clock,
      tint: "var(--li-amber-soft)",
      fg: "var(--li-amber)",
      foot: (
        <>
          <span className="font-semibold text-[var(--li-ink)]">
            {formatPercent(funnel.collected_pct_of_earned)}
          </span>{" "}
          collected
        </>
      ),
      note:
        overdueCount && overdueCount > 0
          ? `${overdueCount} overdue >60d`
          : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="li-card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="li-eyebrow">{card.label}</p>
            <span className="li-tile" style={{ background: card.tint }}>
              <card.icon className="h-4 w-4" style={{ color: card.fg }} />
            </span>
          </div>
          <p className="li-figure li-num mt-3" title={card.exact}>
            {card.value}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="li-mute text-[13px]">{card.foot}</p>
            {card.note && (
              <p className="text-[12px] font-semibold text-[var(--li-amber)]">
                {card.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
