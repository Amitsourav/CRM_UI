"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X as IconX } from "lucide-react";
import { BANK_STATUS_LABELS } from "@/lib/constants";
import type { LeadSource, User } from "@/types";
import type { PipelineFilters } from "@/lib/pipeline-filters";

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

  if (filters.bank_name) {
    chips.push({
      key: "bank_name",
      label: `Bank: ${filters.bank_name}`,
      clears: ["bank_name"],
    });
  }

  if (filters.bank_status) {
    const labels = BANK_STATUS_LABELS as Record<string, string>;
    const display = labels[filters.bank_status] ?? filters.bank_status;
    chips.push({
      key: "bank_status",
      label: `Bank status: ${display}`,
      clears: ["bank_status"],
    });
  }

  if (filters.target_country) {
    chips.push({
      key: "target_country",
      label: `Country: ${filters.target_country}`,
      clears: ["target_country"],
    });
  }

  if (filters.target_intake) {
    chips.push({
      key: "target_intake",
      label: `Intake: ${filters.target_intake}`,
      clears: ["target_intake"],
    });
  }

  if (filters.tags) {
    chips.push({
      key: "tags",
      label: `Tags: ${filters.tags}`,
      clears: ["tags"],
    });
  }

  if (filters.created_from || filters.created_to) {
    const a = filters.created_from ?? "…";
    const b = filters.created_to ?? "…";
    chips.push({
      key: "created",
      label: `Created: ${a} → ${b}`,
      clears: ["created_from", "created_to"],
    });
  }

  if (filters.due_from || filters.due_to) {
    const a = filters.due_from ?? "…";
    const b = filters.due_to ?? "…";
    chips.push({
      key: "due",
      label: `Follow up: ${a} → ${b}`,
      clears: ["due_from", "due_to"],
    });
  }

  if (filters.dnp_min || filters.dnp_max) {
    const lo = filters.dnp_min ?? "0";
    const hi = filters.dnp_max ?? "∞";
    chips.push({
      key: "dnp",
      label: `DNP attempts: ${lo}–${hi}`,
      clears: ["dnp_min", "dnp_max"],
    });
  }

  if (filters.important_only === "true") {
    chips.push({
      key: "important_only",
      label: "Important only",
      clears: ["important_only"],
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
