"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadTimeline } from "./lead-timeline";
import { CallHistory } from "@/components/calls/call-history";
import { CallLogForm } from "@/components/calls/call-log-form";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskCompleteDialog } from "@/components/tasks/task-complete-dialog";
import { Phone, Plus } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import type { Lead, Task } from "@/types";

interface LeadDetailTabsProps {
  lead: Lead;
  callRefreshKey?: number;
}

export function LeadDetailTabs({ lead, callRefreshKey: externalRefreshKey }: LeadDetailTabsProps) {
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

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[200px] truncate">
        {value || "—"}
      </span>
    </div>
  );

  return (
    <>
      <Tabs defaultValue="profile" className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Email" value={lead.email} />
                <InfoRow label="Phone" value={lead.phone} />
                <InfoRow label="Alternate Phone" value={lead.alternate_phone} />
                <InfoRow label="Date of Birth" value={lead.date_of_birth} />
                <InfoRow label="Gender" value={lead.gender} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="City" value={lead.city} />
                <InfoRow label="State" value={lead.state} />
                <InfoRow label="Country" value={lead.country} />
                <InfoRow label="Pincode" value={lead.pincode} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Education</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Qualification" value={lead.highest_qualification} />
                <InfoRow label="Stream" value={lead.stream} />
                <InfoRow label="Passing Year" value={lead.passing_year} />
                <InfoRow label="College" value={lead.college_name} />
                <InfoRow label="University" value={lead.university} />
                <InfoRow label="Percentage" value={lead.percentage ? `${lead.percentage}%` : undefined} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Target Degree" value={lead.target_degree} />
                <InfoRow label="Target Intake" value={lead.target_intake} />
                <div className="py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Preferred Countries</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lead.preferred_countries?.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    )) || <span className="text-sm">—</span>}
                  </div>
                </div>
                <div className="py-1.5">
                  <span className="text-sm text-muted-foreground">Preferred Universities</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lead.preferred_universities?.map((u) => (
                      <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                    )) || <span className="text-sm">—</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Additional Info</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-x-8">
                  <InfoRow label="Source" value={lead.lead_source?.name} />
                  <InfoRow label="Call Attempts" value={lead.call_attempt_count} />
                  <InfoRow label="Due Date" value={lead.due_date ? format(new Date(lead.due_date), "MMM d, yyyy") : undefined} />
                  <InfoRow label="Created" value={format(new Date(lead.created_at), "MMM d, yyyy")} />
                </div>
                {lead.tags && lead.tags.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">Tags: </span>
                    {lead.tags.map((t) => (
                      <Badge key={t} variant="outline" className="mr-1 text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {lead.notes && (
                  <div className="mt-3">
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <LeadTimeline leadId={lead.id} />
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
