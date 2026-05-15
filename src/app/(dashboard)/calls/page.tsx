"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { SentimentBadge } from "@/components/calls/sentiment-badge";
import { CallDetail } from "@/components/calls/call-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchInput } from "@/components/shared/search-input";
import { CalendarIcon, X, RefreshCw, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useCalls } from "@/hooks/use-calls";
import { useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { CallAttemptWithLead, CallFilters, User } from "@/types";

const PAGE_SIZE = 20;

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CallsPage() {
  const { isManager } = useAuthStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [callType, setCallType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [telecallerId, setTelecallerId] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  // Pre counsellors for filter
  const [telecallers, setTelecallers] = useState<User[]>([]);
  useEffect(() => {
    if (isManager) {
      api
        .get("/users?is_active=true")
        .then(({ data }) => setTelecallers(data.items || data || []))
        .catch(() => {});
    }
  }, [isManager]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(0);
  }, []);

  const filters = useMemo<CallFilters>(() => {
    const f: CallFilters = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
    if (searchQuery.trim()) f.search = searchQuery.trim();
    if (callType !== "all") f.call_type = callType;
    if (status !== "all") f.call_status = status;
    if (sentiment !== "all") f.sentiment = sentiment;
    if (telecallerId !== "all") f.telecaller_id = telecallerId;
    if (dateFrom) f.date_from = format(dateFrom, "yyyy-MM-dd");
    if (dateTo) f.date_to = format(dateTo, "yyyy-MM-dd");
    return f;
  }, [searchQuery, callType, status, sentiment, telecallerId, dateFrom, dateTo, page]);

  const { calls, isLoading, error, refetch } = useCalls(filters);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Detail sheet
  const [selectedCall, setSelectedCall] = useState<CallAttemptWithLead | null>(null);

  const hasFilters =
    searchQuery !== "" ||
    callType !== "all" ||
    status !== "all" ||
    sentiment !== "all" ||
    telecallerId !== "all" ||
    dateFrom !== undefined ||
    dateTo !== undefined;

  const clearFilters = () => {
    setSearchQuery("");
    setCallType("all");
    setStatus("all");
    setSentiment("all");
    setTelecallerId("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="All Calls" description="View and track all calls">
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          placeholder="Search by lead name, phone..."
          onSearch={handleSearch}
          className="w-full max-w-xs"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={callType} onValueChange={(v) => { setCallType(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Call Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ai">AI Calls</SelectItem>
            <SelectItem value="live">Live Calls</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sentiment} onValueChange={(v) => { setSentiment(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>

        {isManager && (
          <Select value={telecallerId} onValueChange={(v) => { setTelecallerId(v); setPage(0); }}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Pre Counsellors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pre Counsellors</SelectItem>
              {telecallers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-10" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && calls.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg font-semibold">No calls found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilters ? "Try adjusting your filters" : "Calls will appear here once made"}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && calls.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Agent</TableHead>
                  {isManager && <TableHead>Pre Counsellor</TableHead>}
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => {
                  const isLive = ["initiated", "ringing", "connected"].includes(call.call_status);
                  return (
                  <TableRow key={call.id} className={isLive ? "bg-blue-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isLive && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
                        <div>
                          <p className="font-medium text-sm">{call.lead_name || "Unknown"}</p>
                        {call.lead_phone && (
                          <p className="text-xs text-muted-foreground">{call.lead_phone}</p>
                        )}
                        </div>
                      </div>
                    </TableCell>
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
                    <TableCell className="text-sm">
                      {call.agent_name || "—"}
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-sm">
                        {call.telecaller_id || "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-mono">
                      {formatDuration(call.call_duration_seconds)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {call.cost !== undefined && call.cost !== null
                        ? `$${call.cost.toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + calls.length} calls
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={calls.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

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
    </div>
  );
}
