"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useWebsiteLeadCountStore } from "@/stores/website-lead-count-store";
import {
  websiteLeadsService,
  type WebsiteLeadListParams,
} from "@/services/website-leads-service";
import type { WebsiteLeadForm, WebsiteSubmission } from "@/types";

/**
 * Keeps the sidebar's "new submissions" badge current. Mounted once in the
 * dashboard layout. Polls on an interval and again whenever the tab regains
 * focus, so a counsellor coming back to the window sees a fresh number
 * without waiting out the interval.
 */
export function useWebsiteLeadCountPolling(intervalMs = 60000) {
  const isManager = useAuthStore((s) => s.isManager);
  const refresh = useWebsiteLeadCountStore((s) => s.refresh);

  useEffect(() => {
    if (!isManager) return;
    refresh();
    const id = setInterval(refresh, intervalMs);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isManager, intervalMs, refresh]);
}

interface UseWebsiteLeadsResult {
  submissions: WebsiteSubmission[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /** Drops a row from the current page without a round-trip (post-triage). */
  removeLocal: (id: string) => void;
  /** Replaces a row in place after spam/reopen returns the updated record. */
  patchLocal: (submission: WebsiteSubmission) => void;
}

export function useWebsiteLeads(
  params: WebsiteLeadListParams
): UseWebsiteLeadsResult {
  const [submissions, setSubmissions] = useState<WebsiteSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialised params keep the effect keyed on value, not object identity.
  const key = JSON.stringify(params);
  // Guards against a slow earlier request landing after a newer one and
  // overwriting the fresher list (tab-switch → fast re-filter).
  const requestId = useRef(0);

  const fetchPage = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await websiteLeadsService.list(JSON.parse(key));
      if (id !== requestId.current) return;
      setSubmissions(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 0);
    } catch (err: unknown) {
      if (id !== requestId.current) return;
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load website leads");
      setSubmissions([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const removeLocal = useCallback((id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const patchLocal = useCallback((updated: WebsiteSubmission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

  return {
    submissions,
    total,
    totalPages,
    isLoading,
    error,
    refetch: fetchPage,
    removeLocal,
    patchLocal,
  };
}

/** Form list powering the filter dropdown. Fetched once per mount. */
export function useWebsiteLeadForms(enabled = true) {
  const [forms, setForms] = useState<WebsiteLeadForm[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    websiteLeadsService
      .forms()
      .then((data) => {
        if (!cancelled) setForms(data);
      })
      .catch(() => {
        // Non-fatal: the dropdown just stays empty and the list is unfiltered.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return forms;
}
