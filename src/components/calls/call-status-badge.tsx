"use client";

import { Badge } from "@/components/ui/badge";

interface CallStatusBadgeProps {
  status: string;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700 border-slate-200" },
  initiated: { label: "Initiated", className: "bg-blue-100 text-blue-700 border-blue-200" },
  ringing: { label: "Ringing", className: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse" },
  connected: { label: "Connected", className: "bg-green-100 text-green-700 border-green-200" },
  ended: { label: "Ended", className: "bg-slate-100 text-slate-700 border-slate-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
  no_answer: { label: "No Answer", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const config = CONFIG[status] || { label: status, className: "" };

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}
