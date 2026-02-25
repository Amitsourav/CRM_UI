"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import type { LeadSource, SourceType } from "@/types";

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [metaFormId, setMetaFormId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/leads/sources/list");
      setSources(Array.isArray(data) ? data : data.items || []);
    } catch {
      toast.error("Failed to load sources");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/leads/sources", {
        name,
        source_type: sourceType,
        meta_form_id: sourceType === "meta_ads" ? metaFormId : undefined,
      });
      toast.success("Source created");
      setDialogOpen(false);
      setName("");
      setSourceType("manual");
      setMetaFormId("");
      fetchSources();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to create source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<LeadSource>[] = [
    { key: "name", header: "Name", cell: (s) => <span className="font-medium">{s.name}</span> },
    {
      key: "type",
      header: "Type",
      cell: (s) => <Badge variant="outline" className="capitalize">{s.source_type.replace("_", " ")}</Badge>,
    },
    { key: "meta_form_id", header: "Meta Form ID", cell: (s) => s.meta_form_id || "—" },
    {
      key: "active",
      header: "Status",
      cell: (s) => <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "created",
      header: "Created",
      cell: (s) => format(new Date(s.created_at), "MMM d, yyyy"),
    },
  ];

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader title="Lead Sources" description="Manage where your leads come from">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </PageHeader>

        <DataTable
          columns={columns}
          data={sources}
          isLoading={isLoading}
          emptyTitle="No sources found"
          emptyDescription="Create your first lead source."
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Lead Source</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Source Type *</Label>
                <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="meta_ads">Meta Ads</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sourceType === "meta_ads" && (
                <div className="space-y-2">
                  <Label>Meta Form ID</Label>
                  <Input value={metaFormId} onChange={(e) => setMetaFormId(e.target.value)} />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
