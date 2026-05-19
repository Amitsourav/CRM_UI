"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leadBanksService } from "@/services/lead-banks-service";
import type { BankEntry, PfStatus } from "@/types";

interface SanctionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  entry: BankEntry;
  // Called with the updated entry returned by the backend so the
  // parent can splice it into its local list without refetching.
  onSaved: (updated: BankEntry) => void;
}

// Local form shape — everything is a string so the inputs round-trip
// cleanly. We convert types at submit time.
interface FormState {
  application_id: string;
  sanction_date: string;
  loan_amount: string;
  roi: string;
  tenure_months: string;
  pf_amount: string;
  first_tranche_amount: string;
  no_of_tranches: string;
  pf_status: PfStatus | "";
}

const blankForm = (): FormState => ({
  application_id: "",
  sanction_date: "",
  loan_amount: "",
  roi: "",
  tenure_months: "",
  pf_amount: "",
  first_tranche_amount: "",
  no_of_tranches: "",
  pf_status: "",
});

function entryToForm(entry: BankEntry): FormState {
  return {
    application_id: entry.application_id ?? "",
    sanction_date: entry.sanction_date ?? "",
    loan_amount:
      entry.loan_amount == null ? "" : String(entry.loan_amount),
    roi: entry.roi == null ? "" : String(entry.roi),
    tenure_months:
      entry.tenure_months == null ? "" : String(entry.tenure_months),
    pf_amount: entry.pf_amount == null ? "" : String(entry.pf_amount),
    first_tranche_amount:
      entry.first_tranche_amount == null
        ? ""
        : String(entry.first_tranche_amount),
    no_of_tranches:
      entry.no_of_tranches == null ? "" : String(entry.no_of_tranches),
    pf_status: entry.pf_status ?? "",
  };
}

export function SanctionDetailsDialog({
  open,
  onOpenChange,
  leadId,
  entry,
  onSaved,
}: SanctionDetailsDialogProps) {
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever the dialog opens or the entry changes.
  useEffect(() => {
    if (open) setForm(entryToForm(entry));
  }, [open, entry]);

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send only fields that differ from the entry's current value
      // (or are non-empty). Empty strings → null so the user can
      // clear a value if BE permits.
      const toNumberOrNull = (s: string): number | null => {
        if (s.trim() === "") return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };
      const body = {
        application_id: form.application_id.trim() || null,
        sanction_date: form.sanction_date || null,
        loan_amount: form.loan_amount.trim() || null,
        roi: form.roi.trim() || null,
        tenure_months: toNumberOrNull(form.tenure_months),
        pf_amount: form.pf_amount.trim() || null,
        first_tranche_amount: form.first_tranche_amount.trim() || null,
        no_of_tranches: toNumberOrNull(form.no_of_tranches),
        pf_status:
          form.pf_status === "paid" || form.pf_status === "pending"
            ? form.pf_status
            : null,
      };
      const updated = await leadBanksService.update(leadId, entry.id, body);
      toast.success("Sanction details saved");
      onSaved(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 400) {
        toast.error(
          err.response.data?.detail ||
            "Sanction details can't be set yet — bank status must be sanctioned or later."
        );
      } else if (err.response?.status === 403) {
        toast.error("You don't have permission to edit this lead");
      } else {
        toast.error(
          err.response?.data?.detail || "Couldn't save sanction details"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sanction details — {entry.bank_name}</DialogTitle>
          <DialogDescription>
            Fill in whatever you have. Empty fields stay unset.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-application-id">Application ID</Label>
            <Input
              id="sd-application-id"
              value={form.application_id}
              onChange={(e) => update({ application_id: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-sanction-date">Sanction date</Label>
            <Input
              id="sd-sanction-date"
              type="date"
              value={form.sanction_date}
              onChange={(e) => update({ sanction_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-loan-amount">Loan amount (₹)</Label>
            <Input
              id="sd-loan-amount"
              inputMode="decimal"
              placeholder="e.g. 25,00,000"
              value={form.loan_amount}
              onChange={(e) => update({ loan_amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-roi">ROI (%)</Label>
            <Input
              id="sd-roi"
              inputMode="decimal"
              placeholder="e.g. 10.5"
              value={form.roi}
              onChange={(e) => update({ roi: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-tenure">Tenure (months)</Label>
            <Input
              id="sd-tenure"
              type="number"
              inputMode="numeric"
              value={form.tenure_months}
              onChange={(e) => update({ tenure_months: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-pf-amount">PF amount (₹)</Label>
            <Input
              id="sd-pf-amount"
              inputMode="decimal"
              value={form.pf_amount}
              onChange={(e) => update({ pf_amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-first-tranche">First tranche amount (₹)</Label>
            <Input
              id="sd-first-tranche"
              inputMode="decimal"
              value={form.first_tranche_amount}
              onChange={(e) =>
                update({ first_tranche_amount: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-tranches">Number of tranches</Label>
            <Input
              id="sd-tranches"
              type="number"
              inputMode="numeric"
              value={form.no_of_tranches}
              onChange={(e) => update({ no_of_tranches: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>PF status</Label>
            <Select
              value={form.pf_status === "" ? "__unset" : form.pf_status}
              onValueChange={(v) =>
                update({
                  pf_status:
                    v === "paid" || v === "pending"
                      ? (v as PfStatus)
                      : "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset">Not set</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
