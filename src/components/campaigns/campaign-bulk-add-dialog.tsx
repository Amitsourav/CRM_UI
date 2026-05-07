"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  campaignService,
  type BulkAssignByFilterRequest,
  type BulkAssignByFilterResult,
} from "@/services/campaign-service";
import { useStageConfig } from "@/hooks/use-stage-config";
import type { LeadSource, User } from "@/types";

interface CampaignBulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

const DEFAULT_LIMIT = 10000;
const MAX_LIMIT = 50000;

export function bulkResultToast(result: BulkAssignByFilterResult) {
  const parts: string[] = [];
  if (result.skipped_no_phone)
    parts.push(`${result.skipped_no_phone} no phone`);
  if (result.skipped_already_assigned)
    parts.push(`${result.skipped_already_assigned} already in campaign`);
  const skipNote = parts.length ? `. Skipped: ${parts.join(", ")}.` : ".";
  const truncNote = result.truncated
    ? " (Truncated — try a tighter filter or raise the limit.)"
    : "";
  toast.success(
    `Added ${result.added.toLocaleString()} of ${result.matched.toLocaleString()} matched leads${skipNote}${truncNote}`
  );
}

export function CampaignBulkAddDialog({
  open,
  onOpenChange,
  campaignId,
  onSuccess,
}: CampaignBulkAddDialogProps) {
  const { stages, getEntry } = useStageConfig();

  const [stage, setStage] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [agentId, setAgentId] = useState("all");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [sources, setSources] = useState<LeadSource[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStage("all");
      setSourceId("all");
      setAgentId("all");
      setCreatedAfter("");
      setCreatedBefore("");
      setSearch("");
      setLimit(DEFAULT_LIMIT);
      setMatchCount(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    api
      .get("/leads/sources/list")
      .then(({ data }) => {
        setSources(Array.isArray(data) ? data : data.items || []);
      })
      .catch(() => {});
    api
      .get("/users?is_active=true")
      .then(({ data }) => setAgents(data.items || data || []))
      .catch(() => {});
  }, [open]);

  // Live match-count preview using the lead-list endpoint as a counting proxy.
  useEffect(() => {
    if (!open) return;
    setIsCounting(true);
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "1");
    if (stage !== "all") params.set("current_stage", stage);
    if (sourceId !== "all") params.set("source_id", sourceId);
    if (agentId !== "all") params.set("agent_id", agentId);
    if (createdAfter) params.set("date_from", createdAfter);
    if (createdBefore) params.set("date_to", createdBefore);

    let endpoint = `/leads?${params.toString()}`;
    const trimmed = search.trim();
    if (trimmed.length >= 2) {
      endpoint = `/leads/search?q=${encodeURIComponent(trimmed)}&${params.toString()}`;
    }

    api
      .get(endpoint)
      .then(({ data }) => setMatchCount(data.total ?? 0))
      .catch(() => setMatchCount(null))
      .finally(() => setIsCounting(false));
  }, [open, stage, sourceId, agentId, createdAfter, createdBefore, search]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const body: BulkAssignByFilterRequest = { limit };
    if (stage !== "all") body.current_stage = stage;
    if (sourceId !== "all") body.lead_source_id = sourceId;
    if (agentId !== "all") body.assigned_agent_id = agentId;
    if (createdAfter) body.created_after = `${createdAfter}T00:00:00Z`;
    if (createdBefore) body.created_before = `${createdBefore}T23:59:59Z`;
    const trimmed = search.trim();
    if (trimmed) body.search = trimmed;

    try {
      const result = await campaignService.assignLeadsBulk(campaignId, body);
      bulkResultToast(result);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to bulk-add leads");
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchLine = isCounting
    ? "Counting…"
    : matchCount === null
      ? "—"
      : `${matchCount.toLocaleString()} lead${matchCount === 1 ? "" : "s"} match`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk add leads by filter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{matchLine}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getEntry(s).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Limit (max {MAX_LIMIT.toLocaleString()})</Label>
              <Input
                type="number"
                value={limit}
                min={1}
                max={MAX_LIMIT}
                onChange={(e) =>
                  setLimit(
                    Math.min(
                      MAX_LIMIT,
                      Math.max(1, Number(e.target.value) || DEFAULT_LIMIT)
                    )
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created after</Label>
              <Input
                type="date"
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created before</Label>
              <Input
                type="date"
                value={createdBefore}
                onChange={(e) => setCreatedBefore(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Search (name, phone, email)</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="amit, +91…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || matchCount === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {matchCount?.toLocaleString() ?? "0"} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
