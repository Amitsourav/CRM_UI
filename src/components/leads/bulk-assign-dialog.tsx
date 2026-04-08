"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types";

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSuccess: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  leadIds,
  onSuccess,
}: BulkAssignDialogProps) {
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      api
        .get("/users?role=telecaller&is_active=true")
        .then(({ data }) => setAgents(data.items || data || []))
        .catch(() => {});
      setSelectedAgent("");
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/leads/bulk-assign", {
        lead_ids: leadIds,
        agent_id: selectedAgent,
      });
      toast.success(`${leadIds.length} leads assigned successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to assign leads");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign {leadIds.length} Lead{leadIds.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <Command className="border rounded-md">
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agents found.</CommandEmpty>
            {agents.map((agent) => (
              <CommandItem
                key={agent.id}
                onSelect={() => setSelectedAgent(agent.id)}
                className={`cursor-pointer ${selectedAgent === agent.id ? "bg-primary/10" : ""}`}
              >
                <div>
                  <p className="font-medium">{agent.full_name}</p>
                  <p className="text-xs text-muted-foreground">{agent.email}</p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !selectedAgent}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
