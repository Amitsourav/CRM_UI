"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { BankShareThread } from "./bank-share-thread";
import type { BankShareSummary } from "@/types";

interface BankShareCellProps {
  leadId: string;
  leadName: string;
  bankName: string;
  /** Undefined ⇒ never shared with this bank ⇒ blank cell. */
  share?: BankShareSummary;
}

/**
 * One lead × one bank. Coloured iff a share exists — that presence is the
 * entire colouring rule; `bank_status` is shown in the hover card but never
 * drives the cell's appearance.
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
        className="mx-auto h-7 w-full max-w-[68px] rounded-md border border-dashed border-muted-foreground/15"
        aria-label={`Not shared with ${bankName}`}
      />
    );
  }

  const count = share.message_count ?? 0;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`${leadName} shared with ${bankName}`}
          className="mx-auto flex h-7 w-full max-w-[68px] items-center justify-center rounded-md bg-emerald-100 text-[11px] font-semibold text-emerald-800 ring-emerald-400 transition-shadow hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          {count > 0 ? (
            <span className="tabular-nums">{count > 99 ? "99+" : count}</span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <BankShareThread
          leadId={leadId}
          bankName={bankName}
          summary={share}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
