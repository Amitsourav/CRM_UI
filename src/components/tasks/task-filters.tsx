"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_LABELS } from "@/lib/constants";
import type { User } from "@/types";

interface TaskFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  assignedTo: string;
  onAssignedToChange: (id: string) => void;
  agents: User[];
  isAdmin: boolean;
}

export function TaskFilters({
  status,
  onStatusChange,
  assignedTo,
  onAssignedToChange,
  agents,
  isAdmin,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isAdmin && (
        <Select value={assignedTo} onValueChange={onAssignedToChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
