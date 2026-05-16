import api from "@/lib/api";
import type { BankEntry, BankStatus } from "@/types";

export interface BankEntryCreate {
  bank_name: string;
  bank_status?: BankStatus;
  notes?: string | null;
}

export interface BankEntryUpdate {
  bank_status?: BankStatus;
  notes?: string | null;
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
