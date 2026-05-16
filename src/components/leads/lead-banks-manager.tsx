"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Trash2,
  X as IconX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BANK_STATUS_LABELS, BANK_STATUS_BADGE_CLASSES } from "@/lib/constants";
import { useBanksStore } from "@/stores/banks-store";
import {
  leadBanksService,
  type BankEntryCreate,
} from "@/services/lead-banks-service";
import type { BankEntry, BankStatus } from "@/types";

interface LeadBanksManagerProps {
  leadId: string;
  showNotes?: boolean;
  autoOpenAddIfEmpty?: boolean;
  onChanged?: () => void;
}

const ALL_STATUSES = Object.keys(BANK_STATUS_LABELS) as BankStatus[];

export function LeadBanksManager({
  leadId,
  showNotes,
  autoOpenAddIfEmpty,
  onChanged,
}: LeadBanksManagerProps) {
  const [entries, setEntries] = useState<BankEntry[] | null>(null);
  const [adding, setAdding] = useState(false);
  const banks = useBanksStore((s) => s.banks);
  const ensureBanks = useBanksStore((s) => s.ensureFetched);

  // Add-bank form state
  const [addOpen, setAddOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newBank, setNewBank] = useState("");
  const [newStatus, setNewStatus] = useState<BankStatus>("applied");
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    leadBanksService
      .list(leadId)
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
        if (autoOpenAddIfEmpty && list.length === 0) setAddOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        if (autoOpenAddIfEmpty) setAddOpen(true);
      });
    ensureBanks();
    return () => {
      cancelled = true;
    };
  }, [leadId, ensureBanks, autoOpenAddIfEmpty]);

  const handleStatusChange = async (entry: BankEntry, status: BankStatus) => {
    if (status === entry.bank_status) return;
    const original = entry;
    // Optimistic
    setEntries((prev) =>
      (prev ?? []).map((e) =>
        e.id === entry.id ? { ...e, bank_status: status } : e
      )
    );
    try {
      const updated = await leadBanksService.update(leadId, entry.id, {
        bank_status: status,
      });
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? updated : e))
      );
      onChanged?.();
    } catch (error: unknown) {
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? original : e))
      );
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't update bank status");
    }
  };

  const handleNotesBlur = async (entry: BankEntry, notes: string) => {
    if ((notes || "") === (entry.notes || "")) return;
    try {
      const updated = await leadBanksService.update(leadId, entry.id, {
        notes: notes || null,
      });
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? updated : e))
      );
      onChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't save bank notes");
    }
  };

  const handleDelete = async (entry: BankEntry) => {
    const snapshot = entries;
    setEntries((prev) => (prev ?? []).filter((e) => e.id !== entry.id));
    try {
      await leadBanksService.remove(leadId, entry.id);
      onChanged?.();
    } catch (error: unknown) {
      setEntries(snapshot);
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't remove bank");
    }
  };

  const resetAddForm = () => {
    setNewBank("");
    setNewStatus("applied");
    setPickerQuery("");
    setAddOpen(false);
  };

  const handleAdd = async () => {
    const bank = newBank.trim();
    if (!bank) {
      toast.error("Pick a bank");
      return;
    }
    setAdding(true);
    try {
      const body: BankEntryCreate = {
        bank_name: bank,
        bank_status: newStatus,
      };
      const created = await leadBanksService.add(leadId, body);
      setEntries((prev) => [...(prev ?? []), created]);
      resetAddForm();
      onChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't add bank");
    } finally {
      setAdding(false);
    }
  };

  if (entries === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No banks yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="border rounded-md p-2 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm flex-1 truncate">
                  {entry.bank_name}
                </span>
                <Select
                  value={entry.bank_status}
                  onValueChange={(v) =>
                    handleStatusChange(entry, v as BankStatus)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-7 text-xs w-[150px] border rounded-full px-2",
                      entry.bank_status in BANK_STATUS_BADGE_CLASSES &&
                        BANK_STATUS_BADGE_CLASSES[entry.bank_status]
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BANK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(entry)}
                  aria-label={`Remove ${entry.bank_name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showNotes && (
                <Textarea
                  defaultValue={entry.notes ?? ""}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="text-xs"
                  onBlur={(e) => handleNotesBlur(entry, e.target.value)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add bank */}
      {addOpen ? (
        <div className="border rounded-md p-2 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="h-7 flex-1 justify-between font-normal text-xs"
                >
                  {newBank || (
                    <span className="text-muted-foreground">Pick a bank…</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search banks…"
                    value={pickerQuery}
                    onValueChange={setPickerQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <span className="text-sm text-muted-foreground">
                        No bank matches.
                      </span>
                    </CommandEmpty>
                    <CommandGroup>
                      {banks
                        .filter(
                          (b) => !entries.some((e) => e.bank_name === b)
                        )
                        .map((b) => (
                          <CommandItem
                            key={b}
                            value={b}
                            onSelect={() => {
                              setNewBank(b);
                              setPickerQuery("");
                              setPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                newBank === b ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {b}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as BankStatus)}
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BANK_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={resetAddForm}
              disabled={adding}
            >
              <IconX className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7"
              onClick={handleAdd}
              disabled={adding || !newBank}
            >
              {adding && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add bank
        </Button>
      )}
    </div>
  );
}
