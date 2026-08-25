"use client";

import { useEffect } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BANK_STATUS_BADGE_CLASSES, BANK_STATUS_LABELS } from "@/lib/constants";
import { formatLakhs } from "@/lib/loan-amount";
import {
  threadKey,
  useBankShareThreadStore,
} from "@/stores/bank-share-thread-store";
import type { BankShareSummary, BankStatus } from "@/types";

/* ── date helpers (defensive: these strings come straight off the wire) ── */

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function absoluteTime(value?: string | null): string {
  const date = parse(value);
  return date ? format(date, "d MMM yyyy, h:mm a") : "—";
}

export function relativeTime(value?: string | null): string {
  const date = parse(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

function isBankStatus(value: unknown): value is BankStatus {
  return typeof value === "string" && value in BANK_STATUS_LABELS;
}

export function BankStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium",
        isBankStatus(status) ? BANK_STATUS_BADGE_CLASSES[status] : undefined
      )}
    >
      {isBankStatus(status) ? BANK_STATUS_LABELS[status] : status}
    </Badge>
  );
}

interface BankShareThreadProps {
  leadId: string;
  bankName: string;
  /** Grid-payload summary — rendered instantly, before the thread lands. */
  summary: BankShareSummary;
}

/**
 * Hover-card body for one shared cell: the summary the grid already carries
 * renders immediately, and the full conversation streams in underneath once
 * the per-cell fetch resolves (cached for the session thereafter).
 */
export function BankShareThread({
  leadId,
  bankName,
  summary,
}: BankShareThreadProps) {
  const key = threadKey(leadId, bankName);
  const ensureFetched = useBankShareThreadStore((s) => s.ensureFetched);
  const thread = useBankShareThreadStore((s) => s.threads[key]);
  const isLoading = useBankShareThreadStore((s) => s.loading[key]);
  const error = useBankShareThreadStore((s) => s.errors[key]);

  // Mounted only while the hover card is open, so this is the fetch trigger.
  useEffect(() => {
    ensureFetched(leadId, bankName);
  }, [ensureFetched, leadId, bankName]);

  const messages = thread?.messages ?? [];
  const sharedBy = thread?.shared_by_name || summary.shared_by_name;
  const status = thread?.bank_status ?? summary.bank_status;

  return (
    <div className="space-y-3">
      {/* Header — available on hover with zero latency */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{bankName}</p>
          <BankStatusBadge status={status} />
        </div>
        {/* This lender's own figure — null until the file reaches sanctioned,
            so its absence is normal and shows nothing rather than a dash. */}
        {summary.loan_amount_lakh != null && (
          <p className="font-mono text-xs tabular-nums">
            {formatLakhs(summary.loan_amount_lakh)}
            <span className="ml-1 font-sans text-muted-foreground">
              sanctioned here
            </span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Shared {relativeTime(summary.shared_at)}
          {sharedBy ? ` by ${sharedBy}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          {absoluteTime(summary.shared_at)}
          {summary.source ? ` · via ${summary.source}` : ""}
        </p>
      </div>

      <div className="border-t" />

      {/* Conversation */}
      {messages.length === 0 && isLoading && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {summary.message_count
              ? `Loading ${summary.message_count} message${summary.message_count === 1 ? "" : "s"}…`
              : "Loading conversation…"}
          </p>
          {summary.last_message_preview && (
            <p className="line-clamp-2 rounded-md bg-muted px-2 py-1.5 text-xs">
              {summary.last_message_preview}
            </p>
          )}
          <div className="space-y-2 pt-1">
            <div className="h-8 w-4/5 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-8 w-3/5 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{error}</p>
          {summary.last_message_preview && (
            <p className="line-clamp-3 rounded-md bg-muted px-2 py-1.5 text-xs">
              {summary.last_message_preview}
            </p>
          )}
        </div>
      )}

      {!isLoading && !error && messages.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No messages in the group yet.
        </p>
      )}

      {messages.length > 0 && (
        <div className="-mr-1 max-h-72 space-y-2 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.is_our_team ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5",
                  message.is_our_team
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-medium",
                    message.is_our_team
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground"
                  )}
                >
                  {/* sender_name is frequently null for the bank's staff. */}
                  {message.sender_name ||
                    message.sender_phone ||
                    (message.is_our_team ? "Our team" : bankName)}
                </p>
                <p className="whitespace-pre-wrap break-words text-xs">
                  {message.body}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] tabular-nums",
                    message.is_our_team
                      ? "text-primary-foreground/65"
                      : "text-muted-foreground"
                  )}
                >
                  {absoluteTime(message.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
