"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUniversitiesStore } from "@/stores/universities-store";

interface UniversityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // Applied to the trigger button so callers control width.
  className?: string;
  // Smaller variant used inside the compact applications add-row.
  compact?: boolean;
}

// Free-text combobox: shows known-university suggestions but always accepts
// whatever the user types. Suggestions come from /leads/universities (empty
// on FMC, so this behaves like a plain text field there). Mirrors the bank
// picker pattern in lead-form.tsx but free-text instead of locked-list.
export function UniversityAutocomplete({
  value,
  onChange,
  placeholder = "University…",
  disabled,
  className,
  compact,
}: UniversityAutocompleteProps) {
  const universities = useUniversitiesStore((s) => s.universities);
  const ensureFetched = useUniversitiesStore((s) => s.ensureFetched);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    ensureFetched();
  }, [ensureFetched]);

  const trimmed = query.trim();
  const hasExactMatch = universities.some(
    (u) => u.toLowerCase() === trimmed.toLowerCase()
  );

  const commit = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            compact && "h-7 text-xs",
            className
          )}
        >
          {value || (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown
            className={cn(
              "ml-2 shrink-0 opacity-50",
              compact ? "h-3.5 w-3.5" : "h-4 w-4"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search or type a university…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/* Free text: pressing the "Use" item keeps whatever was typed. */}
            {trimmed && !hasExactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`__use_${trimmed}`}
                  onSelect={() => commit(trimmed)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use &quot;{trimmed}&quot;
                </CommandItem>
              </CommandGroup>
            )}
            {universities.length > 0 && (
              <CommandGroup heading="Suggestions">
                {universities.map((u) => (
                  <CommandItem key={u} value={u} onSelect={() => commit(u)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === u ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {u}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value && (
              <CommandGroup>
                <CommandItem
                  value="__clear"
                  onSelect={() => commit("")}
                  className="text-muted-foreground"
                >
                  <span className="mr-2 h-4 w-4" />— Clear
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
