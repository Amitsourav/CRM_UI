"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { agentService } from "@/services/agent-service";
import type { AIAgent } from "@/types";

function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { detail?: string } } };
  return err.response?.data?.detail || "Something went wrong";
}

export function useAgents() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentService.getAll();
      setAgents(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { agents, isLoading, error, refetch };
}

export function useAgent(id: string) {
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await agentService.getById(id);
        setAgent(data);
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

  return { agent, isLoading, error };
}

export function useCreateAgent(onSuccess?: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  const createAgent = async (data: Partial<AIAgent>) => {
    setIsLoading(true);
    try {
      const agent = await agentService.create(data);
      toast.success("Agent created successfully");
      onSuccess?.();
      return agent;
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createAgent, isLoading };
}

export function useUpdateAgent(onSuccess?: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  const updateAgent = async (id: string, data: Partial<AIAgent>) => {
    setIsLoading(true);
    try {
      const agent = await agentService.update(id, data);
      toast.success("Agent updated successfully");
      onSuccess?.();
      return agent;
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateAgent, isLoading };
}

export function useDeleteAgent(onSuccess?: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  const deleteAgent = async (id: string) => {
    setIsLoading(true);
    try {
      await agentService.delete(id);
      toast.success("Agent deleted successfully");
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteAgent, isLoading };
}
