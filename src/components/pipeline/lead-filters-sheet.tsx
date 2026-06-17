"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useBanksStore } from "@/stores/banks-store";
import {
  APPLICATION_STATUS_LABELS,
  BANK_STATUS_LABELS,
} from "@/lib/constants";
import type { ApplicationStatus, BankStatus } from "@/types";
import {
  LEAD_SEGMENT_LABELS,
  type PipelineFilters,
} from "@/lib/pipeline-filters";
import type { LeadSource, User } from "@/types";

interface LeadFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PipelineFilters;
  onApply: (next: PipelineFilters) => void;
  showAgentFilter: boolean;
  // Lead-segment filter is admin-only — non-admin users only ever
  // see their own leads, so the filter is meaningless for them.
  showLeadSegmentFilter: boolean;
  // FMC shows bank/loan/DNP filters; Admitverse shows application/university/
  // budget filters instead (the backend ignores the other brand's params).
  isFmc: boolean;
  agents: User[];
  sources: LeadSource[];
  campaigns: { id: string; name: string }[];
}

const EMPTY_FILTERS: PipelineFilters = {};
const ALL_BANK_STATUSES = Object.keys(BANK_STATUS_LABELS) as BankStatus[];
const ALL_APPLICATION_STATUSES = Object.keys(
  APPLICATION_STATUS_LABELS
) as ApplicationStatus[];

