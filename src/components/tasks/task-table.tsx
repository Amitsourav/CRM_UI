"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, CheckCircle } from "lucide-react";
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import { format, isBefore, startOfDay } from "date-fns";
import type { Task } from "@/types";

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
}

export function TaskTable({
  tasks,
  isLoading,
  onEdit,
  onComplete,
}: TaskTableProps) {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "Title",
      cell: (task) => <span className="font-medium">{task.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (task) => (
        <Badge variant="outline">{TASK_TYPE_LABELS[task.task_type]}</Badge>
      ),
    },
    {
      key: "lead",
      header: "Lead",
      cell: (task) =>
        task.lead ? (
          <Link
            href={`/leads/${task.lead_id}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {task.lead.full_name}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (task) => (
        <Badge
          variant="secondary"
          className={`border-0 ${statusColor[task.status] || ""}`}
        >
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (task) => task.assignee?.full_name || "—",
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      cell: (task) => {
        const isOverdue =
          task.status !== "completed" &&
          isBefore(new Date(task.due_date), startOfDay(new Date()));
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {format(new Date(task.due_date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      cell: (task) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {task.lead_id && (
              <DropdownMenuItem asChild>
                <Link href={`/leads/${task.lead_id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Lead
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {task.status !== "completed" && (
              <DropdownMenuItem onClick={() => onComplete(task.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Complete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={tasks}
      isLoading={isLoading}
      emptyTitle="No tasks found"
      emptyDescription="There are no tasks matching your filters."
    />
  );
}
