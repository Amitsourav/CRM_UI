"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import type { Lead } from "@/types";

interface PipelineCardProps {
  lead: Lead;
}

export function PipelineCard({ lead }: PipelineCardProps) {
  const router = useRouter();
  const isOverdue =
    lead.due_date && isBefore(new Date(lead.due_date), startOfDay(new Date()));

  const agentInitials = lead.assigned_agent?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      <div className="space-y-2">
        <p className="font-medium text-sm truncate">{lead.full_name}</p>
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </div>
        )}
        {lead.lead_source && (
          <Badge variant="outline" className="text-xs">
            {lead.lead_source.name}
          </Badge>
        )}
        <div className="flex items-center justify-between">
          {lead.due_date && (
            <div
              className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(lead.due_date), "MMM d")}
            </div>
          )}
          {lead.assigned_agent && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {agentInitials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </Card>
  );
}
