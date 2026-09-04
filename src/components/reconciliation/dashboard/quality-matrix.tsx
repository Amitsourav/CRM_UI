"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatCompactRupees, formatPercent, formatRupees } from "@/lib/money";
import type { SourceRow } from "@/types";

interface QualityMatrixProps {
  sources: SourceRow[];
  unattributed?: SourceRow;
}

/**
 * Scale against collection quality: how much a source disbursed, versus how
 * much of what it earned has actually arrived. A scatter because the question
 * is the relationship between two measures, not a ranking.
 *
 * Unattributed is plotted, in its own colour and directly labelled. It is
 * ~40% of disbursement, and leaving the largest mark off a chart about scale
 * would misstate the picture — but it is not a channel, so it is never
 * treated as one of the ranked series.
 */
export function QualityMatrix({ sources, unattributed }: QualityMatrixProps) {
  const attributed = sources.map((s) => ({
    ...s,
    x: s.disbursed_total,
    y: s.collected_pct,
  }));
  const other = unattributed
    ? [
        {
          ...unattributed,
          x: unattributed.disbursed_total,
          y: unattributed.collected_pct,
        },
      ]
    : [];

  return (
    <div className="li-card p-6">
      <div className="mb-4">
        <h3 className="li-title">Scale against collection</h3>
        <p className="li-mute mt-1 text-[13px]">
          How much each source disbursed, against how much of what it earned
          has arrived. Top-right is big and paying.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--li-hairline)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Disbursed"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--li-ink-subtle)" }}
              tickFormatter={(v: number) => formatCompactRupees(v)}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Collected"
              unit="%"
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 11, fill: "var(--li-ink-subtle)" }}
            />
            <ZAxis range={[80, 80]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as SourceRow;
                return (
                  <div
                    className="li-card px-3 py-2 text-[13px]"
                    style={{ background: "var(--li-surface-soft)" }}
                  >
                    <p className="font-normal">{row.source_name}</p>
                    <p className="li-mute mt-1">
                      {formatRupees(row.disbursed_total)} disbursed ·{" "}
                      {row.students}{" "}
                      {row.students === 1 ? "student" : "students"}
                    </p>
                    <p className="li-mute">
                      {formatPercent(row.collected_pct, 1)} collected ·{" "}
                      {formatRupees(row.revenue_per_student)} per student
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              name="Sources"
              data={attributed}
              fill="var(--li-series-a)"
            />
            <Scatter
              name="Unattributed"
              data={other}
              fill="var(--li-series-b)"
              shape="diamond"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {unattributed && (
        <p className="li-mute mt-3 flex items-center gap-1.5 text-[11px]">
          <span
            className="inline-block h-2 w-2 rotate-45"
            style={{ background: "var(--li-series-b)" }}
            aria-hidden
          />
          The diamond is Unattributed —{" "}
          {formatPercent(unattributed.share_of_disbursed_pct, 1)} of
          disbursement with no source recorded. Plotted for scale, not ranked
          as a channel.
        </p>
      )}
    </div>
  );
}
