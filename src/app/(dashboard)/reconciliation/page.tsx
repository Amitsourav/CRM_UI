"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IndianRupee, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "@/components/shared/admin-guard";
import { FmcOnly } from "@/components/shared/fmc-only";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { MultiSelectFilter } from "@/components/shared/multi-select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";
import { showApiError } from "@/lib/api-errors";
import { useDebounce } from "@/hooks/use-debounce";
import { useBanksStore } from "@/stores/banks-store";
import {
  DEFAULT_PAGE_SIZE,
  reconciliationService,
} from "@/services/reconciliation-service";
import { ReconciliationTable } from "@/components/reconciliation/reconciliation-table";
import { LenderSummaryTable } from "@/components/reconciliation/lender-summary-table";
import { TheoreticalPanel } from "@/components/reconciliation/theoretical-panel";
import { RecordPaymentDialog } from "@/components/reconciliation/record-payment-dialog";
import { WriteOffDialog } from "@/components/reconciliation/write-off-dialog";
import {
  STATUS_META,
  STATUS_ORDER,
} from "@/components/reconciliation/status-badge";
import type {
  DisbursementRow,
  LenderSummaryRow,
  ReconciliationStatus,
  ReconciliationTotals,
} from "@/types";

const SEARCH_DEBOUNCE_MS = 400;

// The two questions that find money. Opening on them rather than on
// everything is the difference between a report and a worklist.
const DEFAULT_STATUSES: ReconciliationStatus[] = ["to_bill", "short_paid"];

function ReconciliationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusKey = JSON.stringify(searchParams.getAll("status"));
  const lenderKey = JSON.stringify(searchParams.getAll("bank_name"));
  const statuses = useMemo<ReconciliationStatus[]>(
    () => JSON.parse(statusKey),
    [statusKey]
  );
  const lenders = useMemo<string[]>(() => JSON.parse(lenderKey), [lenderKey]);
  const from = searchParams.get("disbursed_from") || "";
  const to = searchParams.get("disbursed_to") || "";
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "lenders" || tabParam === "revenue" ? tabParam : "files";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  // Three states, not two: never chosen (open on the money), a chosen set,
  // and deliberately cleared (show everything). The last one can't be an
  // empty `status` param — empty values are dropped from the URL, which would
  // read back as "never chosen" and silently restore the default filter.
  const showAll = searchParams.get("status_all") === "1";
  const effectiveStatuses = showAll
    ? []
    : searchParams.has("status")
      ? statuses
      : DEFAULT_STATUSES;

  const patchParams = useCallback(
    (patch: Record<string, string | string[] | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (Array.isArray(value)) {
          next.delete(key);
          for (const v of value) if (v) next.append(key, v);
        } else if (value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      router.replace(qs ? `/reconciliation?${qs}` : "/reconciliation", {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") || ""
  );
  const debouncedSearch = useDebounce(searchValue, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("q") || "")) return;
    patchParams({ q: debouncedSearch || undefined, page: undefined });
    // Keyed on the settled term alone — searchParams/patchParams change
    // identity on every URL write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [rows, setRows] = useState<DisbursementRow[]>([]);
  const [totals, setTotals] = useState<ReconciliationTotals | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<LenderSummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [paying, setPaying] = useState<DisbursementRow | null>(null);
  const [writingOff, setWritingOff] = useState<DisbursementRow | null>(null);

  const storeBanks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);
  useEffect(() => {
    ensureBanks();
  }, [ensureBanks]);

  const statusParam = JSON.stringify(effectiveStatuses);
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reconciliationService.list({
        page,
        page_size: DEFAULT_PAGE_SIZE,
        q: debouncedSearch || undefined,
        status: JSON.parse(statusParam),
        bank_name: JSON.parse(lenderKey),
        disbursed_from: from || undefined,
        disbursed_to: to || undefined,
      });
      setRows(data.items ?? []);
      setTotals(data.totals ?? null);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Couldn't load the report");
      setRows([]);
      setTotals(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusParam, lenderKey, from, to]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await reconciliationService.summary());
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Couldn't load the lender summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "lenders") fetchSummary();
  }, [tab, fetchSummary]);

  const toggleStatus = (status: ReconciliationStatus) => {
    const next = effectiveStatuses.includes(status)
      ? effectiveStatuses.filter((s) => s !== status)
      : [...effectiveStatuses, status];
    patchParams(
      next.length
        ? { status: next, status_all: undefined, page: undefined }
        : { status: undefined, status_all: "1", page: undefined }
    );
  };

  /**
   * Turning a row off zeroes its commission while the rate stays on screen,
   * so the report can still show what it would have been worth.
   */
  const toggleEarns = async (row: DisbursementRow, earns: boolean) => {
    // Optimistic: the list refetch behind this is a full page load.
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, earns_commission: earns } : r))
    );
    try {
      await reconciliationService.update(row.id, { earns_commission: earns });
      fetchRows();
    } catch (error: unknown) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, earns_commission: !earns } : r
        )
      );
      showApiError(error, "Couldn't update this row");
    }
  };

  const refresh = () => {
    fetchRows();
    if (tab === "lenders") fetchSummary();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission"
        description="What lenders owe on what they've disbursed, and what has actually arrived."
      >
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </PageHeader>

      {/* Totals come from the response and cover the whole filtered set —
          re-summing the 50 rows on screen would show a fraction of what is
          owed and read as a far smaller problem than it is. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Outstanding
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {formatRupees(totals?.outstanding_total ?? 0)}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Commission earned
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums">
            {formatRupees(totals?.commission_total ?? 0)}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Received
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums">
            {formatRupees(totals?.received_total ?? 0)}
            <span className="ml-2 font-sans text-xs text-muted-foreground">
              + {formatRupees(totals?.tds_total ?? 0)} TDS
            </span>
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Disbursed
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums">
            {formatRupees(totals?.disbursed_total ?? 0)}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(["files", "lenders", "revenue"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => patchParams({ tab: key === "files" ? undefined : key })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {key === "files"
              ? "Files"
              : key === "lenders"
                ? "By lender"
                : "Theoretical revenue"}
          </button>
        ))}
      </div>

      {tab === "revenue" ? (
        <TheoreticalPanel />
      ) : tab === "files" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_ORDER.map((status) => {
              const on = effectiveStatuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    on
                      ? STATUS_META[status].chip
                      : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {STATUS_META[status].label}
                </button>
              );
            })}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search students"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-8 w-full text-sm sm:w-48"
              />
              <MultiSelectFilter
                placeholder="All lenders"
                countNoun="lenders"
                options={storeBanks.map((b) => ({ value: b, label: b }))}
                selected={lenders}
                onChange={(v) =>
                  patchParams({ bank_name: v.length ? v : undefined, page: undefined })
                }
                showSelectAll
                className="h-8 w-full text-sm sm:w-40"
              />
              <Input
                type="date"
                value={from}
                onChange={(e) =>
                  patchParams({ disbursed_from: e.target.value, page: undefined })
                }
                className="h-8 w-full text-sm sm:w-36"
                aria-label="Disbursed from"
              />
              <Input
                type="date"
                value={to}
                onChange={(e) =>
                  patchParams({ disbursed_to: e.target.value, page: undefined })
                }
                className="h-8 w-full text-sm sm:w-36"
                aria-label="Disbursed to"
              />
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-md border py-12 text-center">
              <p className="font-medium">The report didn&apos;t load</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              {/* The rate error is the one they'll hit first, and it's fixed
                  on another screen. */}
              {error.toLowerCase().includes("commission rate") && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/admin/lenders">Set lender rates</Link>
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <EmptyState
              icon={IndianRupee}
              title="Nothing to reconcile"
              description="Disbursements appear here as files are marked disbursed with an amount and a date."
            />
          )}

          {!isLoading && !error && rows.length > 0 && (
            <>
              <ReconciliationTable
                rows={rows}
                onRecordPayment={setPaying}
                onWriteOff={setWritingOff}
                onToggleEarns={toggleEarns}
              />
              <div className="flex flex-col items-center gap-2">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) =>
                    patchParams({ page: p === 1 ? undefined : String(p) })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {total.toLocaleString()} {total === 1 ? "file" : "files"}
                </p>
              </div>
            </>
          )}
        </>
      ) : summaryLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : summary.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No lender activity yet"
          description="This fills in as files disburse."
        />
      ) : (
        <LenderSummaryTable rows={summary} />
      )}

      <RecordPaymentDialog
        row={paying}
        onOpenChange={(open) => !open && setPaying(null)}
        onSaved={refresh}
      />
      <WriteOffDialog
        row={writingOff}
        onOpenChange={(open) => !open && setWritingOff(null)}
        onSaved={refresh}
      />
    </div>
  );
}

export default function ReconciliationPage() {
  return (
    <AdminGuard>
      <FmcOnly>
        <Suspense>
          <ReconciliationPageContent />
        </Suspense>
      </FmcOnly>
    </AdminGuard>
  );
}
