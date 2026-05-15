import { create } from "zustand";
import api from "@/lib/api";

interface LostReasonsState {
  reasons: string[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

export const useLostReasonsStore = create<LostReasonsState>((set, get) => ({
  reasons: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<string[] | { items: string[] }>(
        "/leads/lost-reasons"
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      set({ reasons: list, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
