"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, RefreshCw, Play, Pause, Square, Eye, Copy, Trash2, Edit, Users } from "lucide-react";
import { toast } from "sonner";
import { campaignService } from "@/services/campaign-service";
import type { Campaign } from "@/services/campaign-service";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  active: { label: "Active", className: "bg-green-100 text-green-700" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", className: "bg-slate-100 text-slate-700" },
  stopped: { label: "Stopped", className: "bg-red-100 text-red-700" },
};

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "stopped", label: "Stopped" },
];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await campaignService.list(params);
      const items: Campaign[] = Array.isArray(data) ? data : data.items || [];
      setCampaigns(items);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh for active campaigns
  useEffect(() => {
    const hasActive = campaigns.some((c) => c.status === "active");
    if (!hasActive) return;
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [campaigns, refetch]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  const filtered = search
    ? campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : campaigns;

  const handleAction = async (action: "start" | "pause" | "stop", campaign: Campaign) => {
    try {
      if (action === "start") await campaignService.start(campaign.id);
      else if (action === "pause") await campaignService.pause(campaign.id);
      else await campaignService.stop(campaign.id);
      toast.success(`Campaign ${action === "start" ? "started" : action === "pause" ? "paused" : "stopped"}`);
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || `Failed to ${action} campaign`);
    }
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setDeletingCampaign(campaign);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);
    try {
      await campaignService.delete(deletingCampaign.id);
      toast.success("Campaign deleted");
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to delete campaign");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setDeletingCampaign(null);
    }
  };

  return (
    <ManagerGuard>
      <div className="space-y-6">
        <PageHeader title="Campaigns" description="Manage auto-dialer campaigns">
          <Button onClick={() => router.push("/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        </PageHeader>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 border rounded-lg p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <SearchInput
            placeholder="Search campaigns..."
            onSearch={handleSearch}
            className="w-full max-w-xs"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && campaigns.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create your first auto-dialer campaign to start calling leads at scale"
            actionLabel="+ Create Campaign"
            onAction={() => router.push("/campaigns/new")}
          />
        )}

        {/* Cards */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((campaign) => {
              const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
              const progressPct = campaign.total_leads > 0
                ? Math.round((campaign.calls_made / campaign.total_leads) * 100)
                : 0;

              return (
                <div
                  key={campaign.id}
                  className="bg-background border rounded-lg p-4 shadow-sm hover:border-primary/50 transition-colors space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-base truncate">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <Badge className={`shrink-0 text-xs ${sc.className} hover:${sc.className}`}>
                      {campaign.status === "active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5" />
                      )}
                      {sc.label}
                    </Badge>
                  </div>

                  {/* Agent */}
                  {campaign.agent_name && (
                    <p className="text-xs text-muted-foreground">
                      Agent: <span className="text-foreground">{campaign.agent_name}</span>
                    </p>
                  )}

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{campaign.calls_made} / {campaign.total_leads} calls</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden bg-muted">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Made: <span className="text-foreground font-medium">{campaign.calls_made}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Connected: <span className="text-green-600 font-medium">{campaign.calls_connected}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Failed: <span className="text-red-600 font-medium">{campaign.calls_failed}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {campaign.total_leads} leads
                    </span>
                    <div className="flex gap-1">
                      {campaign.status === "draft" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Users className="h-3.5 w-3.5 mr-1" /> Leads
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("start", campaign)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Start
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(campaign)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {campaign.status === "scheduled" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("start", campaign)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Start Now
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(campaign)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {campaign.status === "active" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("pause", campaign)}>
                            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("stop", campaign)}>
                            <Square className="h-3.5 w-3.5 mr-1" /> Stop
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {campaign.status === "paused" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("start", campaign)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Resume
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleAction("stop", campaign)}>
                            <Square className="h-3.5 w-3.5 mr-1" /> Stop
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(campaign.status === "completed" || campaign.status === "stopped") && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(campaign)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No search results */}
        {!isLoading && !error && campaigns.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No campaigns match your search</p>
          </div>
        )}

        {/* Delete confirm */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Campaign"
          description={`Are you sure you want to delete "${deletingCampaign?.name}"? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete"}
          onConfirm={handleDeleteConfirm}
          destructive
        />
      </div>
    </ManagerGuard>
  );
}
