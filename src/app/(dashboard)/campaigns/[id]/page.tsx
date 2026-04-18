"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Trash2,
  Users,
  PhoneCall,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Upload,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { campaignService, getCsvTemplateUrl } from "@/services/campaign-service";
import type { Campaign, CampaignLead, CsvUploadResult } from "@/services/campaign-service";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api";
import type { Lead } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", className: "bg-slate-100 text-slate-700" },
  stopped: { label: "Stopped", className: "bg-red-100 text-red-700" },
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-600",
  queued: "text-blue-600",
  calling: "text-yellow-600",
  completed: "text-green-600",
  failed: "text-red-600",
  dnd: "text-orange-600",
  opted_out: "text-slate-600",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "leads" | "settings">("overview");

  // Leads tab state
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [leadSearch, setLeadSearch] = useState("");

  // Assign leads modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [selectedNewLeads, setSelectedNewLeads] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // CSV upload
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null);

  // Settings edit
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    daily_start_time: "",
    daily_end_time: "",
    max_concurrent_calls: 5,
    max_retries: 3,
    retry_gap_hours: 2,
  });

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await campaignService.get(id);
      setCampaign(data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load campaign");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Auto-refresh for active campaigns
  useEffect(() => {
    if (campaign?.status !== "active") return;
    const interval = setInterval(fetchCampaign, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign]);

  // Fetch campaign leads
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const params: Record<string, string | number> = { page: leadsPage, page_size: 20 };
      if (leadStatusFilter !== "all") params.status = leadStatusFilter;
      const data = await campaignService.getLeads(id, params);
      const items = Array.isArray(data) ? data : data.items || [];
      setCampaignLeads(items);
    } catch {
      toast.error("Failed to load campaign leads");
    } finally {
      setLeadsLoading(false);
    }
  }, [id, leadsPage, leadStatusFilter]);

  useEffect(() => {
    if (tab === "leads") fetchLeads();
  }, [tab, fetchLeads]);

  const handleAction = async (action: "start" | "pause" | "stop") => {
    try {
      if (action === "start") await campaignService.start(id);
      else if (action === "pause") await campaignService.pause(id);
      else await campaignService.stop(id);
      toast.success(`Campaign ${action === "start" ? "started" : action === "pause" ? "paused" : "stopped"}`);
      fetchCampaign();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || `Failed to ${action} campaign`);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await campaignService.delete(id);
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Assign leads
  const openAssign = async () => {
    setAssignOpen(true);
    setAvailableLoading(true);
    try {
      const { data } = await api.get("/leads?page_size=50");
      setAvailableLeads(data.items || []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleAssignLeads = async () => {
    if (selectedNewLeads.size === 0) return;
    setIsAssigning(true);
    try {
      await campaignService.assignLeads(id, Array.from(selectedNewLeads));
      toast.success(`${selectedNewLeads.size} leads assigned`);
      setAssignOpen(false);
      setSelectedNewLeads(new Set());
      fetchCampaign();
      if (tab === "leads") fetchLeads();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to assign leads");
    } finally {
      setIsAssigning(false);
    }
  };

  // Save settings
  const handleUploadCsv = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      const result = await campaignService.uploadCsv(id, csvFile);
      setUploadResult(result);
      if (result.new_leads_created > 0 || result.existing_leads_added > 0) {
        toast.success(`${result.new_leads_created + result.existing_leads_added} leads added`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await campaignService.update(id, {
        daily_start_time: editForm.daily_start_time + ":00",
        daily_end_time: editForm.daily_end_time + ":00",
        max_concurrent_calls: editForm.max_concurrent_calls,
        max_retries: editForm.max_retries,
        retry_gap_hours: editForm.retry_gap_hours,
      });
      toast.success("Settings updated");
      setEditing(false);
      fetchCampaign();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to update");
    }
  };

  const handleLeadSearch = useCallback((query: string) => {
    setLeadSearch(query);
  }, []);

  if (isLoading) {
    return (
      <ManagerGuard>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </ManagerGuard>
    );
  }

  if (error || !campaign) {
    return (
      <ManagerGuard>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">{error || "Campaign not found"}</p>
          <Button variant="outline" onClick={() => router.push("/campaigns")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
          </Button>
        </div>
      </ManagerGuard>
    );
  }

  const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const progressPct = campaign.total_leads > 0
    ? Math.round((campaign.calls_made / campaign.total_leads) * 100)
    : 0;
  const successRate = campaign.calls_made > 0
    ? Math.round((campaign.calls_connected / campaign.calls_made) * 100)
    : 0;

  const filteredLeads = leadSearch
    ? campaignLeads.filter(
        (l) =>
          l.lead_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
          l.lead_phone?.includes(leadSearch)
      )
    : campaignLeads;

  const isEditable = campaign.status === "draft" || campaign.status === "paused";

  return (
    <ManagerGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push("/campaigns")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
                <Badge className={`text-xs ${sc.className} hover:${sc.className}`}>
                  {campaign.status === "active" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
                  )}
                  {sc.label}
                </Badge>
              </div>
              {campaign.description && (
                <p className="text-muted-foreground text-sm">{campaign.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(campaign.status === "draft" || campaign.status === "paused") && (
              <Button size="sm" onClick={() => handleAction("start")}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {campaign.status === "paused" ? "Resume" : "Start"}
              </Button>
            )}
            {campaign.status === "active" && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleAction("pause")}>
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction("stop")}>
                  <Square className="mr-1.5 h-3.5 w-3.5" /> Stop
                </Button>
              </>
            )}
            {isEditable && (
              <>
                <Button variant="outline" size="sm" onClick={openAssign}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Leads
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCsvModalOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload CSV
                </Button>
              </>
            )}
            {(campaign.status === "draft" || campaign.status === "completed" || campaign.status === "stopped") && (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <p className="text-xs">Total Leads</p>
            </div>
            <p className="text-2xl font-semibold">{campaign.total_leads}</p>
          </div>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PhoneCall className="h-4 w-4" />
              <p className="text-xs">Calls Made</p>
            </div>
            <p className="text-2xl font-semibold">
              {campaign.calls_made}
              <span className="text-sm font-normal text-muted-foreground ml-1">({progressPct}%)</span>
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <p className="text-xs">Connected</p>
            </div>
            <p className="text-2xl font-semibold text-green-600">
              {campaign.calls_connected}
              <span className="text-sm font-normal text-muted-foreground ml-1">({successRate}%)</span>
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="h-4 w-4" />
              <p className="text-xs">Failed</p>
            </div>
            <p className="text-2xl font-semibold text-red-600">{campaign.calls_failed}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{campaign.calls_made} / {campaign.total_leads}</span>
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden bg-muted flex">
            {campaign.total_leads > 0 && (
              <>
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(campaign.calls_connected / campaign.total_leads) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(campaign.calls_failed / campaign.total_leads) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Connected</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Pending</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(["overview", "leads", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">Campaign Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent</span>
                  <span className="font-medium">{campaign.agent_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}</span>
                </div>
                {campaign.started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{formatDistanceToNow(new Date(campaign.started_at), { addSuffix: true })}</span>
                  </div>
                )}
                {campaign.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{formatDistanceToNow(new Date(campaign.completed_at), { addSuffix: true })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-medium">{'\u20B9'}{campaign.total_cost_inr?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">Schedule</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calling hours</span>
                  <span>{campaign.daily_start_time?.slice(0, 5)} – {campaign.daily_end_time?.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skip weekends</span>
                  <span>{campaign.skip_weekends ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concurrent calls</span>
                  <span>{campaign.max_concurrent_calls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max retries</span>
                  <span>{campaign.max_retries} (gap: {campaign.retry_gap_hours}h)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEADS TAB */}
        {tab === "leads" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={leadStatusFilter} onValueChange={(v) => { setLeadStatusFilter(v); setLeadsPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="calling">Calling</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="dnd">DND</SelectItem>
                </SelectContent>
              </Select>
              <SearchInput placeholder="Search leads..." onSearch={handleLeadSearch} className="w-full max-w-xs" />
            </div>

            {leadsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leads found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Last Attempt</TableHead>
                      <TableHead>Last Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/leads/${lead.lead_id}`)}
                      >
                        <TableCell className="font-medium text-sm">{lead.lead_name || "Unknown"}</TableCell>
                        <TableCell className="text-sm">{lead.lead_phone || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium capitalize ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                            {lead.status?.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{lead.attempt_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.last_attempt_at
                            ? formatDistanceToNow(new Date(lead.last_attempt_at), { addSuffix: true })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {lead.last_call_status?.replace(/_/g, " ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">Page {leadsPage}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={leadsPage === 1} onClick={() => setLeadsPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={filteredLeads.length < 20} onClick={() => setLeadsPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="border rounded-lg p-6 space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Campaign Settings</h3>
              {isEditable && !editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditForm({
                      daily_start_time: campaign.daily_start_time?.slice(0, 5) || "09:00",
                      daily_end_time: campaign.daily_end_time?.slice(0, 5) || "19:00",
                      max_concurrent_calls: campaign.max_concurrent_calls,
                      max_retries: campaign.max_retries,
                      retry_gap_hours: campaign.retry_gap_hours,
                    });
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily start</Label>
                    <Input type="time" value={editForm.daily_start_time} onChange={(e) => setEditForm((f) => ({ ...f, daily_start_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily end</Label>
                    <Input type="time" value={editForm.daily_end_time} onChange={(e) => setEditForm((f) => ({ ...f, daily_end_time: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max concurrent calls</Label>
                  <Input type="number" min={1} max={10} value={editForm.max_concurrent_calls} onChange={(e) => setEditForm((f) => ({ ...f, max_concurrent_calls: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max retries</Label>
                  <Input type="number" min={0} max={5} value={editForm.max_retries} onChange={(e) => setEditForm((f) => ({ ...f, max_retries: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Retry gap (hours)</Label>
                  <Input type="number" min={1} max={24} value={editForm.retry_gap_hours} onChange={(e) => setEditForm((f) => ({ ...f, retry_gap_hours: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSettings}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calling hours</span>
                  <span>{campaign.daily_start_time?.slice(0, 5)} – {campaign.daily_end_time?.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skip weekends</span>
                  <span>{campaign.skip_weekends ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concurrent calls</span>
                  <span>{campaign.max_concurrent_calls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max retries</span>
                  <span>{campaign.max_retries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry gap</span>
                  <span>{campaign.retry_gap_hours} hours</span>
                </div>
                {!isEditable && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Settings are read-only for {campaign.status} campaigns.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assign leads modal */}
        {assignOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Add Leads to Campaign</h3>
                <Button variant="ghost" size="sm" onClick={() => { setAssignOpen(false); setSelectedNewLeads(new Set()); }}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {availableLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setSelectedNewLeads((prev) => {
                            const next = new Set(prev);
                            if (next.has(lead.id)) next.delete(lead.id);
                            else next.add(lead.id);
                            return next;
                          });
                        }}
                      >
                        <input type="checkbox" checked={selectedNewLeads.has(lead.id)} readOnly className="rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lead.full_name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone || lead.email || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{selectedNewLeads.size} selected</span>
                <Button size="sm" disabled={selectedNewLeads.size === 0 || isAssigning} onClick={handleAssignLeads}>
                  {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign {selectedNewLeads.size} Leads
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Upload Modal */}
        {csvModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-semibold">Upload Leads CSV</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setCsvModalOpen(false); setUploadResult(null); setCsvFile(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-5 space-y-4">
                {!uploadResult && !uploading && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <a
                        href={getCsvTemplateUrl()}
                        download
                        className="text-sm text-blue-700 underline inline-flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download CSV template
                      </a>
                    </div>
                    <div className="space-y-2">
                      <Label>Select CSV File</Label>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setCsvFile(f);
                        }}
                      />
                      {csvFile && (
                        <p className="text-xs text-green-600">Selected: {csvFile.name}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Required columns: name, phone. Optional: email, course_interest, country_interest, city
                    </p>
                  </>
                )}

                {uploading && (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Processing CSV and creating leads...</span>
                  </div>
                )}

                {uploadResult && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-green-900">Upload Complete</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total rows</span>
                          <span className="font-medium">{uploadResult.total_rows}</span>
                        </div>
                        <div className="flex justify-between text-green-700">
                          <span>New leads created</span>
                          <span className="font-medium">{uploadResult.new_leads_created}</span>
                        </div>
                        <div className="flex justify-between text-blue-700">
                          <span>Existing leads added</span>
                          <span className="font-medium">{uploadResult.existing_leads_added}</span>
                        </div>
                        {uploadResult.duplicates_skipped > 0 && (
                          <div className="flex justify-between text-yellow-700">
                            <span>Duplicates skipped</span>
                            <span className="font-medium">{uploadResult.duplicates_skipped}</span>
                          </div>
                        )}
                        {uploadResult.invalid_rows > 0 && (
                          <div className="flex justify-between text-red-700">
                            <span>Invalid rows</span>
                            <span className="font-medium">{uploadResult.invalid_rows}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <details className="border rounded-lg p-3">
                        <summary className="cursor-pointer text-sm font-medium text-red-700">
                          View {uploadResult.errors.length} errors
                        </summary>
                        <div className="mt-2 max-h-40 overflow-y-auto text-xs space-y-1">
                          {uploadResult.errors.map((err, i) => (
                            <div key={i} className="text-red-600 bg-red-50 p-2 rounded">
                              Row {err.row}: {err.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex justify-end gap-2">
                {!uploadResult ? (
                  <>
                    <Button variant="outline" onClick={() => { setCsvModalOpen(false); setCsvFile(null); }}>
                      Cancel
                    </Button>
                    <Button disabled={!csvFile || uploading} onClick={handleUploadCsv}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => {
                    setCsvModalOpen(false);
                    setUploadResult(null);
                    setCsvFile(null);
                    fetchCampaign();
                    if (tab === "leads") fetchLeads();
                  }}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Campaign"
          description={`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete"}
          onConfirm={handleDelete}
          destructive
        />
      </div>
    </ManagerGuard>
  );
}
