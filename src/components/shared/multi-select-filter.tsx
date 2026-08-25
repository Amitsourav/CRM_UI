"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  /** Shown on the trigger when nothing is selected, e.g. "All stages". */
  placeholder: string;
  /** Plural noun for the "3 banks" summary label. */
  countNoun: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Offer "Select all" — worth it on long lists like the ~20 banks. */
  showSelectAll?: boolean;
  className?: string;
}

/**
 * Checkbox-list filter behind a popover. Selections are OR'd by the caller's
 * API, so the summary label counts rather than concatenates: one selection
 * shows its label, several show "N banks".
 *
 * Values are committed on every click (no Apply button) — callers debounce or
 * reset paging themselves.
 */
export function MultiSelectFilter({
  placeholder,
  countNoun,
  options,
  selected,
  onChange,
  showSelectAll = false,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  // A value can outlive its option — a stage filter deep-linked from another
  // brand, or a bank removed from the canonical list. It still filters the
  // grid, so it has to stay countable even though it has no row to uncheck.
  const summary = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const match = options.find((o) => o.value === selected[0]);
      return match?.label ?? selected[0];
    }
    return `${selected.length} ${countNoun}`;
  }, [selected, options, placeholder, countNoun]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const allSelected =
    options.length > 0 && options.every((o) => selected.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {(showSelectAll || selected.length > 0) && (
          <div className="flex items-center justify-between border-b px-2 py-1.5">
            {showSelectAll ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  onChange(allSelected ? [] : options.map((o) => o.value))
                }
              >
                <Check className="mr-1.5 h-3 w-3" />
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            ) : (
              <span />
            )}
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onChange([])}
              >
                <X className="mr-1.5 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}

        {options.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No options
          </p>
        ) : (
          <ScrollArea className="max-h-64 overflow-y-auto">
            <div className="p-1">
              {options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(option.value)}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
