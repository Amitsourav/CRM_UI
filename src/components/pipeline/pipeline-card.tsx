"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Phone, Calendar, MoreVertical, Check } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { useStageConfig } from "@/hooks/use-stage-config";
import type { Lead, LeadStage } from "@/types";

interface PipelineCardProps {
  lead: Lead;
  onChangeStage: (leadId: string, fromStage: LeadStage, toStage: LeadStage) => void;
}

export function PipelineCard({ lead, onChangeStage }: PipelineCardProps) {
  const router = useRouter();
  const { getEntry, getValidTransitions } = useStageConfig();

  const isOverdue =
    lead.due_date && isBefore(new Date(lead.due_date), startOfDay(new Date()));

  const agentInitials = lead.assigned_agent?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const transitions = getValidTransitions(lead.current_stage);
  const currentEntry = getEntry(lead.current_stage);

  // Stop propagation so the kebab doesn't trigger card navigation or drag init.
  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm truncate flex-1">{lead.full_name}</p>
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={stopBubble}
              onPointerDown={stopBubble}
            >
              <button
                type="button"
                aria-label="Change stage"
                className="-m-1 p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={stopBubble}
              onPointerDown={stopBubble}
            >
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Change stage
              </DropdownMenuLabel>
              <DropdownMenuItem disabled className="opacity-100">
                <Check className="mr-1.5 h-3.5 w-3.5" />
                <span className={`h-2 w-2 rounded-full mr-2 ${currentEntry.color}`} />
                <span className="flex-1">{currentEntry.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">current</span>
              </DropdownMenuItem>
              {transitions.length > 0 && <DropdownMenuSeparator />}
              {transitions.length === 0 && (
                <DropdownMenuItem disabled className="text-xs">
                  No transitions available
                </DropdownMenuItem>
              )}
              {transitions.map((stage) => {
                const entry = getEntry(stage);
                return (
                  <DropdownMenuItem
                    key={stage}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeStage(lead.id, lead.current_stage, stage);
                    }}
                  >
                    <span className="mr-1.5 h-3.5 w-3.5" />
                    <span className={`h-2 w-2 rounded-full mr-2 ${entry.color}`} />
                    {entry.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </div>
        )}
        {lead.current_stage === "lost" && lead.lost_reason && (
          <p
            className="text-xs text-red-700 line-clamp-2"
            title={lead.lost_reason}
          >
            {lead.lost_reason.length > 60
              ? `${lead.lost_reason.slice(0, 60).trimEnd()}…`
              : lead.lost_reason}
          </p>
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
