"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_CONFIG } from "@/lib/constants";
import type { UserStats, LeadStage } from "@/types";

interface UserStatsCardProps {
  stats: UserStats;
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_leads}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(stats.leads_by_stage || {}).map(([stage, count]) => (
              <Badge
                key={stage}
                variant="secondary"
                className={`${STAGE_CONFIG[stage as LeadStage]?.bgClass || ""} ${STAGE_CONFIG[stage as LeadStage]?.textClass || ""} border-0 text-xs`}
              >
                {STAGE_CONFIG[stage as LeadStage]?.label || stage}: {count as number}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_calls}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-green-600">{stats.tasks_completed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium text-yellow-600">{stats.tasks_pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overdue</span>
              <span className="font-medium text-red-600">{stats.tasks_overdue}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
