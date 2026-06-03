"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Lead, User } from "@/types";

interface LeadReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSuccess: () => void;
}

// Sentinel used by the Selects to represent "no selection" — Radix
// trips on empty-string values. We translate it to null at submit
// time when the user has explicitly cleared a field.
const UNSET = "__unset";

export function LeadReassignDialog({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: LeadReassignDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const initialAgent = lead.assigned_agent_id ?? null;
  const initialPreCounsellor = lead.pre_counsellor_id ?? null;

  // null = explicitly unassigned, undefined = not changed yet
  const [agentId, setAgentId] = useState<string | null>(initialAgent);
  const [preCounsellorId, setPreCounsellorId] = useState<string | null>(
    initialPreCounsellor
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reseed local state every time the dialog opens or the underlying
  // lead changes so reopening the modal doesn't carry over a draft.
  useEffect(() => {
    if (open) {
      setAgentId(lead.assigned_agent_id ?? null);
      setPreCounsellorId(lead.pre_counsellor_id ?? null);
      setReason("");
    }
  }, [open, lead.assigned_agent_id, lead.pre_counsellor_id]);

  useEffect(() => {
    if (!open || users.length > 0 || usersLoading) return;
    setUsersLoading(true);
    api
      .get("/users?is_active=true")
      .then(({ data }) => setUsers(data.items || data || []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [open, users.length, usersLoading]);

  const counsellors = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "manager"),
    [users]
  );
  const preCounsellors = useMemo(
    () => users.filter((u) => u.role === "pre_counsellor"),
    [users]
  );

  const agentChanged = agentId !== initialAgent;
  const preChanged = preCounsellorId !== initialPreCounsellor;
  const dirty = agentChanged || preChanged;

  const handleSubmit = async () => {
    if (!dirty) {
      toast.message("No changes to save");
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (agentChanged) body.assigned_agent_id = agentId;
      if (preChanged) body.pre_counsellor_id = preCounsellorId;
      if (reason.trim()) body.reason = reason.trim();
      await api.post(`/leads/${lead.id}/reassign`, body);
      toast.success("Lead reassigned");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to reassign this lead");
      } else {
        toast.error(err.response?.data?.detail || "Failed to reassign lead");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reassign lead</DialogTitle>
          <DialogDescription>
            Change the Counsellor and/or Pre-Counsellor on{" "}
            <span className="font-medium text-foreground">
              {lead.full_name}
            </span>
            . Empty either field to unassign that role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Counsellor</Label>
            <div className="flex items-center gap-2">
              <Select
                value={agentId ?? UNSET}
                onValueChange={(v) =>
                  setAgentId(v === UNSET ? null : v)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      usersLoading ? "Loading…" : "Pick a counsellor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET}>Unassigned</SelectItem>
                  {counsellors.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={agentId == null}
                onClick={() => setAgentId(null)}
              >
                Unassign
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pre-Counsellor</Label>
            <div className="flex items-center gap-2">
              <Select
                value={preCounsellorId ?? UNSET}
                onValueChange={(v) =>
                  setPreCounsellorId(v === UNSET ? null : v)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      usersLoading ? "Loading…" : "Pick a pre-counsellor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET}>Unassigned</SelectItem>
                  {preCounsellors.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={preCounsellorId == null}
                onClick={() => setPreCounsellorId(null)}
              >
                Unassign
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reassign-reason">Reason (optional)</Label>
            <Textarea
              id="reassign-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this lead being reassigned?"
            />
            <p className="text-[11px] text-muted-foreground">
              Appears on the lead's Timeline as the audit reason.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !dirty}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
