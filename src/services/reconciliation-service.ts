import api from "@/lib/api";
import type {
  DisbursementRow,
  LenderSummaryRow,
  ManagedBank,
  ReconciliationResponse,
  ReconciliationSettings,
  ReconciliationStatus,
  TheoreticalRevenue,
} from "@/types";

export interface ReconciliationParams {
  page?: number;
  page_size?: number;
  /** Repeatable — values OR together, same convention as the share grid. */
  bank_name?: string[];
  status?: ReconciliationStatus[];
  disbursed_from?: string;
  disbursed_to?: string;
  /** Student name. */
  q?: string;
}

// The backend caps page_size at 200.
const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 50;

function appendEach(
  search: URLSearchParams,
  key: string,
  values: string[] | undefined
): void {
  for (const value of values ?? []) {
    if (value) search.append(key, value);
  }
}

/** Amounts go up in lakhs and come back in rupees. Never pre-multiply. */
export interface RecordPaymentBody {
  amount_received?: number;
  tds_deducted?: number;
  received_on?: string;
  payment_reference?: string;
  disbursed_amount_lakh?: number;
  disbursed_on?: string;
  commission_rate?: number;
  /** Overrides the percentage, for a negotiated settlement. */
  commission_amount?: number;
  utr_reference?: string;
  /** Off ⇒ commission is 0 while the rate stays on the row. */
  earns_commission?: boolean;
  write_off_reason?: string;
  notes?: string;
}

export interface TrancheBody {
  disbursed_amount_lakh: number;
  disbursed_on: string;
  utr_reference?: string;
}

export const reconciliationService = {
  list: async (
    params: ReconciliationParams = {}
  ): Promise<ReconciliationResponse> => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set(
      "page_size",
      String(Math.min(params.page_size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE))
    );
    if (params.q) search.set("q", params.q);
    if (params.disbursed_from)
      search.set("disbursed_from", params.disbursed_from);
    if (params.disbursed_to) search.set("disbursed_to", params.disbursed_to);
    appendEach(search, "bank_name", params.bank_name);
    appendEach(search, "status", params.status);

    const { data } = await api.get<ReconciliationResponse>(
      `/reconciliation?${search.toString()}`
    );
    return data;
  },

  summary: async (): Promise<LenderSummaryRow[]> => {
    const { data } = await api.get<
      LenderSummaryRow[] | { items: LenderSummaryRow[] }
    >("/reconciliation/summary");
    return Array.isArray(data) ? data : (data.items ?? []);
  },

  theoretical: async (): Promise<TheoreticalRevenue> => {
    const { data } = await api.get<TheoreticalRevenue>(
      "/reconciliation/theoretical"
    );
    return data;
  },

  getSettings: async (): Promise<ReconciliationSettings> => {
    const { data } = await api.get<ReconciliationSettings>(
      "/reconciliation/settings"
    );
    return data;
  },

  /**
   * Applies to every figure immediately, historical included — it's an
   * assumption about drawdown, not a record of what happened.
   */
  setNetFactor: async (factor: number): Promise<ReconciliationSettings> => {
    const { data } = await api.patch<ReconciliationSettings>(
      "/reconciliation/settings",
      { net_theoretical_factor: factor }
    );
    return data;
  },

  update: async (
    id: string,
    body: RecordPaymentBody
  ): Promise<DisbursementRow> => {
    const { data } = await api.patch<DisbursementRow>(
      `/reconciliation/disbursements/${id}`,
      body
    );
    return data;
  },

  /**
   * A later instalment on a file that already disbursed. Rare — 2 of 2,410
   * files — so it hangs off the bank cell rather than a top-level action.
   */
  addTranche: async (
    leadId: string,
    entryId: string,
    body: TrancheBody
  ): Promise<DisbursementRow> => {
    const { data } = await api.post<DisbursementRow>(
      `/leads/${leadId}/banks/${entryId}/disbursements`,
      body
    );
    return data;
  },

  listTranches: async (
    leadId: string,
    entryId: string
  ): Promise<DisbursementRow[]> => {
    const { data } = await api.get<
      DisbursementRow[] | { items: DisbursementRow[] }
    >(`/leads/${leadId}/banks/${entryId}/disbursements`);
    return Array.isArray(data) ? data : (data.items ?? []);
  },
};

export const lendersService = {
  /** Admin lender list, with the commission rate on each. */
  list: async (): Promise<ManagedBank[]> => {
    const { data } = await api.get<ManagedBank[] | { items: ManagedBank[] }>(
      "/leads/banks/manage"
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  },

  /**
   * Only affects future disbursements — each stored row keeps the rate that
   * applied when it was created, so renegotiating never rewrites history.
   */
  setCommissionRate: async (
    bankId: string,
    rate: number | null
  ): Promise<ManagedBank> => {
    const { data } = await api.patch<ManagedBank>(`/leads/banks/${bankId}`, {
      commission_rate: rate,
    });
    return data;
  },
};
