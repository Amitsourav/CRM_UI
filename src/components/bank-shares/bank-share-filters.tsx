"use client";

import { useEffect } from "react";
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
import { useStageConfig } from "@/hooks/use-stage-config";
import { useUsersStore } from "@/stores/users-store";
import { useBanksStore } from "@/stores/banks-store";

export const ALL_VALUE = "__all__";

interface BankShareFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  stage: string;
  counsellorId: string;
  bankName: string;
  sharedOnly: boolean;
  pageSize: number;
  /** Grid-response bank list — fallback if /leads/banks hasn't landed yet. */
  banks: string[];
  onChange: (patch: Record<string, string | undefined>) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export function BankShareFilters({
  searchValue,
  onSearchChange,
  stage,
  counsellorId,
  bankName,
  sharedOnly,
  pageSize,
  banks,
  onChange,
  onClear,
  hasFilters,
}: BankShareFiltersProps) {
  const { stages, getEntry } = useStageConfig();
  const users = useUsersStore((s) => s.users);
  const ensureUsers = useUsersStore((s) => s.ensureFetched);

  // GET /leads/banks — the canonical lender list, fetched once per session.
  // It grows as we join more bank WhatsApp groups, so it is never derived
  // from a local constant. Falls back to the grid response's `banks` (the
  // same list) if this request hasn't landed yet.
  const storeBanks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);
  const bankOptions = storeBanks.length ? storeBanks : banks;

  useEffect(() => {
    ensureUsers();
    ensureBanks();
  }, [ensureUsers, ensureBanks]);

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

      <Select
        value={stage || ALL_VALUE}
        onValueChange={(v) =>
          onChange({
            current_stage: v === ALL_VALUE ? undefined : v,
            page: undefined,
          })
        }
      >
        <SelectTrigger className="w-full lg:w-[170px]">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All stages</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s} value={s}>
              {getEntry(s).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={counsellorId || ALL_VALUE}
        onValueChange={(v) =>
          onChange({
            agent_id: v === ALL_VALUE ? undefined : v,
            page: undefined,
          })
        }
      >
        <SelectTrigger className="w-full lg:w-[190px]">
          <SelectValue placeholder="All counsellors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All counsellors</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={bankName || ALL_VALUE}
        onValueChange={(v) =>
          onChange({
            bank_name: v === ALL_VALUE ? undefined : v,
            page: undefined,
          })
        }
      >
        <SelectTrigger className="w-full lg:w-[170px]">
          <SelectValue placeholder="Any bank" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Any bank</SelectItem>
          {bankOptions.map((bank) => (
            <SelectItem key={bank} value={bank}>
              {bank}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
