"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
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
  const stage = searchParams.get("current_stage") || "";
  const counsellorId = searchParams.get("agent_id") || "";
  const bankName = searchParams.get("bank_name") || "";
  const sharedOnly = searchParams.get("shared_only") === "1";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSizeParam = Number(searchParams.get("page_size"));
  const pageSize = PAGE_SIZES.includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;

  const patchParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
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
      current_stage: stage || undefined,
      agent_id: counsellorId || undefined,
      bank_name: bankName || undefined,
      shared_only: sharedOnly || undefined,
      page,
      page_size: pageSize,
    }),
    [debouncedSearch, stage, counsellorId, bankName, sharedOnly, page, pageSize]
  );

  const { rows, banks, total, totalPages, isLoading, error, refetch } =
    useBankShareGrid(gridParams);

  const hasFilters =
    !!searchValue || !!stage || !!counsellorId || !!bankName || sharedOnly;

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

  const showingFrom = (page - 1) * pageSize + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Share Grid"
        description="Which banks each file has gone to, and what's happened since. Hover a cell for the group conversation."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      <BankShareFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        stage={stage}
        counsellorId={counsellorId}
        bankName={bankName}
        sharedOnly={sharedOnly}
        pageSize={pageSize}
        banks={banks}
        onChange={patchParams}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      {isLoading && (
        <BankShareGridSkeleton columns={banks.length || 12} />
      )}

      {!isLoading && error && (
        <div className="rounded-md border py-12 text-center">
          <p className="font-medium">Couldn&apos;t load the bank share grid</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          icon={Landmark}
          title={hasFilters ? "No matching leads" : "Nothing shared yet"}
          description={
            hasFilters
              ? "Try a different search term, stage, counsellor or bank."
              : "Shares are recorded automatically when a file goes out to a bank's WhatsApp group."
          }
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <>
          <BankShareGrid rows={rows} banks={banks} />
          <div className="flex flex-col items-center gap-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) =>
                patchParams({ page: p === 1 ? undefined : String(p) })
              }
            />
            <p className="text-sm text-muted-foreground">
              Showing {showingFrom}–{showingFrom + rows.length - 1} of {total}
            </p>
          </div>
        </>
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
