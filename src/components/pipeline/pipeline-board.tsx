"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { PipelineColumn } from "./pipeline-column";
import { LeadFiltersSheet } from "./lead-filters-sheet";
import { ActiveFilterChips } from "./active-filter-chips";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useAuthStore } from "@/stores/auth-store";
import { useTaskCountStore } from "@/stores/task-count-store";
import { useLostReasonsStore } from "@/stores/lost-reasons-store";
import { BANK_STATUS_PRIORITY } from "@/lib/constants";
import { StageChangeFields } from "@/components/shared/stage-change-fields";
import { showApiError } from "@/lib/api-errors";
import {
  buildStagePayload,
  EMPTY_STAGE_DRAFT,
  stageNeedsBankCommitment,
  validateStageChange,
  type StageChangeDraft,
} from "@/lib/stage-change";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  buildFilterSearchParams,
  countActiveFilters,
  parseFiltersFromParams,
  type PipelineFilters,
} from "@/lib/pipeline-filters";
import type { Lead, LeadStage, User, LeadSource } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";


/**
 * The backend caps each column at `per_stage_limit` and reports the real
 * total separately, so a column can hold far fewer cards than it claims.
 * Sent explicitly rather than left to the backend default, so "load the next
 * 50" lines up with what page 1 actually returned.
 */
const PER_STAGE_LIMIT = 50;

interface StageData {
  leads: Lead[];
  total: number;
  page: number;
  isLoadingMore: boolean;
  /**
   * Set when a page comes back empty. Offset paging over a live list can run
   * past the end while `total` still says there's more — without this the
   * button would never go away.
   */
  exhausted: boolean;
}

interface StageChangeData {
  leadId: string;
  fromStage: LeadStage;
  toStage: LeadStage;
}

// Both pipelines are split into two tabs by lead segment (not by stage):
// "Main Pipeline" shows Normal (non-AI) leads and "AI Calling" shows leads
// enrolled in a campaign. Every stage column renders in both tabs — the tab
// only changes the lead_segment filter sent to /leads/by-stage.
type PipelineSegment = "normal" | "campaign";

