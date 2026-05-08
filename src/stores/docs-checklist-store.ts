import { create } from "zustand";
import api from "@/lib/api";

export interface DocsChecklistItem {
  key: string;
  label: string;
}

interface DocsChecklistState {
  items: DocsChecklistItem[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

interface ChecklistResponse {
  items: DocsChecklistItem[];
}

export const useDocsChecklistStore = create<DocsChecklistState>((set, get) => ({
  items: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<ChecklistResponse>(
        "/leads/docs/checklist"
      );
      set({
        items: data.items ?? [],
        fetched: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
