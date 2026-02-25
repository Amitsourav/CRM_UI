"use client";

import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/stores/notification-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative h-9 w-9 p-0"
      onClick={() => router.push("/notifications")}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
