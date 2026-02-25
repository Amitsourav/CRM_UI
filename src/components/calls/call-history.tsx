"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { DISPOSITION_LABELS } from "@/lib/constants";
import api from "@/lib/api";
import type { CallAttempt } from "@/types";

interface CallHistoryProps {
  leadId: string;
  refreshKey?: number;
}

export function CallHistory({ leadId, refreshKey }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/leads/${leadId}/calls`);
        setCalls(Array.isArray(data) ? data : data.items || []);
      } catch {
        setCalls([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCalls();
  }, [leadId, refreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No calls recorded yet.</p>;
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Disposition</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Agenda</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id}>
              <TableCell>{call.attempt_number}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {DISPOSITION_LABELS[call.disposition]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {call.conversation_notes}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {call.agent_agenda}
              </TableCell>
              <TableCell>{formatDuration(call.call_duration_seconds)}</TableCell>
              <TableCell>
                {format(new Date(call.created_at), "MMM d, h:mm a")}
              </TableCell>
              <TableCell>
                {call.call_recording_url && (
                  <a
                    href={call.call_recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
