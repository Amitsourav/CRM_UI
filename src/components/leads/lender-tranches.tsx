"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatRupees, rupeesToNumber } from "@/lib/money";
import { showApiError } from "@/lib/api-errors";
import { todayIso } from "@/lib/stage-change";
import { useAuthStore } from "@/stores/auth-store";
import { reconciliationService } from "@/services/reconciliation-service";
import type { BankEntry, DisbursementRow } from "@/types";

const LAKH = 100_000;

function trancheDate(value?: string | null): string {
  // Historical rows carry no date. They still count for money — only ageing
  // excludes them — so this is a dash, never today.
  if (!value) return "—";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "d MMM yyyy") : value;
}

interface LenderTranchesProps {
  leadId: string;
  entry: BankEntry;
  onChanged?: () => void;
}

/**
 * Instalment history for one lender file.
 *
 * An education loan is sanctioned once and released semester by semester, and
 * FMC earns commission per release — so an instalment that never gets
 * recorded is commission that never gets invoiced. Nineteen files are already
 * multi-tranche and only a third of approved money has been drawn, so this is
 * a panel on the file rather than something hidden behind a hover.
 */
export function LenderTranches({
  leadId,
  entry,
  onChanged,
}: LenderTranchesProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [tranches, setTranches] = useState<DisbursementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DisbursementRow | null>(null);
  const [deleting, setDeleting] = useState<DisbursementRow | null>(null);

  const fetchTranches = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setTranches(await reconciliationService.listTranches(leadId, entry.id));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setLoadError(err.response?.data?.detail || "Couldn't load the releases");
      setTranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [leadId, entry.id]);

  useEffect(() => {
    fetchTranches();
  }, [fetchTranches]);

  // The lender file's loan_amount is the sanction, in rupees — same unit the
  // tranches come back in, so nothing is converted here.
  const sanctioned = useMemo(() => {
    if (entry.loan_amount == null || entry.loan_amount === "") return null;
    const parsed =
      typeof entry.loan_amount === "number"
        ? entry.loan_amount
        : Number(String(entry.loan_amount).replace(/[,\s₹]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [entry.loan_amount]);

  const drawn = tranches.reduce(
    (sum, t) => sum + rupeesToNumber(t.disbursed_amount),
    0
  );
  const remaining = sanctioned == null ? null : Math.max(sanctioned - drawn, 0);
  const percent =
    sanctioned == null ? null : Math.min(Math.round((drawn / sanctioned) * 100), 100);

  const canAdd = isAdmin && entry.bank_status === "disbursed";

  return (
    <div className="mt-1.5 space-y-2 rounded-b-md border-t bg-muted/20 px-2 pt-2 pb-2 -mx-2 -mb-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Releases</p>
        {canAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add release
          </Button>
        )}
      </div>

      {/* Drawdown: whether more money is coming, and how much commission is
          still to be earned on this student. */}
      {sanctioned != null ? (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-teal-500 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{percent}% drawn</span>
            {" · "}
            {formatRupees(drawn)} of {formatRupees(sanctioned)}
            {remaining != null && remaining > 0 && (
              <> · {formatRupees(remaining)} still to come</>
            )}
          </p>
        </div>
      ) : (
        // Saying so beats drawing a bar against a number we don't have.
        !isLoading && (
          <p className="text-[11px] text-muted-foreground">
            {formatRupees(drawn)} released. No sanctioned amount recorded, so
            there&apos;s nothing to measure it against.
          </p>
        )
      )}

      {isLoading && (
        <p className="text-[11px] text-muted-foreground">Loading releases…</p>
      )}

      {!isLoading && loadError && (
        <p className="text-[11px] text-muted-foreground">{loadError}</p>
      )}

      {!isLoading && !loadError && tranches.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Nothing released yet.
        </p>
      )}

      {!isLoading && tranches.length > 0 && (
        <ul className="space-y-1">
          {tranches.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded border bg-background px-2 py-1 text-xs"
            >
              <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">
                #{t.tranche_no}
              </span>
              <span className="font-mono tabular-nums font-medium">
                {formatRupees(t.disbursed_amount)}
              </span>
              <span className="text-muted-foreground">
                {trancheDate(t.disbursed_on)}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {t.earns_commission === false ? (
                  <span className="text-muted-foreground">no commission</span>
                ) : (
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatRupees(t.commission_amount)}
                  </span>
                )}
                {isAdmin && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-[11px]"
                      onClick={() => setEditing(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => setDeleting(t)}
                      aria-label={`Delete release ${t.tranche_no}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <TrancheDialog
        open={adding}
        onOpenChange={setAdding}
        title={`Add a release — ${entry.bank_name}`}
        remaining={remaining}
        sanctioned={sanctioned}
        isFirst={tranches.length === 0}
        onSubmit={async (amountLakh, on, reference) => {
          await reconciliationService.addTranche(leadId, entry.id, {
            disbursed_amount_lakh: amountLakh,
            disbursed_on: on,
            ...(reference ? { utr_reference: reference } : {}),
          });
          await fetchTranches();
          onChanged?.();
        }}
      />

      <TrancheDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Edit release #${editing?.tranche_no ?? ""} — ${entry.bank_name}`}
        remaining={
          // The row's own amount isn't competing with itself for headroom.
          remaining == null || !editing
            ? remaining
            : remaining + rupeesToNumber(editing.disbursed_amount)
        }
        sanctioned={sanctioned}
        isFirst={false}
        initialAmountLakh={
          editing ? rupeesToNumber(editing.disbursed_amount) / LAKH : undefined
        }
        initialDate={editing?.disbursed_on ?? undefined}
        initialReference={editing?.utr_reference ?? undefined}
        onSubmit={async (amountLakh, on, reference) => {
          if (!editing) return;
          await reconciliationService.update(editing.id, {
            disbursed_amount_lakh: amountLakh,
            disbursed_on: on,
            ...(reference ? { utr_reference: reference } : {}),
          });
          setEditing(null);
          await fetchTranches();
          onChanged?.();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this release?"
        description={
          deleting
            ? `${formatRupees(deleting.disbursed_amount)} released on ${trancheDate(deleting.disbursed_on)}. Its commission goes with it.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await reconciliationService.removeTranche(deleting.id);
            toast.success("Release deleted");
            setDeleting(null);
            await fetchTranches();
            onChanged?.();
          } catch (error: unknown) {
            showApiError(error, "Couldn't delete the release");
          }
        }}
      />
    </div>
  );
}

interface TrancheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Rupees left to draw, or null when the sanction isn't recorded. */
  remaining: number | null;
  sanctioned: number | null;
  isFirst: boolean;
  initialAmountLakh?: number;
  initialDate?: string;
  initialReference?: string;
  onSubmit: (
    amountLakh: number,
    disbursedOn: string,
    reference: string
  ) => Promise<void>;
}

function TrancheDialog({
  open,
  onOpenChange,
  title,
  remaining,
  sanctioned,
  isFirst,
  initialAmountLakh,
  initialDate,
  initialReference,
  onSubmit,
}: TrancheDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  // Second press confirms a figure the first press questioned.
  const [warned, setWarned] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmountLakh != null ? String(initialAmountLakh) : "");
    setDate(initialDate ?? "");
    setReference(initialReference ?? "");
    setWarned(null);
  }, [open, initialAmountLakh, initialDate, initialReference]);

  const parsed = Number(amount.trim());
  const valid = Number.isFinite(parsed) && parsed > 0;
  const rupees = valid ? parsed * LAKH : 0;

  // Both of these have happened for real, and the backend accepts whatever
  // it's given — this dialog is the only place they get caught.
  const overRemaining =
    valid && remaining != null && rupees > remaining
      ? `${formatRupees(rupees)} exceeds the ${formatRupees(remaining)} still to be drawn on this sanction. Is this what the bank actually released?`
      : null;
  const wholeSanction =
    valid && isFirst && sanctioned != null && Math.round(rupees) === Math.round(sanctioned)
      ? `That's the full sanction of ${formatRupees(sanctioned)}. Correct for a single full drawdown — but it's also what typing the loan size produces.`
      : null;
  const warning = overRemaining ?? wholeSanction;

  const submit = async () => {
    if (!valid) {
      toast.error("Enter the amount released, in lakhs.");
      return;
    }
    if (!date) {
      toast.error("Set the date the money was released.");
      return;
    }
    if (date > todayIso()) {
      toast.error("The release date can't be in the future.");
      return;
    }
    if (warning && warned !== warning) {
      setWarned(warning);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed, date, reference.trim());
      toast.success("Release recorded");
      onOpenChange(false);
    } catch (error: unknown) {
      showApiError(error, "Couldn't record the release");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tranche-amount">Amount released (in lakhs)</Label>
            <div className="relative">
              <Input
                id="tranche-amount"
                autoFocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setWarned(null);
                }}
                placeholder="3"
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                lakh
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              What the bank actually paid out, never the sanction.
              {valid && <> 3 means ₹3,00,000 — this is {formatRupees(rupees)}.</>}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tranche-date">Date released</Label>
            <Input
              id="tranche-date"
              type="date"
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tranche-ref">
              Payout reference{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="tranche-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="The lender's payout reference"
            />
          </div>

          {warning && (
            <div
              className={cn(
                "rounded-md border p-3 text-sm",
                warned === warning
                  ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"
              )}
            >
              <p>{warning}</p>
              {warned === warning && (
                <p className="mt-1 font-medium">Save again to confirm.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {warning && warned === warning ? "Save anyway" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
