"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pagination } from "@/components/shared/pagination";
import { formatRupees } from "@/lib/money";
import { showApiError } from "@/lib/api-errors";
import {
  reconciliationService,
  type IntelligenceFilters,
} from "@/services/reconciliation-service";
import type { DrilldownResponse, DrilldownSegment } from "@/types";

export interface DrilldownTarget {
  segment: DrilldownSegment;
  value: string;
  /** What the user clicked, for the drawer title. */
  label: string;
}

interface DrilldownDrawerProps {
  target: DrilldownTarget | null;
  filters: IntelligenceFilters;
  onOpenChange: (open: boolean) => void;
}

/**
 * The students behind a number.
 *
 * The header carries BOTH counts. Panels count different things — ageing and
 * by-lender count tranches, the stage funnel counts students — so a drawer
 * reporting one of them looks like it contradicts the figure just clicked.
 */
export function DrilldownDrawer({
  target,
  filters,
  onOpenChange,
}: DrilldownDrawerProps) {
  const [data, setData] = useState<DrilldownResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [target?.segment, target?.value]);

  const filterKey = JSON.stringify(filters);
  const fetchPage = useCallback(async () => {
    if (!target) return;
    setIsLoading(true);
    try {
      setData(
        await reconciliationService.drilldown(
          target.segment,
          target.value,
          JSON.parse(filterKey),
          page
        )
      );
    } catch (error: unknown) {
      // A bad segment or bucket comes back 400 with the valid list in detail.
      showApiError(error, "Couldn't open that segment");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [target, filterKey, page]);

  useEffect(() => {
    if (target) fetchPage();
  }, [target, fetchPage]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / (data.page_size || 50)))
    : 1;

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{target?.label ?? ""}</SheetTitle>
          {data && (
            <p className="text-sm li-mute">
              {data.total.toLocaleString()}{" "}
              {data.total === 1 ? "student" : "students"} ·{" "}
              {data.tranche_total.toLocaleString()}{" "}
              {data.tranche_total === 1 ? "tranche" : "tranches"}
            </p>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-3 overflow-y-auto">
          {isLoading && !data && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {data && data.items.length === 0 && (
            <p className="py-8 text-center text-sm li-mute">
              Nothing in this segment.
            </p>
          )}

          {data && data.items.length > 0 && (
            <>
              <div className="li-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="li-hairline li-eyebrow border-b text-left">
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Lender</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Sanctioned
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Disbursed
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={`${item.lead_id}-${item.bank_name ?? ""}`}
                        className="li-hairline border-b last:border-b-0 hover:bg-[var(--li-surface-soft)]"
                      >
                        <td className="px-3 py-1.5">
                          <Link
                            href={`/leads/${item.lead_id}`}
                            className="inline-flex items-center gap-1 font-medium hover:underline"
                          >
                            {item.full_name}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </Link>
                          <span className="ml-1.5 li-num li-mute text-[11px]">
                            {item.serial_no != null ? `#${item.serial_no}` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap li-mute">
                          {item.bank_name || "—"}
                        </td>
                        <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                          {formatRupees(item.sanctioned)}
                        </td>
                        <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                          {formatRupees(item.disbursed)}
                        </td>
                        <td className="px-3 py-1.5 li-num text-right whitespace-nowrap">
                          {formatRupees(item.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
