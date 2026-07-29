"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getFormChipClasses,
  SUBMISSION_STATUS_CLASSES,
  SUBMISSION_STATUS_LABELS,
} from "@/lib/website-forms";
import { Link2 } from "lucide-react";
import type { WebsiteSubmission, WebsiteSubmissionStatus } from "@/types";

/** Coloured chip for the originating form. Label always comes from the API. */
export function FormChip({
  formKey,
  formName,
  className,
}: {
  formKey: string;
  formName: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border", getFormChipClasses(formKey), className)}
    >
      {formName || formKey}
    </Badge>
  );
}

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: WebsiteSubmissionStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border", SUBMISSION_STATUS_CLASSES[status], className)}
    >
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Shown on a still-`new` row that ingest already matched to an existing lead.
 * Converting it will 409, so this is a heads-up before the counsellor tries.
 */
export function AlreadyInCrmBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
        className
      )}
    >
      <Link2 className="h-3 w-3" />
      Already in CRM
    </Badge>
  );
}

/** True when the row is unreviewed but already linked to a lead. */
export function isAlreadyInCrm(submission: WebsiteSubmission): boolean {
  return submission.status === "new" && !!submission.lead_id;
}
