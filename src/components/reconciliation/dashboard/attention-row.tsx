"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DashboardDataQuality } from "@/types";

interface Counter {
  label: string;
  value: number;
  note: string;
  href?: string;
  accent?: boolean;
}

/**
 * Why a number above might be wrong. Not decoration — a dashboard that hides
 * these ends up trusted more than it deserves.
 *
 * `tranches_materially_short` is the headline, never `tranches_short`: the
 * gap between them is rounding between the lender's arithmetic and ours, so
 * "71 lenders underpaid us" would be wrong and ignored within a week. The
 * rounding count appears only as an aside on that tile.
 */
export function AttentionRow({ dq }: { dq: DashboardDataQuality }) {
  const rounding = dq.tranches_short - dq.tranches_materially_short;

  const counters: Counter[] = [
    {
      label: "Genuinely underpaid",
      value: dq.tranches_materially_short,
      note: `over ₹100 and 2% short · ${rounding} more differ only by rounding`,
      accent: dq.tranches_materially_short > 0,
    },
    {
      label: "Undateable releases",
      value: dq.tranches_without_date,
      note: "in no month and no ageing bucket",
      accent: dq.tranches_without_date > 0,
    },
    {
      label: "Payments with no date",
      value: dq.payments_without_receipt_date,
      note: "collection trend reads light",
    },
    {
      label: "Files with no amount",
      value: dq.files_without_sanctioned_amount,
      note: "excluded from sanctioned and from commission to come",
    },
    {
      label: "On an aggregator",
      value: dq.files_on_aggregator,
      note: "can never earn until moved to a real route",
      href: "/admin/lenders",
      accent: dq.files_on_aggregator > 0,
    },
    {
      label: "Awaiting payment",
      value: dq.tranches_awaiting_payment,
      note: "nothing received yet",
    },
  ];

  return (
    <div>
      <h3 className="li-title mb-3">Needs attention</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {counters.map((c) => {
          const body = (
            <>
              <p
                className={cn(
                  "li-num li-figure-sm",
                  c.accent && "text-[var(--li-rose)]"
                )}
              >
                {c.value.toLocaleString()}
              </p>
              <p className="mt-1 text-[13px] font-normal">{c.label}</p>
              <p className="li-mute mt-1 text-[11px] leading-snug">
                {c.note}
              </p>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="li-card p-4 transition-colors li-card-lift"
            >
              {body}
            </Link>
          ) : (
            <div key={c.label} className="li-card p-4">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
