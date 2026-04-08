"use client";

import { Badge } from "@/components/ui/badge";
import type { CallSentiment } from "@/types";

interface SentimentBadgeProps {
  sentiment?: CallSentiment;
  score?: number;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  positive: { label: "Positive", className: "bg-green-100 text-green-700 border-green-200" },
  neutral: { label: "Neutral", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  negative: { label: "Negative", className: "bg-red-100 text-red-700 border-red-200" },
};

export function SentimentBadge({ sentiment, score }: SentimentBadgeProps) {
  if (!sentiment) {
    return (
      <Badge variant="secondary" className="text-xs">
        No Data
      </Badge>
    );
  }

  const config = CONFIG[sentiment];
  const scoreText = score !== undefined ? ` (${Math.round(score * 100)}%)` : "";

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}{scoreText}
    </Badge>
  );
}
