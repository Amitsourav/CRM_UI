"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { LeadStageLog } from "@/types";
import { useStageConfig } from "@/hooks/use-stage-config";
import { LeadStageBadge } from "./lead-stage-badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const [logs, setLogs] = useState<LeadStageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getEntry } = useStageConfig();

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const { data } = await api.get(`/leads/${leadId}/timeline`);
        setLogs(Array.isArray(data) ? data : data.items || []);
      } catch {
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimeline();
  }, [leadId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No stage changes recorded yet.</p>;
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      {logs.map((log, index) => {
        const stageConfig = getEntry(log.to_stage);
        return (
          <div key={log.id || index} className="relative flex gap-4 pb-6">
            <div className={`relative z-10 h-8 w-8 rounded-full ${stageConfig.color} flex items-center justify-center shrink-0`}>
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {log.from_stage && (
                  <>
                    <LeadStageBadge stage={log.from_stage} />
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <LeadStageBadge stage={log.to_stage} />
              </div>
              {log.changed_by_user && (
                <p className="text-sm text-muted-foreground mt-1">
                  by {log.changed_by_user.full_name}
                </p>
              )}
              {log.conversation_notes && (
                <p className="text-sm mt-1">{log.conversation_notes}</p>
              )}
              {log.agent_agenda && (
                <p className="text-sm text-muted-foreground mt-1">Agenda: {log.agent_agenda}</p>
              )}
              {log.lost_reason && (
                <p className="text-sm text-red-700 mt-1">
                  <span className="font-medium">Lost reason:</span> {log.lost_reason}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
