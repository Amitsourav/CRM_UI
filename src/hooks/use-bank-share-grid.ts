"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bankShareService,
  type BankShareGridParams,
} from "@/services/bank-share-service";
import type { BankShareGridRow } from "@/types";

interface UseBankShareGridResult {
  rows: BankShareGridRow[];
  /** Column order, straight from the backend. */
  banks: string[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /**
   * Local row patch for optimistic inline edits. The grid request takes
   * 2–20s, so a refetch is far too slow to serve as the edit's feedback.
   */
  patchRow: (leadId: string, patch: Partial<BankShareGridRow>) => void;
}

export function useBankShareGrid(
  params: BankShareGridParams
): UseBankShareGridResult {
  const [rows, setRows] = useState<BankShareGridRow[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialised params keep the effect keyed on value, not object identity.
  const key = JSON.stringify(params);
  // Guards against a slow earlier request landing after a newer one — very
  // likely here, where a request can take 20s and a filter change is instant.
  const requestId = useRef(0);

  const fetchGrid = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await bankShareService.grid(JSON.parse(key));
      if (id !== requestId.current) return;
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 0);
      // Kept across loads: an empty page (or a failed one) shouldn't collapse
      // the bank columns or empty the bank filter dropdown.
      if (data.banks?.length) setBanks(data.banks);
    } catch (err: unknown) {
      if (id !== requestId.current) return;
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load the bank share grid");
      setRows([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  const patchRow = useCallback(
    (leadId: string, patch: Partial<BankShareGridRow>) => {
      setRows((prev) =>
        prev.map((r) => (r.lead_id === leadId ? { ...r, ...patch } : r))
      );
    },
    []
  );

  return {
    rows,
    banks,
    total,
    totalPages,
    isLoading,
    error,
    refetch: fetchGrid,
    patchRow,
  };
}
