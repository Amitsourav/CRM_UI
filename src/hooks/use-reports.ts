"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type {
  DashboardReport,
  PipelineReport,
  AgentReport,
  SourceReport,
  TrendDataPoint,
} from "@/types";

export function useDashboardReport() {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<DashboardReport>("/reports/dashboard");
        setData(res.data);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading };
}

export function usePipelineReport() {
  const [data, setData] = useState<PipelineReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<PipelineReport>("/reports/pipeline");
        setData(res.data);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading };
}

export function useAgentReports() {
  const [data, setData] = useState<AgentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<AgentReport[]>("/reports/agents");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading };
}

export function useSourceReports() {
  const [data, setData] = useState<SourceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<SourceReport[]>("/reports/sources");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading };
}

export function useTrendReport(days: number = 30) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<TrendDataPoint[]>(
        `/reports/trends?days=${days}`
      );
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { data, isLoading };
}
