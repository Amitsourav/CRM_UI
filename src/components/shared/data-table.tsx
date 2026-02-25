"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "./loading-skeleton";
import { EmptyState } from "./empty-state";
import { FileX } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  selectable,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row: T) => (row as Record<string, string>).id,
  emptyTitle = "No data found",
  emptyDescription = "There are no items to display.",
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileX}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allSelected = data.length > 0 && selectedIds.length === data.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(getRowId));
    }
  };

  const toggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.key}>
                {col.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.header}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const id = getRowId(row);
            return (
              <TableRow
                key={id}
                className={onRowClick ? "cursor-pointer" : ""}
                onClick={() => onRowClick?.(row)}
                data-state={selectedIds.includes(id) ? "selected" : undefined}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(id)}
                      onCheckedChange={() => toggleRow(id)}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.cell(row)}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
