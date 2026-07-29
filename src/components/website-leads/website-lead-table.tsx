"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, Loader2, RotateCcw, UserPlus } from "lucide-react";
import {
  AlreadyInCrmBadge,
  FormChip,
  isAlreadyInCrm,
  SubmissionStatusBadge,
} from "./submission-badges";
import { CopyText } from "./copy-text";
import type { WebsiteSubmission } from "@/types";

const MESSAGE_MAX_CHARS = 60;

function truncate(text: string, max = MESSAGE_MAX_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

interface WebsiteLeadTableProps {
  submissions: WebsiteSubmission[];
  onSelect: (submission: WebsiteSubmission) => void;
  onConvert: (submission: WebsiteSubmission) => void;
  onSpam: (submission: WebsiteSubmission) => void;
  onReopen: (submission: WebsiteSubmission) => void;
  pendingId?: string | null;
}

export function WebsiteLeadTable({
  submissions,
  onSelect,
  onConvert,
  onSpam,
  onReopen,
  pendingId,
}: WebsiteLeadTableProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((s) => {
              const isPending = pendingId === s.id;
              return (
                <TableRow
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className="cursor-pointer"
                >
                  <TableCell className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="truncate font-medium">
                        {s.full_name || "—"}
                      </p>
                      {isAlreadyInCrm(s) && <AlreadyInCrmBadge />}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[220px]">
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {s.email && (
                        <CopyText
                          value={s.email}
                          label="Email"
                          className="block"
                        />
                      )}
                      {s.phone && (
                        <CopyText
                          value={s.phone}
                          label="Phone"
                          className="block font-mono text-xs"
                        />
                      )}
                      {!s.email && !s.phone && <span>—</span>}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[200px]">
                    <div className="space-y-1">
                      <FormChip formKey={s.form_key} formName={s.form_name} />
                      {s.page && (
                        <p className="truncate text-xs text-muted-foreground">
                          {s.page}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[260px]">
                    {s.message ? (
                      <span
                        className="text-sm text-muted-foreground"
                        title={s.message}
                      >
                        {truncate(s.message)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <span
                      className="text-sm text-muted-foreground"
                      title={format(new Date(s.created_at), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(s.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>

                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      submission={s}
                      isPending={isPending}
                      onConvert={onConvert}
                      onSpam={onSpam}
                      onReopen={onReopen}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — the same row as a card. */}
      <div className="space-y-3 md:hidden">
        {submissions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className="cursor-pointer space-y-3 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{s.full_name || "—"}</p>
                <p
                  className="text-xs text-muted-foreground"
                  title={format(new Date(s.created_at), "PPpp")}
                >
                  {formatDistanceToNow(new Date(s.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <SubmissionStatusBadge status={s.status} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FormChip formKey={s.form_key} formName={s.form_name} />
              {isAlreadyInCrm(s) && <AlreadyInCrmBadge />}
            </div>

            <div
              className="space-y-0.5 text-sm text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {s.email && <CopyText value={s.email} label="Email" className="block" />}
              {s.phone && (
                <CopyText
                  value={s.phone}
                  label="Phone"
                  className="block font-mono text-xs"
                />
              )}
            </div>

            {s.message && (
              <p className="text-sm text-muted-foreground">
                {truncate(s.message, 120)}
              </p>
            )}

            <div onClick={(e) => e.stopPropagation()}>
              <RowActions
                submission={s}
                isPending={pendingId === s.id}
                onConvert={onConvert}
                onSpam={onSpam}
                onReopen={onReopen}
                fullWidth
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Triage buttons. Convert/Spam exist only on `new` rows — a converted row can
 * never be spammed, and a spam/duplicate row can only be reopened.
 */
function RowActions({
  submission,
  isPending,
  onConvert,
  onSpam,
  onReopen,
  fullWidth,
}: {
  submission: WebsiteSubmission;
  isPending: boolean;
  onConvert: (s: WebsiteSubmission) => void;
  onSpam: (s: WebsiteSubmission) => void;
  onReopen: (s: WebsiteSubmission) => void;
  fullWidth?: boolean;
}) {
  if (submission.status === "new") {
    return (
      <div className={fullWidth ? "flex gap-2" : "flex justify-end gap-2"}>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => onConvert(submission)}
          className={fullWidth ? "flex-1" : undefined}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          Convert
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => onSpam(submission)}
        >
          <Ban className="mr-1.5 h-3.5 w-3.5" />
          Spam
        </Button>
      </div>
    );
  }

  if (submission.status === "spam" || submission.status === "duplicate") {
    return (
      <div className={fullWidth ? "flex" : "flex justify-end"}>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => onReopen(submission)}
          className={fullWidth ? "flex-1" : undefined}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Reopen
        </Button>
      </div>
    );
  }

  return null;
}

export function WebsiteLeadTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
