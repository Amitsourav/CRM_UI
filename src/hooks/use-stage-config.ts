"use client";

import { useAuthStore } from "@/stores/auth-store";
import {
  canTransition as canTransitionForSlug,
  getStageConfigMap,
  getStageEntry,
  getStageList,
  getValidTransitions as getValidTransitionsForSlug,
  stageRequiresNotes as stageRequiresNotesForSlug,
  type StageConfigEntry,
} from "@/lib/constants";
import type { LeadStage } from "@/types";

export function useStageConfig() {
  const slug = useAuthStore((s) => s.company?.company_slug ?? null);

  const stages = getStageList(slug);
  const configMap = getStageConfigMap(slug);

  return {
    slug,
    stages,
    configMap,
    getEntry: (stage: LeadStage): StageConfigEntry => getStageEntry(slug, stage),
    getValidTransitions: (from: LeadStage): LeadStage[] =>
      getValidTransitionsForSlug(slug, from),
    canTransition: (from: LeadStage, to: LeadStage): boolean =>
      canTransitionForSlug(slug, from, to),
    stageRequiresNotes: (stage: LeadStage): boolean =>
      stageRequiresNotesForSlug(slug, stage),
  };
}
