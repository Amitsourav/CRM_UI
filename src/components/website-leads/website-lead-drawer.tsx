"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatPayloadValue,
  isUrlValue,
  orderedPayloadEntries,
  payloadKeyLabel,
} from "@/lib/website-forms";
import {
  AlreadyInCrmBadge,
  FormChip,
  isAlreadyInCrm,
  SubmissionStatusBadge,
} from "./submission-badges";
import { CopyText } from "./copy-text";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  PhoneOff,
  RotateCcw,
  Ban,
  UserPlus,
} from "lucide-react";
import type { WebsiteSubmission } from "@/types";

interface WebsiteLeadDrawerProps {
  submission: WebsiteSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (submission: WebsiteSubmission) => void;
  onSpam: (submission: WebsiteSubmission) => void;
  onReopen: (submission: WebsiteSubmission) => void;
  /** Id of the submission currently mid-request, if any. */
  pendingId?: string | null;
}

export function WebsiteLeadDrawer({
  submission,
  open,
  onOpenChange,
  onConvert,
  onSpam,
  onReopen,
  pendingId,
}: WebsiteLeadDrawerProps) {
  if (!submission) return null;

  const payload = submission.payload ?? {};
  // FMC loan applications carry a link into the FMC admin, where the full
  // application record lives. Worth a real button, not a payload row.
  const adminUrl = isUrlValue(payload.admin_url) ? payload.admin_url : null;
  // Present when the visitor typed something unparseable into the phone
  // field — it means `phone` is empty and this is the only number we have.
  const phoneRaw =
    typeof payload.phone_raw === "string" && payload.phone_raw.trim()
      ? payload.phone_raw.trim()
      : null;
  const entries = orderedPayloadEntries(payload);

  const isPending = pendingId === submission.id;
  const canConvert = submission.status === "new";
  const canSpam = submission.status === "new";
  const canReopen =
    submission.status === "spam" || submission.status === "duplicate";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-3 border-b p-4 pr-12">
          <SheetTitle className="text-lg">
            {submission.full_name || "Unnamed submission"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Website form submission details
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2">
            <FormChip
              formKey={submission.form_key}
              formName={submission.form_name}
            />
            <SubmissionStatusBadge status={submission.status} />
            {isAlreadyInCrm(submission) && <AlreadyInCrmBadge />}
          </div>
          <p
            className="text-xs text-muted-foreground"
            title={format(new Date(submission.created_at), "PPpp")}
          >
            Received{" "}
            {formatDistanceToNow(new Date(submission.created_at), {
              addSuffix: true,
            })}
            {submission.page && ` · ${submission.page}`}
            {submission.tag && ` · ${submission.tag}`}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-4">
            {/* Linked lead — set when converted, or matched at ingest. */}
            {submission.lead_id && (
              <Link
                href={`/leads/${submission.lead_id}`}
                className="flex items-center justify-between rounded-md border bg-muted/50 p-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                View linked lead
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {/* Contact */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </h3>
              <div className="space-y-2 text-sm">
                {submission.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <CopyText value={submission.email} label="Email">
                      <a
                        href={`mailto:${submission.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="underline-offset-4 hover:underline"
                      >
                        {submission.email}
                      </a>
                    </CopyText>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No email provided</p>
                )}

                {submission.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <CopyText value={submission.phone} label="Phone">
                      <a
                        href={`tel:${submission.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="underline-offset-4 hover:underline"
                      >
                        {submission.phone}
                      </a>
                    </CopyText>
                  </div>
                ) : (
                  !phoneRaw && (
                    <p className="text-muted-foreground">No phone provided</p>
                  )
                )}

                {/* Unparseable phone — surfaced loudly because it's the only
                    number on the record when `phone` came back empty. */}
                {phoneRaw && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950">
                    <PhoneOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Unrecognised phone entry
                      </p>
                      <CopyText
                        value={phoneRaw}
                        label="Raw phone"
                        className="font-mono text-sm text-amber-900 dark:text-amber-100"
                      />
                      <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                        Typed by the visitor and couldn&apos;t be parsed
                        {submission.phone
                          ? "."
                          : " — this is the only number on this submission."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Message */}
            {submission.message && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Message
                  </h3>
                  <p className="whitespace-pre-wrap text-sm">
                    {submission.message}
                  </p>
                </section>
              </>
            )}

            {/* FMC loan application deep link */}
            {adminUrl && (
              <>
                <Separator />
                <Button asChild variant="outline" className="w-full">
                  <a href={adminUrl} target="_blank" rel="noopener noreferrer">
                    Open in FMC admin
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <p className="-mt-3 text-xs text-muted-foreground">
                  This is a loan application — the full record lives in the FMC
                  admin.
                </p>
              </>
            )}

            {/* Everything else the form posted. Rendered generically so new
                form fields show up without a frontend change. */}
            {entries.length > 0 && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Form details
                  </h3>
                  <dl className="divide-y rounded-md border">
                    {entries.map(([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-2 gap-2 px-3 py-2 text-sm"
                      >
                        <dt className="text-muted-foreground">
                          {payloadKeyLabel(key)}
                        </dt>
                        <dd className="min-w-0 break-words font-medium">
                          {isUrlValue(value) ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {value}
                            </a>
                          ) : (
                            formatPayloadValue(value)
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </>
            )}

            {/* Provenance */}
            <p className="text-xs text-muted-foreground">
              {submission.source && `Source: ${submission.source}`}
              {submission.external_id && ` · Ref: ${submission.external_id}`}
              {submission.reviewed_at &&
                ` · Reviewed ${format(
                  new Date(submission.reviewed_at),
                  "d MMM yyyy, h:mm a"
                )}`}
            </p>
          </div>
        </ScrollArea>

        {(canConvert || canSpam || canReopen) && (
          <div className="flex gap-2 border-t p-4">
            {canConvert && (
              <Button
                className="flex-1"
                disabled={isPending}
                onClick={() => onConvert(submission)}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Convert
              </Button>
            )}
            {canSpam && (
              <Button
                variant="ghost"
                disabled={isPending}
                onClick={() => onSpam(submission)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Spam
              </Button>
            )}
            {canReopen && (
              <Button
                variant="outline"
                className="flex-1"
                disabled={isPending}
                onClick={() => onReopen(submission)}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Reopen
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
