"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showApiError } from "@/lib/api-errors";
import { BANK_STATUS_LABELS } from "@/lib/constants";
import { parseLakhs, todayIso } from "@/lib/stage-change";
import { leadBanksService } from "@/services/lead-banks-service";
import { reconciliationService } from "@/services/reconciliation-service";
import { useBankStatusesStore } from "@/stores/bank-statuses-store";
import { BankShareThread } from "./bank-share-thread";
import type { BankShareSummary, BankStatus } from "@/types";

/** A share counts as "moving" if the group has spoken within this window. */
const RECENT_ACTIVITY_MS = 48 * 60 * 60 * 1000;

export function isRecentlyActive(share: BankShareSummary): boolean {
  if (!share.last_message_at) return false;
  const at = new Date(share.last_message_at).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < RECENT_ACTIVITY_MS;
}

// Weight tracks how much conversation a share has drawn, so a busy file reads
// heavier than a dormant one at a glance. Deliberately a single ink ramp: the
// lead's own colour scale belongs to the row, and a lender's status is not a
// smaller version of the lead's stage.
function weightClasses(count: number): string {
  if (count >= 5) return "bg-foreground/[0.16] text-foreground";
  if (count >= 1) return "bg-foreground/[0.09] text-foreground/90";
  return "bg-foreground/[0.04] text-foreground/60";
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return BANK_STATUS_LABELS[status as BankStatus] ?? status;
}

interface BankShareCellProps {
  leadId: string;
  leadName: string;
  bankName: string;
  /** Undefined ⇒ never shared with this bank ⇒ blank cell. */
  share?: BankShareSummary;
  onPatchShare: (bankName: string, patch: Partial<BankShareSummary>) => void;
}

/**
 * One lead × one bank. Filled iff a share exists — that presence is the
 * entire fill rule.
 *
 * Hover reads the conversation; click sets this lender's status. That status
 * is this lender's decision about this file and nothing more: a cell going
 * `lost` means this bank declined, which leaves the lead's stage and the
 * row's colour untouched. A lead can sit `lost` with one bank and live with
 * two others — a normal state, not something to reconcile.
 *
 * An empty cell is a single faint dot rather than an outlined box: at ~20
 * banks × 25 rows most of this grid is empty, and 500 outlines read as noise
 * that competes with the shares themselves. Blank cells have no entry to
 * PATCH, so they stay inert.
 */
