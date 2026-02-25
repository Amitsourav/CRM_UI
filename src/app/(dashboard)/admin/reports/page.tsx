"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardCards } from "@/components/reports/dashboard-cards";
import { PipelineChart } from "@/components/reports/pipeline-chart";
import { AgentPerformanceTable } from "@/components/reports/agent-performance-table";
import { SourcePerformanceChart } from "@/components/reports/source-performance-chart";
import { TrendsChart } from "@/components/reports/trends-chart";
import { TaskComplianceChart } from "@/components/reports/task-compliance-chart";
import {
  useDashboardReport,
  usePipelineReport,
  useAgentReports,
  useSourceReports,
  useTrendReport,
} from "@/hooks/use-reports";

export default function AdminReportsPage() {
  const [trendDays, setTrendDays] = useState(30);

  const dashboard = useDashboardReport();
  const pipeline = usePipelineReport();
  const agents = useAgentReports();
  const sources = useSourceReports();
  const trends = useTrendReport(trendDays);

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader
          title="Reports Dashboard"
          description="Overview of your CRM performance"
        />

        <DashboardCards data={dashboard.data} isLoading={dashboard.isLoading} />

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
    </AdminGuard>
  );
}
