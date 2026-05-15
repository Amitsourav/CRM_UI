"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { roleLabel } from "@/lib/constants";
import type { Remark } from "@/types";

interface LeadRemarksProps {
  leadId: string;
}

const MAX_BODY = 5000;

function roleBadgeClasses(role: string): string {
  if (role === "admin") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (role === "manager") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  // pre_counsellor + legacy "telecaller" alias
  if (role === "pre_counsellor" || role === "telecaller") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function LeadRemarks({ leadId }: LeadRemarksProps) {
  const [remarks, setRemarks] = useState<Remark[] | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Remark[] | { items: Remark[] }>(`/leads/${leadId}/remarks`)
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data.items ?? []);
        setRemarks(list);
      })
      .catch(() => {
        if (!cancelled) setRemarks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body) {
      toast.error("Write something first");
      return;
    }
    if (body.length > MAX_BODY) {
      toast.error(`Remark is too long (${MAX_BODY} char limit)`);
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<Remark>(`/leads/${leadId}/remarks`, {
        body,
      });
      setRemarks((prev) => [data, ...(prev ?? [])]);
      setDraft("");
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (err.response?.status === 403) {
        toast.error("You don't have permission to add a remark on this lead");
      } else {
        toast.error(err.response?.data?.detail || "Couldn't save remark");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a remark visible to everyone on this lead…"
          rows={3}
          maxLength={MAX_BODY}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {draft.length}/{MAX_BODY}
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !draft.trim()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Remark
          </Button>
        </div>
      </div>

      {/* Feed */}
      {remarks === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : remarks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No remarks yet. Be the first to leave one.
        </p>
      ) : (
        <ul className="space-y-3">
          {remarks.map((r) => (
            <li key={r.id} className="border rounded-md p-3 bg-card">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium">{r.author_name}</span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none border ${roleBadgeClasses(r.author_role)}`}
                >
                  {roleLabel(r.author_role)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ·{" "}
                  {formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
