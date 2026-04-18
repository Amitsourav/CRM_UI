import api from "@/lib/api";
import type { CallAttempt, CallAttemptWithLead, CallStats, CallFilters } from "@/types";

interface RawCall extends CallAttempt {
  lead_name?: string;
  lead_phone?: string;
  agent_name?: string;
  lead?: { full_name?: string; phone?: string; email?: string };
  agent?: { name?: string };
}

function normalizeCall(raw: RawCall): CallAttemptWithLead {
  return {
    ...raw,
    lead_name: raw.lead_name || raw.lead?.full_name,
    lead_phone: raw.lead_phone || raw.lead?.phone,
    agent_name: raw.agent_name || raw.agent?.name,
  };
}

export const callService = {
  getAll: async (filters: CallFilters = {}): Promise<CallAttemptWithLead[]> => {
    const res = await api.get("/calls", { params: filters });
    const items: RawCall[] = Array.isArray(res.data) ? res.data : res.data.items || [];
    return items.map(normalizeCall);
  },

  getById: async (id: string): Promise<CallAttemptWithLead> => {
    const res = await api.get(`/calls/${id}`);
    return normalizeCall(res.data);
  },

  getByLead: async (leadId: string): Promise<CallAttemptWithLead[]> => {
    const res = await api.get(`/leads/${leadId}/calls`);
    const items: RawCall[] = Array.isArray(res.data) ? res.data : res.data.items || [];
    return items.map(normalizeCall);
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
