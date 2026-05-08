"use client";

import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useDocsChecklistStore } from "@/stores/docs-checklist-store";

interface DocsChecklistProps {
  selected: string[];
  onToggle: (key: string) => void;
  disabled?: boolean;
  className?: string;
  /** Stops drag/dialog/router-click bubbling — used by Kanban card consumers. */
  onItemPointerDown?: (e: React.PointerEvent) => void;
}

export function DocsChecklist({
  selected,
  onToggle,
  disabled,
  className,
  onItemPointerDown,
}: DocsChecklistProps) {
  const { items, isLoading, fetched, ensureFetched } = useDocsChecklistStore();

  useEffect(() => {
    ensureFetched();
  }, [ensureFetched]);

  if (!fetched && isLoading) {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-muted-foreground ${
          className ?? ""
        }`}
      >
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        No documents configured.
      </p>
    );
  }

  return (
    <ul className={`space-y-1.5 ${className ?? ""}`}>
      {items.map((item) => {
        const checked = selected.includes(item.key);
        const id = `doc-${item.key}`;
        return (
          <li
            key={item.key}
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onItemPointerDown}
          >
            <Checkbox
              id={id}
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => onToggle(item.key)}
            />
            <label
              htmlFor={id}
              className="text-xs cursor-pointer leading-none select-none"
            >
              {item.label}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
