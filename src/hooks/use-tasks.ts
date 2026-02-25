"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Task, PaginatedResponse } from "@/types";

interface UseTasksParams {
  endpoint?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  assignedTo?: string;
}

export function useTasks(params: UseTasksParams = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("page", (params.page || 1).toString());
      searchParams.set("page_size", (params.pageSize || 20).toString());
      if (params.status && params.status !== "all")
        searchParams.set("status", params.status);
      if (params.assignedTo && params.assignedTo !== "all")
        searchParams.set("assigned_to", params.assignedTo);

      const endpoint = params.endpoint || "/tasks";
      const { data } = await api.get<PaginatedResponse<Task>>(
        `${endpoint}?${searchParams.toString()}`
      );
      setTasks(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [params.endpoint, params.page, params.pageSize, params.status, params.assignedTo]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, totalPages, isLoading, refetch: fetchTasks };
}
