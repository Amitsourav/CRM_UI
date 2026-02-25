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
import { STAGE_CONFIG } from "@/lib/constants";
import type { PipelineReport } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineChartProps {
  data: PipelineReport | null;
  isLoading: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  lead: "#64748b",
  called: "#3b82f6",
  connected: "#eab308",
  qualified_lead: "#a855f7",
  won: "#22c55e",
  lost: "#ef4444",
};

export function PipelineChart({ data, isLoading }: PipelineChartProps) {
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
    name: (STAGE_CONFIG as Record<string, { label: string }>)[s.stage]?.label || s.stage,
    count: s.count,
    fill: STAGE_COLORS[s.stage] || "#64748b",
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
