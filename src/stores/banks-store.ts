import { create } from "zustand";
import api from "@/lib/api";

interface BanksState {
  banks: string[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

export const useBanksStore = create<BanksState>((set, get) => ({
  banks: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<string[] | { items: string[] }>(
        "/leads/banks"
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      set({ banks: list, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