export function PipelineBoard() {
  const { isAdmin, isManager } = useAuthStore();
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const { slug, stages: STAGES, getEntry, canTransition } = useStageConfig();
  const isFmc = slug !== "admitverse";

  const ensureLostReasons = useLostReasonsStore((s) => s.ensureFetched);

  const [stageData, setStageData] = useState<Record<string, StageData>>(() => {
    const initial: Record<string, StageData> = {};
    STAGES.forEach((stage) => {
      initial[stage] = {
        leads: [],
        total: 0,
        page: 1,
        isLoadingMore: false,
        exhausted: false,
      };
    });
    return initial;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Re-seed stageData if the brand's stage list changes (e.g. after login).
  const stagesKey = useMemo(() => STAGES.join("|"), [STAGES]);
  useEffect(() => {
    setStageData((prev) => {
      const next: Record<string, StageData> = {};
      STAGES.forEach((stage) => {
        next[stage] = prev[stage] ?? {
          leads: [],
          total: 0,
          page: 1,
          isLoadingMore: false,
          exhausted: false,
        };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesKey]);

  // Filters — URL is the source of truth so deep links like
  // /pipeline?loan_min=20&loan_max=50 preload state. parseFilters
  // runs every render against searchParams so the rest of the
  // component can treat `filters` as derived state.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters: PipelineFilters = useMemo(
    () =>
      parseFiltersFromParams(
        (k) => searchParams.get(k),
        (k) => searchParams.getAll(k)
      ),
    [searchParams]
  );
  const setFilters = useCallback(
    (next: PipelineFilters) => {
      const params = buildFilterSearchParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );
  const patchFilters = useCallback(
    (patch: Partial<PipelineFilters>) => {
      setFilters({ ...filters, ...patch });
    },
    [filters, setFilters]
  );

  // The two tabs are just the lead_segment filter surfaced as buttons.
  // Anything that isn't the "campaign" (AI Calling) segment is treated as
  // the Main Pipeline (Normal) tab.
  const activeSegment: PipelineSegment =
    filters.lead_segment === "campaign" ? "campaign" : "normal";

  // Default the board to Normal leads on first load: if no valid segment is
  // in the URL yet, seed lead_segment=normal so /leads/by-stage returns
  // non-AI leads. The AI Calling (campaign) segment is admin-only, so force
  // non-admins to normal even if a deep link says ?lead_segment=campaign.
  useEffect(() => {
    if (!isAdmin) {
      if (filters.lead_segment !== "normal") {
        patchFilters({ lead_segment: "normal" });
      }
      return;
    }
    if (
      filters.lead_segment !== "normal" &&
      filters.lead_segment !== "campaign"
    ) {
      patchFilters({ lead_segment: "normal" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.lead_segment, isAdmin]);

  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);

  // Stage change dialog
  const [stageChangeData, setStageChangeData] = useState<StageChangeData | null>(null);
  // One draft shared with the other stage-change surfaces — the required
  // fields per target stage live in lib/stage-change, not here.
  const [stageDraft, setStageDraft] = useState<StageChangeDraft>(EMPTY_STAGE_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load filter options
  useEffect(() => {
    if (isManager) {
      api
        .get("/users?is_active=true")
        .then(({ data }) => setAgents(data.items || data || []))
        .catch(() => {});
    }
    api
      .get("/leads/sources/list")
      .then(({ data }) => setSources(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
    api
      .get("/campaigns?page=1&page_size=100")
      .then(({ data }) =>
        setCampaigns(
          (Array.isArray(data) ? data : data.items || []).map(
            (c: { id: string; name: string }) => ({ id: c.id, name: c.name })
          )
        )
      )
      .catch(() => {});
  }, [isManager]);

  // /leads/by-stage returns a single response with two parallel
  // dictionaries keyed by stage:
  //   counts_by_stage[stage] → number of leads matching filters
  //   items_by_stage[stage]  → leads for that stage, capped at
  //                             per_stage_limit; page the rest in per column
  interface ByStageResponse {
    total?: number;
    counts_by_stage?: Record<string, number>;
    items_by_stage?: Record<string, Lead[]>;
  }

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildFilterSearchParams(filters);
      params.set("per_stage_limit", String(PER_STAGE_LIMIT));
      const { data } = await api.get<ByStageResponse>(
        `/leads/by-stage?${params.toString()}`
      );
      const counts = data.counts_by_stage ?? {};
      const items = data.items_by_stage ?? {};
      setStageData(() => {
        const next: Record<string, StageData> = {};
        for (const stage of STAGES) {
          next[stage] = {
            leads: items[stage] ?? [],
            total: counts[stage] ?? 0,
            page: 1,
            isLoadingMore: false,
            exhausted: false,
          };
        }
        return next;
      });
    } catch {
      // Leave previous state in place on failure.
    } finally {
      setIsLoading(false);
    }
  }, [filters, STAGES]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Next page for one column.
   *
   * Every active filter is resent alongside `stage`/`offset` — the two calls
   * have to agree or page 2 returns leads that don't match what the user
   * searched for and drops them into the same column. That's also why this
   * builds from the same `filters` object as the initial load and adds
   * nothing the initial load doesn't send: a param on one call and not the
   * other is the same bug in a different direction.
   *
   * `/leads?current_stage=X&page=2` is deliberately not used — it honours
   * only a handful of the board's filters and silently ignores the rest,
   * which would append unfiltered leads to a filtered column.
   */
  const handleLoadMore = async (stage: LeadStage) => {
    const current = stageData[stage];
    // Double-click guard: one request in flight per column.
    if (!current || current.isLoadingMore || current.exhausted) return;

    const offset = current.leads.length;
    setStageData((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], isLoadingMore: true },
    }));

    try {
      const params = buildFilterSearchParams(filters);
      params.set("stage", stage);
      params.set("offset", String(offset));
      params.set("per_stage_limit", String(PER_STAGE_LIMIT));
      const { data } = await api.get<ByStageResponse>(
        `/leads/by-stage?${params.toString()}`
      );

      const incoming = data.items_by_stage?.[stage] ?? [];
      // The count comes back on every page and already reflects the filters,
      // so the header keeps tracking the truth rather than a cached number.
      const count = data.counts_by_stage?.[stage];

      setStageData((prev) => {
        const existing = prev[stage];
        // Offset paging over a list that can change underneath us may repeat
        // a lead. Duplicate draggableIds break the drag context, so they're
        // dropped rather than appended.
        const seen = new Set(existing.leads.map((l) => l.id));
        const fresh = incoming.filter((l) => !seen.has(l.id));
        return {
          ...prev,
          [stage]: {
            ...existing,
            leads: [...existing.leads, ...fresh],
            total: count ?? existing.total,
            page: existing.page + 1,
            isLoadingMore: false,
            // Empty page means the end, whatever the count says.
            exhausted: incoming.length === 0,
          },
        };
      });
    } catch (error: unknown) {
      setStageData((prev) => ({
        ...prev,
        [stage]: { ...prev[stage], isLoadingMore: false },
      }));
      showApiError(error, "Couldn't load more leads");
    }
  };

  const performStageChange = async (
    leadId: string,
    fromStage: LeadStage,
    toStage: LeadStage,
    extraData?: Record<string, unknown>
  ): Promise<boolean> => {
    const lead = stageData[fromStage].leads.find((l) => l.id === leadId);
    if (!lead) return false;

    // Optimistic update
    setStageData((prev) => ({
      ...prev,
      [fromStage]: {
        ...prev[fromStage],
        leads: prev[fromStage].leads.filter((l) => l.id !== leadId),
        total: prev[fromStage].total - 1,
      },
      [toStage]: {
        ...prev[toStage],
        leads: [{ ...lead, current_stage: toStage }, ...prev[toStage].leads],
        total: prev[toStage].total + 1,
      },
    }));

    try {
      await api.post(`/leads/${leadId}/stage`, { to_stage: toStage, ...extraData });
      toast.success(`Lead moved to ${getEntry(toStage).label}`);
      refreshTaskCount();
      return true;
    } catch (error: unknown) {
      // Revert optimistic update
      setStageData((prev) => ({
        ...prev,
        [fromStage]: {
          ...prev[fromStage],
          leads: [...prev[fromStage].leads, lead],
          total: prev[fromStage].total + 1,
        },
        [toStage]: {
          ...prev[toStage],
          leads: prev[toStage].leads.filter((l) => l.id !== leadId),
          total: prev[toStage].total - 1,
        },
      }));
      showApiError(error, "Failed to change stage");
      return false;
    }
  };

  // Single entry point for both drag-drop and the per-card dropdown. Every
  // transition opens the modal so the agent can attach a remark / callback
  // date and so Lost can capture a required reason. The card isn't moved
  // optimistically on drag — drop without submitting just snaps back, which
  // gives us the "Cancel reverts" behavior for free.
  const requestStageChange = (
    leadId: string,
    fromStage: LeadStage,
    toStage: LeadStage
  ) => {
    if (fromStage === toStage) return;
    if (!canTransition(fromStage, toStage)) {
      toast.error(
        `Cannot move from ${getEntry(fromStage).label} to ${getEntry(toStage).label}`
      );
      return;
    }
    setStageChangeData({ leadId, fromStage, toStage });
    setStageDraft(
      draftForStage(
        stageData[fromStage]?.leads.find((l) => l.id === leadId),
        toStage
      )
    );
    // Fetch reasons regardless of brand — backend returns the
    // canonical list for FMC and [] for Admitverse, and the UI uses
    // the response to decide dropdown vs textarea.
    if (toStage === "lost") ensureLostReasons();
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    requestStageChange(
      result.draggableId,
      result.source.droppableId as LeadStage,
      result.destination.droppableId as LeadStage
    );
  };

  // Optimistic patch for inline-editable card fields (bank_status, submitted_docs).
  // Refetch a single lead from the server and merge into stageData. Used
  // by surfaces that mutate via a non-PUT path (e.g. lead_banks endpoints)
  // where the server auto-syncs derived fields on the lead.
  const refetchLead = async (leadId: string) => {
    try {
      const { data } = await api.get<Lead>(`/leads/${leadId}`);
      setStageData((prev) => {
        const next = { ...prev };
        for (const stage of Object.keys(next)) {
          const idx = next[stage].leads.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            next[stage] = {
              ...next[stage],
              leads: next[stage].leads.map((l) =>
                l.id === leadId ? { ...l, ...data } : l
              ),
            };
            return next;
          }
        }
        return prev;
      });
    } catch {
      // Silent — failed refresh isn't worth a toast.
    }
  };

  // Captures the original lead, applies the optimistic update, syncs from
  // server response on success, reverts on error.
  const handleUpdateLead = async (
    leadId: string,
    // conversation_notes is a transient field — backend creates a
    // remark for the change but doesn't store it on the lead itself.
    // Currently used by the DNP-N change flow which requires a note.
    update: Partial<Lead> & { conversation_notes?: string }
  ) => {
    let original: Lead | null = null;
    setStageData((prev) => {
      const next = { ...prev };
      for (const stage of Object.keys(next)) {
        const idx = next[stage].leads.findIndex((l) => l.id === leadId);
        if (idx >= 0) {
          original = next[stage].leads[idx];
          next[stage] = {
            ...next[stage],
            leads: next[stage].leads.map((l) =>
              l.id === leadId ? { ...l, ...update } : l
            ),
          };
          return next;
        }
      }
      return prev;
    });

    try {
      const { data } = await api.put<Lead>(`/leads/${leadId}`, update);
      // Sync server-derived fields (e.g., docs_submitted is recomputed from
      // submitted_docs on the backend).
      setStageData((prev) => {
        const next = { ...prev };
        for (const stage of Object.keys(next)) {
          const idx = next[stage].leads.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            next[stage] = {
              ...next[stage],
              leads: next[stage].leads.map((l) =>
                l.id === leadId ? { ...l, ...data } : l
              ),
            };
            return next;
          }
        }
        return prev;
      });
    } catch (error: unknown) {
      if (original) {
        const orig = original;
        setStageData((prev) => {
          const next = { ...prev };
          for (const stage of Object.keys(next)) {
            const idx = next[stage].leads.findIndex((l) => l.id === leadId);
            if (idx >= 0) {
              next[stage] = {
                ...next[stage],
                leads: next[stage].leads.map((l) =>
                  l.id === leadId ? orig : l
                ),
              };
              return next;
            }
          }
          return prev;
        });
      }
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to modify this lead");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update lead");
      }
    }
  };

  const handleToggleImportant = async (leadId: string, currentValue: boolean) => {
    const nextValue = !currentValue;
    const flip = (value: boolean) =>
      setStageData((prev) => {
        const next = { ...prev };
        for (const stage of Object.keys(next)) {
          const idx = next[stage].leads.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            next[stage] = {
              ...next[stage],
              leads: next[stage].leads.map((l) =>
                l.id === leadId ? { ...l, is_important: value } : l
              ),
            };
            return next;
          }
        }
        return prev;
      });

    flip(nextValue);
    try {
      await api.patch(`/leads/${leadId}/important`, { is_important: nextValue });
    } catch (error: unknown) {
      flip(currentValue);
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to modify this lead");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update");
      }
    }
  };

  const handleStageChangeSubmit = async () => {
    if (!stageChangeData) return;
    const { leadId, fromStage, toStage } = stageChangeData;

    const problem = validateStageChange(slug, toStage, stageDraft);
    if (problem) {
      toast.error(problem);
      return;
    }

    setIsSubmitting(true);
    // to_stage is added by performStageChange.
    const { to_stage: _toStage, ...extraData } = buildStagePayload(
      slug,
      toStage,
      stageDraft
    );
    void _toStage;

    const ok = await performStageChange(leadId, fromStage, toStage, extraData);
    setIsSubmitting(false);
    // Keep the modal open on failure so the user can fix the input (e.g.,
    // backend rejected a non-canonical lost_reason) without re-dragging
    // the card. The red toast from performStageChange shows the detail.
    if (ok) closeStageDialog();
  };

  // Same default as the bank-share grid: the bank this lead is furthest along
  // with, taken from the card's own top_banks summary.
  const draftForStage = (lead: Lead | undefined, toStage: LeadStage) => {
    if (!stageNeedsBankCommitment(toStage)) return EMPTY_STAGE_DRAFT;
    const best = [...(lead?.top_banks ?? [])].sort(
      (a, b) =>
        (BANK_STATUS_PRIORITY[b.bank_status] ?? 0) -
        (BANK_STATUS_PRIORITY[a.bank_status] ?? 0)
    )[0];
    return { ...EMPTY_STAGE_DRAFT, bankName: best?.bank_name ?? "" };
  };

  const closeStageDialog = () => {
    setStageChangeData(null);
    setStageDraft(EMPTY_STAGE_DRAFT);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[280px]">
            <Skeleton className="h-10 w-full mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Pipeline tabs (both brands) — split leads by segment (AI vs Normal).
          All stage columns render in both tabs; only the lead_segment filter
          changes, so the board re-fetches the matching set of leads. */}
      <div className="flex items-center gap-1 mb-3 shrink-0">
        <Button
          variant={activeSegment === "normal" ? "default" : "outline"}
          size="sm"
          aria-pressed={activeSegment === "normal"}
          onClick={() => patchFilters({ lead_segment: "normal" })}
        >
          Main Pipeline
        </Button>
        {isAdmin && (
          <Button
            variant={activeSegment === "campaign" ? "default" : "outline"}
            size="sm"
            aria-pressed={activeSegment === "campaign"}
            onClick={() => patchFilters({ lead_segment: "campaign" })}
          >
            AI Calling
          </Button>
        )}
      </div>

      {/* Filters row — a Filters button + active chips. The full filter
          form lives in a drawer so the page header stays light. */}
      <div className="flex flex-col gap-2 mb-4 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersSheetOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {(() => {
            // FMC sorts by loan amount; Admitverse by budget. Same UI,
            // brand-specific sort_by values the backend understands.
            const ascValue = isFmc ? "loan_asc" : "budget_asc";
            const descValue = isFmc ? "loan_desc" : "budget_desc";
            const metric = isFmc ? "loan amount" : "budget";
            return (
              <>
                <Button
                  variant={filters.sort_by === ascValue ? "default" : "outline"}
                  size="sm"
                  title={`Sort by ${metric} — low to high`}
                  aria-pressed={filters.sort_by === ascValue}
                  onClick={() =>
                    patchFilters({
                      sort_by:
                        filters.sort_by === ascValue ? undefined : ascValue,
                    })
                  }
                >
                  <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
                  Low → High
                </Button>
                <Button
                  variant={
                    filters.sort_by === descValue ? "default" : "outline"
                  }
                  size="sm"
                  title={`Sort by ${metric} — high to low`}
                  aria-pressed={filters.sort_by === descValue}
                  onClick={() =>
                    patchFilters({
                      sort_by:
                        filters.sort_by === descValue ? undefined : descValue,
                    })
                  }
                >
                  <ArrowDownNarrowWide className="mr-2 h-4 w-4" />
                  High → Low
                </Button>
              </>
            );
          })()}
          <ActiveFilterChips
            filters={filters}
            agents={agents}
            sources={sources}
            campaigns={campaigns}
            onPatch={patchFilters}
            onClearAll={() => setFilters({})}
          />
        </div>
      </div>

      <LeadFiltersSheet
        open={filtersSheetOpen}
        onOpenChange={setFiltersSheetOpen}
        value={filters}
        onApply={setFilters}
        showAgentFilter={isManager}
        // lead_segment is now driven by the Main Pipeline / AI Calling tabs,
        // so it's no longer offered as a separate filter in the sheet.
        showLeadSegmentFilter={false}
        isFmc={isFmc}
        agents={agents}
        sources={sources}
        campaigns={campaigns}
      />

      {/* Pipeline board — columns stretch to fill the available height so
          the kanban uses the full viewport. Internal ScrollArea scrolls
          per-column. */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex items-stretch gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={stageData[stage].leads}
              totalCount={stageData[stage].total}
              hasMore={
                !stageData[stage].exhausted &&
                stageData[stage].leads.length < stageData[stage].total
              }
              pageSize={PER_STAGE_LIMIT}
              isLoadingMore={stageData[stage].isLoadingMore}
              onLoadMore={() => handleLoadMore(stage)}
              onChangeStage={requestStageChange}
              onToggleImportant={handleToggleImportant}
              onUpdateLead={handleUpdateLead}
              onRefetchLead={refetchLead}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Stage change dialog */}
      <Dialog open={!!stageChangeData} onOpenChange={(open) => !open && closeStageDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to{" "}
              {stageChangeData && getEntry(stageChangeData.toStage).label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Fields come from the shared component so the Kanban, the lead
                detail page and the bank-share grid ask for exactly the same
                things — PF Paid's bank + amount included. */}
            {stageChangeData && (
              <StageChangeFields
                toStage={stageChangeData.toStage}
                draft={stageDraft}
                onChange={(patch) =>
                  setStageDraft((d) => ({ ...d, ...patch }))
                }
                showNotes
                autoFocus
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStageDialog}>Cancel</Button>
            <Button
              onClick={handleStageChangeSubmit}
              disabled={
                isSubmitting ||
                (!!stageChangeData &&
                  validateStageChange(
                    slug,
                    stageChangeData.toStage,
                    stageDraft
                  ) !== null)
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