export function BankShareCell({
  leadId,
  leadName,
  bankName,
  share,
  onPatchShare,
}: BankShareCellProps) {
  const options = useBankStatusesStore((s) => s.options);
  const ensureStatuses = useBankStatusesStore((s) => s.ensureFetched);

  const [hoverOpen, setHoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Which money form is open, if any. `pf_paid` needs an amount; `disbursed`
  // needs an amount and a date; `tranche` records a later instalment on a
  // file that already disbursed.
  const [form, setForm] = useState<null | {
    kind: "pf_paid" | "disbursed" | "tranche";
    amount: string;
    date: string;
    reference: string;
  }>(null);

  useEffect(() => {
    if (menuOpen) ensureStatuses();
  }, [menuOpen, ensureStatuses]);

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
  const current = share.bank_status ?? null;
  const declined = current === "lost";
  const editable = !!share.entry_id;

  // The offered list is not the full set — a cell can hold a status that has
  // been retired from it, and dropping that would leave the cell looking
  // unset. Its own status always leads the list.
  const choices: Array<{ value: string; label: string }> = [];
  if (current) choices.push({ value: current, label: statusLabel(current) });
  for (const option of options) {
    if (option.value !== current) choices.push(option);
  }

  const close = () => {
    setMenuOpen(false);
    setForm(null);
  };

  const patch = async (
    status: string,
    extra: {
      loan_amount_lakh?: number;
      disbursed_amount_lakh?: number;
      disbursed_on?: string;
      utr_reference?: string;
    } = {}
  ) => {
    if (!share.entry_id) return;
    const previous = current;
    const previousAmount = share.loan_amount_lakh;

    // Optimistic — the grid request behind this page runs 2–20s.
    onPatchShare(bankName, {
      bank_status: status,
      ...(extra.loan_amount_lakh !== undefined
        ? { loan_amount_lakh: extra.loan_amount_lakh }
        : {}),
    });
    setSaving(true);
    try {
      await leadBanksService.update(leadId, share.entry_id, {
        bank_status: status as BankStatus,
        ...extra,
      });
      toast.success(`${bankName} set to ${statusLabel(status)}`);
      close();
    } catch (error: unknown) {
      onPatchShare(bankName, {
        bank_status: previous,
        loan_amount_lakh: previousAmount,
      });
      showApiError(error, "Couldn't update this bank");
    } finally {
      setSaving(false);
    }
  };

  const pick = (status: string) => {
    // Idempotent: re-picking the current status neither re-asks for figures
    // nor writes a second tranche.
    if (status === current) {
      close();
      return;
    }
    if (status === "pf_paid") {
      // The backend accepts the status alone once an amount is stored, but
      // showing the figure being committed beats saving a number the user
      // can't see. Pre-filled when there is one.
      setForm({
        kind: "pf_paid",
        amount:
          share.loan_amount_lakh != null ? String(share.loan_amount_lakh) : "",
        date: "",
        reference: "",
      });
      return;
    }
    if (status === "disbursed") {
      // Commission is earned on what was released, so this asks rather than
      // assuming the sanctioned figure — they are often different.
      setForm({ kind: "disbursed", amount: "", date: "", reference: "" });
      return;
    }
    patch(status);
  };

  const addTranche = async (amountLakh: number, on: string, ref: string) => {
    if (!share.entry_id) return;
    setSaving(true);
    try {
      await reconciliationService.addTranche(leadId, share.entry_id, {
        disbursed_amount_lakh: amountLakh,
        disbursed_on: on,
        ...(ref.trim() ? { utr_reference: ref.trim() } : {}),
      });
      toast.success(`Recorded another release from ${bankName}`);
      close();
    } catch (error: unknown) {
      showApiError(error, "Couldn't record the disbursement");
    } finally {
      setSaving(false);
    }
  };

  const trigger = (
    <button
      type="button"
      aria-label={
        `${leadName} · ${bankName}` +
        (current ? `, ${statusLabel(current)}` : "") +
        (count > 0 ? `, ${count} messages` : "") +
        (active ? ", active in the last 48 hours" : "") +
        (editable ? ". Change this bank's status" : "")
      }
      className={cn(
        "relative mx-auto flex h-7 w-full max-w-[62px] items-center justify-center rounded",
        "font-mono text-[11px] tabular-nums",
        "ring-foreground/25 transition-[box-shadow,background-color] hover:ring-2",
        "focus-visible:ring-2 focus-visible:outline-none",
        // This lender declined. Styled on the cell alone — the row's colour
        // belongs to the lead's stage and must not move with it.
        declined
          ? "bg-red-100 text-red-800 line-through dark:bg-red-950/50 dark:text-red-300"
          : weightClasses(count),
        saving && "opacity-60"
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
  );

  const thread = (
    <HoverCardContent align="start" className="w-80">
      <BankShareThread leadId={leadId} bankName={bankName} summary={share} />
    </HoverCardContent>
  );

  // No entry id means there is nothing to PATCH — hover only.
  if (!editable) {
    return (
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        {thread}
      </HoverCard>
    );
  }

  // Both triggers chain onto the button itself: each `asChild` merges its
  // props into the next, and the button is the only DOM node in the chain.
  // Wrapping one root around the other instead would hand the click handlers
  // to a component that renders nothing and drops them.
  return (
    <Popover open={menuOpen} onOpenChange={(o) => (o ? setMenuOpen(true) : close())}>
      <HoverCard
        // Suppressed while the status menu is open, so the two panels can't
        // stack on top of each other.
        open={hoverOpen && !menuOpen}
        onOpenChange={setHoverOpen}
        openDelay={120}
        closeDelay={80}
      >
        <PopoverTrigger asChild>
          <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        </PopoverTrigger>
        {thread}
      </HoverCard>
      <PopoverContent align="start" className="w-56 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-medium">{bankName}</p>
          <p className="text-[11px] text-muted-foreground">
            This lender only — the lead&apos;s stage is unchanged.
          </p>
        </div>

        {form === null ? (
          <ScrollArea className="max-h-60 overflow-y-auto">
            <div className="p-1">
              {choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  disabled={saving}
                  onClick={() => pick(choice.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      choice.value === current ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{choice.label}</span>
                </button>
              ))}

              {/* Most loans come out in one go, so a second instalment lives
                  here rather than in the main flow. */}
              {current === "disbursed" && (
                <>
                  <div className="my-1 border-t" />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setForm({
                        kind: "tranche",
                        amount: "",
                        date: "",
                        reference: "",
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>Add another release</span>
                  </button>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3 p-3">
            <div className="space-y-2">
              <Label htmlFor="cell-amount">
                {form.kind === "pf_paid" ? "Sanctioned amount" : "Amount released"}
              </Label>
              <div className="relative">
                <Input
                  id="cell-amount"
                  autoFocus
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, amount: e.target.value })
                  }
                  placeholder={form.kind === "pf_paid" ? "45" : "30"}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  lakh
                </span>
              </div>
              {form.kind !== "pf_paid" && (
                <p className="text-xs text-muted-foreground">
                  What this lender actually released, not the sanctioned
                  amount.
                </p>
              )}
            </div>

            {form.kind !== "pf_paid" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cell-date">Date released</Label>
                  <Input
                    id="cell-date"
                    type="date"
                    max={todayIso()}
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cell-ref">
                    Bank reference{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="cell-ref"
                    value={form.reference}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, reference: e.target.value })
                    }
                    placeholder="AXISN12345678"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => {
                  const amount = parseLakhs(form.amount);
                  if (amount === null) {
                    toast.error(
                      "Enter the amount in lakhs — a number above 0."
                    );
                    return;
                  }
                  if (form.kind === "pf_paid") {
                    patch("pf_paid", { loan_amount_lakh: amount });
                    return;
                  }
                  if (!form.date) {
                    toast.error("Set the date the money was released.");
                    return;
                  }
                  if (form.date > todayIso()) {
                    toast.error("The release date can't be in the future.");
                    return;
                  }
                  if (form.kind === "tranche") {
                    addTranche(amount, form.date, form.reference);
                    return;
                  }
                  patch("disbursed", {
                    disbursed_amount_lakh: amount,
                    disbursed_on: form.date,
                    ...(form.reference.trim()
                      ? { utr_reference: form.reference.trim() }
                      : {}),
                  });
                }}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
