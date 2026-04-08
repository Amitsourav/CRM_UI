import api from "@/lib/api";
import type { CallAttempt, CallAttemptWithLead, CallStats, CallFilters } from "@/types";

export const callService = {
  getAll: async (filters: CallFilters = {}): Promise<CallAttemptWithLead[]> => {
    const res = await api.get("/calls", { params: filters });
    return Array.isArray(res.data) ? res.data : res.data.items || [];
  },

  getById: async (id: string): Promise<CallAttemptWithLead> => {
    const res = await api.get(`/calls/${id}`);
    return res.data;
  },

  getByLead: async (leadId: string): Promise<CallAttempt[]> => {
    const res = await api.get(`/leads/${leadId}/calls`);
    return Array.isArray(res.data) ? res.data : res.data.items || [];
  },

  getStats: async (params?: {
    date_from?: string;
    date_to?: string;
    telecaller_id?: string;
  }): Promise<CallStats> => {
    const res = await api.get("/reports/calls", { params });
    return res.data;
  },

  initiateCall: async (data: {
    lead_id: string;
    ai_agent_id?: string;
    call_type?: "ai" | "live";
    phone_number?: string;
  }): Promise<CallAttempt> => {
    const res = await api.post("/calls/initiate", data);
    return res.data;
  },
};
