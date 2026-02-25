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
import { Skeleton } from "@/components/ui/skeleton";
import type { SourceReport } from "@/types";

interface SourcePerformanceChartProps {
  data: SourceReport[];
  isLoading: boolean;
}

export function SourcePerformanceChart({
  data,
  isLoading,
}: SourcePerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((s) => ({
    name: s.source_name,
    leads: s.total_leads,
    conversion: +(s.conversion_rate * 100).toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No source data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversion" fill="#22c55e" name="Conversion %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
