"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskCompleteDialog } from "@/components/tasks/task-complete-dialog";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Task, User, PaginatedResponse } from "@/types";

type TabValue = "all" | "today" | "overdue" | "completed-today";

const TAB_ENDPOINTS: Record<TabValue, string> = {
  all: "/tasks",
  today: "/tasks/today",
  overdue: "/tasks/overdue",
  "completed-today": "/tasks/completed-today",
};

export default function TasksPage() {
  const { isManager } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [agents, setAgents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState("");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "20");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (assignedToFilter !== "all")
        params.set("assigned_to", assignedToFilter);

      const endpoint = TAB_ENDPOINTS[activeTab];
      const { data } = await api.get<PaginatedResponse<Task>>(
        `${endpoint}?${params.toString()}`
      );
      setTasks(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, statusFilter, assignedToFilter]);

  const fetchAgents = useCallback(async () => {
    if (!isManager) return;
    try {
      const { data } = await api.get("/users?role=telecaller&is_active=true");
      setAgents(data.items || data || []);
    } catch {
      // silent
    }
  }, [isManager]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleComplete = (taskId: string) => {
    setCompletingTaskId(taskId);
    setCompleteDialogOpen(true);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Manage your tasks and follow-ups">
        <Button
          onClick={() => {
            setEditingTask(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed-today">Completed Today</TabsTrigger>
        </TabsList>
      </Tabs>

      <TaskFilters
        status={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        assignedTo={assignedToFilter}
        onAssignedToChange={(v) => {
          setAssignedToFilter(v);
          setPage(1);
        }}
        agents={agents}
        isAdmin={isManager}
      />

      <TaskTable
        tasks={tasks}
        isLoading={isLoading}
        onEdit={handleEdit}
        onComplete={handleComplete}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onSuccess={fetchTasks}
      />

      <TaskCompleteDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        taskId={completingTaskId}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
