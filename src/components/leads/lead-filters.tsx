"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useStageConfig } from "@/hooks/use-stage-config";
import api from "@/lib/api";
import type { User, LeadSource } from "@/types";

export interface LeadFiltersState {
  stage: string;
  agentId: string;
  sourceId: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onFiltersChange: (filters: LeadFiltersState) => void;
  isAdmin: boolean;
}

export function LeadFilters({
  filters,
  onFiltersChange,
  isAdmin,
}: LeadFiltersProps) {
  const [agents, setAgents] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const { stages, getEntry } = useStageConfig();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        if (isAdmin) {
          const { data } = await api.get("/users?is_active=true");
          setAgents(data.items || data || []);
        }
        const { data: srcData } = await api.get("/leads/sources/list");
        setSources(Array.isArray(srcData) ? srcData : srcData.items || []);
      } catch {
        // silent
      }
    };
    fetchOptions();
  }, [isAdmin]);

  const hasFilters =
    filters.stage !== "all" ||
    filters.agentId !== "all" ||
    filters.sourceId !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  const clearFilters = () => {
    onFiltersChange({
      stage: "all",
      agentId: "all",
      sourceId: "all",
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select
        value={filters.stage}
        onValueChange={(v) => onFiltersChange({ ...filters, stage: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {stages.map((value) => (
            <SelectItem key={value} value={value}>
              {getEntry(value).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isAdmin && (
        <Select
          value={filters.agentId}
          onValueChange={(v) => onFiltersChange({ ...filters, agentId: v })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.sourceId}
        onValueChange={(v) => onFiltersChange({ ...filters, sourceId: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.id}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={filters.dateFrom}
            onSelect={(d) => onFiltersChange({ ...filters, dateFrom: d })}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateTo ? format(filters.dateTo, "MMM d") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={filters.dateTo}
            onSelect={(d) => onFiltersChange({ ...filters, dateTo: d })}
          />
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
