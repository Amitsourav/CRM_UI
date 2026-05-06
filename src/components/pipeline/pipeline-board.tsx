"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { PipelineColumn } from "./pipeline-column";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useAuthStore } from "@/stores/auth-store";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

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
  const { stages: STAGES, getEntry, canTransition, stageRequiresNotes } =
    useStageConfig();

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
  const [agents, setAgents] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);

  // Stage change dialog
  const [stageChangeData, setStageChangeData] = useState<StageChangeData | null>(null);
  const [notes, setNotes] = useState("");
  const [agenda, setAgenda] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
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
  }, [isManager]);

  const buildParams = useCallback(
    (stage: LeadStage, page: number) => {
      const params = new URLSearchParams();
      params.set("current_stage", stage);
      params.set("page", page.toString());
      params.set("page_size", PER_STAGE_LIMIT.toString());
      if (agentFilter !== "all") params.set("agent_id", agentFilter);
      if (sourceFilter !== "all") params.set("source_id", sourceFilter);
      return params.toString();
    },
    [agentFilter, sourceFilter]
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
  ) => {
    const lead = stageData[fromStage].leads.find((l) => l.id === leadId);
    if (!lead) return;

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
    }
  };

  // Single entry point for both drag-drop and the per-card dropdown.
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
    if (stageRequiresNotes(toStage) || toStage === "lost") {
      setStageChangeData({ leadId, fromStage, toStage });
      return;
    }
    performStageChange(leadId, fromStage, toStage);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    requestStageChange(
      result.draggableId,
      result.source.droppableId as LeadStage,
      result.destination.droppableId as LeadStage
    );
  };

  const handleStageChangeSubmit = async () => {
    if (!stageChangeData) return;
    const { leadId, fromStage, toStage } = stageChangeData;

    if (stageRequiresNotes(toStage) && (!notes.trim() || !agenda.trim())) {
      toast.error("Notes and agenda are required");
      return;
    }
    if (toStage === "lost" && !lostReason.trim()) {
      toast.error("Lost reason is required");
      return;
    }

    setIsSubmitting(true);
    const extraData: Record<string, unknown> = {};
    if (stageRequiresNotes(toStage)) {
      extraData.conversation_notes = notes;
      extraData.agent_agenda = agenda;
    }
    if (toStage === "lost") extraData.lost_reason = lostReason;
    if (dueDate) extraData.due_date = format(dueDate, "yyyy-MM-dd");

    await performStageChange(leadId, fromStage, toStage, extraData);
    setIsSubmitting(false);
    closeStageDialog();
  };

  const closeStageDialog = () => {
    setStageChangeData(null);
    setNotes("");
    setAgenda("");
    setLostReason("");
    setDueDate(undefined);
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
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {isManager && (
          <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Telecallers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Telecallers</SelectItem>
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
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Pipeline board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 260px)" }}
        >
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
            {stageChangeData && stageRequiresNotes(stageChangeData.toStage) && (
              <>
                <div className="space-y-2">
                  <Label>Conversation Notes *</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Agent Agenda *</Label>
                  <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} />
                </div>
              </>
            )}
            {stageChangeData?.toStage === "lost" && (
              <div className="space-y-2">
                <Label>Lost Reason *</Label>
                <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStageDialog}>Cancel</Button>
            <Button onClick={handleStageChangeSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
