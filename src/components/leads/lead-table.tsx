"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { LeadStageBadge } from "./lead-stage-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, UserPlus, Trash2, Users } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import type { Lead } from "@/types";

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  isAdmin: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (lead: Lead) => void;
  onAssign: (leadId: string) => void;
  onDelete: (leadId: string) => void;
  onBulkAssign: () => void;
}

export function LeadTable({
  leads,
  isLoading,
  isAdmin,
  selectedIds,
  onSelectionChange,
  onEdit,
  onAssign,
  onDelete,
  onBulkAssign,
}: LeadTableProps) {
  const router = useRouter();

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (lead) => (
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.full_name}
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (lead) => lead.phone || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (lead) => (
        <span className="truncate max-w-[180px] block">{lead.email || "—"}</span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      cell: (lead) => <LeadStageBadge stage={lead.current_stage} />,
    },
    {
      key: "source",
      header: "Source",
      cell: (lead) => lead.lead_source?.name || "—",
    },
    {
      key: "agent",
      header: "Agent",
      cell: (lead) => lead.assigned_agent?.full_name || "Unassigned",
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      cell: (lead) => {
        if (!lead.due_date) return "—";
        const isOverdue = isBefore(new Date(lead.due_date), startOfDay(new Date()));
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {format(new Date(lead.due_date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      cell: (lead) => format(new Date(lead.created_at), "MMM d, yyyy"),
    },
    {
      key: "actions",
      header: "",
      cell: (lead) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(lead)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => onAssign(lead.id)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(lead.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {isAdmin && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={onBulkAssign}>
            <Users className="mr-2 h-4 w-4" />
            Assign Selected
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={leads}
        isLoading={isLoading}
        selectable={isAdmin}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        emptyTitle="No leads found"
        emptyDescription="Create your first lead or adjust your filters."
        onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
      />
    </div>
  );
}
