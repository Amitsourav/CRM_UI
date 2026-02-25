"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import api from "@/lib/api";

export function useNotificationPolling(intervalMs = 30000) {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await api.get<{ count: number }>(
          "/notifications/unread-count"
        );
        setUnreadCount(data.count);
      } catch {
        // silent
      }
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, setUnreadCount]);
}
