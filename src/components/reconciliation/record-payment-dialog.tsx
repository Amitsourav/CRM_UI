"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupees, rupeesToNumber } from "@/lib/money";
import { todayIso } from "@/lib/stage-change";
import { reconciliationService } from "@/services/reconciliation-service";
import type { DisbursementRow } from "@/types";

interface RecordPaymentDialogProps {
  row: DisbursementRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function toAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Records what a lender actually paid against one disbursement.
 *
 * TDS is the point of this form. Indian lenders withhold it (s.194H) before
 * paying commission, so ₹45,000 owed typically arrives as ₹40,500 cash plus
 * ₹4,500 withheld. The backend settles on cash + TDS, so entering only the
 * cash leaves a shortfall that doesn't exist — do that a few hundred times
 * and the shortfall column stops meaning anything.
 *
 * Hence: both fields side by side, TDS defaulted to the gap once cash is
 * entered, and a live line showing what the entry settles.
 */
export function RecordPaymentDialog({
  row,
  onOpenChange,
  onSaved,
}: RecordPaymentDialogProps) {
  const [cash, setCash] = useState("");
  const [tds, setTds] = useState("");
  const [receivedOn, setReceivedOn] = useState("");
  const [reference, setReference] = useState("");
  // Set only for a negotiated settlement — otherwise the backend's own
  // rate × disbursed stands.
  const [agreed, setAgreed] = useState("");
  const [showAgreed, setShowAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setCash(row.amount_received != null ? String(row.amount_received) : "");
    setTds(row.tds_deducted != null ? String(row.tds_deducted) : "");
    setReceivedOn(row.received_on ?? todayIso());
    setReference(row.utr_reference ?? "");
    setAgreed("");
    setShowAgreed(false);
  }, [row]);

  if (!row) return null;

  // A row that earns nothing owes nothing, whatever the rate says.
  const earns = row.earns_commission !== false;
  const calculated = earns ? rupeesToNumber(row.commission_amount) : 0;
  const agreedValue = toAmount(agreed);
  // The agreed figure replaces the calculated one everywhere, including the
  // live settles line — otherwise the form would check the entry against a
  // number it isn't going to save.
  const due = agreedValue !== null ? agreedValue : calculated;
  const cashValue = toAmount(cash) ?? 0;
  const tdsValue = toAmount(tds) ?? 0;
  const settles = cashValue + tdsValue;
  const gap = due - settles;

  // The default that stops the common mistake: what's left of the commission
  // after the cash is almost always exactly the tax withheld.
  const suggestTds = () => {
    const remaining = due - cashValue;
    if (cashValue > 0 && remaining > 0 && !toAmount(tds)) {
      setTds(String(Math.round(remaining)));
    }
  };

  const save = async () => {
    const amount = toAmount(cash);
    if (amount === null) {
      toast.error("Enter the amount received.");
      return;
    }
    if (!receivedOn) {
      toast.error("Set the date the payment arrived.");
      return;
    }
    if (row.disbursed_on && receivedOn < row.disbursed_on) {
      toast.error("The payment can't be dated before the disbursement.");
      return;
    }
    // The backend refuses an explicit amount on a row that earns nothing;
    // saying so here beats bouncing it off the API.
    if (agreedValue !== null && !earns) {
      toast.error(
        "This row is marked as not earning commission. Tick it first to set an agreed amount."
      );
      return;
    }

    setSaving(true);
    try {
      await reconciliationService.update(row.id, {
        amount_received: amount,
        tds_deducted: toAmount(tds) ?? 0,
        received_on: receivedOn,
        ...(reference.trim() ? { payment_reference: reference.trim() } : {}),
        ...(agreedValue !== null ? { commission_amount: agreedValue } : {}),
      });
      toast.success("Payment recorded");
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't record the payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Record payment — {row.lead_name} / {row.bank_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted px-3 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                Commission due
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatRupees(due)}
                {agreedValue !== null && (
                  <span className="ml-2 font-sans text-xs font-normal text-muted-foreground line-through">
                    {formatRupees(calculated)}
                  </span>
                )}
              </span>
            </div>
            {!earns && (
              <p className="mt-1 text-xs text-muted-foreground">
                Marked as not earning commission.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cash">Amount received</Label>
              <Input
                id="cash"
                autoFocus
                inputMode="decimal"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                onBlur={suggestTds}
                placeholder="40500"
              />
              <p className="text-xs text-muted-foreground">Cash in the bank</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tds">TDS deducted</Label>
              <Input
                id="tds"
                inputMode="decimal"
                value={tds}
                onChange={(e) => setTds(e.target.value)}
                placeholder="4500"
              />
              <p className="text-xs text-muted-foreground">
                Tax the lender withheld
              </p>
            </div>
          </div>

          {/* Live, because this line is what stops a wrong entry. */}
          <div
            className={cn(
              "flex items-baseline justify-between rounded-md border px-3 py-2 text-sm",
              gap <= 0
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
                : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
            )}
          >
            <span>Settles</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatRupees(settles)}
              <span className="ml-2 font-sans font-normal">
                {gap <= 0
                  ? "· fully paid"
                  : `· ${formatRupees(gap)} still short`}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="received-on">Date received</Label>
              <Input
                id="received-on"
                type="date"
                min={row.disbursed_on ?? undefined}
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-ref">
                Reference{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="payment-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="UTR123456"
              />
            </div>
          </div>

          {/* Tucked behind a toggle: settling for a different figure is the
              exception, and an always-visible box invites overwriting a
              correct calculation. */}
          {showAgreed || agreed ? (
            <div className="space-y-2">
              <Label htmlFor="agreed-amount">Agreed commission</Label>
              <Input
                id="agreed-amount"
                inputMode="decimal"
                value={agreed}
                onChange={(e) => setAgreed(e.target.value)}
                placeholder={String(Math.round(calculated))}
                disabled={!earns}
              />
              <p className="text-xs text-muted-foreground">
                {earns
                  ? "Replaces rate × disbursed for this row. Leave blank to keep the calculated figure."
                  : "Tick \"earns commission\" on this row first."}
              </p>
            </div>
          ) : (
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() => setShowAgreed(true)}
            >
              Settled for a different amount?
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
