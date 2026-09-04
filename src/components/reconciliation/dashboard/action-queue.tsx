"use client";

import Link from "next/link";
import { AlertCircle, Clock, FileText, TrendingUp } from "lucide-react";
import { formatCompactRupees, formatRupees } from "@/lib/money";
import type {
  DashboardDataQuality,
  DashboardPipelineAhead,
  ExceptionsResponse,
} from "@/types";

interface ActionQueueProps {
  dq: DashboardDataQuality;
  ahead: DashboardPipelineAhead;
  exceptions?: ExceptionsResponse | null;
}

/**
 * What to do next, ordered by what it is worth.
 *
 * These are the same counters as the data-quality panel, phrased as tasks —
 * a number that tells you something is wrong is only useful if it also tells
 * you what to open. `tranches_materially_short` leads rather than
 * `tranches_short`, because the difference between them is rounding.
 */
export function ActionQueue({ dq, ahead, exceptions }: ActionQueueProps) {
  const rows = [
    {
      icon: Clock,
      tint: "var(--li-rose-soft)",
      fg: "var(--li-rose)",
      title: `${dq.tranches_materially_short} genuinely underpaid releases`,
      note: `short by over ₹100 and 2% · ${
        dq.tranches_short - dq.tranches_materially_short
      } more differ only by rounding`,
      value: null as string | null,
      href: "/reconciliation?status=short_paid",
    },
    {
      icon: FileText,
      tint: "var(--li-amber-soft)",
      fg: "var(--li-amber)",
      title: `${dq.tranches_without_date} releases with no date`,
      note: "missing from every month and from ageing",
      value: null,
      href: "/reconciliation",
    },
    {
      icon: TrendingUp,
      tint: "var(--li-accent-soft)",
      fg: "var(--li-accent)",
      title: `${ahead.confirmed_files} files ready to draw`,
      note: `${formatCompactRupees(ahead.undrawn_total)} sanctioned pipeline`,
      value: formatRupees(ahead.future_commission),
      href: "/reconciliation/dashboard?tab=pipeline",
    },
    {
      icon: AlertCircle,
      tint: "var(--li-blue-soft)",
      fg: "var(--li-blue)",
      title: `${dq.files_on_aggregator} files on an aggregator`,
      note: "these earn nothing until moved to a real route",
      value: null,
      href: "/admin/lenders",
    },
  ];

  return (
    <div className="li-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="li-eyebrow">Today&apos;s priorities</p>
          <h3 className="li-title mt-1">Action queue</h3>
        </div>
        {exceptions && (
          <span className="li-tag li-num">{exceptions.total} actions</span>
        )}
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <Link
            key={row.title}
            href={row.href}
            className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--li-surface-soft)]"
          >
            <span className="li-tile shrink-0" style={{ background: row.tint }}>
              <row.icon className="h-4 w-4" style={{ color: row.fg }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">
                {row.title}
              </span>
              <span className="li-mute block text-[12px]">{row.note}</span>
            </span>
            {row.value && (
              <span className="li-num shrink-0 text-[14px] font-bold">
                {row.value}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
