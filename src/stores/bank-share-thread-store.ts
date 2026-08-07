import { create } from "zustand";
import { bankShareService } from "@/services/bank-share-service";
import type { BankShareThread } from "@/types";

/**
 * Session cache for bank-share conversations, keyed by lead × bank.
 *
 * Threads are fetched on hover, and a user sweeping the mouse across a row
 * would otherwise fire a request per cell — on a database that runs 2–20s per
 * request. Once fetched, a cell never refetches for the rest of the session
 * (the WhatsApp bot writes these; nothing in this UI changes them).
 */
export function threadKey(leadId: string, bankName: string): string {
  return `${leadId}::${bankName}`;
}

interface BankShareThreadState {
  threads: Record<string, BankShareThread>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  ensureFetched: (leadId: string, bankName: string) => Promise<void>;
}

export const useBankShareThreadStore = create<BankShareThreadState>(
  (set, get) => ({
    threads: {},
    loading: {},
    errors: {},
    ensureFetched: async (leadId, bankName) => {
      const key = threadKey(leadId, bankName);
      const state = get();
      if (state.threads[key] || state.loading[key]) return;

      set((s) => ({
        loading: { ...s.loading, [key]: true },
        // Drop a stale error so a retry-on-reopen isn't stuck showing it.
        errors: { ...s.errors, [key]: "" },
      }));
      try {
        const thread = await bankShareService.thread(leadId, bankName);
        set((s) => ({
          threads: { ...s.threads, [key]: thread },
          loading: { ...s.loading, [key]: false },
        }));
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        set((s) => ({
          loading: { ...s.loading, [key]: false },
          errors: {
            ...s.errors,
            [key]: err.response?.data?.detail || "Couldn't load the conversation",
          },
        }));
      }
    },
  })
);
