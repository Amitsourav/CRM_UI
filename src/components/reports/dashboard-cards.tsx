"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, CheckSquare, AlertTriangle, TrendingUp } from "lucide-react";
import type { DashboardReport } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardCardsProps {
  data: DashboardReport | null;
  isLoading: boolean;
}

export function DashboardCards({ data, isLoading }: DashboardCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: "Total Leads",
      value: data.total_leads,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "New Today",
      value: data.new_leads_today,
      icon: Phone,
      color: "text-green-600",
    },
    {
      title: "Pending Tasks",
      value: data.tasks_pending,
      icon: CheckSquare,
      color: "text-yellow-600",
    },
    {
      title: "Overdue Tasks",
      value: data.tasks_overdue,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Conversion Rate",
      value: `${(data.conversion_rate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
