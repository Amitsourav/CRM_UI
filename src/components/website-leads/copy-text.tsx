"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

interface CopyTextProps {
  value: string;
  /** Rendered instead of `value` (e.g. a mailto: link wrapping the text). */
  children?: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Click-to-copy contact value. Used in the list row and the detail drawer.
 *
 * Rendered as a <span>, not a <button>, because it sits inside table rows
 * that are themselves clickable (row → drawer) and inside <a> tel:/mailto:
 * links in the drawer — nesting interactive elements would be invalid markup
 * in the second case and hijack the row click in the first. Keyboard access
 * is preserved via role/tabIndex/Enter+Space.
 */
export function CopyText({ value, children, className, label }: CopyTextProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard denied (insecure context / permissions) — no toast, the
      // value is already visible and selectable.
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      title={label ? `${label} — click to copy` : "Click to copy"}
      onClick={(e) => {
        e.stopPropagation();
        copy();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          copy();
        }
      }}
      className={cn(
        "group/copy inline-flex max-w-full cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <span className="truncate">{children ?? value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/copy:opacity-60" />
      )}
    </span>
  );
}
