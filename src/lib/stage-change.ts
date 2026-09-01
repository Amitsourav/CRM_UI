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
  /** What the lender approved, in lakhs. */
  sanctionedAmountLakh: string;
  /** YYYY-MM-DD. */
  sanctionDate: string;
  /** What the lender actually released, in lakhs — not the sanctioned figure. */
  disbursedAmountLakh: string;
  /** YYYY-MM-DD. */
  disbursedOn: string;
  utrReference: string;
  notes: string;
}

export const EMPTY_STAGE_DRAFT: StageChangeDraft = {
  dueDate: "",
  lostReason: "",
  bankName: "",
  bankLoanAmountLakh: "",
  sanctionedAmountLakh: "",
  sanctionDate: "",
  disbursedAmountLakh: "",
  disbursedOn: "",
  utrReference: "",
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

/**
 * A sanction is an offer, so it records what was approved and when. It earns
 * nothing on its own — revenue only starts counting at PF Paid, where the
 * student paying the fee confirms the loan is real and which lender won it.
 */
export function stageNeedsSanction(stage: LeadStage): boolean {
  return stage === "sanctioned";
}

/**
 * Commission is earned on what a lender released, so marking a file disbursed
 * now has to capture that amount and its date. The lender itself is optional —
 * the backend falls back to the lead's primary one.
 */
export function stageNeedsDisbursement(stage: LeadStage): boolean {
  return stage === "disbursed";
}

/**
 * A follow-up date is the default requirement, but not for the stages that
 * ask for money instead — sanctioned, pf_paid and disbursed each capture
 * their own figures — nor for the terminal ones (FMC's disbursed,
 * Admitverse's enrolled) or lost, which takes a reason.
 *
 * These three must agree with the fields on screen: requiring a date the form
 * doesn't render leaves Save disabled with nothing to explain why.
 */
export function stageNeedsDueDate(
  slug: string | null | undefined,
  stage: LeadStage
): boolean {
  if (stage === "lost") return false;
  if (slug === "admitverse") return stage !== "enrolled";
  return (
    stage !== "disbursed" &&
    !stageNeedsSanction(stage) &&
    !stageNeedsBankCommitment(stage)
  );
}

/** True when nothing has to be collected, so the move can just be applied. */
export function stageAppliesImmediately(
  slug: string | null | undefined,
  stage: LeadStage
): boolean {
  return (
    !stageNeedsDueDate(slug, stage) &&
    !stageNeedsLostReason(stage) &&
    !stageNeedsBankCommitment(stage) &&
    !stageNeedsDisbursement(stage) &&
    !stageNeedsSanction(stage)
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
  if (stageNeedsSanction(stage)) {
    if (parseLakhs(draft.sanctionedAmountLakh) === null) {
      return "Enter the sanctioned amount in lakhs — a number above 0.";
    }
    if (!draft.sanctionDate) return "Set the date of the sanction.";
    if (draft.sanctionDate > todayIso()) {
      return "The sanction date can't be in the future.";
    }
  }
  if (stageNeedsDisbursement(stage)) {
    if (parseLakhs(draft.disbursedAmountLakh) === null) {
      return "Enter the amount released in lakhs — a number above 0.";
    }
    if (!draft.disbursedOn) return "Set the date the money was released.";
    if (draft.disbursedOn > todayIso()) {
      return "The release date can't be in the future.";
    }
  }
  if (stageNeedsDueDate(slug, stage) && !draft.dueDate) {
    return "Set a follow-up date.";
  }
  return null;
}

/** Local calendar date as YYYY-MM-DD, for comparing against date inputs. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

  if (stageNeedsSanction(stage)) {
    payload.sanctioned_amount_lakh = parseLakhs(draft.sanctionedAmountLakh);
    payload.sanction_date = draft.sanctionDate;
    if (draft.bankName.trim()) payload.bank_name = draft.bankName.trim();
  }

  if (stageNeedsDisbursement(stage)) {
    payload.disbursed_amount_lakh = parseLakhs(draft.disbursedAmountLakh);
    payload.disbursed_on = draft.disbursedOn;
    // Omitted unless the user picked one — the backend defaults to the lead's
    // primary lender, which it already knows by the time a file disburses.
    if (draft.bankName.trim()) payload.bank_name = draft.bankName.trim();
    if (draft.utrReference.trim()) {
      payload.utr_reference = draft.utrReference.trim();
    }
  }

  return payload;
}
