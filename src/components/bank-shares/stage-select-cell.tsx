"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { showApiError } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageChangeFields } from "@/components/shared/stage-change-fields";
import { useStageConfig } from "@/hooks/use-stage-config";
import { BANK_STATUS_PRIORITY } from "@/lib/constants";
import {
  buildStagePayload,
  EMPTY_STAGE_DRAFT,
  stageAppliesImmediately,
  stageNeedsBankCommitment,
  validateStageChange,
  type StageChangeDraft,
} from "@/lib/stage-change";
import type { BankShareSummary, BankStatus, LeadStage } from "@/types";

/**
 * The bank this lead is furthest along with, used to pre-select the lender on
 * a PF Paid move. Only a default — the user can always pick another.
 */
function furthestBank(
  shares: Record<string, BankShareSummary> | undefined
): string {
  let best = "";
  let bestRank = 0;
  for (const [bank, share] of Object.entries(shares ?? {})) {
    const rank = BANK_STATUS_PRIORITY[share.bank_status as BankStatus] ?? 0;
    if (rank > bestRank) {
      best = bank;
      bestRank = rank;
    }
  }
  return best;
}

interface StageSelectCellProps {
  leadId: string;
  currentStage: LeadStage;
  shares?: Record<string, BankShareSummary>;
  /** Refetch — a stage move can also change this lead's bank cells. */
  onChanged: () => void;
}

export function StageSelectCell({
  leadId,
  currentStage,
  shares,
  onChanged,
}: StageSelectCellProps) {
  const { slug, getEntry, getValidTransitions } = useStageConfig();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<LeadStage | null>(null);
  const [draft, setDraft] = useState<StageChangeDraft>(EMPTY_STAGE_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const entry = getEntry(currentStage);
  const targets = getValidTransitions(currentStage);
  // Disbursed is terminal — the backend rejects every target, so there's
  // nothing to open.
  const locked = targets.length === 0;

  const close = () => {
    setOpen(false);
    setPending(null);
    setDraft(EMPTY_STAGE_DRAFT);
  };

  const submit = async (stage: LeadStage, withDraft: StageChangeDraft) => {
    setSubmitting(true);
    try {
      await api.post(
        `/leads/${leadId}/stage`,
        buildStagePayload(slug, stage, withDraft)
      );
      toast.success(`Moved to ${getEntry(stage).label}`);
      close();
      // A PF Paid move also rewrites this lead's bank cell and primary bank,
      // so the row is refetched rather than patched locally.
      onChanged();
    } catch (error: unknown) {
      // These detail strings are written for the user — shown as they are.
      showApiError(error, "Couldn't change the stage");
    } finally {
      setSubmitting(false);
    }
  };

  const pick = (stage: LeadStage) => {
    if (stageAppliesImmediately(slug, stage)) {
      submit(stage, EMPTY_STAGE_DRAFT);
      return;
    }
    setDraft({
      ...EMPTY_STAGE_DRAFT,
      bankName: stageNeedsBankCommitment(stage) ? furthestBank(shares) : "",
    });
    setPending(stage);
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        entry.bgClass,
        entry.textClass
      )}
    >
      <span className="truncate">{entry.label}</span>
      {!locked && <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />}
    </span>
  );

  // Colour alone never carries the stage — the label is always present, here
  // and in the row tint's legend.
  if (locked) {
    return <span title={`${entry.label} — this stage is final`}>{badge}</span>;
  }

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="max-w-full rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`Stage: ${entry.label}. Change stage`}
        >
          {badge}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        {pending === null ? (
          <ScrollArea className="max-h-72 overflow-y-auto">
            <div className="p-1">
              {targets.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  disabled={submitting}
                  onClick={() => pick(stage)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      getEntry(stage).color
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{getEntry(stage).label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3 p-3">
            <p className="text-sm font-medium">
              Move to {getEntry(pending).label}
            </p>

            <StageChangeFields
              toStage={pending}
              draft={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => {
                  const problem = validateStageChange(slug, pending, draft);
                  if (problem) {
                    toast.error(problem);
                    return;
                  }
                  submit(pending, draft);
                }}
              >
                {submitting && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
