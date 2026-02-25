"use client";

import { PageHeader } from "@/components/shared/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Drag and drop leads between stages"
      />
      <PipelineBoard />
    </div>
  );
}
