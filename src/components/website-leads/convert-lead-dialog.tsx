"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsersStore } from "@/stores/users-store";
import { roleLabel } from "@/lib/constants";
import {
  AlreadyLinkedError,
  websiteLeadsService,
  type ConvertSubmissionBody,
} from "@/services/website-leads-service";
import { ArrowRight, Loader2, UserCheck } from "lucide-react";
import { FormChip } from "./submission-badges";
import type { WebsiteSubmission } from "@/types";

// Select can't hold an empty-string value, so "leave unassigned" needs a
// sentinel that never collides with a UUID.
const UNASSIGNED = "__unassigned__";

interface ConvertLeadDialogProps {
  submission: WebsiteSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a lead is created — drop the row and refresh counts. */
  onConverted: (submission: WebsiteSubmission) => void;
  /**
   * Fired on a 409. The backend has already re-tagged the submission as
   * `duplicate` and linked it, so the caller should mirror that locally.
   */
  onAlreadyLinked: (submission: WebsiteSubmission, leadId: string | null) => void;
}

export function ConvertLeadDialog({
  submission,
  open,
  onOpenChange,
  onConverted,
  onAlreadyLinked,
}: ConvertLeadDialogProps) {
  const router = useRouter();
  const users = useUsersStore((s) => s.users);
  const ensureFetched = useUsersStore((s) => s.ensureFetched);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [counsellorId, setCounsellorId] = useState(UNASSIGNED);
  const [preCounsellorId, setPreCounsellorId] = useState(UNASSIGNED);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set when the convert 409s — swaps the dialog body for the "already a
  // lead" outcome instead of closing with an error toast.
  const [linkedLeadId, setLinkedLeadId] = useState<string | null | undefined>(
    undefined
  );

  // Reset to the submission's own values every time the dialog opens, so a
  // previous row's edits never leak into the next one.
  useEffect(() => {
    if (!open || !submission) return;
    ensureFetched();
    setFullName(submission.full_name ?? "");
    setEmail(submission.email ?? "");
    setPhone(submission.phone ?? "");
    setCounsellorId(UNASSIGNED);
    setPreCounsellorId(UNASSIGNED);
    setNotes("");
    setLinkedLeadId(undefined);
    setIsSubmitting(false);
  }, [open, submission, ensureFetched]);

  if (!submission) return null;

  const alreadyLinked = linkedLeadId !== undefined;

  // The backend needs at least one contact channel to build a lead from.
  const hasContact = !!email.trim() || !!phone.trim();

  const handleConvert = async () => {
    setIsSubmitting(true);
    try {
      // Send only what the counsellor actually changed or filled in —
      // omitted fields fall back to what the form originally sent.
      const body: ConvertSubmissionBody = {};
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      if (trimmedName && trimmedName !== (submission.full_name ?? ""))
        body.full_name = trimmedName;
      if (trimmedEmail !== (submission.email ?? "")) body.email = trimmedEmail;
      if (trimmedPhone !== (submission.phone ?? "")) body.phone = trimmedPhone;
      if (counsellorId !== UNASSIGNED) body.assigned_agent_id = counsellorId;
      if (preCounsellorId !== UNASSIGNED)
        body.pre_counsellor_id = preCounsellorId;
      if (notes.trim()) body.notes = notes.trim();

      const lead = await websiteLeadsService.convert(submission.id, body);
      toast.success("Lead created", {
        description: lead.full_name || trimmedName || "Opening lead…",
        action: {
          label: "Open lead",
          onClick: () => router.push(`/leads/${lead.id}`),
        },
      });
      onConverted(submission);
      onOpenChange(false);
      router.push(`/leads/${lead.id}`);
    } catch (error: unknown) {
      if (error instanceof AlreadyLinkedError) {
        // Expected triage outcome, not a failure — show it in-place.
        setLinkedLeadId(error.leadId);
        onAlreadyLinked(submission, error.leadId);
        return;
      }
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to convert submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLinkedLead = () => {
    if (!linkedLeadId) return;
    onOpenChange(false);
    router.push(`/leads/${linkedLeadId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {alreadyLinked ? (
          <>
            <DialogHeader>
              <DialogTitle>This person is already a lead</DialogTitle>
              <DialogDescription>
                An active lead already exists with this email or phone. The
                submission has been marked as a duplicate and linked to it — no
                new lead was created.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="min-w-0">
                <p className="font-medium">
                  {submission.full_name || "This submission"}
                </p>
                <p className="text-muted-foreground">
                  {[submission.email, submission.phone]
                    .filter(Boolean)
                    .join(" · ") || "No contact details"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {linkedLeadId && (
                <Button onClick={openLinkedLead}>
                  Open existing lead
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Convert to lead</DialogTitle>
              <DialogDescription>
                Fix any typos before the lead is created — it&apos;s cheaper
                than editing afterwards.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <FormChip
                formKey={submission.form_key}
                formName={submission.form_name}
              />
              {submission.page && (
                <span className="truncate text-xs text-muted-foreground">
                  {submission.page}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="convert-name">Name</Label>
                <Input
                  id="convert-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="convert-email">Email</Label>
                  <Input
                    id="convert-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="convert-phone">Phone</Label>
                  <Input
                    id="convert-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {!hasContact && (
                <p className="text-xs text-destructive">
                  A lead needs an email or a phone number. Check the
                  submission&apos;s raw phone value if the visitor mistyped it.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="convert-counsellor">Counsellor</Label>
                  <Select
                    value={counsellorId}
                    onValueChange={setCounsellorId}
                  >
                    <SelectTrigger id="convert-counsellor" className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} · {roleLabel(u.role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="convert-pre-counsellor">Pre-counsellor</Label>
                  <Select
                    value={preCounsellorId}
                    onValueChange={setPreCounsellorId}
                  >
                    <SelectTrigger
                      id="convert-pre-counsellor"
                      className="w-full"
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} · {roleLabel(u.role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="convert-notes">Notes</Label>
                <Textarea
                  id="convert-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra context for whoever picks this up…"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvert}
                disabled={isSubmitting || !hasContact}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create lead
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
