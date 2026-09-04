"use client";

import Link from "next/link";
import { formatCompactRupees, formatPercent, formatRupees } from "@/lib/money";
import { useStageConfig } from "@/hooks/use-stage-config";
import type { LeadStage, PipelineForecast } from "@/types";
import type { DrilldownTarget } from "./drilldown-drawer";

interface PipelineTabProps {
  data: PipelineForecast;
  onDrilldown: (target: DrilldownTarget) => void;
}

export function PipelineTab({ data, onDrilldown }: PipelineTabProps) {
  const { getEntry } = useStageConfig();
  const { stage_funnel: funnel, revenue_bridge: bridge, opportunities } = data;
  // Bars are scaled by money, not headcount — a stage holding 11 students and
  // ₹7.4 cr is the one worth looking at.
  const widest = Math.max(...funnel.map((s) => s.sanctioned), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="li-card p-5">
          <p className="li-eyebrow">
            Booked
          </p>
          <p className="mt-1 font-mono li-figure tabular-nums">
            {formatRupees(bridge.booked)}
          </p>
          <p className="mt-0.5 text-xs li-mute">
            earned on money already released
          </p>
        </div>
        <div className="li-card p-5">
          <p className="li-eyebrow">
            Unlockable
          </p>
          <p className="mt-1 font-mono li-figure tabular-nums">
            {/* A floor — files with no lender rate are excluded, not zeroed. */}
            {bridge.files_missing_rate > 0 && (
              <span className="mr-1 font-sans text-sm font-normal li-mute">
                at least
              </span>
            )}
            {formatRupees(bridge.unlockable)}
          </p>
          <p className="mt-0.5 text-xs li-mute">
            on {formatCompactRupees(bridge.undrawn_total)} still undrawn
            {bridge.files_missing_rate > 0 && (
              <> · {bridge.files_missing_rate} files have no rate</>
            )}
          </p>
        </div>
        <div className="li-card p-5">
          <p className="li-eyebrow">
            Drawn
          </p>
          <p className="mt-1 font-mono li-figure tabular-nums">
            {formatPercent(bridge.drawn_pct, 1)}
          </p>
          <p className="mt-0.5 text-xs li-mute">
            of confirmed money released
          </p>
        </div>
      </div>

      <div className="li-card">
        <div className="li-hairline border-b px-5 py-3">
          <h3 className="li-title">Where the students are</h3>
          <p className="li-mute text-[13px]">
            By value, not headcount — a stalled stage matters as money.
          </p>
        </div>
        <div className="space-y-2 p-4">
          {funnel.map((row) => {
            const entry = getEntry(row.stage as LeadStage);
            return (
              <button
                key={row.stage}
                type="button"
                onClick={() =>
                  onDrilldown({
                    segment: "stage",
                    value: row.stage,
                    label: `${entry.label} — ${row.leads} students`,
                  })
                }
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-[var(--li-surface-soft)]"
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{entry.label}</span>
                  <span className="li-num li-mute text-[11px]">
                    {row.leads} students · {formatCompactRupees(row.sanctioned)}{" "}
                    sanctioned
                    {row.disbursed > 0 && (
                      <> · {formatCompactRupees(row.disbursed)} out</>
                    )}
                  </span>
                </div>
                <div
                  className="mt-2 h-2 w-full overflow-hidden"
                  style={{ background: "var(--li-surface-soft)" }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${(row.sanctioned / widest) * 100}%`,
                      background: "var(--li-accent)",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="li-card overflow-hidden">
        <div className="li-hairline border-b px-5 py-3">
          <h3 className="li-title">Biggest opportunities</h3>
          <p className="li-mute text-[13px]">
            Approved money not yet drawn, and what it is worth.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="li-hairline li-eyebrow border-b text-left">
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Lender</th>
                <th className="px-3 py-2 text-right font-medium">Sanction</th>
                <th className="px-3 py-2 text-right font-medium">Disbursed</th>
                <th className="px-3 py-2 text-right font-medium">Pending</th>
                <th className="px-3 py-2 text-right font-medium">
                  Potential net revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((row) => (
                <tr
                  key={`${row.lead_id}-${row.bank_name ?? ""}`}
                  className="li-hairline border-b last:border-b-0 hover:bg-[var(--li-surface-soft)]"
                >
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/leads/${row.lead_id}`}
                      className="font-medium hover:underline"
                    >
                      {row.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 li-mute">
                    {getEntry(row.stage as LeadStage).label}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap li-mute">
                    {row.bank_name || "—"}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                    {formatRupees(row.sanctioned)}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                    {formatRupees(row.disbursed)}
                  </td>
                  <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                    {formatRupees(row.pending)}
                  </td>
                  {/* The 80% haircut is already applied upstream. */}
                  <td className="li-num px-3 py-1.5 text-right whitespace-nowrap text-[var(--li-accent)]">
                    {formatRupees(row.potential_net_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
