"use client";

import { formatCompactRupees, formatPercent, formatRupees } from "@/lib/money";
import type { DashboardFunnel } from "@/types";
import type { DrilldownTarget } from "./drilldown-drawer";

interface FlowOfMoneyProps {
  funnel: DashboardFunnel;
  onDrilldown: (target: DrilldownTarget) => void;
}

/**
 * Sanction → disbursement → cash, drawn to scale.
 *
 * The bars share one axis — each is a share of the sanctioned total — so the
 * collapse from approved money to cash in hand is visible as width rather
 * than as arithmetic. Commission and cash are a fraction of a percent of the
 * sanction, which is why those two get a minimum bar and their own labels:
 * drawn honestly they would be invisible.
 *
 * Every percentage comes from the response. Nothing is derived here except
 * the bar widths.
 */
export function FlowOfMoney({ funnel, onDrilldown }: FlowOfMoneyProps) {
  const top = Math.max(funnel.sanctioned_total, 1);
  const width = (value: number) =>
    `${Math.max((value / top) * 100, 1.5).toFixed(2)}%`;

  const bars = [
    {
      key: "sanctioned" as const,
      label: "Sanctioned",
      value: funnel.sanctioned_total,
      foot: `${funnel.sanctioned_files} files approved`,
      fill: "linear-gradient(90deg, #6366f1, #7c6df2)",
      height: "h-24",
    },
    {
      key: "disbursed" as const,
      label: "Disbursed",
      value: funnel.disbursed_total,
      foot: `${formatPercent(funnel.disbursed_pct_of_confirmed)} of confirmed drawn`,
      fill: "linear-gradient(90deg, #3b82f6, #60a5fa)",
      height: "h-20",
    },
    {
      key: null,
      label: "Commission due",
      value: funnel.earned_total,
      foot: "commission + GST on what was released",
      fill: "linear-gradient(90deg, #ea9a3e, #f0b563)",
      height: "h-3",
    },
    {
      key: null,
      label: "Cash received",
      value: funnel.collected_total,
      foot: `${formatPercent(funnel.collected_pct_of_earned)} of earned collected`,
      fill: "linear-gradient(90deg, #16a34a, #34d399)",
      height: "h-3",
    },
  ];

  return (
    <div className="li-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="li-eyebrow">Flow of money</p>
          <h3 className="li-title mt-1">Sanction → disbursement → cash</h3>
        </div>
        <p className="li-mute text-[12px]">to scale</p>
      </div>

      <div className="space-y-5">
        {bars.map((bar) => {
          const clickable = bar.key !== null;
          return (
            <div key={bar.label}>
              <p className="li-num li-secondary mb-1.5 text-[13px] font-semibold">
                {formatCompactRupees(bar.value)}
              </p>
              <div
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                title={formatRupees(bar.value)}
                onClick={
                  clickable
                    ? () =>
                        onDrilldown({
                          segment: "funnel_step",
                          value: bar.key as string,
                          label: bar.label,
                        })
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDrilldown({
                            segment: "funnel_step",
                            value: bar.key as string,
                            label: bar.label,
                          });
                        }
                      }
                    : undefined
                }
                className={
                  clickable
                    ? "cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--li-accent)]"
                    : undefined
                }
              >
                <div
                  className={`${bar.height} rounded-lg`}
                  style={{ width: width(bar.value), background: bar.fill }}
                />
              </div>
              <p className="mt-2 text-[13px] font-semibold">{bar.label}</p>
              <p className="li-mute text-[12px]">{bar.foot}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
