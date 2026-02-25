"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { DISPOSITION_LABELS } from "@/lib/constants";
import type { CallDisposition } from "@/types";

interface CallLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSuccess: () => void;
}

export function CallLogForm({
  open,
  onOpenChange,
  leadId,
  onSuccess,
}: CallLogFormProps) {
  const [disposition, setDisposition] = useState<CallDisposition>("connected");
  const [notes, setNotes] = useState("");
  const [agenda, setAgenda] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Conversation notes are required");
      return;
    }
    if (!agenda.trim()) {
      toast.error("Agent agenda is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/leads/${leadId}/calls`, {
        disposition,
        conversation_notes: notes,
        agent_agenda: agenda,
        due_date_for_next: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      });
      toast.success("Call logged successfully");
      onSuccess();
      onOpenChange(false);
      setNotes("");
      setAgenda("");
      setDueDate(undefined);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to log call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Disposition</Label>
            <Select
              value={disposition}
              onValueChange={(v) => setDisposition(v as CallDisposition)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conversation Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary of the conversation..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Agent Agenda *</Label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Next steps / follow-up plan..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Next Call Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Call
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
