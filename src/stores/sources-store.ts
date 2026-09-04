import { create } from "zustand";
import api from "@/lib/api";
import type { LeadSource } from "@/types";

interface SourcesState {
  sources: LeadSource[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

/**
 * Lead sources, fetched once per session. Three screens were each fetching
 * this list on mount with their own copy of the call; the filter controls that
 * need it now share one.
 */
export const useSourcesStore = create<SourcesState>((set, get) => ({
  sources: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<LeadSource[] | { items: LeadSource[] }>(
        "/leads/sources/list"
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      set({ sources: list, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
