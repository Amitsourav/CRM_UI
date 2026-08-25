import api from "@/lib/api";
import type { BankShareGridResponse, BankShareThread } from "@/types";

export interface BankShareGridParams {
  page?: number;
  page_size?: number;
  /** Name / phone / email search. */
  q?: string;
  /**
   * The three list filters are repeatable: the param is sent once per
   * selected value and the backend ORs them together, while different
   * filters AND with each other — `?bank_name=PNB&bank_name=Axis` plus
   * `?current_stage=processing` reads as "PNB or Axis, and in processing".
   *
   * Sent as repeated bare params, never `bank_name[]=` — the backend
   * ignores the bracket form and silently returns an unfiltered grid.
   * An empty array is omitted entirely rather than sent as `?x=`.
   */
  current_stage?: string[];
  agent_id?: string[];
  /** Only leads shared with (any of) these banks. */
  bank_name?: string[];
  /** Only leads shared with at least one bank. */
  shared_only?: boolean;
}

// Backend caps page_size at 100. The endpoint is three queries regardless of
// page size, so a bigger page isn't proportionally slower — but the payload
// grows, and this DB runs 2–20s per request. 25–50 is the sweet spot.
const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

function appendEach(
  search: URLSearchParams,
  key: string,
  values: string[] | undefined
): void {
  for (const value of values ?? []) {
    if (value) search.append(key, value);
  }
}

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
    appendEach(search, "current_stage", params.current_stage);
    appendEach(search, "agent_id", params.agent_id);
    appendEach(search, "bank_name", params.bank_name);
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
