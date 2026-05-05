"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStageConfig } from "@/hooks/use-stage-config";
import type { LeadStage, PipelineReport } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineChartProps {
  data: PipelineReport | null;
  isLoading: boolean;
}

const FMC_STAGE_COLORS: Record<string, string> = {
  lead: "#64748b",
  called: "#3b82f6",
  connected: "#eab308",
  qualified_lead: "#a855f7",
  won: "#22c55e",
  lost: "#ef4444",
};

const ADMITVERSE_STAGE_COLORS: Record<string, string> = {
  created: "#9ca3af",
  contacted: "#60a5fa",
  dnp_pre_qualified: "#fb923c",
  connected: "#3b82f6",
  qualified: "#6366f1",
  opportunity: "#c084fc",
  dnp_post_qualified: "#f97316",
  processing: "#4f46e5",
  important: "#eab308",
  partial_docs_collected: "#22d3ee",
  docs_collected: "#0891b2",
  application_done: "#14b8a6",
  conditional_draft: "#0d9488",
  ucol: "#10b981",
  deposit_paid: "#22c55e",
  cas_received: "#16a34a",
  visa_applied: "#15803d",
  enrolled: "#166534",
  lost: "#ef4444",
};

export function PipelineChart({ data, isLoading }: PipelineChartProps) {
  const { slug, getEntry } = useStageConfig();
  const stageColors = slug === "admitverse" ? ADMITVERSE_STAGE_COLORS : FMC_STAGE_COLORS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = data.stages.map((s) => ({
    name: getEntry(s.stage as LeadStage).label,
    count: s.count,
    fill: stageColors[s.stage] || "#64748b",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
