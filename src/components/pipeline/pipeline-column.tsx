"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineCard } from "./pipeline-card";
import { STAGE_CONFIG } from "@/lib/constants";
import type { Lead, LeadStage } from "@/types";

interface PipelineColumnProps {
  stage: LeadStage;
  leads: Lead[];
}

export function PipelineColumn({ stage, leads }: PipelineColumnProps) {
  const config = STAGE_CONFIG[stage];

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <h3 className="font-medium text-sm">{config.label}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {leads.length}
        </Badge>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
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
                      <PipelineCard lead={lead} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
