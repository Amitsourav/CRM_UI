"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useLeads } from "@/hooks/use-leads";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadFilters, type LeadFiltersState } from "@/components/leads/lead-filters";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadAssignDialog } from "@/components/leads/lead-assign-dialog";
import { BulkAssignDialog } from "@/components/leads/bulk-assign-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Suspense } from "react";
import type { Lead } from "@/types";

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuthStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFiltersState>({
    stage: searchParams.get("stage") || "all",
    agentId: searchParams.get("agent_id") || "all",
    sourceId: searchParams.get("source_id") || "all",
    dateFrom: undefined,
    dateTo: undefined,
  });

  const { leads, totalPages, isLoading, refetch } = useLeads({
    page,
    pageSize: 20,
    stage: filters.stage,
    agentId: filters.agentId,
    sourceId: filters.sourceId,
    dateFrom: filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : undefined,
    dateTo: filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : undefined,
    search,
  });

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningLeadId, setAssigningLeadId] = useState("");
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState("");

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
  }, []);

  const handleFiltersChange = (newFilters: LeadFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleFormSuccess = (leadId?: string) => {
    refetch();
    if (leadId) router.push(`/leads/${leadId}`);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${deletingLeadId}`);
      toast.success("Lead deleted");
      refetch();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to delete lead");
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Manage your leads and prospects">
        <Button variant="outline" onClick={() => router.push("/leads/import")}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button
          onClick={() => {
            setEditingLead(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          placeholder="Search leads by name, email, phone..."
          onSearch={handleSearch}
          className="sm:w-72"
        />
      </div>

      <LeadFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isAdmin={isAdmin}
      />

      <LeadTable
        leads={leads}
        isLoading={isLoading}
        isAdmin={isAdmin}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={(lead) => {
          setEditingLead(lead);
          setFormOpen(true);
        }}
        onAssign={(leadId) => {
          setAssigningLeadId(leadId);
          setAssignDialogOpen(true);
        }}
        onDelete={(leadId) => {
          setDeletingLeadId(leadId);
          setDeleteDialogOpen(true);
        }}
        onBulkAssign={() => setBulkAssignOpen(true)}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editingLead}
        onSuccess={handleFormSuccess}
      />

      <LeadAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        leadId={assigningLeadId}
        onSuccess={() => {
          refetch();
          setAssignDialogOpen(false);
        }}
      />

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        leadIds={selectedIds}
        onSuccess={() => {
          refetch();
          setSelectedIds([]);
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsPageContent />
    </Suspense>
  );
}
