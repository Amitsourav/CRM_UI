import api from "@/lib/api";
import type { BankEntry, BankStatus, PfStatus } from "@/types";

export interface BankEntryCreate {
  bank_name: string;
  bank_status?: BankStatus;
  notes?: string | null;
}

export interface BankEntryUpdate {
  bank_status?: BankStatus;
  /** In lakhs — required when setting a bank to pf_paid without a stored one. */
  loan_amount_lakh?: number;
  /**
   * Required when setting a bank to `sanctioned`, alongside `sanction_date`
   * below. A sanction is what was approved; it earns nothing on its own.
   */
  sanctioned_amount_lakh?: number;
  /**
   * Required when setting a bank to `disbursed`: what actually left the bank,
   * in lakhs, and when. Commission is earned on this, not on the sanctioned
   * figure.
   */
  disbursed_amount_lakh?: number;
  disbursed_on?: string;
  utr_reference?: string;
  notes?: string | null;
  application_id?: string | null;
  sanction_date?: string | null;
  loan_amount?: string | number | null;
  roi?: string | number | null;
  tenure_months?: number | null;
  pf_amount?: string | number | null;
  first_tranche_amount?: string | number | null;
  no_of_tranches?: number | null;
  pf_status?: PfStatus | null;
}

export const leadBanksService = {
  list: async (leadId: string): Promise<BankEntry[]> => {
    const { data } = await api.get<BankEntry[] | { items: BankEntry[] }>(
      `/leads/${leadId}/banks`
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  },
  add: async (leadId: string, body: BankEntryCreate): Promise<BankEntry> => {
    const { data } = await api.post<BankEntry>(`/leads/${leadId}/banks`, body);
    return data;
  },
  update: async (
    leadId: string,
    entryId: string,
    body: BankEntryUpdate
  ): Promise<BankEntry> => {
    const { data } = await api.patch<BankEntry>(
      `/leads/${leadId}/banks/${entryId}`,
      body
    );
    return data;
  },
  remove: async (leadId: string, entryId: string): Promise<void> => {
    await api.delete(`/leads/${leadId}/banks/${entryId}`);
  },
};
