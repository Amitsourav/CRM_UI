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
import { applicationsService } from "@/services/applications-service";
import { VISA_STATUS_LABELS } from "@/lib/constants";
import type { Application, VisaStatus } from "@/types";

interface ApplicationOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  entry: Application;
  // Called with the updated application returned by the backend so the
  // parent can splice it into its local list without refetching.
  onSaved: (updated: Application) => void;
}

// Local form shape — strings round-trip cleanly through the inputs.
interface FormState {
  offer_date: string;
  tuition_fee: string;
  scholarship_amount: string;
  deposit_amount: string;
  deposit_paid_date: string;
  cas_number: string;
  visa_status: VisaStatus | "";
}

const blankForm = (): FormState => ({
  offer_date: "",
  tuition_fee: "",
  scholarship_amount: "",
  deposit_amount: "",
  deposit_paid_date: "",
  cas_number: "",
  visa_status: "",
});

function entryToForm(entry: Application): FormState {
  return {
    offer_date: entry.offer_date ?? "",
    tuition_fee: entry.tuition_fee == null ? "" : String(entry.tuition_fee),
    scholarship_amount:
      entry.scholarship_amount == null ? "" : String(entry.scholarship_amount),
    deposit_amount:
      entry.deposit_amount == null ? "" : String(entry.deposit_amount),
    deposit_paid_date: entry.deposit_paid_date ?? "",
    cas_number: entry.cas_number ?? "",
    visa_status: entry.visa_status ?? "",
  };
}

const VISA_STATUSES = Object.keys(VISA_STATUS_LABELS) as VisaStatus[];

export function ApplicationOfferDialog({
  open,
  onOpenChange,
  leadId,
  entry,
  onSaved,
}: ApplicationOfferDialogProps) {
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(entryToForm(entry));
  }, [open, entry]);

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const toNumberOrNull = (s: string): number | null => {
        if (s.trim() === "") return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };
      const body = {
        offer_date: form.offer_date || null,
        tuition_fee: toNumberOrNull(form.tuition_fee),
        scholarship_amount: toNumberOrNull(form.scholarship_amount),
        deposit_amount: toNumberOrNull(form.deposit_amount),
        deposit_paid_date: form.deposit_paid_date || null,
        cas_number: form.cas_number.trim() || null,
        visa_status: form.visa_status || null,
      };
      const updated = await applicationsService.update(leadId, entry.id, body);
      toast.success("Offer details saved");
      onSaved(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 400) {
        toast.error(
          err.response.data?.detail ||
            "Offer details can't be set yet — status must be offer received or later."
        );
      } else if (err.response?.status === 403) {
        toast.error("You don't have permission to edit this lead");
      } else {
        toast.error(
          err.response?.data?.detail || "Couldn't save offer details"
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
          <DialogTitle>Offer details — {entry.university_name}</DialogTitle>
          <DialogDescription>
            Fill in whatever you have. Empty fields stay unset.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ao-offer-date">Offer date</Label>
            <Input
              id="ao-offer-date"
              type="date"
              value={form.offer_date}
              onChange={(e) => update({ offer_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ao-tuition">Tuition fee</Label>
            <Input
              id="ao-tuition"
              inputMode="decimal"
              placeholder="e.g. 18000"
              value={form.tuition_fee}
              onChange={(e) => update({ tuition_fee: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ao-scholarship">Scholarship amount</Label>
            <Input
              id="ao-scholarship"
              inputMode="decimal"
              placeholder="e.g. 2000"
              value={form.scholarship_amount}
              onChange={(e) => update({ scholarship_amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ao-deposit">Deposit amount</Label>
            <Input
              id="ao-deposit"
              inputMode="decimal"
              placeholder="e.g. 2000"
              value={form.deposit_amount}
              onChange={(e) => update({ deposit_amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ao-deposit-date">Deposit paid date</Label>
            <Input
              id="ao-deposit-date"
              type="date"
              value={form.deposit_paid_date}
              onChange={(e) => update({ deposit_paid_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ao-cas">CAS number</Label>
            <Input
              id="ao-cas"
              placeholder="e.g. CAS123"
              value={form.cas_number}
              onChange={(e) => update({ cas_number: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Visa status</Label>
            <Select
              value={form.visa_status === "" ? "__unset" : form.visa_status}
              onValueChange={(v) =>
                update({
                  visa_status: VISA_STATUSES.includes(v as VisaStatus)
                    ? (v as VisaStatus)
                    : "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset">Not set</SelectItem>
                {VISA_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {VISA_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
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
