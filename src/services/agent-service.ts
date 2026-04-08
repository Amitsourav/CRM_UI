import api from "@/lib/api";
import type { AIAgent, ProviderOptions } from "@/types";

export const agentService = {
  getAll: async (): Promise<AIAgent[]> => {
    const res = await api.get("/agents");
    return Array.isArray(res.data) ? res.data : res.data.items || [];
  },

  getById: async (id: string): Promise<AIAgent> => {
    const res = await api.get(`/agents/${id}`);
    return res.data;
  },

  getDefault: async (): Promise<AIAgent | null> => {
    try {
      const res = await api.get("/agents/default");
      return res.data;
    } catch {
      return null;
    }
  },

  getOptions: async (): Promise<ProviderOptions> => {
    const res = await api.get("/agents/options");
    return res.data;
  },

  create: async (data: Partial<AIAgent>): Promise<AIAgent> => {
    const res = await api.post("/agents", data);
    return res.data;
  },

  update: async (id: string, data: Partial<AIAgent>): Promise<AIAgent> => {
    const res = await api.put(`/agents/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/agents/${id}`);
  },

  setDefault: async (id: string): Promise<AIAgent> => {
    const res = await api.post(`/agents/${id}/set-default`);
    return res.data;
  },

  clone: async (id: string): Promise<AIAgent> => {
    const res = await api.post(`/agents/${id}/clone`);
    return res.data;
  },

  testChat: async (
    id: string,
    message: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<{ response: string; history?: Array<{ role: string; content: string }> }> => {
    const res = await api.post(`/agents/${id}/test-chat`, { message, history });
    return res.data;
  },
};
