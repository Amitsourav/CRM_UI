"use client";

import { Badge } from "@/components/ui/badge";
import { useStageConfig } from "@/hooks/use-stage-config";
import type { LeadStage } from "@/types";

interface LeadStageBadgeProps {
  stage: LeadStage;
}

export function LeadStageBadge({ stage }: LeadStageBadgeProps) {
  const { getEntry } = useStageConfig();
  const config = getEntry(stage);
  return (
    <Badge variant="secondary" className={`${config.bgClass} ${config.textClass} border-0`}>
      {config.label}
    </Badge>
  );
}
