import api from "@/lib/api";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "scheduled" | "active" | "paused" | "completed" | "stopped";
  ai_agent_id: string;
  agent_name?: string;
  start_date?: string;
  end_date?: string;
  daily_start_time: string;
  daily_end_time: string;
  skip_weekends: boolean;
  max_retries: number;
  retry_gap_hours: number;
  max_concurrent_calls: number;
  total_leads: number;
  calls_made: number;
  calls_connected: number;
  calls_failed: number;
  total_cost_inr: number;
  progress_pct: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CampaignLead {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  status: string;
  attempt_count: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  last_call_status?: string;
}

export interface CreateCampaignRequest {
  ai_agent_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  daily_start_time?: string;
  daily_end_time?: string;
  skip_weekends?: boolean;
  max_retries?: number;
  retry_gap_hours?: number;
  max_concurrent_calls?: number;
  lead_ids?: string[];
}

export interface CsvUploadResult {
  success: boolean;
  total_rows: number;
  new_leads_created: number;
  existing_leads_added: number;
  // Phones in the CSV that already exist in CRM and were therefore
  // NOT enrolled in the campaign (counsellors continue working them).
  existing_in_crm_skipped?: number;
  duplicates_skipped: number;
  invalid_rows: number;
  errors: Array<{ row: number; error: string }>;
}

export interface BulkAssignByFilterRequest {
  csv_import_id?: string;
  current_stage?: string;
  lead_source_id?: string;
  assigned_agent_id?: string;
  created_after?: string;
  created_before?: string;
  search?: string;
  tags_any?: string[];
  limit?: number;
}

export interface BulkAssignByFilterResult {
  matched: number;
  added: number;
  skipped_no_phone: number;
  skipped_already_assigned: number;
  truncated: boolean;
}

export function getCsvTemplateUrl(): string {
  return "/api/v1/campaigns/csv-template";
}

export const campaignService = {
  list: async (params?: { status?: string; page?: number; page_size?: number }) => {
    const res = await api.get("/campaigns", { params });
    return res.data;
  },

  get: async (id: string): Promise<Campaign> => {
    const res = await api.get(`/campaigns/${id}`);
    return res.data;
  },

  create: async (data: CreateCampaignRequest): Promise<Campaign> => {
    const res = await api.post("/campaigns", data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreateCampaignRequest>): Promise<Campaign> => {
    const res = await api.put(`/campaigns/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/campaigns/${id}`);
    return res.data;
  },

  assignLeads: async (id: string, lead_ids: string[]) => {
    const res = await api.post(`/campaigns/${id}/assign-leads`, { lead_ids });
    return res.data;
  },

  assignLeadsBulk: async (
    id: string,
    body: BulkAssignByFilterRequest
  ): Promise<BulkAssignByFilterResult> => {
    const res = await api.post(`/campaigns/${id}/assign-leads-bulk`, body);
    return res.data;
  },

  start: async (id: string) => {
    const res = await api.post(`/campaigns/${id}/start`);
    return res.data;
  },

  pause: async (id: string) => {
    const res = await api.post(`/campaigns/${id}/pause`);
    return res.data;
  },

  stop: async (id: string) => {
    const res = await api.post(`/campaigns/${id}/stop`);
    return res.data;
  },

  getLeads: async (id: string, params?: { status?: string; page?: number; page_size?: number }) => {
    const res = await api.get(`/campaigns/${id}/leads`, { params });
    return res.data;
  },

  uploadCsv: async (id: string, file: File): Promise<CsvUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post(`/campaigns/${id}/upload-csv`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
