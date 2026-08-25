"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, RefreshCw } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useBankShareGrid } from "@/hooks/use-bank-share-grid";
import { useAuthStore } from "@/stores/auth-store";
import { DEFAULT_PAGE_SIZE } from "@/services/bank-share-service";
import {
  BankShareGrid,
  BankShareGridSkeleton,
} from "@/components/bank-shares/bank-share-grid";
import { BankShareFilters } from "@/components/bank-shares/bank-share-filters";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZES = [25, 50];

function BankSharesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── URL-backed view state, so a filtered grid is shareable ──
  // The three list filters are repeatable both here and on the API, so they
  // round-trip as repeated params (?bank_name=PNB&bank_name=Axis) rather
  // than a delimited string — no escaping, and the URL matches the request.
  // Keyed on the serialized form: getAll() returns a fresh array each
  // render, which would defeat every downstream memo.
  const stagesKey = JSON.stringify(searchParams.getAll("current_stage"));
  const counsellorsKey = JSON.stringify(searchParams.getAll("agent_id"));
  const banksKey = JSON.stringify(searchParams.getAll("bank_name"));
  const stages = useMemo<string[]>(() => JSON.parse(stagesKey), [stagesKey]);
  const counsellorIds = useMemo<string[]>(
    () => JSON.parse(counsellorsKey),
    [counsellorsKey]
  );
  const bankNames = useMemo<string[]>(() => JSON.parse(banksKey), [banksKey]);
  const sharedOnly = searchParams.get("shared_only") === "1";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSizeParam = Number(searchParams.get("page_size"));
  const pageSize = PAGE_SIZES.includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;

  const patchParams = useCallback(
    (patch: Record<string, string | string[] | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (Array.isArray(value)) {
          // Replace the whole set: delete first, then one append per value.
          // An empty selection drops the param rather than sending "?key=".
          next.delete(key);
          for (const v of value) if (v) next.append(key, v);
        } else if (value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      router.replace(qs ? `/bank-shares?${qs}` : "/bank-shares", {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  // Search is typed locally and mirrored to the URL once it settles, so a
  // keystroke never costs a 2–20s request. The URL copy is for sharing a
  // filtered view; it's seeded from here at mount and the grid reads the
  // local value, so the two can't disagree mid-typing.
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") || ""
  );
  const debouncedSearch = useDebounce(searchValue, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    // No-ops on mount (and whenever the URL already agrees), so a deep link
    // like ?q=ajoy&page=3 doesn't get its page stripped on arrival.
    if (debouncedSearch === (searchParams.get("q") || "")) return;
    patchParams({ q: debouncedSearch || undefined, page: undefined });
    // Keyed on the settled search term alone: searchParams/patchParams change
    // identity on every URL update, which would re-run this on unrelated
    // filter changes. Both are read fresh from the current render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const gridParams = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      current_stage: stages.length ? stages : undefined,
      agent_id: counsellorIds.length ? counsellorIds : undefined,
      bank_name: bankNames.length ? bankNames : undefined,
      shared_only: sharedOnly || undefined,
      page,
      page_size: pageSize,
    }),
    [
      debouncedSearch,
      stages,
      counsellorIds,
      bankNames,
      sharedOnly,
      page,
      pageSize,
    ]
  );

  const { rows, banks, total, totalPages, isLoading, error, refetch } =
    useBankShareGrid(gridParams);

  const hasFilters =
    !!searchValue ||
    stages.length > 0 ||
    counsellorIds.length > 0 ||
    bankNames.length > 0 ||
    sharedOnly;

  const clearFilters = () => {
    setSearchValue("");
    patchParams({
      q: undefined,
      current_stage: undefined,
      agent_id: undefined,
      bank_name: undefined,
      shared_only: undefined,
      page: undefined,
    });
  };

  const onPageSizeChange = (value: string) =>
    patchParams({ page_size: value === "25" ? undefined : value, page: undefined });

  const showingFrom = (page - 1) * pageSize + 1;

  return (
    // Full-bleed: cancels the dashboard shell's padding so the matrix runs
    // edge to edge. With ~20 bank columns, every 78px reclaimed is another
    // lender visible without scrolling.
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col md:-m-6">
      {/* One control rail. The page has no heading of its own — the topbar
          breadcrumb already reads "Bank Shares", and repeating it here would
          cost a row of vertical space to say nothing new. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5 md:px-6">
        <BankShareFilters
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          stages={stages}
          counsellorIds={counsellorIds}
          bankNames={bankNames}
          sharedOnly={sharedOnly}
          banks={banks}
          onChange={patchParams}
          onClear={clearFilters}
          hasFilters={hasFilters}
        />

        <div className="ml-auto flex items-center gap-3">
          {!isLoading && !error && (
            <p className="hidden font-mono text-xs tabular-nums text-muted-foreground lg:block">
              {total.toLocaleString()} {total === 1 ? "file" : "files"}
            </p>
          )}

          {/* The endpoint is three queries regardless of page size, so 50
              costs payload rather than latency — 25 keeps first paint quick. */}
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              onPageSizeChange(v)
            }
          >
            <SelectTrigger className="h-8 w-[92px] text-sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={refetch}
            disabled={isLoading}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* The grid owns the rest of the viewport and scrolls inside itself, so
          the rail and the pager below never leave the screen. */}
      <div className="min-h-0 flex-1">
        {isLoading && <BankShareGridSkeleton columns={banks.length || 12} />}

        {!isLoading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-medium">The grid didn&apos;t load</p>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="flex h-full items-center justify-center px-6">
            <EmptyState
              icon={Landmark}
              title={hasFilters ? "No files match" : "No files shared yet"}
              description={
                hasFilters
                  ? "Widen the search, or reset the filters to see every file."
                  : "Shares appear here as soon as a file goes out to a bank's WhatsApp group."
              }
            />
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <BankShareGrid rows={rows} banks={banks} />
        )}
      </div>

      {!isLoading && !error && rows.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-2 md:px-6">
          <div className="flex items-center gap-4">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {showingFrom.toLocaleString()}–
              {(showingFrom + rows.length - 1).toLocaleString()} of{" "}
              {total.toLocaleString()}
            </p>
            {/* Legend for the one accent on the page. */}
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Replied in the last 48h
            </p>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) =>
              patchParams({ page: p === 1 ? undefined : String(p) })
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * FundMyCampus only — Admitverse leads have university applications, not
 * banks. Matches the codebase's FMC convention (`slug !== "admitverse"`)
 * rather than testing for a specific FMC slug.
 */
function FmcGuard({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const slug = useAuthStore((s) => s.company?.company_slug ?? null);
  const router = useRouter();
  const isAdmitverse = slug === "admitverse";

  useEffect(() => {
    if (!isLoading && isAdmitverse) router.replace("/leads");
  }, [isLoading, isAdmitverse, router]);

  if (isLoading) return <PageSkeleton />;
  if (isAdmitverse) return null;
  return <>{children}</>;
}

export default function BankSharesPage() {
  return (
    <FmcGuard>
      <Suspense>
        <BankSharesPageContent />
      </Suspense>
    </FmcGuard>
  );
}
