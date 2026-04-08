"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import type {
  DashboardReport,
  PipelineReport,
  AgentReport,
  SourceReport,
  TrendDataPoint,
} from "@/types";

function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { detail?: string } } };
  return err.response?.data?.detail || "Failed to load report data";
}

export function useDashboardReport() {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<DashboardReport>("/reports/dashboard");
        setData(res.data);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading, error };
}

export function usePipelineReport() {
  const [data, setData] = useState<PipelineReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<PipelineReport>("/reports/pipeline");
        setData(res.data);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading, error };
}

export function useAgentReports() {
  const [data, setData] = useState<AgentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<AgentReport[]>("/reports/agents");
        setData(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading, error };
}

export function useSourceReports() {
  const [data, setData] = useState<SourceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<SourceReport[]>("/reports/sources");
        setData(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { data, isLoading, error };
}

export function useTrendReport(days: number = 30) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<TrendDataPoint[]>(
        `/reports/trends?days=${days}`
      );
      setData(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { data, isLoading, error };
}
