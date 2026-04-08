"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { callService } from "@/services/call-service";
import type { CallAttempt, CallAttemptWithLead, CallStats, CallFilters } from "@/types";

function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { detail?: string } } };
  return err.response?.data?.detail || "Failed to load call data";
}

export function useCalls(filters?: CallFilters) {
  const [calls, setCalls] = useState<CallAttemptWithLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callService.getAll(filters);
      setCalls(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters?.telecaller_id,
    filters?.call_status,
    filters?.call_type,
    filters?.sentiment,
    filters?.date_from,
    filters?.date_to,
    filters?.skip,
    filters?.limit,
  ]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { calls, isLoading, error, refetch };
}

export function useCall(id: string) {
  const [call, setCall] = useState<CallAttemptWithLead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await callService.getById(id);
        setCall(data);
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
  }, [id]);

  return { call, isLoading, error };
}

export function useLeadCalls(leadId: string) {
  const [calls, setCalls] = useState<CallAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await callService.getByLead(leadId);
      setCalls(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { calls, isLoading, error, refetch };
}

export function useCallStats(params?: {
  date_from?: string;
  date_to?: string;
  telecaller_id?: string;
}) {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await callService.getStats(params);
        setStats(data);
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
  }, [params?.date_from, params?.date_to, params?.telecaller_id]);

  return { stats, isLoading, error };
}
