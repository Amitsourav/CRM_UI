"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { LeadStageBadge } from "@/components/leads/lead-stage-badge";
import { LeadDetailTabs } from "@/components/leads/lead-detail-tabs";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadAssignDialog } from "@/components/leads/lead-assign-dialog";
import { CallLogForm } from "@/components/calls/call-log-form";
import { StartCallButton } from "@/components/calls/start-call-button";
import { TaskForm } from "@/components/tasks/task-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowRightLeft,
  Phone,
  Plus,
  Edit,
  UserPlus,
  Trash2,
  CalendarIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useTaskCountStore } from "@/stores/task-count-store";
import type { Lead, LeadStage } from "@/types";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, isManager } = useAuthStore();
  const { getEntry, getValidTransitions, stageRequiresNotes } = useStageConfig();
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

  const [callRefreshKey, setCallRefreshKey] = useState(0);

  // Stage change
  const [targetStage, setTargetStage] = useState<LeadStage | "">("");
  const [stageNotes, setStageNotes] = useState("");
  const [stageAgenda, setStageAgenda] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [stageDueDate, setStageDueDate] = useState<Date | undefined>();
  const [stageSubmitting, setStageSubmitting] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const { data } = await api.get<Lead>(`/leads/${leadId}`);
      setLead(data);
    } catch {
      toast.error("Failed to load lead");
      router.push("/leads");
    } finally {
      setIsLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  if (isLoading || !lead) return <PageSkeleton />;

  const validTransitions = getValidTransitions(lead.current_stage);

  const handleStageSelect = (stage: LeadStage) => {
    setTargetStage(stage);
    setStageNotes("");
    setStageAgenda("");
    setLostReason("");
    setStageDueDate(undefined);
    setStageDialogOpen(true);
  };

  const handleStageSubmit = async () => {
    if (!targetStage) return;
    if (stageRequiresNotes(targetStage) && (!stageNotes.trim() || !stageAgenda.trim())) {
      toast.error("Notes and agenda are required");
      return;
    }
    if (targetStage === "lost" && !lostReason.trim()) {
      toast.error("Lost reason is required");
      return;
    }

    setStageSubmitting(true);
    try {
      const payload: Record<string, unknown> = { to_stage: targetStage };
      if (stageRequiresNotes(targetStage)) {
        payload.conversation_notes = stageNotes;
        payload.agent_agenda = stageAgenda;
      }
      if (targetStage === "lost") payload.lost_reason = lostReason;
      if (stageDueDate) payload.due_date = format(stageDueDate, "yyyy-MM-dd");

      await api.post(`/leads/${leadId}/stage`, payload);
      toast.success(`Stage changed to ${getEntry(targetStage).label}`);
      refreshTaskCount();
      setStageDialogOpen(false);
      fetchLead();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to change stage");
    } finally {
      setStageSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success("Lead deleted");
      router.push("/leads");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to delete lead");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{lead.full_name}</h1>
            <LeadStageBadge stage={lead.current_stage} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {lead.assigned_agent && (
              <Badge variant="outline">Agent: {lead.assigned_agent.full_name}</Badge>
            )}
            {lead.lead_source && (
              <Badge variant="outline">Source: {lead.lead_source.name}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {validTransitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Change Stage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {validTransitions.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => handleStageSelect(stage)}
                  >
                    {getEntry(stage).label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {lead.phone && (
            <StartCallButton
              lead_id={lead.id}
              lead_name={lead.full_name || "there"}
              phone_number={lead.phone}
              onCallEnd={() => {
                toast.success("Call ended! Transcript saving...");
                setCallRefreshKey((k) => k + 1);
                fetchLead();
              }}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => setCallLogOpen(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Log Manual
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTaskFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {isManager && (
            <>
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <LeadDetailTabs lead={lead} callRefreshKey={callRefreshKey} />

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change to {targetStage && getEntry(targetStage).label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {targetStage && stageRequiresNotes(targetStage) && (
              <>
                <div className="space-y-2">
                  <Label>Conversation Notes *</Label>
                  <Textarea
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    placeholder="Notes from conversation..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agent Agenda *</Label>
                  <Textarea
                    value={stageAgenda}
                    onChange={(e) => setStageAgenda(e.target.value)}
                    placeholder="Next steps..."
                  />
                </div>
              </>
            )}
            {targetStage === "lost" && (
              <div className="space-y-2">
                <Label>Lost Reason *</Label>
                <Textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Reason for marking as lost..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {stageDueDate ? format(stageDueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={stageDueDate} onSelect={setStageDueDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStageSubmit} disabled={stageSubmitting}>
              {stageSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadForm
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        onSuccess={fetchLead}
      />

      <LeadAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        leadId={leadId}
        onSuccess={fetchLead}
      />

      <CallLogForm
        open={callLogOpen}
        onOpenChange={setCallLogOpen}
        leadId={leadId}
        onSuccess={fetchLead}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        leadId={leadId}
        onSuccess={fetchLead}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
