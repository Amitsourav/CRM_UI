"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineCard } from "./pipeline-card";
import { useStageConfig } from "@/hooks/use-stage-config";
import { isDnpStage } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import type { Lead, LeadStage } from "@/types";

interface PipelineColumnProps {
  stage: LeadStage;
  leads: Lead[];
  totalCount: number;
  hasMore: boolean;
  /** How many the next page fetches — the button says so plainly. */
  pageSize: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onChangeStage: (leadId: string, fromStage: LeadStage, toStage: LeadStage) => void;
  onToggleImportant: (leadId: string, currentValue: boolean) => void;
  onUpdateLead: (leadId: string, update: Partial<Lead>) => void;
  onRefetchLead: (leadId: string) => void;
}

export function PipelineColumn({
  stage,
  leads,
  totalCount,
  hasMore,
  pageSize,
  isLoadingMore,
  onLoadMore,
  onChangeStage,
  onToggleImportant,
  onUpdateLead,
  onRefetchLead,
}: PipelineColumnProps) {
  const { getEntry } = useStageConfig();
  const config = getEntry(stage);
  // The header keeps showing the true total; this is only what's unloaded.
  const remaining = Math.max(totalCount - leads.length, 0);

  return (
    <div
      className={`flex flex-col shrink-0 bg-muted/50 rounded-lg ${
        stage === "created" || isDnpStage(stage) ? "w-[400px]" : "w-[340px]"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <h3 className="font-medium text-sm">{config.label}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {leads.length < totalCount && (
            <span className="text-xs text-muted-foreground">
              {leads.length}/
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {totalCount}
          </Badge>
        </div>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1 min-h-0">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-2 space-y-2 min-h-[200px] ${snapshot.isDraggingOver ? "bg-muted" : ""}`}
            >
              {leads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? "opacity-90" : ""}
                    >
                      <PipelineCard
                        lead={lead}
                        onChangeStage={onChangeStage}
                        onToggleImportant={onToggleImportant}
                        onUpdateLead={onUpdateLead}
                        onRefetchLead={onRefetchLead}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {/* Sits after the last card, inside the scroll area: the user
                  finds out there's more at the point they run out, which is
                  where the question occurs to them. Nothing renders when the
                  column is whole. */}
              {hasMore && (
                <Button
                  variant="outline"
                  className="h-auto w-full flex-col gap-0.5 py-2"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-medium">
                        Show {Math.min(pageSize, remaining).toLocaleString()}{" "}
                        more
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {remaining.toLocaleString()} remaining
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
