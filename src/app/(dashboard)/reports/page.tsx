"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DailyReportView } from "@/components/reports/daily-report-view";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Daily Activity"
        description="Today's work plus your last 30 days"
      />
      <DailyReportView />
    </div>
  );
}
