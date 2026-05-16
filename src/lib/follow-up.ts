import { differenceInCalendarDays, format, startOfDay } from "date-fns";

export type FollowUpTone = "overdue" | "today" | "tomorrow" | "future";

export interface FollowUpDisplay {
  label: string;
  tone: FollowUpTone;
  isOverdue: boolean; // tone === "overdue" || tone === "today"
}

// Returns a label + tone for a lead's follow-up date.
//   overdue   "{N} day(s) overdue"   red + bold
//   today     "Today"                red + bold
//   tomorrow  "Tomorrow"             orange
//   future    "d MMM yyyy"           muted
export function formatFollowUp(
  iso?: string | null
): FollowUpDisplay | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const diffDays = differenceInCalendarDays(
      startOfDay(date),
      startOfDay(new Date())
    );
    if (diffDays === 0) {
      return { label: "Today", tone: "today", isOverdue: true };
    }
    if (diffDays === 1) {
      return { label: "Tomorrow", tone: "tomorrow", isOverdue: false };
    }
    if (diffDays < 0) {
      const n = Math.abs(diffDays);
      return {
        label: `${n} day${n === 1 ? "" : "s"} overdue`,
        tone: "overdue",
        isOverdue: true,
      };
    }
    return {
      label: format(date, "d MMM yyyy"),
      tone: "future",
      isOverdue: false,
    };
  } catch {
    return null;
  }
}

export function followUpToneClass(tone: FollowUpTone): string {
  switch (tone) {
    case "overdue":
    case "today":
      return "text-red-600 font-semibold";
    case "tomorrow":
      return "text-orange-600";
    case "future":
      return "text-muted-foreground";
  }
}

export function followUpIconClass(tone: FollowUpTone | undefined): string {
  if (tone === "overdue" || tone === "today") return "text-red-600";
  if (tone === "tomorrow") return "text-orange-500";
  return "text-blue-500";
}
