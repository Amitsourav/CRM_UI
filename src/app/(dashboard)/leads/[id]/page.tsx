"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { LeadStageBadge } from "@/components/leads/lead-stage-badge";
import { LeadDetailTabs } from "@/components/leads/lead-detail-tabs";
import { LeadSummaryTiles } from "@/components/leads/lead-summary-tiles";
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
  Star,
  Bot,
  MoreVertical,
  Mail,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useTaskCountStore } from "@/stores/task-count-store";
import { useLostReasonsStore } from "@/stores/lost-reasons-store";
import { usePageTitleStore } from "@/stores/page-title-store";
import { useUsersStore } from "@/stores/users-store";
import { leadBanksService } from "@/services/lead-banks-service";
import { BANK_STATUS_PRIORITY } from "@/lib/constants";
import type { BankStatus, Lead, LeadStage } from "@/types";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, isManager } = useAuthStore();
  const { slug, getEntry, getValidTransitions, stageRequiresNotes } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const lostReasons = useLostReasonsStore((s) => s.reasons);
  const ensureLostReasons = useLostReasonsStore((s) => s.ensureFetched);
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
  const [activeTab, setActiveTab] = useState<string>("profile");

  // Stage change
  const [targetStage, setTargetStage] = useState<LeadStage | "">("");
  const [stageNotes, setStageNotes] = useState("");
  const [stageAgenda, setStageAgenda] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [stageDueDate, setStageDueDate] = useState<Date | undefined>();
  const [stageSubmitting, setStageSubmitting] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      // Detail endpoint sometimes ships top_banks: [] / bank_count: 0
      // even when /leads/{id}/banks actually returns entries. Pull the
      // banks list directly and merge so every surface (summary tile,
      // Finance card, Banks tab) agrees.
      const [{ data }, banks] = await Promise.all([
        api.get<Lead>(`/leads/${leadId}`),
        leadBanksService.list(leadId).catch(() => []),
      ]);
      const top_banks = [...banks]
        .sort((a, b) => {
          const order = BANK_STATUS_PRIORITY[b.bank_status] -
            BANK_STATUS_PRIORITY[a.bank_status];
          if (order !== 0) return order;
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        })
        .slice(0, 2)
        .map((b) => ({
          id: b.id,
          bank_name: b.bank_name,
          bank_status: b.bank_status,
        }));
      setLead({
        ...data,
        top_banks,
        bank_count: banks.length,
      });
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

  // Push the lead's display name up to the topbar breadcrumb so it
  // doesn't show the raw UUID.
  const setSegmentOverride = usePageTitleStore((s) => s.setSegmentOverride);
  useEffect(() => {
    setSegmentOverride(lead?.full_name ?? null);
    return () => setSegmentOverride(null);
  }, [lead?.full_name, setSegmentOverride]);

  // Lazy-load active users so we can resolve agent / pre-counsellor
  // names even when the detail endpoint only returns the IDs.
  const ensureUsers = useUsersStore((s) => s.ensureFetched);
  const usersById = useUsersStore((s) => s.byId);
  useEffect(() => {
    if (lead?.assigned_agent_id || lead?.pre_counsellor_id) ensureUsers();
  }, [ensureUsers, lead?.assigned_agent_id, lead?.pre_counsellor_id]);

  if (isLoading || !lead) return <PageSkeleton />;

  const headerAgentName =
    lead.assigned_agent_name ||
    lead.assigned_agent?.full_name ||
    (lead.assigned_agent_id
      ? usersById[lead.assigned_agent_id]?.full_name
      : undefined);
  const headerPreCounsellorName =
    lead.pre_counsellor_name ||
    (lead.pre_counsellor_id
      ? usersById[lead.pre_counsellor_id]?.full_name
      : undefined);

  const validTransitions = getValidTransitions(lead.current_stage);

  const handleStageSelect = (stage: LeadStage) => {
    setTargetStage(stage);
    setStageNotes("");
    setStageAgenda("");
    setLostReason("");
    setStageDueDate(undefined);
    setStageDialogOpen(true);
    if (stage === "lost" && isFmc) ensureLostReasons();
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
    if (isDueDateRequiredForStage(targetStage) && !stageDueDate) {
      toast.error("Follow-up date is required.");
      return;
    }

    setStageSubmitting(true);
    try {
      const payload: Record<string, unknown> = { to_stage: targetStage };
      if (stageRequiresNotes(targetStage)) {
        payload.conversation_notes = stageNotes;
        payload.agent_agenda = stageAgenda;
      } else if (stageNotes.trim()) {
        // Optional remark on a non-gated transition.
        payload.conversation_notes = stageNotes.trim();
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

  const handleToggleImportant = async () => {
    if (!lead) return;
    const next = !lead.is_important;
    // Optimistic
    setLead({ ...lead, is_important: next });
    try {
      await api.patch(`/leads/${leadId}/important`, { is_important: next });
    } catch (error: unknown) {
      setLead({ ...lead, is_important: !next });
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to modify this lead");
      } else {
        toast.error(err.response?.data?.detail || "Couldn't update");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{lead.full_name}</h1>
            <button
              type="button"
              onClick={handleToggleImportant}
              aria-label={
                lead.is_important ? "Unmark important" : "Mark important"
              }
              className="-m-1 p-1 rounded hover:bg-muted"
            >
              <Star
                className={
                  lead.is_important
                    ? "h-5 w-5 fill-yellow-400 text-yellow-500"
                    : "h-5 w-5 text-muted-foreground"
                }
              />
            </button>
            <LeadStageBadge stage={lead.current_stage} />
            {lead.has_active_ai_campaign && (
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 gap-1"
              >
                <Bot className="h-3.5 w-3.5" />
                AI campaign active
              </Badge>
            )}
            {/* Quick contact actions — parity with the Kanban tile. */}
            <div className="flex items-center gap-0.5 ml-1">
              <a
                href={lead.email ? `mailto:${lead.email}` : undefined}
                aria-label="Email"
                onClick={(e) => {
                  if (!lead.email) {
                    e.preventDefault();
                    toast.error("Email not available");
                  }
                }}
                className={`p-1.5 rounded hover:bg-muted text-slate-500 ${
                  !lead.email ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href={lead.phone ? `tel:${lead.phone}` : undefined}
                aria-label="Call"
                onClick={(e) => {
                  if (!lead.phone) {
                    e.preventDefault();
                    toast.error("Phone not available");
                  }
                }}
                className={`p-1.5 rounded hover:bg-muted text-blue-500 ${
                  !lead.phone ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={
                  lead.phone
                    ? `https://wa.me/${lead.phone.replace(/\D/g, "")}`
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                onClick={(e) => {
                  if (!lead.phone) {
                    e.preventDefault();
                    toast.error("Phone not available");
                  }
                }}
                className={`p-1.5 rounded hover:bg-muted text-green-600 ${
                  !lead.phone ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            {headerAgentName && (
              <Badge variant="outline">Counsellor: {headerAgentName}</Badge>
            )}
            {headerPreCounsellorName && (
              <Badge variant="outline">
                Pre Counsellor: {headerPreCounsellorName}
              </Badge>
            )}
            {lead.lead_source && (
              <Badge variant="outline">Source: {lead.lead_source.name}</Badge>
            )}
            {lead.tags?.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
          {lead.current_stage === "lost" && (lead.lost_reason || lead.lost_time) && (
            <div className="mt-2 space-y-0.5 text-sm text-red-700">
              {lead.lost_reason && (
                <p>
                  <span className="font-medium">Lost reason:</span> {lead.lost_reason}
                </p>
              )}
              {lead.lost_time && (
                <p>
                  <span className="font-medium">Lost on:</span>{" "}
                  {format(new Date(lead.lost_time), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {validTransitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Move Stage
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
            Edit Lead
          </Button>
          {isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reassign
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <LeadSummaryTiles
        lead={lead}
        counsellorName={headerAgentName}
        preCounsellorName={headerPreCounsellorName}
        onOpenBanksTab={() => setActiveTab("banks")}
      />

      <LeadDetailTabs
        lead={lead}
        callRefreshKey={callRefreshKey}
        onRefetchLead={fetchLead}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change to {targetStage && getEntry(targetStage).label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {targetStage && (
              <div className="space-y-2">
                <Label>
                  {stageRequiresNotes(targetStage)
                    ? "Conversation Notes *"
                    : "Remark (optional)"}
                </Label>
                <Textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder={
                    stageRequiresNotes(targetStage)
                      ? "Notes from conversation..."
                      : "Add a note about this change..."
                  }
                />
              </div>
            )}
            {targetStage && stageRequiresNotes(targetStage) && (
              <div className="space-y-2">
                <Label>Agent Agenda *</Label>
                <Textarea
                  value={stageAgenda}
                  onChange={(e) => setStageAgenda(e.target.value)}
                  placeholder="Next steps..."
                />
              </div>
            )}
            {targetStage === "lost" && (
              <div className="space-y-2">
                <Label>Lost Reason *</Label>
                {isFmc ? (
                  <>
                    <Select value={lostReason} onValueChange={setLostReason}>
                      <SelectTrigger>
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
                    placeholder="Reason for marking as lost..."
                  />
                )}
              </div>
            )}
            {(() => {
              const required =
                !!targetStage && isDueDateRequiredForStage(targetStage);
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
                  {required && !stageDueDate && (
                    <p className="text-xs text-red-600">
                      Follow-up date is required.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleStageSubmit}
              disabled={
                stageSubmitting ||
                (targetStage === "lost" && !lostReason.trim()) ||
                (!!targetStage &&
                  isDueDateRequiredForStage(targetStage) &&
                  !stageDueDate)
              }
            >
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
