"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X as IconX } from "lucide-react";
import type { PipelineFilters } from "@/lib/pipeline-filters";
import type { LeadSource, User } from "@/types";

interface ActiveFilterChipsProps {
  filters: PipelineFilters;
  agents: User[];
  sources: LeadSource[];
  campaigns: { id: string; name: string }[];
  // Patch is a partial that the parent merges into its filter state.
  // Passing { foo: undefined } removes that filter.
  onPatch: (patch: Partial<PipelineFilters>) => void;
  onClearAll: () => void;
}

interface Chip {
  // A logical group key — clicking the X clears all keys in `clears`.
  key: string;
  label: string;
  clears: (keyof PipelineFilters)[];
}

export function ActiveFilterChips({
  filters,
  agents,
  sources,
  campaigns,
  onPatch,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: Chip[] = [];

  if (filters.q) {
    chips.push({
      key: "q",
      label: `Search: "${filters.q}"`,
      clears: ["q"],
    });
  }

  if (filters.agent_id) {
    const a = agents.find((u) => u.id === filters.agent_id);
    chips.push({
      key: "agent_id",
      label: `Counsellor: ${a?.full_name ?? filters.agent_id}`,
      clears: ["agent_id"],
    });
  }

  if (filters.source_id) {
    const s = sources.find((x) => x.id === filters.source_id);
    chips.push({
      key: "source_id",
      label: `Source: ${s?.name ?? filters.source_id}`,
      clears: ["source_id"],
    });
  }

  if (filters.campaign_id) {
    const c = campaigns.find((x) => x.id === filters.campaign_id);
    chips.push({
      key: "campaign_id",
      label: `Campaign: ${c?.name ?? filters.campaign_id}`,
      clears: ["campaign_id"],
    });
  }

  if (filters.loan_min || filters.loan_max) {
    const lo = filters.loan_min ?? "0";
    const hi = filters.loan_max ?? "∞";
    chips.push({
      key: "loan",
      label: `Budget: ${lo}–${hi}L`,
      clears: ["loan_min", "loan_max"],
    });
  }

  if (filters.country) {
    chips.push({
      key: "country",
      label: `Country: ${filters.country}`,
      clears: ["country"],
    });
  }

  if (filters.intake) {
    chips.push({
      key: "intake",
      label: `Intake: ${filters.intake}`,
      clears: ["intake"],
    });
  }

  if (filters.bank) {
    chips.push({
      key: "bank",
      label: `Bank: ${filters.bank}`,
      clears: ["bank"],
    });
  }

  if (filters.tags) {
    chips.push({
      key: "tags",
      label: `Tags: ${filters.tags}`,
      clears: ["tags"],
    });
  }

  if (filters.created_after || filters.created_before) {
    const a = filters.created_after ?? "…";
    const b = filters.created_before ?? "…";
    chips.push({
      key: "created",
      label: `Created: ${a} → ${b}`,
      clears: ["created_after", "created_before"],
    });
  }

  if (filters.due_after || filters.due_before) {
    const a = filters.due_after ?? "…";
    const b = filters.due_before ?? "…";
    chips.push({
      key: "due",
      label: `Follow up: ${a} → ${b}`,
      clears: ["due_after", "due_before"],
    });
  }

  if (filters.is_important === "true") {
    chips.push({
      key: "is_important",
      label: "Important only",
      clears: ["is_important"],
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pr-1 py-0.5 font-normal"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove filter: ${chip.label}`}
            onClick={() => {
              const patch: Partial<PipelineFilters> = {};
              for (const k of chip.clears) {
                (patch as Record<string, undefined>)[k] = undefined;
              }
              onPatch(patch);
            }}
            className="rounded-full hover:bg-muted -mr-0.5 p-0.5"
          >
            <IconX className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
