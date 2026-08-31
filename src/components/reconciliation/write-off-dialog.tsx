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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRupees } from "@/lib/money";
import { reconciliationService } from "@/services/reconciliation-service";
import type { DisbursementRow } from "@/types";

interface WriteOffDialogProps {
  row: DisbursementRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Stops chasing a row and drops it out of the outstanding total. */
export function WriteOffDialog({
  row,
  onOpenChange,
  onSaved,
}: WriteOffDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) setReason(row.write_off_reason ?? "");
  }, [row]);

  if (!row) return null;

  const save = async () => {
    if (!reason.trim()) {
      toast.error("Say why this is being written off.");
      return;
    }
    setSaving(true);
    try {
      await reconciliationService.update(row.id, {
        write_off_reason: reason.trim(),
      });
      toast.success("Written off");
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't write this off");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Write off — {row.lead_name} / {row.bank_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {formatRupees(row.shortfall)} stops being chased and leaves the
            outstanding total. The row stays on the report, marked written off.
          </p>
          <div className="space-y-2">
            <Label htmlFor="write-off-reason">Reason</Label>
            <Textarea
              id="write-off-reason"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Settled at a lower rate by agreement"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Write off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
