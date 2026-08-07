import api from "@/lib/api";
import type { BankShareGridResponse, BankShareThread } from "@/types";

export interface BankShareGridParams {
  page?: number;
  page_size?: number;
  /** Name / phone / email search. */
  q?: string;
  current_stage?: string;
  agent_id?: string;
  /** Only leads shared with this bank. */
  bank_name?: string;
  /** Only leads shared with at least one bank. */
  shared_only?: boolean;
}

// Backend caps page_size at 100. The endpoint is three queries regardless of
// page size, so a bigger page isn't proportionally slower — but the payload
// grows, and this DB runs 2–20s per request. 25–50 is the sweet spot.
const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export const bankShareService = {
  grid: async (
    params: BankShareGridParams = {}
  ): Promise<BankShareGridResponse> => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set(
      "page_size",
      String(Math.min(params.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE))
    );
    if (params.q) search.set("q", params.q);
    if (params.current_stage) search.set("current_stage", params.current_stage);
    if (params.agent_id) search.set("agent_id", params.agent_id);
    if (params.bank_name) search.set("bank_name", params.bank_name);
    // Only sent when on — the backend default is "all leads".
    if (params.shared_only) search.set("shared_only", "true");

    const { data } = await api.get<BankShareGridResponse>(
      `/leads/bank-share-grid?${search.toString()}`
    );
    return data;
  },

  /**
   * Full WhatsApp thread for one lead × one bank. Deliberately not inlined in
   * the grid — 25 leads × 18 banks of history would dwarf the rest of the
   * payload. Fetched on hover and cached per cell by `bank-share-thread-store`.
   */
  thread: async (
    leadId: string,
    bankName: string
  ): Promise<BankShareThread> => {
    const { data } = await api.get<BankShareThread>(
      `/leads/${leadId}/bank-shares/${encodeURIComponent(bankName)}`
    );
    return data;
  },
};
