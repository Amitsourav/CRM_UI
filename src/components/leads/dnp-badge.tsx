"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronDown, Loader2 } from "lucide-react";

// Color ramp by attempt count — slate → amber → orange → red as the lead
// nears the auto-Lost threshold (backend moves to Lost at 6).
function dnpTone(n: number): string {
  return n >= 5
    ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
    : n >= 3
      ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
      : n >= 1
        ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
}

interface DnpBadgeProps {
  count: number;
  // Fired after the user picks a new attempt count and supplies the required
  // note. The parent performs the PUT (dnp_count + conversation_notes).
  onConfirm: (next: number, note: string) => void;
  // Stops the click/pointer from bubbling to the card (drag init / navigate).
  stopBubble: (e: React.SyntheticEvent) => void;
}

// Interactive "DNP-N" badge shared by FMC and Admitverse Kanban cards.
// Clicking opens a 1–6 picker; changing the value requires a note (backend
// rule) collected via the confirmation dialog.
export function DnpBadge({ count, onConfirm, stopBubble }: DnpBadgeProps) {
  const [pendingDnp, setPendingDnp] = useState<number | null>(null);
  const [dnpNote, setDnpNote] = useState("");
  const [dnpSubmitting, setDnpSubmitting] = useState(false);

  const n = count;
  const label = n > 0 ? `DNP-${n}` : "DNP";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          onClick={stopBubble}
          onPointerDown={stopBubble}
        >
          <button
            type="button"
            title={`Moved to DNP ${n} time${n === 1 ? "" : "s"} — click to change`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-medium border shrink-0 transition-colors ${dnpTone(n)}`}
          >
            {label}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={stopBubble}
          onPointerDown={stopBubble}
        >
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <DropdownMenuItem
              key={value}
              onClick={(e) => {
                e.stopPropagation();
                if (value === n) return;
                // Open the note-required modal — the PUT fires from Confirm.
                setPendingDnp(value);
                setDnpNote("");
              }}
            >
              {n === value ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <span className="mr-1.5 h-3.5 w-3.5" />
              )}
              DNP-{value}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DNP-N change requires a note — backend rejects writes that don't
          include conversation_notes for this field. */}
      <Dialog
        open={pendingDnp !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPendingDnp(null);
            setDnpNote("");
          }
        }}
      >
        <DialogContent onClick={stopBubble} onPointerDown={stopBubble}>
          <DialogHeader>
            <DialogTitle>
              DNP-{n} → DNP-{pendingDnp ?? 0}
            </DialogTitle>
            <DialogDescription>
              Add a short note about why this DNP attempt count is changing.
              The note will appear in the lead&apos;s remarks timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dnp-note">Conversation notes *</Label>
            <Textarea
              id="dnp-note"
              autoFocus
              rows={3}
              value={dnpNote}
              onChange={(e) => setDnpNote(e.target.value)}
              placeholder="e.g. user is busy, retry tomorrow"
            />
            {!dnpNote.trim() && (
              <p className="text-xs text-red-600">A note is required.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={dnpSubmitting}
              onClick={() => {
                setPendingDnp(null);
                setDnpNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={dnpSubmitting || !dnpNote.trim() || pendingDnp == null}
              onClick={() => {
                if (pendingDnp == null) return;
                const note = dnpNote.trim();
                if (!note) return;
                setDnpSubmitting(true);
                // onConfirm's promise isn't surfaced; close optimistically
                // and let any backend error toast via the parent.
                try {
                  onConfirm(pendingDnp, note);
                } finally {
                  setDnpSubmitting(false);
                  setPendingDnp(null);
                  setDnpNote("");
                }
              }}
            >
              {dnpSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
