"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  reportService,
  type DailyReportResponse,
  type DailyRangeItem,
  type DailyMetrics,
  type MetricKey,
} from "@/services/report-service";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import api from "@/lib/api";
import type { User } from "@/types";

function todayLocalISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

const KPI_ORDER: Array<{
  key: MetricKey;
  label: string;
  format?: (v: number) => string;
}> = [
  { key: "calls_made", label: "Calls Made" },
  { key: "calls_connected", label: "Calls Connected" },
  {
    key: "call_duration_minutes",
    label: "Duration (min)",
    format: (v) => v.toFixed(1),
  },
  { key: "leads_created", label: "Leads Created" },
  { key: "transitions_total", label: "Pipeline Moves" },
  { key: "leads_won", label: "Leads Won" },
  { key: "leads_lost", label: "Leads Lost" },
  { key: "tasks_completed", label: "Tasks Completed" },
  { key: "tasks_created", label: "Tasks Created" },
];

function DeltaBadge({ delta }: { delta?: number }) {
  if (delta === undefined || delta === 0) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
        ±0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        positive
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}

export function DailyReportView() {
  const { isAdmin, user: authUser } = useAuthStore();
  const [date, setDate] = useState<string>(todayLocalISO());
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [daily, setDaily] = useState<DailyReportResponse | null>(null);
  const [range, setRange] = useState<DailyRangeItem[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingRange, setLoadingRange] = useState(true);

  // Admin-only: load user list once for the dropdown.
  useEffect(() => {
    if (!isAdmin) return;
    api
      .get("/users?is_active=true")
      .then(({ data }) => setUsers(data.items || data || []))
      .catch(() => {});
  }, [isAdmin]);

  // Today's report
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingDaily(true);
    const params: { date: string; user_id?: string } = { date };
    if (isAdmin && userId) params.user_id = userId;
    reportService
      .daily(params)
      .then(setDaily)
      .catch(() => toast.error("Failed to load daily report"))
      .finally(() => setLoadingDaily(false));
  }, [date, userId, isAdmin]);

  // 30-day range — only refetch when the user changes; the table is independent
  // of the selected date.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingRange(true);
    const params: { days: number; user_id?: string } = { days: 30 };
    if (isAdmin && userId) params.user_id = userId;
    reportService
      .dailyRange(params)
      .then(setRange)
      .catch(() => {})
      .finally(() => setLoadingRange(false));
  }, [userId, isAdmin]);

  const targetPct = daily?.percent_of_target ?? null;
  const targetBarColor =
    targetPct === null
      ? ""
      : targetPct >= 100
        ? "bg-green-500"
        : targetPct >= 70
          ? "bg-amber-500"
          : "bg-red-500";
  const targetTextColor =
    targetPct === null
      ? ""
      : targetPct >= 100
        ? "text-green-700"
        : targetPct >= 70
          ? "text-amber-700"
          : "text-red-700";

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={date}
            max={todayLocalISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {isAdmin && (
          <div className="space-y-1.5">
            <Label className="text-xs">User</Label>
            <Select
              value={userId ?? "self"}
              onValueChange={(v) => setUserId(v === "self" ? undefined : v)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">
                  Me ({authUser?.full_name ?? "self"})
                </SelectItem>
                {users
                  .filter((u) => u.id !== authUser?.id)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span>
                        {u.full_name}
                        <span className="text-xs text-muted-foreground capitalize ml-2">
                          {u.role}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {daily && (
          <div className="ml-auto text-sm text-muted-foreground">
            Viewing <span className="font-medium">{daily.user_name}</span>{" "}
            <span className="capitalize">({daily.user_role})</span> ·{" "}
            {format(new Date(daily.date), "EEE, MMM d, yyyy")}
          </div>
        )}
      </div>

      {/* Target progress bar */}
      {daily?.target_call_count != null && targetPct !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                Daily call target: {daily.metrics.calls_made} /{" "}
                {daily.target_call_count}
              </p>
              <span className={`text-sm font-semibold ${targetTextColor}`}>
                {Math.round(targetPct)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${targetBarColor}`}
                style={{ width: `${Math.min(100, targetPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      {loadingDaily ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : daily ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {KPI_ORDER.map(({ key, label, format: fmt }) => {
            const value = daily.metrics[key] as number;
            const delta = daily.deltas?.[key];
            const display = fmt ? fmt(value) : value.toString();
            return (
              <Card key={key}>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-xs font-normal text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold">{display}</span>
                    <DeltaBadge delta={delta} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data for this date.</p>
      )}

      {/* 30-day history */}
      <div>
        <h3 className="text-sm font-medium mb-2">Last 30 days</h3>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Connected</TableHead>
                <TableHead className="text-right">Duration (min)</TableHead>
                <TableHead className="text-right">Leads Created</TableHead>
                <TableHead className="text-right">Pipeline Moves</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">Tasks Done</TableHead>
                <TableHead className="text-right">Tasks Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRange ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : range.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-6"
                  >
                    No history available
                  </TableCell>
                </TableRow>
              ) : (
                [...range].reverse().map((row) => {
                  const m: DailyMetrics = row.metrics;
                  return (
                    <TableRow
                      key={row.date}
                      className={`cursor-pointer ${
                        row.date === date ? "bg-muted/60" : ""
                      }`}
                      onClick={() => setDate(row.date)}
                    >
                      <TableCell>
                        {format(new Date(row.date), "EEE, MMM d")}
                      </TableCell>
                      <TableCell className="text-right">{m.calls_made}</TableCell>
                      <TableCell className="text-right">
                        {m.calls_connected}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.call_duration_minutes.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.leads_created}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.transitions_total}
                      </TableCell>
                      <TableCell className="text-right">{m.leads_won}</TableCell>
                      <TableCell className="text-right">{m.leads_lost}</TableCell>
                      <TableCell className="text-right">
                        {m.tasks_completed}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.tasks_created}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
