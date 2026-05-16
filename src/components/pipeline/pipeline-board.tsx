"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { PipelineColumn } from "./pipeline-column";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useAuthStore } from "@/stores/auth-store";
import { useTaskCountStore } from "@/stores/task-count-store";
import { useLostReasonsStore } from "@/stores/lost-reasons-store";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Lead, LeadStage, User, LeadSource, PaginatedResponse } from "@/types";
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
import { Loader2, RefreshCw } from "lucide-react";

const PER_STAGE_LIMIT = 30;

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
  const { isManager } = useAuthStore();
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const { slug, stages: STAGES, getEntry, canTransition } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const lostReasons = useLostReasonsStore((s) => s.reasons);
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

  // Filters
  const [agentFilter, setAgentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
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

  const buildParams = useCallback(
    (stage: LeadStage, page: number) => {
      const params = new URLSearchParams();
      params.set("current_stage", stage);
      params.set("page", page.toString());
      params.set("page_size", PER_STAGE_LIMIT.toString());
      if (agentFilter !== "all") params.set("agent_id", agentFilter);
      if (sourceFilter !== "all") params.set("source_id", sourceFilter);
      if (campaignFilter !== "all") params.set("campaign_id", campaignFilter);
      return params.toString();
    },
    [agentFilter, sourceFilter, campaignFilter]
  );

  const fetchStage = useCallback(
    async (stage: LeadStage, page: number = 1, append: boolean = false) => {
      try {
        const { data } = await api.get<PaginatedResponse<Lead>>(
          `/leads?${buildParams(stage, page)}`
        );
        const leads = data.items || [];
        setStageData((prev) => ({
          ...prev,
          [stage]: {
            leads: append ? [...prev[stage].leads, ...leads] : leads,
            total: data.total || 0,
            page,
            isLoadingMore: false,
          },
        }));
      } catch {
        setStageData((prev) => ({
          ...prev,
          [stage]: { ...prev[stage], isLoadingMore: false },
        }));
      }
    },
    [buildParams]
  );

  // Initial load — fetch all stages in parallel
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all(STAGES.map((stage) => fetchStage(stage, 1, false)));
    setIsLoading(false);
  }, [fetchStage, STAGES]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleLoadMore = (stage: LeadStage) => {
    const nextPage = stageData[stage].page + 1;
    setStageData((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], isLoadingMore: true },
    }));
    fetchStage(stage, nextPage, true);
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
    if (toStage === "lost" && isFmc) ensureLostReasons();
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
    update: Partial<Lead>
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

    if (toStage === "lost" && !lostReason.trim()) {
      toast.error("Lost reason is required");
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

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        {isManager && (
          <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Pre Counsellors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pre Counsellors</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

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
              hasMore={stageData[stage].leads.length < stageData[stage].total}
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
                {isFmc ? (
                  <>
                    <Select value={lostReason} onValueChange={setLostReason}>
                      <SelectTrigger autoFocus>
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lostReasons.length === 0 ? (
                          <SelectItem value="__loading" disabled>
                            Loading reasons…
                          </SelectItem>
                        ) : (
                          lostReasons.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))
                        )}
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
                <div className="space-y-2">
                  <Label>Next callback date (optional)</Label>
                  <Input
                    type="date"
                    value={dueDateTime}
                    onChange={(e) => setDueDateTime(e.target.value)}
                    aria-label="When to follow up next"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStageDialog}>Cancel</Button>
            <Button
              onClick={handleStageChangeSubmit}
              disabled={
                isSubmitting ||
                (stageChangeData?.toStage === "lost" && !lostReason.trim())
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
