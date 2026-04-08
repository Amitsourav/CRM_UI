"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import type { AIAgent } from "@/types";

interface AgentCardProps {
  agent: AIAgent;
  onEdit: (agent: AIAgent) => void;
  onDelete: (agent: AIAgent) => void;
  onClone: (agent: AIAgent) => void;
  onSetDefault: (agent: AIAgent) => void;
  onTest: (agent: AIAgent) => void;
}

function shortModelName(model: string): string {
  if (!model) return "—";
  const map: Record<string, string> = {
    "openai/gpt-4o-mini": "GPT-4o Mini",
    "openai/gpt-4.1-mini": "GPT-4.1 Mini",
    "openai/gpt-4.1-nano": "GPT-4.1 Nano",
    "openai/gpt-4o": "GPT-4o",
    "anthropic/claude-3-haiku-20240307": "Claude Haiku",
  };
  return map[model] || model.split("/").pop() || model;
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onClone,
  onSetDefault,
  onTest,
}: AgentCardProps) {
  const pricing = agent.pricing;

  return (
    <div className="bg-background border rounded-lg p-4 shadow-sm hover:border-primary/50 transition-colors space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-base truncate">{agent.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {agent.is_default && (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
              DEFAULT
            </Badge>
          )}
          <span
            className={`h-2 w-2 rounded-full ${
              agent.is_active ? "bg-green-500" : "bg-gray-400"
            }`}
            title={agent.is_active ? "Active" : "Inactive"}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-xs capitalize">
          {agent.stt_provider} STT
        </Badge>
        {agent.pricing?.dual_tts_enabled ? (
          <Badge variant="outline" className="text-xs capitalize">
            EN: {agent.tts_provider_english} | HI: {agent.tts_provider_hindi}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs capitalize">
            {agent.tts_provider} TTS
          </Badge>
        )}
        <Badge variant="outline" className="text-xs uppercase">
          {agent.primary_language}
          {agent.secondary_language && agent.secondary_language !== "none"
            ? `+${agent.secondary_language}`
            : ""}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {agent.tone}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {agent.role}
        </Badge>
      </div>

      {/* Model */}
      <div className="text-xs text-muted-foreground">
        Model: <span className="text-foreground">{shortModelName(agent.llm_model)}</span>
      </div>

      {/* Pricing */}
      {pricing && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Est. cost per min</p>
          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
            <div
              className="bg-green-500"
              style={{ width: `${pricing.breakdown_pct.stt}%` }}
            />
            <div
              className="bg-orange-500"
              style={{ width: `${pricing.breakdown_pct.llm}%` }}
            />
            <div
              className="bg-slate-600"
              style={{ width: `${pricing.breakdown_pct.tts}%` }}
            />
            <div
              className="bg-blue-500"
              style={{ width: `${pricing.breakdown_pct.telephony}%` }}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${pricing.breakdown_pct.platform}%` }}
            />
          </div>
          <p className="text-sm">
            ~${pricing.total_usd.toFixed(3)}/min &nbsp;≈&nbsp; ₹{pricing.total_inr.toFixed(2)}/min
          </p>
          <p className="text-xs text-muted-foreground">
            ~₹{pricing.monthly_1000_mins_inr.toLocaleString()}/month (1,000 mins)
          </p>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
            {pricing.savings_vs_bolna_pct}% cheaper than Bolna ✓
          </Badge>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          Created {format(new Date(agent.created_at), "MMM d, yyyy")}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onTest(agent)}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Test
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onClone(agent)}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Clone
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onEdit(agent)}>
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${
              agent.is_default
                ? "opacity-40 cursor-not-allowed"
                : "text-destructive hover:text-destructive"
            }`}
            onClick={() => onDelete(agent)}
            disabled={agent.is_default}
            title={
              agent.is_default
                ? "Set another agent as default first"
                : "Delete agent"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!agent.is_default && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onSetDefault(agent)}
        >
          <Star className="h-3.5 w-3.5 mr-1.5" /> Set Default
        </Button>
      )}
    </div>
  );
}
