import api from "@/lib/api";

export interface DailyMetrics {
  calls_made: number;
  // calls_implied: distinct leads moved or updated today (proxy for call
  // activity until the dialer ships and calls_made becomes meaningful).
  calls_implied: number;
  calls_connected: number;
  call_duration_minutes: number;
  leads_created: number;
  transitions_total: number;
  transitions_by_stage: Record<string, number>;
  leads_won: number;
  leads_lost: number;
  tasks_created: number;
  tasks_completed: number;
}

export type MetricKey = keyof DailyMetrics;

export interface DailyReportResponse {
  date: string;
  user_id: string;
  user_name: string;
  user_role: string;
  metrics: DailyMetrics;
  yesterday_metrics?: DailyMetrics;
  deltas?: Partial<Record<MetricKey, number>>;
  target_call_count: number | null;
  percent_of_target: number | null;
}

export interface DailyRangeItem {
  date: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  metrics: DailyMetrics;
}

export const reportService = {
  daily: async (params?: { date?: string; user_id?: string }) => {
    const res = await api.get<DailyReportResponse>("/reports/daily", { params });
    return res.data;
  },
  dailyRange: async (params: { days: number; user_id?: string }) => {
    const res = await api.get<DailyRangeItem[]>("/reports/daily/range", {
      params,
    });
    return res.data;
  },
};
