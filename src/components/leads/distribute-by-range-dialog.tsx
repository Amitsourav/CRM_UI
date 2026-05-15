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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStageConfig } from "@/hooks/use-stage-config";
import { roleLabel } from "@/lib/constants";
import type { User } from "@/types";

type OrderBy = "created_at_desc" | "created_at_asc";

interface RangeRow {
  from: string;
  to: string;
  agent_id: string;
}

interface RangeResult {
  from: number;
  to: number;
  agent_id: string;
  agent_name: string;
  assigned_count: number;
}

interface DistributeResponse {
  total_assigned: number;
  eligible_count: number;
  ranges: RangeResult[];
}

interface DistributeByRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DistributeByRangeDialog({
  open,
  onOpenChange,
  onSuccess,
}: DistributeByRangeDialogProps) {
  const { stages, getEntry } = useStageConfig();

  const [users, setUsers] = useState<User[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [stage, setStage] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<OrderBy>("created_at_desc");
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [ranges, setRanges] = useState<RangeRow[]>([
    { from: "", to: "", agent_id: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DistributeResponse | null>(null);

  // Reset form state each time the dialog opens.
  useEffect(() => {
    if (open) {
      setStage("all");
      setOrderBy("created_at_desc");
      setUnassignedOnly(true);
      setRanges([{ from: "", to: "", agent_id: "" }]);
      setResult(null);
      setEligibleCount(null);
    }
  }, [open]);

  // Load active users (admins + managers + pre counsellors).
  useEffect(() => {
    if (!open) return;
    api
      .get("/users?is_active=true")
      .then(({ data }) => setUsers(data.items || data || []))
      .catch(() => {});
  }, [open]);

  // Refresh eligible count whenever the relevant filters change.
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "1");
    if (unassignedOnly) params.set("unassigned_only", "true");
    if (stage !== "all") params.set("current_stage", stage);
    api
      .get(`/leads?${params.toString()}`)
      .then(({ data }) => setEligibleCount(data.total ?? null))
      .catch(() => setEligibleCount(null));
  }, [open, stage, unassignedOnly]);

  const updateRange = (idx: number, field: keyof RangeRow, value: string) => {
    setRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const addRange = () => {
    setRanges((prev) => {
      const last = prev[prev.length - 1];
      const nextFrom = last && last.to ? String(Number(last.to) + 1) : "";
      return [...prev, { from: nextFrom, to: "", agent_id: "" }];
    });
  };

  const removeRange = (idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const parsed = ranges.map((r) => ({
      from: Number(r.from),
      to: Number(r.to),
      agent_id: r.agent_id,
    }));
    for (const r of parsed) {
      if (
        !Number.isInteger(r.from) ||
        !Number.isInteger(r.to) ||
        r.from < 1 ||
        r.to < 1
      ) {
        toast.error("Each range needs valid from/to numbers");
        return;
      }
      if (r.from > r.to) {
        toast.error("`from` must be ≤ `to` in every range");
        return;
      }
      if (!r.agent_id) {
        toast.error("Pick an agent for every range");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post<DistributeResponse>(
        "/leads/distribute-by-range",
        {
          ranges: parsed,
          unassigned_only: unassignedOnly,
          order_by: orderBy,
          ...(stage !== "all" ? { stage } : {}),
        }
      );
      setResult(data);
      toast.success(`Distributed ${data.total_assigned} leads`);
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to distribute leads");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribute Leads by Range</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{result.total_assigned}</span> of{" "}
              <span className="font-medium">{result.eligible_count}</span>{" "}
              eligible leads assigned.
            </p>
            <div className="space-y-2">
              {result.ranges.map((r, i) => {
                const requested = r.to - r.from + 1;
                const truncated = r.assigned_count < requested;
                const empty = requested - r.assigned_count;
                return (
                  <div key={i} className="border rounded-md p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">
                        Rows {r.from}–{r.to} → {r.agent_name}
                      </span>
                      <Badge variant="secondary">
                        {r.assigned_count} assigned
                      </Badge>
                    </div>
                    {truncated && (
                      <div className="flex items-start gap-2 text-xs bg-yellow-50 text-yellow-900 px-2 py-1.5 rounded border border-yellow-200">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          Only {r.assigned_count} leads matched — {empty} slot
                          {empty !== 1 ? "s were" : " was"} empty.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {eligibleCount !== null
                  ? `${eligibleCount.toLocaleString()} ${
                      unassignedOnly ? "unassigned" : "matching"
                    } lead${eligibleCount === 1 ? "" : "s"} available`
                  : "Loading eligible count…"}
              </div>

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
                  <Label className="text-xs">Order</Label>
                  <Select
                    value={orderBy}
                    onValueChange={(v) => setOrderBy(v as OrderBy)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest first</SelectItem>
                      <SelectItem value="created_at_asc">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="distribute-unassigned-only"
                  checked={unassignedOnly}
                  onCheckedChange={setUnassignedOnly}
                />
                <Label
                  htmlFor="distribute-unassigned-only"
                  className="text-sm cursor-pointer"
                >
                  Only distribute unassigned leads
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ranges</Label>
                {ranges.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="From"
                      value={r.from}
                      onChange={(e) => updateRange(idx, "from", e.target.value)}
                      className="w-24"
                      min={1}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="number"
                      placeholder="To"
                      value={r.to}
                      onChange={(e) => updateRange(idx, "to", e.target.value)}
                      className="w-24"
                      min={1}
                    />
                    <Select
                      value={r.agent_id}
                      onValueChange={(v) => updateRange(idx, "agent_id", v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Pick agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="flex items-center gap-2">
                              <span>{u.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {roleLabel(u.role)}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ranges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRange(idx)}
                        aria-label="Remove range"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRange}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add another range
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Distribute
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
