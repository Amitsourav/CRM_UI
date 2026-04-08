"use client";

import { useCallback, useEffect, useState } from "react";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import api from "@/lib/api";
import type { CSVImport } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  previewing: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function AdminCsvHistoryPage() {
  const [imports, setImports] = useState<CSVImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/csv/history?page=${page}&page_size=20`);
      const items: CSVImport[] = Array.isArray(data) ? data : (data.items || []);
      const pages: number = Array.isArray(data) ? 1 : (data.total_pages || 1);
      setImports(items);
      setTotalPages(pages);
    } catch {
      toast.error("Failed to load CSV history");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <ManagerGuard>
      <div className="space-y-6">
        <PageHeader
          title="CSV Import History"
          description="View past CSV imports and their results"
        />

        {isLoading ? (
          <TableSkeleton columns={8} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Duplicates</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No CSV imports found
                    </TableCell>
                  </TableRow>
                ) : (
                  imports.map((imp) => (
                    <>
                      <TableRow
                        key={imp.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedId(expandedId === imp.id ? null : imp.id)
                        }
                      >
                        <TableCell>
                          {imp.error_details?.length > 0 &&
                            (expandedId === imp.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            ))}
                        </TableCell>
                        <TableCell className="font-medium">
                          {imp.file_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`border-0 capitalize ${STATUS_COLORS[imp.status] || ""}`}
                          >
                            {imp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {imp.total_rows}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {imp.success_count}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {imp.failure_count}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {imp.duplicate_count}
                        </TableCell>
                        <TableCell>
                          {format(new Date(imp.created_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                      {expandedId === imp.id &&
                        imp.error_details?.length > 0 && (
                          <TableRow key={`${imp.id}-errors`}>
                            <TableCell colSpan={8} className="bg-muted/50">
                              <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
                                <p className="text-sm font-medium mb-2">
                                  Error Details:
                                </p>
                                {imp.error_details.map((err, i) => (
                                  <div
                                    key={i}
                                    className="flex gap-2 text-xs"
                                  >
                                    <Badge
                                      variant="outline"
                                      className="shrink-0"
                                    >
                                      Row {err.row}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {err.error}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </ManagerGuard>
  );
}
