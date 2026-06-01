"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Lead, PaginatedResponse } from "@/types";

interface UseLeadsParams {
  page?: number;
  pageSize?: number;
  stage?: string;
  agentId?: string;
  sourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  // Admin-only segmentation filter, same contract as the pipeline
  // page: unassigned / counsellor / pre_counsellor / campaign.
  leadSegment?: string;
}

export function useLeads(params: UseLeadsParams = {}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("page", (params.page || 1).toString());
      searchParams.set("page_size", (params.pageSize || 20).toString());
      if (params.stage && params.stage !== "all")
        searchParams.set("current_stage", params.stage);
      if (params.agentId && params.agentId !== "all")
        searchParams.set("agent_id", params.agentId);
      if (params.sourceId && params.sourceId !== "all")
        searchParams.set("source_id", params.sourceId);
      if (params.dateFrom) searchParams.set("date_from", params.dateFrom);
      if (params.dateTo) searchParams.set("date_to", params.dateTo);
      if (params.leadSegment && params.leadSegment !== "all")
        searchParams.set("lead_segment", params.leadSegment);

      let endpoint = `/leads?${searchParams.toString()}`;
      if (params.search && params.search.length >= 2) {
        endpoint = `/leads/search?q=${encodeURIComponent(params.search)}&${searchParams.toString()}`;
      }

      const { data } = await api.get<PaginatedResponse<Lead>>(endpoint);
      setLeads(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.page,
    params.pageSize,
    params.stage,
    params.agentId,
    params.sourceId,
    params.dateFrom,
    params.dateTo,
    params.search,
    params.leadSegment,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, total, totalPages, isLoading, refetch: fetchLeads };
}
