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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CallStatusBadge } from "./call-status-badge";
import { SentimentBadge } from "./sentiment-badge";
import { CallDetail } from "./call-detail";
import { Eye } from "lucide-react";
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
  const [selectedCall, setSelectedCall] = useState<CallAttempt | null>(null);

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
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Disposition</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.id}>
                <TableCell>{call.attempt_number || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={call.call_type === "ai" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {call.call_type === "ai" ? "AI" : "Live"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CallStatusBadge status={call.call_status} />
                </TableCell>
                <TableCell>
                  <SentimentBadge sentiment={call.sentiment} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {call.disposition
                      ? DISPOSITION_LABELS[call.disposition as keyof typeof DISPOSITION_LABELS] || call.disposition
                      : "—"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">
                  {call.conversation_notes || "—"}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {formatDuration(call.call_duration_seconds)}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(call.created_at), "MMM d, h:mm a")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedCall(call)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Call Detail Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selectedCall && <CallDetail call={selectedCall} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
