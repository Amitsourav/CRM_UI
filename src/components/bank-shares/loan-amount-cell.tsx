"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCommittedLoan } from "@/lib/loan-amount";
import type { PfPaidBank } from "@/types";

interface LoanAmountCellProps {
  leadId: string;
  /** The student's asking figure, as stored. */
  loanAmount?: string | number | null;
  /** Lenders that have committed. Non-empty ⇒ this cell is read-only. */
  pfPaidBanks?: PfPaidBank[];
  onSaved: (loanAmount: string) => void;
}

/**
 * Click to edit the lead's asking amount in place.
 *
 * The input is deliberately unmasked: the backend parses "45", "7.5 Lakh" and
 * "1.5cr" into the same numeric value, and a numeric-only filter would make
 * the last two impossible to type.
 *
 * Rows where a lender has already committed show that figure instead and
 * aren't editable here — the committed number comes from the stage move, not
 * from this field, so letting someone type over it would edit a value that
 * isn't the one displayed.
 */
export function LoanAmountCell({
  leadId,
  loanAmount,
  pfPaidBanks,
  onSaved,
}: LoanAmountCellProps) {
  const committed = !!pfPaidBanks?.length;
  const display = formatCommittedLoan(loanAmount, pfPaidBanks);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Blur fires on Escape's unmount too; this keeps the cancel from saving.
  const cancelled = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (committed) {
    return (
      <span
        className="block truncate"
        title={`${display} — committed by a lender at PF Paid`}
      >
        {display}
      </span>
    );
  }

  const startEditing = () => {
    setValue(loanAmount == null ? "" : String(loanAmount));
    cancelled.current = false;
    setEditing(true);
  };

  const save = async () => {
    if (cancelled.current) return;
    const next = value.trim();
    const previous = loanAmount == null ? "" : String(loanAmount);
    setEditing(false);
    if (next === previous) return;

    // Optimistic — the grid request behind this page runs 2–20s, so waiting
    // on a refetch to show the new value would feel broken.
    onSaved(next);
    setSaving(true);
    try {
      await api.put(`/leads/${leadId}`, { loan_amount: next });
    } catch (error: unknown) {
      onSaved(previous);
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      toast.error(
        err.response?.status === 403
          ? "This lead isn't assigned to you"
          : err.response?.data?.detail || "Couldn't save the loan amount"
      );
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelled.current = true;
            setEditing(false);
          }
        }}
        aria-label="Loan amount in lakhs"
        className="w-full rounded border bg-background px-1 py-0.5 font-mono text-[12px] tabular-nums outline-none ring-1 ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Click to edit"
      className={cn(
        "-mx-1 block w-[calc(100%+0.5rem)] truncate rounded px-1 text-left hover:bg-foreground/[0.06]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        saving && "opacity-60"
      )}
    >
      {display}
    </button>
  );
}
