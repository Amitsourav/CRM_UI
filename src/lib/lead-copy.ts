import { toast } from "sonner";
import type { Lead } from "@/types";

// Builds the snippet the FMC Copy button writes to the clipboard.
// Order: Name → Phone → Email → University. Skips fields that are
// empty so the snippet is always tight (no "Email: —" placeholders).
export function buildLeadCopyText(lead: Lead): string {
  const lines: string[] = [];
  const name = lead.full_name?.trim();
  if (name) lines.push(`Name: ${name}`);
  if (lead.phone?.trim()) lines.push(`Phone: ${lead.phone.trim()}`);
  if (lead.email?.trim()) lines.push(`Email: ${lead.email.trim()}`);
  if (lead.university?.trim())
    lines.push(`University: ${lead.university.trim()}`);
  return lines.join("\n");
}

// Copies a lead's contact snippet and shows a toast. Falls back to a
// document.execCommand path for browsers / contexts where the async
// Clipboard API is blocked (e.g. http://).
export async function copyLeadToClipboard(lead: Lead): Promise<void> {
  const text = buildLeadCopyText(lead);
  if (!text) {
    toast.error("Nothing to copy on this lead");
    return;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    toast.success("Lead details copied");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}
