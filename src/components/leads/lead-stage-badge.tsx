import { Badge } from "@/components/ui/badge";
import { STAGE_CONFIG } from "@/lib/constants";
import type { LeadStage } from "@/types";

interface LeadStageBadgeProps {
  stage: LeadStage;
}

export function LeadStageBadge({ stage }: LeadStageBadgeProps) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge variant="secondary" className={`${config.bgClass} ${config.textClass} border-0`}>
      {config.label}
    </Badge>
  );
}
