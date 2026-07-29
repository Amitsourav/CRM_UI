import { create } from "zustand";
import { websiteLeadsService } from "@/services/website-leads-service";
import type { WebsiteLeadCounts } from "@/types";
import { useAuthStore } from "./auth-store";

const EMPTY_COUNTS: WebsiteLeadCounts = {
  new: 0,
  converted: 0,
  duplicate: 0,
  spam: 0,
  total: 0,
};

interface WebsiteLeadCountState {
  counts: WebsiteLeadCounts;
  refresh: () => Promise<void>;
  // Local decrement applied the moment a row leaves the New tab, so the
  // sidebar badge doesn't lag behind the table until the next poll.
  decrementNew: (by?: number) => void;
}

export const useWebsiteLeadCountStore = create<WebsiteLeadCountState>(
  (set, get) => ({
    counts: EMPTY_COUNTS,
    refresh: async () => {
      // Manager+ only — pre-counsellors get a 403 here, so don't even ask.
      if (!useAuthStore.getState().isManager) {
        set({ counts: EMPTY_COUNTS });
        return;
      }
      try {
        set({ counts: await websiteLeadsService.counts() });
      } catch {
        // Silent — keep the last good counts rather than zeroing the badge
        // on a transient failure.
      }
    },
    decrementNew: (by = 1) => {
      const { counts } = get();
      set({
        counts: { ...counts, new: Math.max(0, counts.new - by) },
      });
    },
  })
);
