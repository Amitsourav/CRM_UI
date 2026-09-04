"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { showApiError } from "@/lib/api-errors";
import { todayIso } from "@/lib/stage-change";
import {
  reconciliationService,
  type RecordPaymentBody,
} from "@/services/reconciliation-service";
import type { DisbursementRow } from "@/types";

const LAKH = 100_000;

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

interface EditTrancheDialogProps {
  row: DisbursementRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * Corrects the disbursement itself, as opposed to recording what was paid
 * against it. Reachable from the report row because that's where a wrong
 * figure gets noticed — before this, fixing a rate meant finding the lead.
 *
 * PATCH is `extra: forbid`, so only fields the user actually changed are
 * sent. Amount and rate recompute commission server-side; an explicit
 * commission amount overrides that, for a settlement agreed at a figure.
 */
export function EditTrancheDialog({
  row,
  onOpenChange,
  onSaved,
}: EditTrancheDialogProps) {
  const [amountLakh, setAmountLakh] = useState("");
  const [date, setDate] = useState("");
  const [rate, setRate] = useState("");
  const [gst, setGst] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setAmountLakh(String(rupeesToNumber(row.disbursed_amount) / LAKH));
    setDate(row.disbursed_on ?? "");
    setRate(row.commission_rate != null ? String(row.commission_rate) : "");
    setGst(row.gst_amount != null ? String(row.gst_amount) : "");
    setReference(row.utr_reference ?? "");
  }, [row]);

  if (!row) return null;

  const parsedAmount = num(amountLakh);
  const previewRupees = parsedAmount === null ? 0 : parsedAmount * LAKH;

  const save = async () => {
    if (parsedAmount === null || parsedAmount <= 0) {
      toast.error("Enter the amount released, in lakhs.");
      return;
    }
    if (date && date > todayIso()) {
      toast.error("The release date can't be in the future.");
      return;
    }

    // Only what changed — the endpoint rejects unknown fields, and sending a
    // value back unchanged risks overwriting a server-side recompute.
    const body: RecordPaymentBody = {};
    const originalLakh = rupeesToNumber(row.disbursed_amount) / LAKH;
    if (parsedAmount !== originalLakh) body.disbursed_amount_lakh = parsedAmount;
    if (date !== (row.disbursed_on ?? "")) body.disbursed_on = date;

    const parsedRate = num(rate);
    if (parsedRate !== null && String(parsedRate) !== String(row.commission_rate ?? "")) {
      body.commission_rate = parsedRate;
    }
    const parsedGst = num(gst);
    if (parsedGst !== null && String(parsedGst) !== String(row.gst_amount ?? "")) {
      body.gst_amount = parsedGst;
    }
    if (reference.trim() !== (row.utr_reference ?? "")) {
      body.utr_reference = reference.trim();
    }

    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await reconciliationService.update(row.id, body);
      toast.success("Disbursement updated");
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      showApiError(error, "Couldn't update the disbursement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Correct release #{row.tranche_no} — {row.lead_name} /{" "}
            {row.bank_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount released (in lakhs)</Label>
              <div className="relative">
                <Input
                  id="edit-amount"
                  autoFocus
                  inputMode="decimal"
                  value={amountLakh}
                  onChange={(e) => setAmountLakh(e.target.value)}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  lakh
                </span>
              </div>
              {parsedAmount !== null && (
                <p className="text-xs text-muted-foreground">
                  {formatRupees(previewRupees)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date released</Label>
              <Input
                id="edit-date"
                type="date"
                max={todayIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {/* Historical rows have none; clearing it isn't an error. */}
              <p className="text-xs text-muted-foreground">
                Blank on older rows.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Commission rate</Label>
              <div className="relative">
                <Input
                  id="edit-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="pr-7"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Recalculates the commission.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-gst">GST</Label>
              <Input
                id="edit-gst"
                inputMode="decimal"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                In rupees, billed on top.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-ref">
              Payout reference{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="AXISN12345678"
            />
          </div>
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
