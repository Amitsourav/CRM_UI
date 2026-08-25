"use client";

import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { BankShareThread } from "./bank-share-thread";
import type { BankShareSummary } from "@/types";

/** A share counts as "moving" if the group has spoken within this window. */
const RECENT_ACTIVITY_MS = 48 * 60 * 60 * 1000;

export function isRecentlyActive(share: BankShareSummary): boolean {
  if (!share.last_message_at) return false;
  const at = new Date(share.last_message_at).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < RECENT_ACTIVITY_MS;
}

// Weight tracks how much conversation a share has drawn, so a busy file reads
// heavier than a dormant one at a glance. Deliberately a single ink ramp, not
// a colour scale: colour in this app means funnel progress, and a share is
// not progress — `bank_status` never touches how a cell looks.
function weightClasses(count: number): string {
  if (count >= 5) return "bg-foreground/[0.16] text-foreground";
  if (count >= 1) return "bg-foreground/[0.09] text-foreground/90";
  return "bg-foreground/[0.04] text-foreground/60";
}

interface BankShareCellProps {
  leadId: string;
  leadName: string;
  bankName: string;
  /** Undefined ⇒ never shared with this bank ⇒ blank cell. */
  share?: BankShareSummary;
}

/**
 * One lead × one bank. Filled iff a share exists — that presence is the
 * entire rule.
 *
 * An empty cell is a single faint dot rather than an outlined box: at ~20
 * banks × 25 rows most of this grid is empty, and 500 outlines read as noise
 * that competes with the shares themselves.
 */
export function BankShareCell({
  leadId,
  leadName,
  bankName,
  share,
}: BankShareCellProps) {
  if (!share) {
    return (
      <div
        className="flex h-7 items-center justify-center"
        aria-label={`Not shared with ${bankName}`}
      >
        <span className="h-[3px] w-[3px] rounded-full bg-foreground/15" />
      </div>
    );
  }

  const count = share.message_count ?? 0;
  const active = isRecentlyActive(share);

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`${leadName} shared with ${bankName}${
            count > 0 ? `, ${count} messages` : ""
          }${active ? ", active in the last 48 hours" : ""}`}
          className={cn(
            "relative mx-auto flex h-7 w-full max-w-[62px] items-center justify-center rounded",
            "font-mono text-[11px] tabular-nums",
            "ring-foreground/25 transition-[box-shadow,background-color] hover:ring-2",
            "focus-visible:ring-2 focus-visible:outline-none",
            weightClasses(count)
          )}
        >
          {count > 0 ? (
            <span>{count > 99 ? "99+" : count}</span>
          ) : (
            <span className="h-1 w-1 rounded-full bg-current" />
          )}
          {active && (
            <span
              className="absolute -right-px -top-px h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-card"
              aria-hidden
            />
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <BankShareThread leadId={leadId} bankName={bankName} summary={share} />
      </HoverCardContent>
    </HoverCard>
  );
}
