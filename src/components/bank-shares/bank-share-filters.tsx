"use client";

import { useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectFilter } from "@/components/shared/multi-select-filter";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useUsersStore } from "@/stores/users-store";
import { useBanksStore } from "@/stores/banks-store";

interface BankShareFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Multi-select: values within each filter OR, filters AND. */
  stages: string[];
  counsellorIds: string[];
  bankNames: string[];
  sharedOnly: boolean;
  pageSize: number;
  /** Grid-response bank list — fallback if /leads/banks hasn't landed yet. */
  banks: string[];
  onChange: (patch: Record<string, string | string[] | undefined>) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function BankShareFilters({
  searchValue,
  onSearchChange,
  stages,
  counsellorIds,
  bankNames,
  sharedOnly,
  pageSize,
  banks,
  onChange,
  onClear,
  hasFilters,
}: BankShareFiltersProps) {
  const { stages: stageList, getEntry } = useStageConfig();
  const users = useUsersStore((s) => s.users);
  const ensureUsers = useUsersStore((s) => s.ensureFetched);

  // GET /leads/banks — the canonical lender list, fetched once per session.
  // It grows as we join more bank WhatsApp groups, so it is never derived
  // from a local constant. Falls back to the grid response's `banks` (the
  // same list) if this request hasn't landed yet.
  const storeBanks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);
  const bankSource = storeBanks.length ? storeBanks : banks;

  useEffect(() => {
    ensureUsers();
    ensureBanks();
  }, [ensureUsers, ensureBanks]);

  const stageOptions = useMemo(
    () => stageList.map((s) => ({ value: s, label: getEntry(s).label })),
    // getEntry is rebuilt each render by the hook; the stage list is the
    // only thing that actually changes the options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stageList]
  );

  const counsellorOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.full_name })),
    [users]
  );

  const bankOptions = useMemo(
    () => bankSource.map((b) => ({ value: b, label: b })),
    [bankSource]
  );

  // Every selection change resets paging — filtering while on page 8 would
  // otherwise land on an empty grid.
  const patchFilter = (key: string, values: string[]) =>
    onChange({ [key]: values.length ? values : undefined, page: undefined });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative w-full lg:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, phone or email…"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <MultiSelectFilter
        placeholder="All stages"
        countNoun="stages"
        options={stageOptions}
        selected={stages}
        onChange={(v) => patchFilter("current_stage", v)}
        className="w-full lg:w-[170px]"
      />

      <MultiSelectFilter
        placeholder="All counsellors"
        countNoun="counsellors"
        options={counsellorOptions}
        selected={counsellorIds}
        onChange={(v) => patchFilter("agent_id", v)}
        className="w-full lg:w-[190px]"
      />

      <MultiSelectFilter
        placeholder="Any bank"
        countNoun="banks"
        options={bankOptions}
        selected={bankNames}
        onChange={(v) => patchFilter("bank_name", v)}
        showSelectAll
        className="w-full lg:w-[170px]"
      />

      <div className="flex items-center gap-2">
        <Switch
          id="shared-only"
          checked={sharedOnly}
          onCheckedChange={(checked) =>
            onChange({ shared_only: checked ? "1" : undefined, page: undefined })
          }
        />
        <Label htmlFor="shared-only" className="cursor-pointer text-sm">
          Shared only
        </Label>
      </div>

      {/* The endpoint is three queries regardless of page size, so 50 costs
          payload rather than latency — but 25 keeps the first paint quick. */}
      <Select
        value={String(pageSize)}
        onValueChange={(v) =>
          onChange({ page_size: v === "25" ? undefined : v, page: undefined })
        }
      >
        <SelectTrigger className="w-full lg:w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="25">25 / page</SelectItem>
          <SelectItem value="50">50 / page</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
