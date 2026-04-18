"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { campaignService, getCsvTemplateUrl } from "@/services/campaign-service";
import { useAgents } from "@/hooks/use-agents";
import api from "@/lib/api";
import type { Lead } from "@/types";

const STEPS = ["Basic Info", "Schedule", "Call Settings", "Assign Leads", "Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const { agents, isLoading: agentsLoading } = useAgents();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [dailyStart, setDailyStart] = useState("09:00");
  const [dailyEnd, setDailyEnd] = useState("19:00");
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryGapHours, setRetryGapHours] = useState(2);

  // Lead selection
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStage, setLeadStage] = useState("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // CSV upload
  const [leadMode, setLeadMode] = useState<"select" | "upload">("select");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === agentId),
    [agents, agentId]
  );

  // Fetch leads for step 4
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", leadsPage.toString());
      params.set("page_size", "20");
      if (leadStage !== "all") params.set("current_stage", leadStage);

      let endpoint = `/leads?${params.toString()}`;
      if (leadSearch && leadSearch.length >= 2) {
        endpoint = `/leads/search?q=${encodeURIComponent(leadSearch)}&${params.toString()}`;
      }

      const { data } = await api.get(endpoint);
      setLeads(data.items || []);
      setLeadsTotalPages(data.total_pages || 1);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLeadsLoading(false);
    }
  }, [leadsPage, leadSearch, leadStage]);

  useEffect(() => {
    if (step === 3) fetchLeads();
  }, [step, fetchLeads]);

  const handleLeadSearch = useCallback((query: string) => {
    setLeadSearch(query);
    setLeadsPage(1);
  }, []);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const allSelected = leads.every((l) => selectedLeadIds.has(l.id));
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      leads.forEach((l) => {
        if (allSelected) next.delete(l.id);
        else next.add(l.id);
      });
      return next;
    });
  };

  const canNext = () => {
    if (step === 0) return name.trim() && agentId;
    if (step === 3) return leadMode === "upload" ? !!csvFile : selectedLeadIds.size > 0;
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await campaignService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        ai_agent_id: agentId,
        daily_start_time: dailyStart + ":00",
        daily_end_time: dailyEnd + ":00",
        skip_weekends: skipWeekends,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        max_concurrent_calls: maxConcurrent,
        max_retries: maxRetries,
        retry_gap_hours: retryGapHours,
        ...(leadMode === "select" && { lead_ids: Array.from(selectedLeadIds) }),
      });

      // Backend returns { id, campaign_id, ... } — use id field
      const campaignId = response.id || (response as unknown as Record<string, string>).campaign_id;

      if (leadMode === "upload" && csvFile && campaignId) {
        try {
          const result = await campaignService.uploadCsv(campaignId, csvFile);
          toast.success(
            `Campaign created! ${result.new_leads_created} new leads created, ${result.existing_leads_added} existing leads added.`
          );
        } catch (err: unknown) {
          const e = err as { response?: { data?: { detail?: string } } };
          toast.error("Campaign created but CSV upload failed: " + (e.response?.data?.detail || "Unknown error"));
        }
      } else {
        toast.success("Campaign created");
      }

      router.push(`/campaigns/${campaignId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedCost = selectedLeadIds.size * (selectedAgent?.pricing?.total_inr || 3) * 3;
  const estimatedMinutes = selectedLeadIds.size > 0 && maxConcurrent > 0
    ? Math.ceil(selectedLeadIds.size / maxConcurrent) * 3
    : 0;

  return (
    <ManagerGuard>
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader title="New Campaign" description="Set up an auto-dialer campaign">
          <Button variant="outline" onClick={() => router.push("/campaigns")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </PageHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i < step
                    ? "bg-primary text-primary-foreground cursor-pointer"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`text-sm hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border hidden sm:block" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="border rounded-lg p-6 bg-background">
          {/* STEP 1 — Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. March 2026 Outreach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>AI Agent *</Label>
                {agentsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents
                        .filter((a) => a.is_active)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              <span>{a.name}</span>
                              {a.pricing?.total_inr !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  ({'\u20B9'}{a.pricing.total_inr.toFixed(2)}/min)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Schedule */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily start time</Label>
                  <Input type="time" value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Daily end time</Label>
                  <Input type="time" value={dailyEnd} onChange={(e) => setDailyEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={skipWeekends} onCheckedChange={setSkipWeekends} />
                <Label>Skip weekends</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start date (optional)</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Defaults to now if empty</p>
                </div>
                <div className="space-y-2">
                  <Label>End date (optional)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Call Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Max concurrent calls (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">How many calls to make at the same time</p>
              </div>
              <div className="space-y-2">
                <Label>Max retries per lead (0-5)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">How many times to retry if lead doesn&apos;t answer</p>
              </div>
              <div className="space-y-2">
                <Label>Retry gap (hours, 1-24)</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={retryGapHours}
                  onChange={(e) => setRetryGapHours(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">Wait this long before retrying a lead</p>
              </div>
            </div>
          )}

          {/* STEP 4 — Assign Leads */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-1 border-b">
                <button
                  type="button"
                  onClick={() => setLeadMode("select")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    leadMode === "select"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Select Existing Leads
                </button>
                <button
                  type="button"
                  onClick={() => setLeadMode("upload")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    leadMode === "upload"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload CSV
                </button>
              </div>

              {/* Select existing leads */}
              {leadMode === "select" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selected
                    </p>
                    <div className="flex gap-2">
                      <Select value={leadStage} onValueChange={(v) => { setLeadStage(v); setLeadsPage(1); }}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          <SelectItem value="new_lead">New Lead</SelectItem>
                          <SelectItem value="called">Called</SelectItem>
                          <SelectItem value="connected">Connected</SelectItem>
                          <SelectItem value="qualified_lead">Qualified</SelectItem>
                        </SelectContent>
                      </Select>
                      <SearchInput placeholder="Search leads..." onSearch={handleLeadSearch} className="w-48" />
                    </div>
                  </div>

                  {leadsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-md">
                        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50">
                          <Checkbox
                            checked={leads.length > 0 && leads.every((l) => selectedLeadIds.has(l.id))}
                            onCheckedChange={toggleAllOnPage}
                          />
                          <span className="text-xs text-muted-foreground font-medium">Select all on this page</span>
                        </div>
                        {leads.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">No leads found</p>
                        )}
                        {leads.map((lead) => (
                          <div
                            key={lead.id}
                            className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleLead(lead.id)}
                          >
                            <Checkbox checked={selectedLeadIds.has(lead.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lead.full_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone || lead.email || "No contact"}</p>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">
                              {lead.current_stage?.replace(/_/g, " ") || "new"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Page {leadsPage} of {leadsTotalPages}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={leadsPage === 1} onClick={() => setLeadsPage((p) => p - 1)}>
                            Previous
                          </Button>
                          <Button variant="outline" size="sm" disabled={leadsPage >= leadsTotalPages} onClick={() => setLeadsPage((p) => p + 1)}>
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Upload CSV */}
              {leadMode === "upload" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-1">Quick Upload CSV</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Upload a CSV file to automatically create leads and add them to this campaign.
                      Duplicates will be skipped by phone number.
                    </p>
                    <a
                      href={getCsvTemplateUrl()}
                      download
                      className="text-sm text-blue-700 underline inline-flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download CSV template
                    </a>
                  </div>

                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.name.endsWith(".csv")) setCsvFile(file);
                      else toast.error("Please drop a CSV file");
                    }}
                  >
                    {csvFile ? (
                      <div>
                        <Upload className="w-10 h-10 text-green-500 mx-auto mb-2" />
                        <p className="font-medium">{csvFile.name}</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {(csvFile.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          type="button"
                          onClick={() => setCsvFile(null)}
                          className="text-sm text-destructive hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium mb-1">Drop CSV file here or click to select</p>
                        <p className="text-sm text-muted-foreground mb-4">Required columns: name, phone</p>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCsvFile(file);
                          }}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          Select CSV File
                        </Button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Leads will be created in your Leads page and added to this campaign automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Review Campaign</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">AI Agent</p>
                  <p className="font-medium">{selectedAgent?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Calling hours</p>
                  <p className="font-medium">{dailyStart} – {dailyEnd}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Skip weekends</p>
                  <p className="font-medium">{skipWeekends ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Concurrent calls</p>
                  <p className="font-medium">{maxConcurrent}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max retries</p>
                  <p className="font-medium">{maxRetries} (gap: {retryGapHours}h)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leads</p>
                  {leadMode === "upload" ? (
                    <p className="font-medium">CSV: {csvFile?.name}</p>
                  ) : (
                    <p className="font-medium">{selectedLeadIds.size} selected</p>
                  )}
                </div>
                {leadMode === "select" && (
                  <div>
                    <p className="text-muted-foreground">Est. cost</p>
                    <p className="font-medium">{'\u20B9'}{estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} (~3 min avg)</p>
                  </div>
                )}
              </div>
              {leadMode === "select" && estimatedMinutes > 0 && (
                <p className="text-xs text-muted-foreground">
                  Est. completion: ~{estimatedMinutes < 60
                    ? `${estimatedMinutes} min`
                    : `${Math.round(estimatedMinutes / 60 * 10) / 10} hours`}
                  {" "}({maxConcurrent} concurrent, ~3 min/call)
                </p>
              )}
              {leadMode === "upload" && (
                <p className="text-xs text-muted-foreground">
                  Leads will be created from the CSV file after campaign creation. Cost estimates will be available once leads are processed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          )}
        </div>
      </div>
    </ManagerGuard>
  );
}
