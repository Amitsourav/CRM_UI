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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";


interface StageData {
  leads: Lead[];
  total: number;
  page: number;
  isLoadingMore: boolean;
}

interface StageChangeData {
  leadId: string;
  fromStage: LeadStage;
  toStage: LeadStage;
}

export function PipelineBoard() {
  const { isAdmin, isManager } = useAuthStore();
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const { slug, stages: STAGES, getEntry, canTransition } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const lostReasons = useLostReasonsStore((s) => s.reasons);
  const lostReasonsFetched = useLostReasonsStore((s) => s.fetched);
  const ensureLostReasons = useLostReasonsStore((s) => s.ensureFetched);

  const [stageData, setStageData] = useState<Record<string, StageData>>(() => {
    const initial: Record<string, StageData> = {};
    STAGES.forEach((stage) => {
      initial[stage] = { leads: [], total: 0, page: 1, isLoadingMore: false };
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
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);

  // Stage change dialog
  const [stageChangeData, setStageChangeData] = useState<StageChangeData | null>(null);
  const [notes, setNotes] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [dueDateTime, setDueDateTime] = useState(""); // date-only: "YYYY-MM-DD" (backend accepts plain ISO date)
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
  //   items_by_stage[stage]  → leads for that stage (capped per stage
  //                             by the backend; no FE pagination)
  interface ByStageResponse {
    total?: number;
    counts_by_stage?: Record<string, number>;
    items_by_stage?: Record<string, Lead[]>;
  }

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildFilterSearchParams(filters).toString();
      const { data } = await api.get<ByStageResponse>(
        params ? `/leads/by-stage?${params}` : `/leads/by-stage`
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

  // /by-stage returns each stage's items in one shot — no per-stage
  // pagination yet. Until BE exposes a "load more for this stage"
  // contract, the column hides its Load more button by reporting no
  // additional pages.
  const handleLoadMore = (_stage: LeadStage) => {
    void _stage;
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
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to modify this lead");
      } else {
        toast.error(err.response?.data?.detail || "Failed to change stage");
      }
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

  // Backend requires due_date on every non-terminal stage move. Terminal
  // stages (where due_date is optional and can be blank):
  //   FMC:         lost, disbursed
  //   Admitverse:  lost, enrolled
  const isDueDateRequiredForStage = (stage: LeadStage): boolean => {
    if (stage === "lost") return false;
    if (isFmc) return stage !== "disbursed";
    return stage !== "enrolled";
  };

  const handleStageChangeSubmit = async () => {
    if (!stageChangeData) return;
    const { leadId, fromStage, toStage } = stageChangeData;

    if (toStage === "lost" && !lostReason.trim()) {
      toast.error("Lost reason is required");
      return;
    }
    if (isDueDateRequiredForStage(toStage) && !dueDateTime) {
      toast.error("Follow-up date is required.");
      return;
    }

    setIsSubmitting(true);
    const extraData: Record<string, unknown> = {};
    if (toStage === "lost") {
      extraData.lost_reason = lostReason.trim();
    } else {
      if (notes.trim()) extraData.conversation_notes = notes.trim();
      if (dueDateTime) {
        // Send the date string as-is; backend's timestamptz column accepts
        // "YYYY-MM-DD" and stores it as midnight UTC.
        extraData.due_date = dueDateTime;
      }
    }

    const ok = await performStageChange(leadId, fromStage, toStage, extraData);
    setIsSubmitting(false);
    // Keep the modal open on failure so the user can fix the input (e.g.,
    // backend rejected a non-canonical lost_reason) without re-dragging
    // the card. The red toast from performStageChange shows the detail.
    if (ok) closeStageDialog();
  };

  const closeStageDialog = () => {
    setStageChangeData(null);
    setNotes("");
    setLostReason("");
    setDueDateTime("");
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
          <Button
            variant={filters.sort_by === "loan_asc" ? "default" : "outline"}
            size="sm"
            title="Sort by loan amount — low to high"
            aria-pressed={filters.sort_by === "loan_asc"}
            onClick={() =>
              patchFilters({
                sort_by:
                  filters.sort_by === "loan_asc" ? undefined : "loan_asc",
              })
            }
          >
            <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
            Low → High
          </Button>
          <Button
            variant={filters.sort_by === "loan_desc" ? "default" : "outline"}
            size="sm"
            title="Sort by loan amount — high to low"
            aria-pressed={filters.sort_by === "loan_desc"}
            onClick={() =>
              patchFilters({
                sort_by:
                  filters.sort_by === "loan_desc" ? undefined : "loan_desc",
              })
            }
          >
            <ArrowDownNarrowWide className="mr-2 h-4 w-4" />
            High → Low
          </Button>
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
        showLeadSegmentFilter={isAdmin}
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
              hasMore={false}
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
            {stageChangeData?.toStage === "lost" ? (
              <div className="space-y-2">
                <Label>Reason for lost *</Label>
                {/* Backend's /leads/lost-reasons response shape drives
                    the UI: a non-empty list → locked dropdown; an
                    empty list → free-text input. Until the response
                    arrives we show a loading placeholder. */}
                {!lostReasonsFetched ? (
                  <p className="text-xs text-muted-foreground">
                    Loading reasons…
                  </p>
                ) : lostReasons.length > 0 ? (
                  <>
                    <Select value={lostReason} onValueChange={setLostReason}>
                      <SelectTrigger autoFocus>
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lostReasons.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!lostReason.trim() && (
                      <p className="text-xs text-red-600">
                        Lost Reason is required
                      </p>
                    )}
                  </>
                ) : (
                  <Textarea
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="Why is this lead lost?"
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Remark (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What happened on this call?"
                  />
                </div>
                {(() => {
                  const required =
                    !!stageChangeData &&
                    isDueDateRequiredForStage(stageChangeData.toStage);
                  return (
                    <div className="space-y-2">
                      <Label>
                        Next callback date{" "}
                        {required ? (
                          <span className="text-red-600">*</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        )}
                      </Label>
                      <Input
                        type="date"
                        value={dueDateTime}
                        onChange={(e) => setDueDateTime(e.target.value)}
                        aria-label="When to follow up next"
                      />
                      {required && !dueDateTime && (
                        <p className="text-xs text-red-600">
                          Follow-up date is required.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStageDialog}>Cancel</Button>
            <Button
              onClick={handleStageChangeSubmit}
              disabled={
                isSubmitting ||
                (stageChangeData?.toStage === "lost" && !lostReason.trim()) ||
                (!!stageChangeData &&
                  isDueDateRequiredForStage(stageChangeData.toStage) &&
                  !dueDateTime)
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
