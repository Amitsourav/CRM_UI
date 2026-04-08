"use client";

import { useState } from "react";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardCards } from "@/components/reports/dashboard-cards";
import { PipelineChart } from "@/components/reports/pipeline-chart";
import { AgentPerformanceTable } from "@/components/reports/agent-performance-table";
import { SourcePerformanceChart } from "@/components/reports/source-performance-chart";
import { TrendsChart } from "@/components/reports/trends-chart";
import { TaskComplianceChart } from "@/components/reports/task-compliance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  PhoneCall,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  useDashboardReport,
  usePipelineReport,
  useAgentReports,
  useSourceReports,
  useTrendReport,
} from "@/hooks/use-reports";
import { useCallStats } from "@/hooks/use-calls";

export default function AdminReportsPage() {
  const [trendDays, setTrendDays] = useState(30);

  const dashboard = useDashboardReport();
  const pipeline = usePipelineReport();
  const agents = useAgentReports();
  const sources = useSourceReports();
  const trends = useTrendReport(trendDays);
  const { stats: callStats, isLoading: callStatsLoading } = useCallStats();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const connectRate = callStats
    ? callStats.total_calls > 0
      ? Math.round((callStats.connected_calls / callStats.total_calls) * 100)
      : 0
    : 0;

  return (
    <ManagerGuard>
      <div className="space-y-6">
        <PageHeader
          title="Reports Dashboard"
          description="Overview of your CRM performance"
        />

        <DashboardCards data={dashboard.data} isLoading={dashboard.isLoading} />

        {/* Call Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {callStatsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : callStats ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{callStats.total_calls}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connected</CardTitle>
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{callStats.connected_calls}</div>
                  <p className="text-xs text-muted-foreground">{connectRate}% connect rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(callStats.avg_duration_seconds)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${callStats.total_cost.toFixed(2)}</div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="col-span-4 text-sm text-muted-foreground text-center py-4">
              No call data available
            </p>
          )}
        </div>

        {/* Sentiment Breakdown */}
        {!callStatsLoading && callStats && callStats.total_calls > 0 && (
          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">Positive</p>
                    <p className="text-2xl font-bold">{callStats.sentiment_breakdown.positive}</p>
                    <p className="text-xs text-muted-foreground">calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Neutral</p>
                    <p className="text-2xl font-bold">{callStats.sentiment_breakdown.neutral}</p>
                    <p className="text-xs text-muted-foreground">calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium">Negative</p>
                    <p className="text-2xl font-bold">{callStats.sentiment_breakdown.negative}</p>
                    <p className="text-xs text-muted-foreground">calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <PipelineChart data={pipeline.data} isLoading={pipeline.isLoading} />
          <TaskComplianceChart />
        </div>

        <AgentPerformanceTable
          data={agents.data}
          isLoading={agents.isLoading}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SourcePerformanceChart
            data={sources.data}
            isLoading={sources.isLoading}
          />
          <TrendsChart
            data={trends.data}
            isLoading={trends.isLoading}
            days={trendDays}
            onDaysChange={setTrendDays}
          />
        </div>
      </div>
    </ManagerGuard>
  );
}
