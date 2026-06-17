import { create } from "zustand";
import api from "@/lib/api";

// Autocomplete suggestions for university fields. Returns [] on FMC, so the
// field degrades to plain free text there. The list is advisory — callers
// always accept free text, this just powers suggestions. Lazy-cached once
// per session, mirroring banks-store.
interface UniversitiesState {
  universities: string[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

export const useUniversitiesStore = create<UniversitiesState>((set, get) => ({
  universities: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<string[] | { items: string[] }>(
        "/leads/universities"
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      set({ universities: list, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
