"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/money";
import { showApiError } from "@/lib/api-errors";
import { reconciliationService } from "@/services/reconciliation-service";
import type { TheoreticalRevenue } from "@/types";

/**
 * What the book would be worth if every sanction drew down in full, against
 * what it has actually earned.
 *
 * FMC's own words throughout — gross theoretical, net theoretical, revenue,
 * drawdown gap — because these are the terms the numbers are discussed in
 * outside the CRM, and renaming them here would make the two disagree.
 */
export function TheoreticalPanel() {
  const [data, setData] = useState<TheoreticalRevenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFactor, setEditingFactor] = useState(false);
  const [factorDraft, setFactorDraft] = useState("");
  const [savingFactor, setSavingFactor] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await reconciliationService.theoretical());
    } catch (error: unknown) {
      showApiError(error, "Couldn't load the revenue figures");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveFactor = async () => {
    const parsed = Number(factorDraft.trim());
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      toast.error("Enter a percentage between 1 and 100.");
      return;
    }
    setSavingFactor(true);
    try {
      await reconciliationService.setNetFactor(parsed);
      setEditingFactor(false);
      await fetchData();
      toast.success("Net factor updated");
    } catch (error: unknown) {
      showApiError(error, "Couldn't update the net factor");
    } finally {
      setSavingFactor(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const excluded =
    (data.files_missing_amount ?? 0) + (data.files_missing_rate ?? 0);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Row
          label="Gross theoretical revenue"
          note="if every sanction drew down in full"
          value={formatRupees(data.gross_theoretical_revenue)}
        />
        <Row
          label="Net theoretical revenue"
          note={
            editingFactor ? undefined : `at ${Number(data.net_theoretical_factor)}%`
          }
          value={formatRupees(data.net_theoretical_revenue)}
          action={
            editingFactor ? (
              <div className="flex items-center gap-1">
                <div className="relative w-20">
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={factorDraft}
                    onChange={(e) => setFactorDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveFactor();
                      if (e.key === "Escape") setEditingFactor(false);
                    }}
                    className="h-7 pr-6 text-sm"
                    aria-label="Net theoretical factor"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={savingFactor}
                  onClick={saveFactor}
                  aria-label="Save factor"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditingFactor(false)}
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setFactorDraft(String(Number(data.net_theoretical_factor)));
                  setEditingFactor(true);
                }}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            )
          }
        />
        <Row
          label="Revenue earned"
          note="on what actually disbursed"
          value={formatRupees(data.revenue)}
        />
        <Row
          label="Drawdown gap"
          note="approved, not yet drawn"
          value={formatRupees(data.drawdown_gap)}
          emphasis
        />
      </div>

      {/* These files are left out of the sums rather than counted as zero, so
          without this line the totals read as complete when they aren't. */}
      {excluded > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p>
              {data.files_counted.toLocaleString()} of{" "}
              {data.files.toLocaleString()} files counted — the rest are
              excluded, so every figure above is a floor.
            </p>
            {/* Each count goes to where it can actually be resolved. Neither
                links to the files themselves: nothing filters leads by
                "sanctioned with no amount", and a link that showed the wrong
                files would be worse than none. */}
            <ul className="space-y-0.5">
              {data.files_missing_amount > 0 && (
                <li>
                  <Link
                    href="/reconciliation?tab=lenders"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    <span className="font-medium">
                      {data.files_missing_amount.toLocaleString()} files
                    </span>{" "}
                    have no sanctioned amount
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    — see which lenders hold them
                  </span>
                </li>
              )}
              {data.files_missing_rate > 0 && (
                <li>
                  <Link
                    href="/admin/lenders"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    <span className="font-medium">
                      {data.files_missing_rate.toLocaleString()} files
                    </span>{" "}
                    are on a route with no rate
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    — set the rate, or move them to a specific route
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  note,
  value,
  action,
  emphasis,
}: {
  label: string;
  note?: string;
  value: string;
  action?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0" +
        (emphasis ? " bg-muted/50" : "")
      }
    >
      <div className="min-w-0">
        <p className={"text-sm" + (emphasis ? " font-medium" : "")}>{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <span
          className={
            "font-mono tabular-nums" +
            (emphasis ? " text-lg font-semibold" : " text-base")
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}
