"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  CheckSquare,
  AlertTriangle,
  PhoneOff,
  ArrowRightLeft,
  FileSpreadsheet,
  BellRing,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Notification, NotificationType } from "@/types";

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  lead_assigned: UserPlus,
  task_created: CheckSquare,
  task_overdue: Clock,
  dnp_warning: AlertTriangle,
  dnp_auto_lost: PhoneOff,
  stage_changed: ArrowRightLeft,
  csv_import_complete: FileSpreadsheet,
  general: BellRing,
};

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
}: NotificationListProps) {
  const router = useRouter();

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.lead_id) {
      router.push(`/leads/${notification.lead_id}`);
    } else if (notification.task_id) {
      router.push("/tasks");
    }
  };

  return (
    <div className="space-y-1">
      {notifications.map((notification) => {
        const Icon = ICON_MAP[notification.type] || BellRing;
        return (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
              !notification.is_read ? "bg-muted/50" : ""
            }`}
            onClick={() => handleClick(notification)}
          >
            <div
              className={`rounded-full p-2 ${
                !notification.is_read ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm truncate ${
                    !notification.is_read ? "font-semibold" : ""
                  }`}
                >
                  {notification.title}
                </p>
                {!notification.is_read && (
                  <Badge
                    variant="default"
                    className="h-2 w-2 rounded-full p-0"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(notification.created_at), "MMM d, h:mm a")}
              </p>
            </div>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification.id);
                }}
              >
                Mark read
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
