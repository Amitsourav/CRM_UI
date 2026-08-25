import { create } from "zustand";
import api from "@/lib/api";
import type { ProviderOption } from "@/types";

interface BankStatusesState {
  /** Offered options, in backend order. Labels are used as given. */
  options: ProviderOption[];
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

/**
 * GET /leads/bank-statuses — what a lender's status may be set to.
 *
 * Deliberately not a whitelist: `docs_reviewed` and `under_review` are no
 * longer offered but are still valid on existing rows. Callers must render a
 * cell's own status even when it is missing from this list.
 */
export const useBankStatusesStore = create<BankStatusesState>((set, get) => ({
  options: [],
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<
        ProviderOption[] | { items: ProviderOption[] }
      >("/leads/bank-statuses");
      const list = Array.isArray(data) ? data : (data.items ?? []);
      set({ options: list, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
