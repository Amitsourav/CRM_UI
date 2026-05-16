"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadTimeline } from "./lead-timeline";
import { LeadRemarks } from "./lead-remarks";
import { LeadBanksManager } from "./lead-banks-manager";
import { DocsChecklist } from "./docs-checklist";
import { CallHistory } from "@/components/calls/call-history";
import { CallLogForm } from "@/components/calls/call-log-form";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskCompleteDialog } from "@/components/tasks/task-complete-dialog";
import {
  CalendarClock,
  ChevronDown,
  ClipboardList,
  IndianRupee,
  Landmark,
  Phone,
  PhoneCall,
  Plus,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatLakhs } from "@/lib/utils";
import {
  formatFollowUp,
  followUpIconClass,
  followUpToneClass,
} from "@/lib/follow-up";
import {
  BANK_STATUS_BADGE_CLASSES,
  BANK_STATUS_LABELS,
} from "@/lib/constants";
import { useStageConfig } from "@/hooks/use-stage-config";
import { useUsersStore } from "@/stores/users-store";
import type { BankStatus, Lead, Task } from "@/types";

interface LeadDetailTabsProps {
  lead: Lead;
  callRefreshKey?: number;
  onRefetchLead?: () => void;
  // Optional controlled tab — if provided, the parent owns the active
  // tab and we just call back when the user switches.
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
}

