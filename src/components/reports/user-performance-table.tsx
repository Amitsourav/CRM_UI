"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStageConfig } from "@/hooks/use-stage-config";
import { roleLabel } from "@/lib/constants";
import type { LeadStage, Role } from "@/types";

interface UserPipelineRow {
  user_id: string | null;
  user_name: string;
  user_role: Role | "ai";
  total_leads: number;
  by_stage: Record<string, number>;
}

interface CompanyTotals {
  total_leads: number;
  by_stage: Record<string, number>;
}

interface UserPipelineStatsResponse {
  rows: UserPipelineRow[];
  // Truthful company-wide rollup. Don't sum row totals — leads with
  // both a Counsellor and a Pre-Counsellor get double-counted there.
  company_totals?: CompanyTotals;
}

type SortKey = "total" | string;

export function UserPerformanceTable() {
  const [rows, setRows] = useState<UserPipelineRow[] | null>(null);
  const [companyTotals, setCompanyTotals] = useState<CompanyTotals | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { slug, stages, getEntry } = useStageConfig();

  useEffect(() => {
    let cancelled = false;
    api
      .get<UserPipelineStatsResponse>("/reports/user-pipeline-stats")
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data.rows ?? []);
        setCompanyTotals(data.company_totals ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { response?: { data?: { detail?: string } } };
        setError(e?.response?.data?.detail ?? "Failed to load user stats");
      });
    return () => {
      cancelled = true;
    };
    // useStageConfig.slug isn't a dep — the endpoint is brand-scoped
    // on the backend by the user's auth, not by URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Columns = the union of by_stage keys across all rows AND the
  // company_totals breakdown, ordered by the brand's canonical
  // pipeline order. Unknown keys (legacy / new) get appended at the
  // end so we don't drop data. Pulling in company_totals.by_stage
  // ensures stages that no user has work on (but exist on the
  // company-level rollup) still get a column.
  const stageColumns = useMemo(() => {
    const present = new Set<string>();
    for (const r of rows ?? []) {
      for (const k of Object.keys(r.by_stage ?? {})) present.add(k);
    }
    for (const k of Object.keys(companyTotals?.by_stage ?? {})) {
      present.add(k);
    }
    if (present.size === 0) return [] as string[];
    const known = stages.filter((s) => present.has(s));
    const unknown = [...present].filter((k) => !stages.includes(k as LeadStage));
    return [...known, ...unknown];
  }, [rows, companyTotals, stages]);

  // AI row always sinks to the bottom regardless of sort, so the
  // human leaderboard reads naturally.
  const sortedRows = useMemo(() => {
    if (!rows) return [];
    const out = [...rows].sort((a, b) => {
      const aIsAI = a.user_role === "ai";
      const bIsAI = b.user_role === "ai";
      if (aIsAI && !bIsAI) return 1;
      if (bIsAI && !aIsAI) return -1;
      const av =
        sortKey === "total" ? a.total_leads : (a.by_stage?.[sortKey] ?? 0);
      const bv =
        sortKey === "total" ? b.total_leads : (b.by_stage?.[sortKey] ?? 0);
      const cmp = av - bv;
      if (cmp === 0) return a.user_name.localeCompare(b.user_name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Brand for stage labels — getEntry handles unknown keys via
  // FALLBACK_STAGE_ENTRY, so casting is safe.
  const labelFor = (stageKey: string): string =>
    getEntry(stageKey as LeadStage).label;
  // Suppress unused-var when stage-config slug only matters via the
  // getEntry closure.
  void slug;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (rows === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {companyTotals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Total leads in CRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
              <span className="text-3xl font-bold tabular-nums">
                {companyTotals.total_leads.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                Ground-truth count — deduped across counsellor /
                pre-counsellor assignments.
              </span>
            </div>
            {stageColumns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stageColumns.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 bg-muted/30"
                  >
                    <span className="text-xs text-muted-foreground">
                      {labelFor(s)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {(companyTotals.by_stage?.[s] ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="sticky left-0 bg-background z-10 min-w-[240px] border-r"
                >
                  User
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-2 h-8 font-medium"
                    onClick={() => toggleSort("total")}
                  >
                    Total
                    <ArrowUpDown
                      className={cn(
                        "ml-1 h-3 w-3",
                        sortKey === "total"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
                </TableHead>
                {stageColumns.map((s) => (
                  <TableHead
                    key={s}
                    className="text-right whitespace-nowrap"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-2 h-8 font-medium"
                      onClick={() => toggleSort(s)}
                    >
                      {labelFor(s)}
                      <ArrowUpDown
                        className={cn(
                          "ml-1 h-3 w-3",
                          sortKey === s
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2 + stageColumns.length}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    No user stats available.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => {
                  const isAI = row.user_role === "ai";
                  return (
                    <TableRow
                      key={row.user_id ?? `ai-${row.user_name}`}
                      className={isAI ? "bg-purple-50/40" : undefined}
                    >
                      <TableCell
                        className={cn(
                          "sticky left-0 z-10 border-r",
                          isAI ? "bg-purple-50/40" : "bg-background"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isAI ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-purple-100 text-purple-700 border border-purple-200"
                            >
                              <Bot className="h-3 w-3" />
                              AI
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {roleLabel(row.user_role as Role)}
                            </Badge>
                          )}
                          <span className="font-medium">{row.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {row.total_leads}
                      </TableCell>
                      {stageColumns.map((s) => (
                        <TableCell
                          key={s}
                          className="text-right tabular-nums text-muted-foreground"
                        >
                          {row.by_stage?.[s] ?? 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
