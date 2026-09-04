"use client";

import { useEffect } from "react";
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
import { useBanksStore } from "@/stores/banks-store";
import { useLostReasonsStore } from "@/stores/lost-reasons-store";
import { useStageConfig } from "@/hooks/use-stage-config";
import {
  stageNeedsBankCommitment,
  stageNeedsDisbursement,
  stageNeedsDueDate,
  stageNeedsSanction,
  stageNeedsLostReason,
  todayIso,
  type StageChangeDraft,
} from "@/lib/stage-change";
import type { LeadStage } from "@/types";

interface StageChangeFieldsProps {
  toStage: LeadStage;
  draft: StageChangeDraft;
  onChange: (patch: Partial<StageChangeDraft>) => void;
  /** Optional free-text remark. Off in tight surfaces like the grid popover. */
  showNotes?: boolean;
  autoFocus?: boolean;
}

/**
 * The fields a stage move needs, shared by every surface that moves a lead so
 * the three of them can't drift apart. The container (dialog, popover) and the
 * submit button belong to the caller.
 */
export function StageChangeFields({
  toStage,
  draft,
  onChange,
  showNotes = false,
  autoFocus = false,
}: StageChangeFieldsProps) {
  const { slug } = useStageConfig();
  const lostReasons = useLostReasonsStore((s) => s.reasons);
  const lostReasonsFetched = useLostReasonsStore((s) => s.fetched);
  const ensureLostReasons = useLostReasonsStore((s) => s.ensureFetched);
  const banks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);

  const needsLostReason = stageNeedsLostReason(toStage);
  const needsBank = stageNeedsBankCommitment(toStage);
  const needsDisbursement = stageNeedsDisbursement(toStage);
  const needsSanction = stageNeedsSanction(toStage);
  const needsDueDate = stageNeedsDueDate(slug, toStage);

  useEffect(() => {
    if (needsLostReason) ensureLostReasons();
    if (needsBank || needsDisbursement || needsSanction) ensureBanks();
  }, [
    needsLostReason,
    needsBank,
    needsDisbursement,
    needsSanction,
    ensureLostReasons,
    ensureBanks,
  ]);

  if (needsLostReason) {
    return (
      <div className="space-y-2">
        <Label>Reason</Label>
        {/* The backend's response shape drives the control: a non-empty list
            is locked (free text is rejected); an empty list means this tenant
            has no canonical reasons, so free text is all there is. */}
        {!lostReasonsFetched ? (
          <p className="text-xs text-muted-foreground">Loading reasons…</p>
        ) : lostReasons.length > 0 ? (
          <Select
            value={draft.lostReason}
            onValueChange={(v) => onChange({ lostReason: v })}
          >
            <SelectTrigger autoFocus={autoFocus}>
              <SelectValue placeholder="Pick a reason" />
            </SelectTrigger>
            <SelectContent>
              {lostReasons.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Textarea
            value={draft.lostReason}
            onChange={(e) => onChange({ lostReason: e.target.value })}
            placeholder="Why was this lead lost?"
            autoFocus={autoFocus}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {needsBank && (
        <>
          <div className="space-y-2">
            <Label>Bank</Label>
            <Select
              value={draft.bankName}
              onValueChange={(v) => onChange({ bankName: v })}
            >
              <SelectTrigger autoFocus={autoFocus}>
                <SelectValue placeholder="Which bank was paid?" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pf-amount">Sanctioned amount (in lakhs)</Label>
            <div className="relative">
              <Input
                id="pf-amount"
                inputMode="decimal"
                value={draft.bankLoanAmountLakh}
                onChange={(e) =>
                  onChange({ bankLoanAmountLakh: e.target.value })
                }
                placeholder="60"
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                lakh
              </span>
            </div>
          </div>
        </>
      )}

      {showNotes && (
        <div className="space-y-2">
          <Label htmlFor="stage-notes">Remark</Label>
          <Textarea
            id="stage-notes"
            value={draft.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="What happened on this call?"
          />
        </div>
      )}

      {needsSanction && (
        <>
          <div className="space-y-2">
            <Label htmlFor="sanctioned-amount">Sanctioned amount (in lakhs)</Label>
            <div className="relative">
              <Input
                id="sanctioned-amount"
                autoFocus={autoFocus}
                inputMode="decimal"
                value={draft.sanctionedAmountLakh}
                onChange={(e) =>
                  onChange({ sanctionedAmountLakh: e.target.value })
                }
                placeholder="30"
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                lakh
              </span>
            </div>
            {/* A sanction is an offer: it sets the ceiling for what can be
                drawn down, and earns nothing until the file reaches PF Paid. */}
            <p className="text-xs text-muted-foreground">
              What the lender approved. Revenue starts counting at PF Paid.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sanction-date">Sanction date</Label>
            <Input
              id="sanction-date"
              type="date"
              max={todayIso()}
              value={draft.sanctionDate}
              onChange={(e) => onChange({ sanctionDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Lender{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Select
              value={draft.bankName}
              onValueChange={(v) => onChange({ bankName: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="The lead's own lender" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Left blank the field isn't sent at all, and the backend uses
                the lead's own lender — a better answer than anything guessed
                from here, so this stays empty by default. */}
            <p className="text-xs text-muted-foreground">
              Leave blank to use the lead&apos;s lender. Only pick one if a
              different lender released the money.
            </p>
          </div>
        </>
      )}

      {needsDisbursement && (
        <>
          <div className="space-y-2">
            <Label htmlFor="disbursed-amount">Amount released (in lakhs)</Label>
            <div className="relative">
              <Input
                id="disbursed-amount"
                autoFocus={autoFocus}
                inputMode="decimal"
                value={draft.disbursedAmountLakh}
                onChange={(e) =>
                  onChange({ disbursedAmountLakh: e.target.value })
                }
                placeholder="30"
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                lakh
              </span>
            </div>
            {/* Commission is worked out per release. Typing the sanctioned
                amount when only the first instalment came out overstates it,
                and nothing downstream catches that. */}
            <p className="text-xs text-muted-foreground">
              What the lender actually released, not the sanctioned amount.
              This is the <span className="font-medium">first release</span> —
              later instalments are added on the lender file.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disbursed-on">Date released</Label>
            <Input
              id="disbursed-on"
              type="date"
              max={todayIso()}
              value={draft.disbursedOn}
              onChange={(e) => onChange({ disbursedOn: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Lender{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Select
              value={draft.bankName}
              onValueChange={(v) => onChange({ bankName: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="The lead's own lender" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Left blank the field isn't sent at all, and the backend uses
                the lead's own lender — a better answer than anything guessed
                from here, so this stays empty by default. */}
            <p className="text-xs text-muted-foreground">
              Leave blank to use the lead&apos;s lender. Only pick one if a
              different lender released the money.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utr-reference">
              Bank reference{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="utr-reference"
              value={draft.utrReference}
              onChange={(e) => onChange({ utrReference: e.target.value })}
              placeholder="AXISN12345678"
            />
          </div>
        </>
      )}

      {/* Rendered for every stage the backend might want a date on, which is
          all of them bar the terminal ones — money-collecting stages
          included. Keyed off !needsDisbursement rather than off
          stageNeedsDueDate so a stage where the date is merely optional
          still offers it. */}
      {!needsDisbursement && (
        <div className="space-y-2">
          <Label htmlFor="stage-due-date">
            Follow-up{" "}
            {!needsDueDate && (
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            )}
          </Label>
          <Input
            id="stage-due-date"
            type="date"
            value={draft.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            autoFocus={autoFocus && !needsBank}
          />
        </div>
      )}
    </div>
  );
}
