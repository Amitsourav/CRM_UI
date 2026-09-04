"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parse } from "date-fns";
import { formatCompactRupees, formatRupees } from "@/lib/money";
import type { DashboardMonth } from "@/types";

function monthLabel(value: string): string {
  const parsed = parse(value, "yyyy-MM", new Date(2000, 0, 1));
  return isNaN(parsed.getTime()) ? value : format(parsed, "MMM yy");
}

interface TrendChartProps {
  months: DashboardMonth[];
  /** Tranches with no disbursement date — in no month, so the trend is light. */
  undatedTranches: number;
}

/**
 * Earned against collected, by month.
 *
 * The two series are dated differently on purpose — earned by disbursement
 * month, collected by receipt month — so a tranche earned in June and paid in
 * August appears in both, in different columns. Grouped rather than stacked
 * for that reason: stacking would imply they sum to something.
 *
 * One axis, both series in rupees. Months with no activity are absent from
 * the response and stay absent here.
 */
export function TrendChart({ months, undatedTranches }: TrendChartProps) {
  const data = months.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div className="li-card p-6">
      <div className="mb-4">
        <h3 className="li-title">Earned vs collected</h3>
        <p className="li-mute mt-1 text-[13px]">
          Earned by the month money was released; collected by the month it
          arrived. A tranche can appear in both, in different months.
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--li-hairline)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--li-ink-subtle)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fontSize: 11, fill: "var(--li-ink-subtle)" }}
              tickFormatter={(v: number) => formatCompactRupees(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--li-hairline)", fillOpacity: 0.5 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as DashboardMonth;
                return (
                  <div
                    className="li-card px-3 py-2 text-[13px]"
                    style={{ background: "var(--li-surface-soft)" }}
                  >
                    <p className="mb-1 font-normal">{label}</p>
                    <p className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 "
                        style={{ background: "var(--li-series-a)" }}
                      />
                      Earned
                      <span className="li-num ml-auto">
                        {formatRupees(row.earned)}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 "
                        style={{ background: "var(--li-series-b)" }}
                      />
                      Collected
                      <span className="li-num ml-auto">
                        {formatRupees(row.collected)}
                      </span>
                    </p>
                    <p className="li-mute mt-1">
                      {row.tranches} {row.tranches === 1 ? "release" : "releases"}
                      {" · "}
                      {formatRupees(row.disbursed)} disbursed
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="li-mute text-[11px]">{value}</span>
              )}
            />
            <Bar
              dataKey="earned"
              name="Earned"
              fill="var(--li-series-a)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
            <Bar
              dataKey="collected"
              name="Collected"
              fill="var(--li-series-b)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Undated tranches fall in no month at all, so every bar here is light
          by that much. Saying so is the difference between a trend and a
          quietly wrong one. */}
      {undatedTranches > 0 && (
        <p className="li-mute mt-3 text-[11px]">
          {undatedTranches} {undatedTranches === 1 ? "release has" : "releases have"}{" "}
          no disbursement date and appear in no month here.
        </p>
      )}
    </div>
  );
}
