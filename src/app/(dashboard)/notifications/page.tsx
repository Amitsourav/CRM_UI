"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { useNotificationStore } from "@/stores/notification-store";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<Notification>>(
        `/notifications?page=${page}&page_size=20`
      );
      setNotifications(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(Math.max(0, useNotificationStore.getState().unreadCount - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Stay updated on your leads and tasks">
        {notifications.some((n) => !n.is_read) && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! New notifications will appear here."
        />
      ) : (
        <>
          <NotificationList
            notifications={notifications}
            onMarkRead={handleMarkRead}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
