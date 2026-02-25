"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendDataPoint } from "@/types";
import { format } from "date-fns";

interface TrendsChartProps {
  data: TrendDataPoint[];
  isLoading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}

export function TrendsChart({
  data,
  isLoading,
  days,
  onDaysChange,
}: TrendsChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trends</CardTitle>
        <Select
          value={days.toString()}
          onValueChange={(v) => onDaysChange(Number(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#3b82f6"
                name="New Leads"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#eab308"
                name="Calls"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#22c55e"
                name="Conversions"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