export function LeadFiltersSheet({
  open,
  onOpenChange,
  value,
  onApply,
  showAgentFilter,
  showLeadSegmentFilter,
  isFmc,
  agents,
  sources,
  campaigns,
}: LeadFiltersSheetProps) {
  const banks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);
  useEffect(() => {
    // Bank list is only used by the FMC bank filter.
    if (open && isFmc) ensureBanks();
  }, [open, isFmc, ensureBanks]);

  // Local draft — applied to the parent only when the user clicks Apply.
  const [draft, setDraft] = useState<PipelineFilters>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const update = (patch: Partial<PipelineFilters>) =>
    setDraft((d) => ({ ...d, ...patch }));

  // Select uses "__all" as the unset sentinel since "" trips the
  // Radix "empty string value" guard.
  const fromSelectValue = (v: string): string => (v === "__all" ? "" : v);
  const toSelectValue = (v: string | undefined): string =>
    v && v !== "" ? v : "__all";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter pipeline</SheetTitle>
          <SheetDescription>
            Narrow the Kanban to a subset of leads. Filters combine with AND.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-q">Search</Label>
            <Input
              id="filter-q"
              placeholder="Name, phone, email…"
              value={draft.q ?? ""}
              onChange={(e) => update({ q: e.target.value })}
            />
          </div>

          {showAgentFilter && (
            <div className="space-y-1.5">
              <Label>Counsellor</Label>
              <Select
                value={toSelectValue(draft.agent_id)}
                onValueChange={(v) => update({ agent_id: fromSelectValue(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All counsellors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All counsellors</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showLeadSegmentFilter && (
            <div className="space-y-1.5">
              <Label>Lead segment</Label>
              <Select
                value={toSelectValue(draft.lead_segment)}
                onValueChange={(v) => {
                  const next = fromSelectValue(v);
                  update({
                    lead_segment:
                      next === "unassigned" ||
                      next === "counsellor" ||
                      next === "pre_counsellor" ||
                      next === "campaign"
                        ? next
                        : undefined,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All leads</SelectItem>
                  {(
                    Object.keys(LEAD_SEGMENT_LABELS) as Array<
                      keyof typeof LEAD_SEGMENT_LABELS
                    >
                  ).map((k) => (
                    <SelectItem key={k} value={k}>
                      {LEAD_SEGMENT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select
              value={toSelectValue(draft.source_id)}
              onValueChange={(v) => update({ source_id: fromSelectValue(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Campaign</Label>
            <Select
              value={toSelectValue(draft.campaign_id)}
              onValueChange={(v) => update({ campaign_id: fromSelectValue(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFmc && (
            <div className="space-y-1.5">
              <Label>Bank</Label>
              <Select
                value={toSelectValue(draft.bank_name)}
                onValueChange={(v) => update({ bank_name: fromSelectValue(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any bank</SelectItem>
                  {banks.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isFmc && (
            <div className="space-y-1.5">
              <Label>Bank status</Label>
              <Select
                value={toSelectValue(draft.bank_status)}
                onValueChange={(v) =>
                  update({ bank_status: fromSelectValue(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any status</SelectItem>
                  {ALL_BANK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {BANK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Admitverse-only: application status + university + budget range. */}
          {!isFmc && (
            <div className="space-y-1.5">
              <Label>Application status</Label>
              <Select
                value={toSelectValue(draft.application_status)}
                onValueChange={(v) =>
                  update({ application_status: fromSelectValue(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any status</SelectItem>
                  {ALL_APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPLICATION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isFmc && (
            <div className="space-y-1.5">
              <Label htmlFor="filter-university">University</Label>
              <Input
                id="filter-university"
                placeholder="e.g. University of Oxford"
                value={draft.university ?? ""}
                onChange={(e) => update({ university: e.target.value })}
              />
            </div>
          )}

          {isFmc ? (
            <div className="space-y-1.5">
              <Label>Budget (lakhs)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  value={draft.loan_min ?? ""}
                  onChange={(e) => update({ loan_min: e.target.value })}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  value={draft.loan_max ?? ""}
                  onChange={(e) => update({ loan_max: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  value={draft.budget_min ?? ""}
                  onChange={(e) => update({ budget_min: e.target.value })}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  value={draft.budget_max ?? ""}
                  onChange={(e) => update({ budget_max: e.target.value })}
                />
                <Input
                  className="w-20"
                  placeholder="INR"
                  value={draft.budget_currency ?? ""}
                  onChange={(e) =>
                    update({
                      budget_currency: e.target.value
                        .toUpperCase()
                        .slice(0, 3),
                    })
                  }
                  aria-label="Budget currency"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="filter-country">Destination country</Label>
            <Input
              id="filter-country"
              placeholder="USA, UK, Canada…"
              value={draft.target_country ?? ""}
              onChange={(e) => update({ target_country: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-intake">Intake</Label>
            <Input
              id="filter-intake"
              placeholder="Sep-2026"
              value={draft.target_intake ?? ""}
              onChange={(e) => update({ target_intake: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-tags">Tags</Label>
            <Input
              id="filter-tags"
              placeholder="comma-separated, e.g. imported, hot"
              value={draft.tags ?? ""}
              onChange={(e) => update({ tags: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Created</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={draft.created_from ?? ""}
                onChange={(e) => update({ created_from: e.target.value })}
                aria-label="Created from"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                value={draft.created_to ?? ""}
                onChange={(e) => update({ created_to: e.target.value })}
                aria-label="Created to"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Follow up</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={draft.due_from ?? ""}
                onChange={(e) => update({ due_from: e.target.value })}
                aria-label="Follow up from"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                value={draft.due_to ?? ""}
                onChange={(e) => update({ due_to: e.target.value })}
                aria-label="Follow up to"
              />
            </div>
          </div>

          {isFmc && (
            <div className="space-y-1.5">
              <Label>DNP attempts</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={draft.dnp_min ?? ""}
                  onChange={(e) => update({ dnp_min: e.target.value })}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  value={draft.dnp_max ?? ""}
                  onChange={(e) => update({ dnp_max: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="filter-important"
              checked={draft.important_only === "true"}
              onCheckedChange={(checked) =>
                update({ important_only: checked ? "true" : "" })
              }
            />
            <Label htmlFor="filter-important" className="font-normal">
              Important only
            </Label>
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onApply(EMPTY_FILTERS);
              onOpenChange(false);
            }}
          >
            Clear all
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
