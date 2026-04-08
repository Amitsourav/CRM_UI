"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { agentService } from "@/services/agent-service";
import type { AIAgent } from "@/types";

interface AgentSelectorProps {
  value?: string;
  onChange: (agent_id: string) => void;
  placeholder?: string;
}

export function AgentSelector({
  value,
  onChange,
  placeholder = "Select an agent",
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await agentService.getAll();
        const active = data.filter((a) => a.is_active);
        setAgents(active);
        if (!value) {
          const def = active.find((a) => a.is_default);
          if (def) onChange(def.id);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error || agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No agents found. Please create an agent first.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{agent.name}</span>
                {agent.is_default && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    DEFAULT
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground text-xs capitalize">
                {agent.stt_provider} STT · {agent.tts_provider} TTS
              </span>
              <span className="text-muted-foreground text-xs">
                ₹{agent.pricing?.total_inr?.toFixed(2) || "—"}/min ·{" "}
                {agent.primary_language?.toUpperCase()}
                {agent.secondary_language && agent.secondary_language !== "none"
                  ? `+${agent.secondary_language.toUpperCase()}`
                  : ""}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
