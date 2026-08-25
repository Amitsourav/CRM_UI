"use client";

import { useEffect, useMemo } from "react";
import { Landmark, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
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
        className="h-8 w-full text-sm sm:w-[150px]"
      />

      <MultiSelectFilter
        placeholder="All counsellors"
        countNoun="counsellors"
        options={counsellorOptions}
        selected={counsellorIds}
        onChange={(v) => patchFilter("agent_id", v)}
        className="h-8 w-full text-sm sm:w-[160px]"
      />

      <MultiSelectFilter
        placeholder="Any bank"
        countNoun="banks"
        options={bankOptions}
        selected={bankNames}
        onChange={(v) => patchFilter("bank_name", v)}
        showSelectAll
        className="h-8 w-full text-sm sm:w-[150px]"
      />

      <Button
        variant={sharedOnly ? "secondary" : "outline"}
        size="sm"
        aria-pressed={sharedOnly}
        className={cn(
          "h-8 gap-1.5 text-sm font-normal",
          !sharedOnly && "text-muted-foreground"
        )}
        onClick={() =>
          onChange({
            shared_only: sharedOnly ? undefined : "1",
            page: undefined,
          })
        }
      >
        <Landmark className="h-3.5 w-3.5" />
        Shared only
      </Button>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-sm font-normal text-muted-foreground"
          onClick={onClear}
        >
          Reset
        </Button>
      )}
    </div>
  );
}
