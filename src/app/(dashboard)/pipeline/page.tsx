"use client";

import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  // No PageHeader here on purpose — telecallers wanted maximum vertical room
  // for the Kanban itself. Filters + columns render flush at the top.
  return <PipelineBoard />;
}
