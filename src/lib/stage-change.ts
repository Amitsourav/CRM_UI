import type { LeadStage } from "@/types";

/**
 * What a stage move has to carry, in one place.
 *
 * These rules live in the backend's stage engine, so every surface that moves
 * a lead — the Kanban drag, the lead detail page, the bank-share grid — has to
 * ask for the same fields. Wiring them into one screen only means the others
 * start failing their POSTs with a 400.
 */

export interface StageChangeDraft {
  /** YYYY-MM-DD. The backend's timestamptz column takes a plain date. */
  dueDate: string;
  lostReason: string;
  bankName: string;
  /** Free text while typing; validated as a number in lakhs on submit. */
  bankLoanAmountLakh: string;
  notes: string;
}

export const EMPTY_STAGE_DRAFT: StageChangeDraft = {
  dueDate: "",
  lostReason: "",
  bankName: "",
  bankLoanAmountLakh: "",
  notes: "",
};

export function stageNeedsLostReason(stage: LeadStage): boolean {
  return stage === "lost";
}

/**
 * `pf_paid` means one specific lender's processing fee was paid, for that
 * lender's sanctioned amount — so which lender, and how much, are both
 * mandatory. FMC-only; Admitverse's parallel stage is `deposit_paid` and
 * carries no bank.
 */
export function stageNeedsBankCommitment(stage: LeadStage): boolean {
  return stage === "pf_paid";
}

// Terminal stages don't take a follow-up date: FMC's disbursed, Admitverse's
// enrolled, and lost on both (which takes a reason instead).
export function stageNeedsDueDate(
  slug: string | null | undefined,
  stage: LeadStage
): boolean {
  if (stage === "lost") return false;
  if (slug === "admitverse") return stage !== "enrolled";
  return stage !== "disbursed";
}

/** True when nothing has to be collected, so the move can just be applied. */
export function stageAppliesImmediately(
  slug: string | null | undefined,
  stage: LeadStage
): boolean {
  return (
    !stageNeedsDueDate(slug, stage) &&
    !stageNeedsLostReason(stage) &&
    !stageNeedsBankCommitment(stage)
  );
}

/** Parsed lakhs figure, or null when the input isn't a positive number. */
export function parseLakhs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Returns the message to show, or null when the draft is complete. Mirrors
 * the backend's own checks so the user isn't taught the rules by 400s.
 */
export function validateStageChange(
  slug: string | null | undefined,
  stage: LeadStage,
  draft: StageChangeDraft
): string | null {
  if (stageNeedsLostReason(stage) && !draft.lostReason.trim()) {
    return "Pick a reason this lead was lost.";
  }
  if (stageNeedsBankCommitment(stage)) {
    if (!draft.bankName.trim()) return "Pick the bank that was paid.";
    if (parseLakhs(draft.bankLoanAmountLakh) === null) {
      return "Enter the sanctioned amount in lakhs — a number above 0.";
    }
  }
  if (stageNeedsDueDate(slug, stage) && !draft.dueDate) {
    return "Set a follow-up date.";
  }
  return null;
}

/** Request body for POST /leads/{id}/stage. */
export function buildStagePayload(
  slug: string | null | undefined,
  stage: LeadStage,
  draft: StageChangeDraft
): Record<string, unknown> {
  const payload: Record<string, unknown> = { to_stage: stage };

  if (stageNeedsLostReason(stage)) {
    payload.lost_reason = draft.lostReason.trim();
    return payload;
  }

  if (draft.notes.trim()) payload.conversation_notes = draft.notes.trim();
  // Sent whenever set: required on most stages, and accepted as an optional
  // follow-up on the terminal ones.
  if (draft.dueDate) payload.due_date = draft.dueDate;

  if (stageNeedsBankCommitment(stage)) {
    payload.bank_name = draft.bankName.trim();
    // Already in lakhs — the backend converts to rupees. Never pre-multiply.
    payload.bank_loan_amount_lakh = parseLakhs(draft.bankLoanAmountLakh);
  }

  return payload;
}
