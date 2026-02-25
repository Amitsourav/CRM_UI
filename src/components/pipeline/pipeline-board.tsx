"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { PipelineColumn } from "./pipeline-column";
import { STAGE_CONFIG, VALID_TRANSITIONS } from "@/lib/constants";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Lead, LeadStage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STAGES = Object.entries(STAGE_CONFIG)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([key]) => key as LeadStage);

interface StageChangeData {
  leadId: string;
  fromStage: LeadStage;
  toStage: LeadStage;
}

export function PipelineBoard() {
  const [leadsByStage, setLeadsByStage] = useState<Record<LeadStage, Lead[]>>({
    lead: [],
    called: [],
    connected: [],
    qualified_lead: [],
    won: [],
    lost: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stageChangeData, setStageChangeData] = useState<StageChangeData | null>(null);
  const [notes, setNotes] = useState("");
  const [agenda, setAgenda] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const { data } = await api.get("/leads?page_size=100");
      const allLeads: Lead[] = Array.isArray(data) ? data : (data.items || []);
      const grouped = {} as Record<LeadStage, Lead[]>;
      STAGES.forEach((stage) => {
        grouped[stage] = allLeads.filter((l) => l.current_stage === stage);
      });
      setLeadsByStage(grouped);
    } catch {
      toast.error("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const needsNotes = (stage: LeadStage) =>
    ["called", "connected", "qualified_lead"].includes(stage);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const fromStage = result.source.droppableId as LeadStage;
    const toStage = result.destination.droppableId as LeadStage;
    if (fromStage === toStage) return;

    if (!VALID_TRANSITIONS[fromStage].includes(toStage)) {
      toast.error(
        `Cannot move from ${STAGE_CONFIG[fromStage].label} to ${STAGE_CONFIG[toStage].label}`
      );
      return;
    }

    const leadId = result.draggableId;
    if (needsNotes(toStage) || toStage === "lost") {
      setStageChangeData({ leadId, fromStage, toStage });
      return;
    }
    performStageChange(leadId, fromStage, toStage);
  };

  const performStageChange = async (
    leadId: string,
    fromStage: LeadStage,
    toStage: LeadStage,
    extraData?: Record<string, unknown>
  ) => {
    const lead = leadsByStage[fromStage].find((l) => l.id === leadId);
    if (!lead) return;

    // Optimistic update
    setLeadsByStage((prev) => ({
      ...prev,
      [fromStage]: prev[fromStage].filter((l) => l.id !== leadId),
      [toStage]: [...prev[toStage], { ...lead, current_stage: toStage }],
    }));

    try {
      await api.post(`/leads/${leadId}/stage`, { to_stage: toStage, ...extraData });
      toast.success(`Lead moved to ${STAGE_CONFIG[toStage].label}`);
    } catch (error: unknown) {
      setLeadsByStage((prev) => ({
        ...prev,
        [fromStage]: [...prev[fromStage], lead],
        [toStage]: prev[toStage].filter((l) => l.id !== leadId),
      }));
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to change stage");
    }
  };

  const handleStageChangeSubmit = async () => {
    if (!stageChangeData) return;
    const { leadId, fromStage, toStage } = stageChangeData;

    if (needsNotes(toStage) && (!notes.trim() || !agenda.trim())) {
      toast.error("Notes and agenda are required");
      return;
    }
    if (toStage === "lost" && !lostReason.trim()) {
      toast.error("Lost reason is required");
      return;
    }

    setIsSubmitting(true);
    const extraData: Record<string, unknown> = {};
    if (needsNotes(toStage)) {
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage]}
            />
          ))}
        </div>
      </DragDropContext>

      <Dialog open={!!stageChangeData} onOpenChange={(open) => !open && closeStageDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to{" "}
              {stageChangeData && STAGE_CONFIG[stageChangeData.toStage].label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {stageChangeData && needsNotes(stageChangeData.toStage) && (
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