export function LeadDetailTabs({
  lead,
  callRefreshKey: externalRefreshKey,
  onRefetchLead,
  activeTab: externalActiveTab,
  onActiveTabChange,
}: LeadDetailTabsProps) {
  const { slug } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const [internalActiveTab, setInternalActiveTab] = useState<string>("profile");
  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: string) => {
    if (externalActiveTab === undefined) setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  };
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const callRefreshKey = (externalRefreshKey || 0) + internalRefreshKey;
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [completingTaskId, setCompletingTaskId] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const { data } = await api.get(`/leads/${lead.id}/tasks`);
      setTasks(Array.isArray(data) ? data : data.items || []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [lead.id]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
          {isFmc && <TabsTrigger value="banks">Banks</TabsTrigger>}
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSection
            lead={lead}
            isFmc={isFmc}
            onRefetchLead={onRefetchLead}
            onOpenBanksTab={() => setActiveTab("banks")}
          />
        </TabsContent>

        <TabsContent value="remarks" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <LeadRemarks leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {isFmc && (
          <TabsContent value="banks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Banks</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadBanksManager
                  leadId={lead.id}
                  showNotes
                  onChanged={onRefetchLead}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <LeadTimeline leadId={lead.id} fallbackLostReason={lead.lost_reason} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCallLogOpen(true)}>
              <Phone className="mr-2 h-4 w-4" />
              Log Call
            </Button>
          </div>
          <CallHistory leadId={lead.id} refreshKey={callRefreshKey} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingTask(undefined);
                setTaskFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
          <TaskTable
            tasks={tasks}
            isLoading={tasksLoading}
            onEdit={(task) => {
              setEditingTask(task);
              setTaskFormOpen(true);
            }}
            onComplete={(taskId) => {
              setCompletingTaskId(taskId);
              setCompleteDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <CallLogForm
        open={callLogOpen}
        onOpenChange={setCallLogOpen}
        leadId={lead.id}
        onSuccess={() => setInternalRefreshKey((k) => k + 1)}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        leadId={lead.id}
        onSuccess={fetchTasks}
      />

      <TaskCompleteDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        taskId={completingTaskId}
        onSuccess={fetchTasks}
      />
    </>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words min-w-0">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

function ProfileSection({
  lead,
  isFmc,
  onRefetchLead,
  onOpenBanksTab,
}: {
  lead: Lead;
  isFmc: boolean;
  onRefetchLead?: () => void;
  onOpenBanksTab?: () => void;
}) {
  // Resolve names from assigned_agent_id / pre_counsellor_id via the
  // users store. Backend may send the denormalized *_name string on the
  // detail endpoint; if it doesn't, this fallback fills the gap so the
  // Pipeline & Assignment block doesn't read "—" when there's actually
  // someone assigned.
  const ensureUsers = useUsersStore((s) => s.ensureFetched);
  const usersById = useUsersStore((s) => s.byId);
  useEffect(() => {
    if (lead.assigned_agent_id || lead.pre_counsellor_id) ensureUsers();
  }, [ensureUsers, lead.assigned_agent_id, lead.pre_counsellor_id]);
  const counsellorName =
    lead.assigned_agent_name ||
    lead.assigned_agent?.full_name ||
    (lead.assigned_agent_id
      ? usersById[lead.assigned_agent_id]?.full_name
      : undefined);
  const preCounsellorName =
    lead.pre_counsellor_name ||
    (lead.pre_counsellor_id
      ? usersById[lead.pre_counsellor_id]?.full_name
      : undefined);

  const followUp = formatFollowUp(lead.due_date);
  // Structured BankEntry rows from /leads/{id}/banks are the source
  // of truth. We intentionally don't synthesize a chip from legacy
  // bank_name/bank_status — that disagrees with the Banks tab.
  const primaryBank = lead.top_banks?.[0] ?? null;
  const cf = (lead.custom_fields ?? {}) as Record<string, unknown>;
  const leadScore = cf.lead_score;
  const quickLenderUpdate = cf.quick_lender_update;
  const bankHistory = cf.bank_history;
  const disbursementDate = cf.disbursement_date;
  const disbursementAmount = cf.disbursement_amount;
  const followUpText = cf.follow_up_text;
  const originalSourceText = cf.original_source_text;
  // Legacy bank_history is only useful when no structured BankEntry
  // rows exist — otherwise the Banks tab is the source of truth.
  const showLegacyBankHistory =
    typeof bankHistory === "string" &&
    bankHistory.trim().length > 0 &&
    (lead.bank_count ?? 0) === 0 &&
    (lead.top_banks?.length ?? 0) === 0;

  const updateLead = async (update: Partial<Lead>) => {
    try {
      await api.put(`/leads/${lead.id}`, update);
      onRefetchLead?.();
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to modify this lead");
      } else {
        toast.error(err.response?.data?.detail || "Couldn't update lead");
      }
    }
  };

  const handleDocToggle = (key: string) => {
    const current = lead.submitted_docs ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    updateLead({ submitted_docs: next });
  };

  const docsTotal = lead.docs_required ?? 0;
  const docsDone = lead.docs_submitted ?? 0;

  const { display: loanDisplay, crore: loanCrore } = formatLakhs(
    lead.loan_amount
  );
  const loanUnit = loanDisplay === "1" ? "Lakh" : "Lakhs";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Email" value={lead.email} />
          <InfoRow label="Phone" value={lead.phone} />
          <InfoRow label="Alternate Phone" value={lead.alternate_phone} />
          <InfoRow label="Date of Birth" value={lead.date_of_birth} />
          <InfoRow label="Gender" value={lead.gender} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="City" value={lead.city} />
          <InfoRow label="State" value={lead.state} />
          <InfoRow label="Country" value={lead.country} />
          <InfoRow label="Pincode" value={lead.pincode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Qualification" value={lead.highest_qualification} />
          <InfoRow label="Stream" value={lead.stream} />
          <InfoRow label="Passing Year" value={lead.passing_year} />
          <InfoRow label="College" value={lead.college_name} />
          <InfoRow label="University" value={lead.university} />
          <InfoRow
            label="Percentage"
            value={lead.percentage ? `${lead.percentage}%` : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Target Degree" value={lead.target_degree} />
          <InfoRow label="Target Intake" value={lead.target_intake} />
          {!isFmc && <InfoRow label="Budget" value={lead.budget} />}
          <div className="py-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground">
              Preferred Countries
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.preferred_countries && lead.preferred_countries.length > 0 ? (
                lead.preferred_countries.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))
              ) : (
                <span className="text-sm">—</span>
              )}
            </div>
          </div>
          <div className="py-1.5">
            <span className="text-sm text-muted-foreground">
              Preferred Universities
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.preferred_universities &&
              lead.preferred_universities.length > 0 ? (
                lead.preferred_universities.map((u) => (
                  <Badge key={u} variant="secondary" className="text-xs">
                    {u}
                  </Badge>
                ))
              ) : (
                <span className="text-sm">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline & Assignment — everything the Kanban tile shows about who
          owns this lead and when to follow up. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline & Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Counsellor" value={counsellorName} />
          {isFmc && (
            <InfoRow label="Pre Counsellor" value={preCounsellorName} />
          )}
          <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Follow up</span>
            <span className="flex items-center gap-1.5 text-sm">
              <CalendarClock
                className={cn(
                  "h-4 w-4 shrink-0",
                  followUpIconClass(followUp?.tone)
                )}
              />
              {followUp ? (
                <span className={followUpToneClass(followUp.tone)}>
                  {followUp.label}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>
          {isFmc && lead.current_stage === "dnp" && (
            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">DNP attempts</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    DNP-{lead.dnp_count ?? 0}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <DropdownMenuItem
                      key={n}
                      onClick={() => {
                        if (lead.dnp_count === n) return;
                        updateLead({ dnp_count: n });
                      }}
                    >
                      DNP-{n}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <InfoRow label="Source" value={lead.lead_source?.name} />
          <InfoRow label="Call Attempts" value={lead.call_attempt_count} />
          <InfoRow
            label="Last contacted"
            value={
              lead.connected_time
                ? format(new Date(lead.connected_time), "MMM d, yyyy 'at' h:mm a")
                : undefined
            }
          />
          <InfoRow
            label="Created"
            value={format(new Date(lead.created_at), "MMM d, yyyy")}
          />
          {lead.won_time && (
            <InfoRow
              label="Won on"
              value={format(new Date(lead.won_time), "MMM d, yyyy")}
            />
          )}
          {lead.lost_time && (
            <InfoRow
              label="Lost on"
              value={format(new Date(lead.lost_time), "MMM d, yyyy")}
            />
          )}
          {/* Activity strip — same counts as the Kanban tile. */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 mt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <PhoneCall className="h-3.5 w-3.5 text-blue-500" />
              {lead.call_count ?? 0}{" "}
              {lead.call_count === 1 ? "Call" : "Calls"}
            </span>
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
              {lead.task_count ?? 0}{" "}
              {lead.task_count === 1 ? "Task" : "Tasks"}
            </span>
            <span className="flex items-center gap-1">
              <StickyNote className="h-3.5 w-3.5 text-violet-500" />
              {lead.notes_count ?? 0}{" "}
              {lead.notes_count === 1 ? "Note" : "Notes"}
            </span>
          </div>
          {/* Latest note preview — full feed lives in the Remarks tab. */}
          {lead.latest_note && (
            <div className="pt-2 mt-2 border-t border-border/50 space-y-1">
              <span className="text-xs text-muted-foreground">Latest note</span>
              <p className="flex items-start gap-1.5 text-sm">
                <StickyNote className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
                <span className="break-words">
                  {lead.latest_note.body.length > 160
                    ? `${lead.latest_note.body.slice(0, 160).trimEnd()}…`
                    : lead.latest_note.body}
                </span>
              </p>
              <p className="text-xs text-muted-foreground ml-6">
                — {lead.latest_note.author_name || "Unknown"} ·{" "}
                {format(
                  new Date(lead.latest_note.created_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isFmc && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Loan amount</span>
              <span className="flex items-center gap-1 text-sm font-medium">
                <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
                {lead.loan_amount ? (
                  <>
                    {loanDisplay} {loanUnit}
                    {loanCrore && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({loanCrore} Cr)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Primary bank</span>
              {primaryBank ? (
                <button
                  type="button"
                  onClick={onOpenBanksTab}
                  className="flex items-center gap-2 text-sm rounded -m-1 p-1 hover:bg-muted/60 transition-colors"
                  title="Manage banks"
                >
                  <Landmark className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium">{primaryBank.bank_name}</span>
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full border text-[11px] leading-none",
                      primaryBank.bank_status in BANK_STATUS_BADGE_CLASSES
                        ? BANK_STATUS_BADGE_CLASSES[primaryBank.bank_status]
                        : "bg-muted text-muted-foreground border-transparent"
                    )}
                  >
                    {BANK_STATUS_LABELS[primaryBank.bank_status] ??
                      primaryBank.bank_status}
                  </span>
                  {(lead.bank_count ?? 0) > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{(lead.bank_count ?? 1) - 1} more
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenBanksTab}
                  className="text-sm text-muted-foreground italic hover:underline"
                >
                  — Add bank
                </button>
              )}
            </div>
            <div className="py-1.5 border-b border-border/50">
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Docs progress
                </span>
                <span className="text-sm font-medium">
                  {docsDone} / {docsTotal || "—"} docs
                </span>
              </div>
              {docsTotal > 0 && (
                <DocsChecklist
                  selected={lead.submitted_docs ?? []}
                  onToggle={handleDocToggle}
                  className="mt-2"
                />
              )}
            </div>
            {typeof disbursementAmount === "string" &&
              disbursementAmount.trim() && (
                <InfoRow
                  label="Disbursement amount"
                  value={disbursementAmount}
                />
              )}
            {typeof disbursementDate === "string" &&
              disbursementDate.trim() && (
                <InfoRow label="Disbursement date" value={disbursementDate} />
              )}
            {typeof quickLenderUpdate === "string" && quickLenderUpdate && (
              <div className="py-1.5 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Quick lender update
                </span>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {quickLenderUpdate}
                </p>
              </div>
            )}
            {showLegacyBankHistory && (
              <div className="py-1.5">
                <span className="text-sm text-muted-foreground">
                  Bank history (legacy)
                </span>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {bankHistory as string}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Other Info</CardTitle>
        </CardHeader>
        <CardContent>
          {leadScore !== undefined &&
            leadScore !== null &&
            (typeof leadScore === "string" || typeof leadScore === "number") && (
              <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Lead score</span>
                <Badge variant="secondary" className="text-xs">
                  {leadScore}
                </Badge>
              </div>
            )}
          <div className="py-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.tags && lead.tags.length > 0 ? (
                lead.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
          {typeof followUpText === "string" && followUpText.trim() && (
            <InfoRow label="Follow-up note (import)" value={followUpText} />
          )}
          {typeof originalSourceText === "string" &&
            originalSourceText.trim() && (
              <InfoRow
                label="Original source (import)"
                value={originalSourceText}
              />
            )}
          <NotesEditor
            value={lead.notes ?? ""}
            onSave={(next) => updateLead({ notes: next })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function NotesEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  // Re-seed draft when the upstream value changes (e.g. after refetch).
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const dirty = draft !== value;
  return (
    <div className="py-1.5">
      <span className="text-sm text-muted-foreground">Notes</span>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Free-form notes about this lead…"
        rows={3}
        className="mt-1 text-sm"
      />
      {dirty && (
        <div className="flex justify-end gap-1.5 mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDraft(value)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

