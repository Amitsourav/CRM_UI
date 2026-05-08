"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineCard } from "./pipeline-card";
import { useStageConfig } from "@/hooks/use-stage-config";
import { Loader2 } from "lucide-react";
import type { Lead, LeadStage } from "@/types";

interface PipelineColumnProps {
  stage: LeadStage;
  leads: Lead[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onChangeStage: (leadId: string, fromStage: LeadStage, toStage: LeadStage) => void;
  onToggleImportant: (leadId: string, currentValue: boolean) => void;
  onUpdateLead: (leadId: string, update: Partial<Lead>) => void;
}

export function PipelineColumn({
  stage,
  leads,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onChangeStage,
  onToggleImportant,
  onUpdateLead,
}: PipelineColumnProps) {
  const { getEntry } = useStageConfig();
  const config = getEntry(stage);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-muted/50 rounded-lg">
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
          <ScrollArea className="flex-1" style={{ maxHeight: "calc(100vh - 300px)" }}>
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
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : null}
                  {isLoadingMore
                    ? "Loading..."
                    : `Load more (${totalCount - leads.length} remaining)`}
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
