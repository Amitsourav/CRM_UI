"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { FmcOnly } from "@/components/shared/fmc-only";
import { MultiSelectFilter } from "@/components/shared/multi-select-filter";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { showApiError } from "@/lib/api-errors";
import { useBanksStore } from "@/stores/banks-store";
import { useSourcesStore } from "@/stores/sources-store";
import {
  reconciliationService,
  type IntelligenceFilters,
} from "@/services/reconciliation-service";
import { InsightBanner } from "@/components/reconciliation/dashboard/insight-banner";
import { KpiRow } from "@/components/reconciliation/dashboard/kpi-row";
import { FlowOfMoney } from "@/components/reconciliation/dashboard/flow-of-money";
import { ActionQueue } from "@/components/reconciliation/dashboard/action-queue";
import { LenderPulse } from "@/components/reconciliation/dashboard/lender-pulse";
import { AheadOwedRow } from "@/components/reconciliation/dashboard/ahead-owed-row";
import { TrendChart } from "@/components/reconciliation/dashboard/trend-chart";
import { LendersAgeingRow } from "@/components/reconciliation/dashboard/lenders-ageing-row";
import { AttentionRow } from "@/components/reconciliation/dashboard/attention-row";
import { PipelineTab } from "@/components/reconciliation/dashboard/pipeline-tab";
import { SourcesTab } from "@/components/reconciliation/dashboard/sources-tab";
import { ExceptionsTab } from "@/components/reconciliation/dashboard/exceptions-tab";
import {
  DrilldownDrawer,
  type DrilldownTarget,
} from "@/components/reconciliation/dashboard/drilldown-drawer";
import type {
  ExceptionsResponse,
  PipelineForecast,
  ReconciliationDashboard,
  SourcesResponse,
  TheoreticalRevenue,
} from "@/types";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pipeline", label: "Pipeline & Forecast" },
  { key: "revenue", label: "Revenue & Collections" },
  { key: "lenders", label: "Lender Performance" },
  { key: "sources", label: "Source Performance" },
  { key: "exceptions", label: "Data Control Centre" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: TabKey =
    (TABS.find((t) => t.key === tabParam)?.key as TabKey) ?? "overview";

  // One filter object, spread into every call. A tab filtering differently
  // from the tab beside it is worse than no filter at all.
  const bankKey = JSON.stringify(searchParams.getAll("bank_name"));
  const sourceKey = JSON.stringify(searchParams.getAll("source_id"));
  const fromParam = searchParams.get("disbursed_from") || "";
  const toParam = searchParams.get("disbursed_to") || "";
  const asOf = searchParams.get("as_of") || "";

  const filters = useMemo<IntelligenceFilters>(
    () => ({
      bank_name: JSON.parse(bankKey),
      source_id: JSON.parse(sourceKey),
      disbursed_from: fromParam || undefined,
      disbursed_to: toParam || undefined,
      as_of: asOf || undefined,
    }),
    [bankKey, sourceKey, fromParam, toParam, asOf]
  );
  const filterKey = JSON.stringify(filters);
  const banks = useMemo<string[]>(() => JSON.parse(bankKey), [bankKey]);
  const sourceIds = useMemo<string[]>(() => JSON.parse(sourceKey), [sourceKey]);

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
      router.replace(
        qs ? `/reconciliation/dashboard?${qs}` : "/reconciliation/dashboard",
        { scroll: false }
      );
    },
    [router, searchParams]
  );

  const [dashboard, setDashboard] = useState<ReconciliationDashboard | null>(null);
  const [pipeline, setPipeline] = useState<PipelineForecast | null>(null);
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionsResponse | null>(null);
  // Overview's theoretical-revenue tile and its banner need one figure each
  // from two other endpoints; both are cheap and cached.
  const [theoretical, setTheoretical] = useState<TheoreticalRevenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<DrilldownTarget | null>(null);

  const storeBanks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);
  const storeSources = useSourcesStore((s) => s.sources);
  const ensureSources = useSourcesStore((s) => s.ensureFetched);
  useEffect(() => {
    ensureBanks();
    ensureSources();
  }, [ensureBanks, ensureSources]);

  // Overview, Revenue and Lenders all read the one dashboard call.
  const needsDashboard =
    tab === "overview" || tab === "revenue" || tab === "lenders";

  const fetchTab = useCallback(async () => {
    const active: IntelligenceFilters = JSON.parse(filterKey);
    setIsLoading(true);
    try {
      if (tab === "overview") {
        const [board, theo, pipe] = await Promise.all([
          reconciliationService.dashboard(12, active),
          reconciliationService.theoretical().catch(() => null),
          reconciliationService.pipeline(active, 5).catch(() => null),
        ]);
        setDashboard(board);
        setTheoretical(theo);
        if (pipe) setPipeline(pipe);
      } else if (tab === "revenue" || tab === "lenders") {
        setDashboard(await reconciliationService.dashboard(12, active));
      } else if (tab === "pipeline") {
        setPipeline(await reconciliationService.pipeline(active));
      } else if (tab === "sources") {
        setSources(await reconciliationService.sources(active));
      } else if (tab === "exceptions") {
        setExceptions(await reconciliationService.exceptions(active));
      }
    } catch (error: unknown) {
      showApiError(error, "Couldn't load this view");
    } finally {
      setIsLoading(false);
    }
  }, [tab, filterKey]);

  useEffect(() => {
    fetchTab();
  }, [fetchTab]);

  const skeleton = (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="li-card h-24 animate-pulse"
          style={{ background: "var(--li-hairline)" }}
        />
      ))}
    </div>
  );

  return (
    <div className="loan-intel -m-4 min-h-[calc(100vh-4rem)] space-y-6 p-6 md:-m-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            Loan intelligence
          </h1>
          <p className="li-mute mt-1 text-[14px]">
            Sanction to cash collection — one operating view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reconciliation" className="li-btn li-btn-secondary">
            Every release
          </Link>
          <button
            type="button"
            onClick={fetchTab}
            disabled={isLoading}
            className="li-btn li-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* One filter row above every tab. */}
      <div className="li-card flex flex-wrap items-end gap-4 p-4 md:rounded-2xl">
        <div className="space-y-1">
          <span className="li-eyebrow block">Lender</span>
          <MultiSelectFilter
            placeholder="All lenders"
            countNoun="lenders"
            options={storeBanks.map((b) => ({ value: b, label: b }))}
            selected={banks}
            onChange={(v) => patchParams({ bank_name: v.length ? v : undefined })}
            showSelectAll
            className="li-input h-9 w-48 justify-between"
          />
        </div>
        <div className="space-y-1">
          <span className="li-eyebrow block">Source</span>
          <MultiSelectFilter
            placeholder="All sources"
            countNoun="sources"
            options={storeSources.map((src) => ({
              value: src.id,
              label: src.name,
            }))}
            selected={sourceIds}
            onChange={(v) => patchParams({ source_id: v.length ? v : undefined })}
            className="li-input h-9 w-44 justify-between"
          />
        </div>

        {/* The mockup's "closure month" doesn't exist as a field — this is the
            disbursement date, and mislabelling it is the exact class of error
            that cost two days of reconciliation. */}
        <div className="space-y-1">
          <label htmlFor="from" className="li-eyebrow block">
            Disbursement month from
          </label>
          <Input
            id="from"
            type="date"
            value={fromParam}
            onChange={(e) => patchParams({ disbursed_from: e.target.value })}
            className="li-input h-9 w-36"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="li-eyebrow block">
            to
          </label>
          <Input
            id="to"
            type="date"
            value={toParam}
            onChange={(e) => patchParams({ disbursed_to: e.target.value })}
            className="li-input h-9 w-36"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="as-of" className="li-eyebrow block">
            Age as of
          </label>
          <Input
            id="as-of"
            type="date"
            value={asOf}
            onChange={(e) => patchParams({ as_of: e.target.value })}
            className="li-input h-9 w-36"
          />
        </div>
        {(banks.length > 0 ||
          sourceIds.length > 0 ||
          fromParam ||
          toParam ||
          asOf) && (
          <button
            type="button"
            className="li-mute pb-2 text-[13px] hover:text-[var(--li-ink)]"
            onClick={() =>
              patchParams({
                bank_name: undefined,
                source_id: undefined,
                disbursed_from: undefined,
                disbursed_to: undefined,
                as_of: undefined,
              })
            }
          >
            Clear
          </button>
        )}
      </div>

      <div className="li-hairline flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              patchParams({ tab: t.key === "overview" ? undefined : t.key })
            }
            className={cn(
              "-mb-px border-b-2 px-3 pb-3 pt-1 text-[14px] font-semibold whitespace-nowrap transition-colors",
              tab === t.key
                ? "border-[var(--li-accent)] text-[var(--li-accent)]"
                : "li-mute border-transparent hover:text-[var(--li-ink)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && !dashboard && !pipeline && !sources && !exceptions
        ? skeleton
        : null}

      <div className={cn(isLoading && "opacity-60")}>
        {needsDashboard && dashboard && tab === "overview" && (
          <div className="space-y-5">
            <InsightBanner
              ahead={dashboard.pipeline_ahead}
              topOpportunity={pipeline?.opportunities?.[0]}
              onOpen={() => patchParams({ tab: "pipeline" })}
            />

            <KpiRow
              funnel={dashboard.funnel}
              ahead={dashboard.pipeline_ahead}
              theoretical={theoretical}
              overdueCount={
                dashboard.ageing.buckets.find((b) => b.bucket === "over_90")
                  ?.tranches
              }
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <FlowOfMoney
                funnel={dashboard.funnel}
                onDrilldown={setDrilldown}
              />
              <AheadOwedRow
                ahead={dashboard.pipeline_ahead}
                ageing={dashboard.ageing}
                lenderCount={
                  dashboard.by_lender.filter((l) => l.outstanding_total > 0)
                    .length
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ActionQueue
                dq={dashboard.data_quality}
                ahead={dashboard.pipeline_ahead}
                exceptions={exceptions}
              />
              <LenderPulse
                lenders={dashboard.by_lender}
                onDrilldown={setDrilldown}
                onViewAll={() => patchParams({ tab: "lenders" })}
              />
            </div>

            <AttentionRow dq={dashboard.data_quality} />
          </div>
        )}

        {needsDashboard && dashboard && tab === "revenue" && (
          <div className="space-y-6">
            <TrendChart
              months={dashboard.monthly}
              undatedTranches={dashboard.data_quality.tranches_without_date}
            />
            <LendersAgeingRow
              lenders={dashboard.by_lender}
              ageing={dashboard.ageing}
              onDrilldown={setDrilldown}
            />
          </div>
        )}

        {needsDashboard && dashboard && tab === "lenders" && (
          <LendersAgeingRow
            lenders={dashboard.by_lender}
            ageing={dashboard.ageing}
            onDrilldown={setDrilldown}
          />
        )}

        {tab === "pipeline" && pipeline && (
          <PipelineTab data={pipeline} onDrilldown={setDrilldown} />
        )}

        {tab === "sources" && sources && (
          <SourcesTab data={sources} onDrilldown={setDrilldown} />
        )}

        {tab === "exceptions" && exceptions && (
          <ExceptionsTab data={exceptions} />
        )}
      </div>

      <DrilldownDrawer
        target={drilldown}
        filters={filters}
        onOpenChange={(open) => !open && setDrilldown(null)}
      />
    </div>
  );
}

export default function ReconciliationDashboardPage() {
  return (
    <AdminGuard>
      <FmcOnly>
        <Suspense>
          <DashboardContent />
        </Suspense>
      </FmcOnly>
    </AdminGuard>
  );
}
