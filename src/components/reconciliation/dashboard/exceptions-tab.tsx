"use client";

import Link from "next/link";
import { formatRupees } from "@/lib/money";
import type { ExceptionsResponse } from "@/types";

const CODE_LABELS: Record<string, string> = {
  on_aggregator: "On an aggregator",
  no_sanctioned_amount: "No sanctioned amount",
  no_disbursement_date: "No disbursement date",
  no_receipt_date: "No receipt date",
  materially_short: "Genuinely underpaid",
};

/**
 * Severity without saturated colour, which this direction avoids entirely.
 * Rank reads from the surface step and the ink weight instead, with the one
 * accent reserved for the highest — the same logic that keeps the rest of the
 * page greyscale. The word itself is always present, so the ranking never
 * depends on a colour being noticed.
 */
/**
 * Severity carries a left rule in the documented semantic colour, plus the
 * word itself — colour is never the only signal.
 */
function severityRule(severity: string): string {
  if (severity === "high") return "var(--li-rose)";
  if (severity === "medium") return "var(--li-amber)";
  return "var(--li-hairline)";
}

/**
 * Everything the book can't be trusted on, already sorted by severity then by
 * money at stake. One record tripping two rules yields two rows — they are
 * two separate fixes, which is why the counts reconcile with data_quality.
 */
export function ExceptionsTab({ data }: { data: ExceptionsResponse }) {
  const codes = Object.entries(data.by_code ?? {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {codes.map(([code, count]) => (
          <div key={code} className="li-card p-4">
            <p className="li-num li-figure-sm">
              {count.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs font-medium">
              {CODE_LABELS[code] ?? code}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm li-mute">
        {data.total.toLocaleString()} issues across the book. A record
        breaking two rules appears twice — they are two separate fixes.
      </p>

      <div className="space-y-2">
        {data.items.map((item, i) => (
          <div
            key={`${item.lead_id}-${item.code}-${i}`}
            className="li-card p-4"
            style={{ borderLeft: `3px solid ${severityRule(item.severity)}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="li-tag">{item.severity}</span>
              <span className="text-[16px]">{item.issue}</span>
              <Link
                href={`/leads/${item.lead_id}`}
                className="text-sm hover:underline"
              >
                {item.full_name}
                {item.serial_no != null && (
                  <span className="ml-1.5 li-num li-mute text-[11px]">
                    #{item.serial_no}
                  </span>
                )}
              </Link>
              {item.bank_name && (
                <span className="li-mute text-[13px]">
                  {item.bank_name}
                </span>
              )}
              {item.amount != null && (
                <span className="ml-auto font-mono text-sm tabular-nums">
                  {formatRupees(item.amount)}
                </span>
              )}
            </div>
            {/* Written to be read by a person — in the row, not a tooltip. */}
            <p className="mt-1.5 text-xs leading-relaxed li-mute">
              {item.why}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
