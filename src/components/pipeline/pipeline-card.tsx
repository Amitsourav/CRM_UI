"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  MoreVertical,
  Check,
  Star,
  Mail,
  MessageCircle,
  Copy,
  GraduationCap,
  IndianRupee,
  Landmark,
  FileText,
  PhoneCall,
  ClipboardList,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Bot,
  Pencil,
  X as IconX,
  Globe,
  Wallet,
  CalendarClock,
  UserRound,
  Sparkles,
  School,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStageConfig } from "@/hooks/use-stage-config";
import {
  BANK_STATUS_BADGE_CLASSES,
  BANK_STATUS_LABELS,
  getStageHex,
} from "@/lib/constants";
import { formatLakhs } from "@/lib/utils";
import {
  formatFollowUp,
  followUpIconClass,
  followUpToneClass,
} from "@/lib/follow-up";
import { copyLeadToClipboard } from "@/lib/lead-copy";
import { DocsChecklist } from "@/components/leads/docs-checklist";
import { LeadBanksManager } from "@/components/leads/lead-banks-manager";
import { leadBanksService } from "@/services/lead-banks-service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BankStatus, Lead, LeadStage, User } from "@/types";

interface PipelineCardProps {
  lead: Lead;
  onChangeStage: (
    leadId: string,
    fromStage: LeadStage,
    toStage: LeadStage
  ) => void;
  onToggleImportant: (leadId: string, currentValue: boolean) => void;
  onUpdateLead: (leadId: string, update: Partial<Lead>) => void;
  onRefetchLead: (leadId: string) => void;
}

export function PipelineCard({
  lead,
  onChangeStage,
  onToggleImportant,
  onUpdateLead,
  onRefetchLead,
}: PipelineCardProps) {
  const { slug, getEntry, getValidTransitions } = useStageConfig();
  const isFmc = slug !== "admitverse";

  const transitions = getValidTransitions(lead.current_stage);
  const currentEntry = getEntry(lead.current_stage);

  // Stop propagation so the kebab doesn't trigger card navigation or drag init.
  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const StageDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        onClick={stopBubble}
        onPointerDown={stopBubble}
      >
        <button
          type="button"
          aria-label="Change stage"
          className="-m-1 p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={stopBubble}
        onPointerDown={stopBubble}
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Change stage
        </DropdownMenuLabel>
        <DropdownMenuItem disabled className="opacity-100">
          <Check className="mr-1.5 h-3.5 w-3.5" />
          <span className={`h-2 w-2 rounded-full mr-2 ${currentEntry.color}`} />
          <span className="flex-1">{currentEntry.label}</span>
          <span className="ml-2 text-xs text-muted-foreground">current</span>
        </DropdownMenuItem>
        {transitions.length > 0 && <DropdownMenuSeparator />}
        {transitions.length === 0 && (
          <DropdownMenuItem disabled className="text-xs">
            No transitions available
          </DropdownMenuItem>
        )}
        {transitions.map((stage) => {
          const entry = getEntry(stage);
          return (
            <DropdownMenuItem
              key={stage}
              onClick={(e) => {
                e.stopPropagation();
                onChangeStage(lead.id, lead.current_stage, stage);
              }}
            >
              <span className="mr-1.5 h-3.5 w-3.5" />
              <span className={`h-2 w-2 rounded-full mr-2 ${entry.color}`} />
              {entry.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const StarButton = (
    <button
      type="button"
      aria-label={lead.is_important ? "Unmark important" : "Mark important"}
      className="-m-1 p-1 rounded hover:bg-muted shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        onToggleImportant(lead.id, !!lead.is_important);
      }}
      onPointerDown={stopBubble}
    >
      <Star
        className={`h-4 w-4 ${
          lead.is_important
            ? "fill-yellow-400 text-yellow-500"
            : "text-muted-foreground"
        }`}
      />
    </button>
  );

  // ───────────────────────────────────────────────────────────────────────
  // Admitverse enhanced tile — inline-editable fields (Intake / Country /
  // Budget / Counsellor / Lead created / Follow up). Preserves the existing
  // slim-card elements (name, phone, star, kebab, source, lost reason).
  // ───────────────────────────────────────────────────────────────────────
  const leadHref = `/leads/${lead.id}`;

  if (!isFmc) {
    return (
      <AdmitverseEnhancedCard
        lead={lead}
        stageDropdown={StageDropdown}
        starButton={StarButton}
        stopBubble={stopBubble}
        leadHref={leadHref}
        onUpdateLead={onUpdateLead}
      />
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // FMC enhanced tile
  // ───────────────────────────────────────────────────────────────────────
  return (
    <FmcEnhancedCard
      lead={lead}
      stageDropdown={StageDropdown}
      starButton={StarButton}
      stopBubble={stopBubble}
      leadHref={leadHref}
      onUpdateLead={onUpdateLead}
      onRefetchLead={onRefetchLead}
      stageHex={getStageHex(slug, lead.current_stage)}
    />
  );
}

// FMC-only enhanced card. Lifts state out of PipelineCard so its hook usage
// only fires on the FMC branch.
function FmcEnhancedCard({
  lead,
  stageDropdown,
  starButton,
  stopBubble,
  leadHref,
  onUpdateLead,
  onRefetchLead,
  stageHex,
}: {
  lead: Lead;
  stageDropdown: React.ReactNode;
  starButton: React.ReactNode;
  stopBubble: (e: React.SyntheticEvent) => void;
  leadHref: string;
  onUpdateLead: (leadId: string, update: Partial<Lead>) => void;
  onRefetchLead: (leadId: string) => void;
  stageHex: string;
}) {
  const [docsOpen, setDocsOpen] = useState(false);

  // Card-level click → open lead in new tab. Implemented as a div click
  // rather than an <a target="_blank"> wrapper because nested Radix triggers
  // (Popover/DropdownMenu) lose their open-popover behavior when the parent
  // anchor is involved — composeEventHandlers honors defaultPrevented set
  // on the same click event, so any preventDefault we use to suppress the
  // anchor's activation also cancels Radix's open. Using a div removes the
  // anchor activation behavior entirely; we only call window.open when the
  // click target is NOT inside an interactive descendant.
  const openLeadInNewTab = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest(
        'button, input, textarea, select, [role="menuitem"], [role="option"], [role="combobox"], [data-radix-popper-content-wrapper]'
      )
    ) {
      return;
    }
    window.open(leadHref, "_blank", "noopener,noreferrer");
  };

  // Inline-edit state for Country / College / Loan.
  // Bank name and Bank Status both use their own dropdown patterns.
  type FmcEditField = "country" | "university" | "loan_amount";
  const [editing, setEditing] = useState<FmcEditField | null>(null);

  const startEdit = (field: FmcEditField) => setEditing(field);
  const cancelEdit = () => setEditing(null);
  const saveEdit = (field: FmcEditField, raw: string) => {
    const v = raw.trim();
    const update: Partial<Lead> =
      field === "country"
        ? { preferred_countries: v ? [v] : [] }
        : field === "university"
          ? { university: v || undefined }
          : { loan_amount: v || undefined };
    onUpdateLead(lead.id, update);
    setEditing(null);
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.email) {
      toast.error("Mail not available");
      return;
    }
    window.location.href = `mailto:${lead.email}`;
  };

  const handlePhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) {
      toast.error("Phone not available");
      return;
    }
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) {
      toast.error("Phone not available");
      return;
    }
    const digits = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void copyLeadToClipboard(lead);
  };

  // Prefer the backend-provided top_banks list. If it's not in the
  // by-stage payload. Structured BankEntry rows are the source of
  // truth; we no longer synthesize a chip from legacy
  // bank_name/bank_status because doing so contradicts the Banks tab
  // on the detail page (which only reads /leads/{id}/banks).
  const topBanks: {
    id: string;
    bank_name: string;
    bank_status: BankStatus;
  }[] = lead.top_banks ?? [];
  const extraBanksCount = Math.max(
    0,
    (lead.bank_count ?? 0) - topBanks.length
  );
  const handleEntryStatusChange = async (
    entry: { id: string; bank_status: BankStatus },
    status: BankStatus
  ) => {
    if (status === entry.bank_status) return;
    // Synthetic fallback entry (no real BankEntry row) → PATCH the
    // lead-level bank_status field via the existing update path.
    if (!entry.id) {
      onUpdateLead(lead.id, { bank_status: status });
      return;
    }
    try {
      await leadBanksService.update(lead.id, entry.id, {
        bank_status: status,
      });
      onRefetchLead(lead.id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't update bank status");
    }
  };
  const docsTotal = lead.docs_required;
  const docsDone = lead.docs_submitted;
  const showDocs =
    typeof docsTotal === "number" && docsTotal > 0;

  const agentName = lead.assigned_agent_name || lead.assigned_agent?.full_name;
  const followUp = formatFollowUp(lead.due_date);

  const tags = lead.tags ?? [];

  const callCount = lead.call_count ?? 0;
  const taskCount = lead.task_count ?? 0;
  const notesCount = lead.notes_count ?? 0;

  // Docs progress color ramp: gray → amber → blue → green
  const docsPct =
    showDocs && (docsTotal ?? 0) > 0
      ? ((docsDone ?? 0) / (docsTotal as number)) * 100
      : 0;
  const docsCountColor =
    !showDocs || docsPct === 0
      ? "text-muted-foreground"
      : docsPct >= 100
        ? "text-green-700 font-medium"
        : docsPct >= 50
          ? "text-blue-700"
          : "text-amber-700";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openLeadInNewTab}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const t = e.target as HTMLElement | null;
          if (
            t?.closest(
              'button, input, textarea, select, [role="menuitem"], [role="option"], [role="combobox"]'
            )
          ) {
            return;
          }
          e.preventDefault();
          window.open(leadHref, "_blank", "noopener,noreferrer");
        }
      }}
      className="block text-inherit no-underline"
    >
    <Card
      className={`w-full max-w-full overflow-hidden p-2 cursor-pointer hover:shadow-md transition-shadow relative ${
        lead.is_important ? "ring-1 ring-yellow-300/70" : ""
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: stageHex }}
    >
      <div className="space-y-1.5 min-w-0">
        {/* Row 1: name + phone (stacked) + action icons + stage dropdown */}
        <div className="flex items-start justify-between gap-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{lead.full_name}</p>
            {lead.phone && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {lead.phone}
              </p>
            )}
          </div>
          {lead.current_stage === "dnp" && (() => {
            const n = lead.dnp_count ?? 0;
            const label = n > 0 ? `DNP-${n}` : "DNP";
            const tone =
              n >= 5
                ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                : n >= 3
                  ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                  : n >= 1
                    ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={stopBubble}
                  onPointerDown={stopBubble}
                >
                  <button
                    type="button"
                    title={`Moved to DNP ${n} time${n === 1 ? "" : "s"} — click to change`}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-medium border shrink-0 transition-colors ${tone}`}
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
                        onUpdateLead(lead.id, { dnp_count: value });
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
            );
          })()}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              aria-label="Email"
              onClick={handleEmail}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-slate-500"
            >
              <Mail className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Call"
              onClick={handlePhone}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-blue-500"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="WhatsApp"
              onClick={handleWhatsApp}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-green-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Copy lead details"
              title="Copy name, phone, email, university"
              onClick={handleCopy}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-slate-500"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {starButton}
            {stageDropdown}
          </div>
        </div>

        {/* Loan / education section — loan and docs always render so every
            FMC card has the same row structure. Country and College are also
            always rendered with "—" fallback so the layout is consistent. */}
        <div className="border-t pt-1.5 space-y-1">
            <div className="flex items-start gap-1.5 text-xs text-foreground/80 min-w-0">
              <Globe className="h-3.5 w-3.5 shrink-0 text-cyan-600 mt-0.5" />
              <span className="text-muted-foreground shrink-0">Country:</span>
              <InlineText
                value={lead.preferred_countries?.[0] ?? ""}
                displayNode={
                  <span className="font-medium">
                    {lead.preferred_countries?.[0]}
                  </span>
                }
                editing={editing === "country"}
                onStartEdit={() => startEdit("country")}
                onSave={(v) => saveEdit("country", v)}
                onCancel={cancelEdit}
                stopBubble={stopBubble}
                placeholder="USA"
              />
            </div>
            <div className="flex items-start gap-1.5 text-xs text-foreground/80 min-w-0">
              <School className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
              <span className="text-muted-foreground shrink-0">College:</span>
              <InlineText
                value={lead.university ?? ""}
                displayNode={
                  <span className="font-medium">{lead.university}</span>
                }
                editing={editing === "university"}
                onStartEdit={() => startEdit("university")}
                onSave={(v) => saveEdit("university", v)}
                onCancel={cancelEdit}
                stopBubble={stopBubble}
                placeholder="MIT / Oxford / …"
              />
            </div>
            {lead.target_degree && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <GraduationCap className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span className="truncate">{lead.target_degree}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-foreground/80">
              <IndianRupee className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              {(() => {
                const { display, crore } = formatLakhs(lead.loan_amount);
                const unit = display === "1" ? "Lakh" : "Lakhs";
                return (
                  <InlineText
                    value={lead.loan_amount ?? ""}
                    displayNode={
                      <span className="font-medium">
                        {display} {unit}
                        {crore && (
                          <span className="ml-1 text-muted-foreground font-normal">
                            ({crore} Cr)
                          </span>
                        )}
                      </span>
                    }
                    editing={editing === "loan_amount"}
                    onStartEdit={() => startEdit("loan_amount")}
                    onSave={(v) => saveEdit("loan_amount", v)}
                    onCancel={cancelEdit}
                    stopBubble={stopBubble}
                    placeholder="25"
                    numericOnly
                  />
                );
              })()}
            </div>
            {/* Bank row — driven by lead.top_banks (up to 2 entries, ordered
                best-status-first, stable). Each chip is a bank_name button
                that opens the manager popover plus a status dropdown that
                PATCHes that specific entry. Tail badge "+N more" links to
                the same manager when bank_count > 2. */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/80 min-w-0">
              <Landmark className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              {topBanks.length === 0 ? (
                <Popover>
                  <PopoverTrigger
                    asChild
                    onPointerDown={stopBubble}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted/60 transition-colors"
                    >
                      <span className="italic text-muted-foreground font-normal">
                        + Add bank
                      </span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[340px] p-3"
                    onClick={stopBubble}
                    onPointerDown={stopBubble}
                  >
                    <p className="text-xs font-medium mb-2">Banks</p>
                    <LeadBanksManager
                      leadId={lead.id}
                      autoOpenAddIfEmpty
                      onChanged={() => onRefetchLead(lead.id)}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                topBanks.map((entry, i) => {
                  const statusClass =
                    entry.bank_status in BANK_STATUS_BADGE_CLASSES
                      ? BANK_STATUS_BADGE_CLASSES[entry.bank_status]
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80";
                  return (
                    <Fragment key={entry.id || `legacy-${entry.bank_name}`}>
                      {i > 0 && (
                        <span className="text-muted-foreground/40 shrink-0">
                          |
                        </span>
                      )}
                      <Popover>
                        <PopoverTrigger
                          asChild
                          onPointerDown={stopBubble}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted/60 transition-colors min-w-0"
                            title="Manage banks"
                          >
                            <span className="font-medium truncate">
                              {entry.bank_name}
                            </span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[340px] p-3"
                          onClick={stopBubble}
                          onPointerDown={stopBubble}
                        >
                          <p className="text-xs font-medium mb-2">Banks</p>
                          <LeadBanksManager
                            leadId={lead.id}
                            onChanged={() => onRefetchLead(lead.id)}
                          />
                        </PopoverContent>
                      </Popover>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onPointerDown={stopBubble}
                        >
                          <button
                            type="button"
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[11px] leading-none transition-colors ${statusClass}`}
                          >
                            <span>
                              {BANK_STATUS_LABELS[entry.bank_status] ??
                                entry.bank_status}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          onClick={stopBubble}
                          onPointerDown={stopBubble}
                        >
                          {(
                            Object.keys(BANK_STATUS_LABELS) as BankStatus[]
                          ).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEntryStatusChange(entry, status);
                              }}
                            >
                              {entry.bank_status === status ? (
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                              ) : (
                                <span className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {BANK_STATUS_LABELS[status]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Fragment>
                  );
                })
              )}
              {extraBanksCount > 0 && (
                <Popover>
                  <PopoverTrigger
                    asChild
                    onPointerDown={stopBubble}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] leading-none bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 transition-colors shrink-0"
                      title={`${lead.bank_count} banks total — click to manage`}
                    >
                      +{extraBanksCount} more
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[340px] p-3"
                    onClick={stopBubble}
                    onPointerDown={stopBubble}
                  >
                    <p className="text-xs font-medium mb-2">All banks</p>
                    <LeadBanksManager
                      leadId={lead.id}
                      onChanged={() => onRefetchLead(lead.id)}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {showDocs && (
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocsOpen((v) => !v);
                  }}
                  onPointerDown={stopBubble}
                  className="flex items-center gap-1.5 text-xs text-foreground/80 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
                  <span className={docsCountColor}>
                    {docsDone ?? 0} / {docsTotal} docs
                  </span>
                  {docsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {docsOpen && (
                  <DocsChecklist
                    selected={lead.submitted_docs ?? []}
                    onToggle={(key) => {
                      const current = lead.submitted_docs ?? [];
                      const next = current.includes(key)
                        ? current.filter((k) => k !== key)
                        : [...current, key];
                      onUpdateLead(lead.id, { submitted_docs: next });
                    }}
                    onItemPointerDown={stopBubble}
                    className="mt-1.5 ml-5"
                  />
                )}
              </div>
            )}
          </div>

        {/* Lost reason (preserve from previous behavior) */}
        {lead.current_stage === "lost" && lead.lost_reason && (
          <p
            className="text-xs text-red-700 line-clamp-2 border-t pt-1.5"
            title={lead.lost_reason}
          >
            <span className="font-medium">Lost:</span>{" "}
            {lead.lost_reason.length > 60
              ? `${lead.lost_reason.slice(0, 60).trimEnd()}…`
              : lead.lost_reason}
          </p>
        )}

        {/* Agent + counts — always render so admins can spot unassigned
            leads and so 0-count badges still appear. */}
        <div className="border-t pt-1.5 space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <CalendarClock
                className={`h-3.5 w-3.5 shrink-0 ${followUpIconClass(followUp?.tone)}`}
              />
              <span className="text-muted-foreground shrink-0">Follow up:</span>
              {followUp ? (
                <span className={`${followUpToneClass(followUp.tone)} truncate`}>
                  {followUp.label}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-0.5" title={`${callCount} ${callCount === 1 ? "Call" : "Calls"}`}>
                <PhoneCall className="h-3 w-3 text-blue-500" />
                {callCount}
              </span>
              <span className="flex items-center gap-0.5" title={`${taskCount} ${taskCount === 1 ? "Task" : "Tasks"}`}>
                <ClipboardList className="h-3 w-3 text-orange-500" />
                {taskCount}
              </span>
              <span className="flex items-center gap-0.5" title={`${notesCount} ${notesCount === 1 ? "Note" : "Notes"}`}>
                <StickyNote className="h-3 w-3 text-violet-500" />
                {notesCount}
              </span>
            </div>
          </div>
          <p className="text-xs font-medium leading-snug break-words">
            <span className="text-muted-foreground font-normal">Counsellor:</span>{" "}
            {agentName ? (
              <span>{agentName}</span>
            ) : (
              <span className="italic text-muted-foreground font-normal">
                Unassigned
              </span>
            )}
            <span className="text-muted-foreground font-normal"> · PC:</span>{" "}
            {lead.pre_counsellor_name ? (
              <span>{lead.pre_counsellor_name}</span>
            ) : (
              <span className="text-muted-foreground font-normal">—</span>
            )}
          </p>
        </div>

        {/* Latest note */}
        <LatestNoteSection note={lead.latest_note ?? null} />

        {/* Tags */}
        {tags.length > 0 && (
          <div className="border-t pt-1.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none bg-pink-50 text-pink-700 border border-pink-200"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI campaign watermark */}
      {lead.has_active_ai_campaign && (
        <span
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none bg-purple-50 text-purple-700 border border-purple-200"
          title="Active AI campaign"
        >
          <Bot className="h-3 w-3" />
          AI
        </span>
      )}
    </Card>
    </div>
  );
}

// Map sep_2026 → "Sep 2026"; passes through anything unrecognized.
function formatIntake(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^([a-z]+)_(\d{4})$/i);
  if (!m) return trimmed;
  const [, month, year] = m;
  return `${month.charAt(0).toUpperCase()}${month.slice(1).toLowerCase()} ${year}`;
}

// Renders the lead's most recent remark on the Kanban tile. Empty
// state shows "No notes yet" so the section keeps a consistent slot
// even on leads with no remarks.
function LatestNoteSection({
  note,
}: {
  note: {
    body: string;
    author_name: string | null;
    author_role: string;
    created_at: string;
  } | null;
}) {
  if (!note) {
    return (
      <div className="border-t pt-1.5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <StickyNote className="h-3 w-3 shrink-0" />
          No notes yet
        </p>
      </div>
    );
  }
  const body =
    note.body.length > 70 ? `${note.body.slice(0, 70).trimEnd()}…` : note.body;
  const author = note.author_name?.trim() || "Unknown";
  const ago = formatRelative(note.created_at) ?? "just now";
  return (
    <div className="border-t pt-1.5">
      <p
        className="flex items-start gap-1.5 text-[11px] leading-snug"
        title={`${note.body}\n— ${author} · ${ago}`}
      >
        <StickyNote className="h-3 w-3 shrink-0 text-violet-500 mt-0.5" />
        <span className="break-words min-w-0">
          {body}
          <span className="text-[10px] text-muted-foreground ml-1">
            — {author} · {ago}
          </span>
        </span>
      </p>
    </div>
  );
}

// "3d ago", "5h ago" — abbreviated relative format per spec.
function formatRelative(iso?: string): string | null {
  if (!iso) return null;
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "just now";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  } catch {
    return null;
  }
}

interface InlineRowProps {
  Icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  label: string;
  display: React.ReactNode;
  editing: boolean;
  onStartEdit: (e: React.MouseEvent) => void;
  onSave: () => void;
  onCancel: () => void;
  stopBubble: (e: React.SyntheticEvent) => void;
  children?: React.ReactNode; // edit-mode input
  hideIfEmpty?: boolean;
  isEmpty?: boolean;
  isOverdue?: boolean;
}

function InlineRow({
  Icon,
  iconClass,
  label,
  display,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  stopBubble,
  children,
  hideIfEmpty,
  isEmpty,
  isOverdue,
}: InlineRowProps) {
  if (!editing && hideIfEmpty && isEmpty) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-foreground/80 group"
      onClick={stopBubble}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass ?? ""}`} />
      <span className="text-muted-foreground shrink-0">{label}:</span>
      {editing ? (
        <>
          {children}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            onPointerDown={stopBubble}
            aria-label="Save"
            className="-m-0.5 p-0.5 rounded hover:bg-green-100 text-green-700"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            onPointerDown={stopBubble}
            aria-label="Cancel"
            className="-m-0.5 p-0.5 rounded hover:bg-red-100 text-red-700"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span
            className={`truncate ${isOverdue ? "text-red-600 font-medium" : ""}`}
          >
            {isEmpty ? (
              <span className="text-muted-foreground italic">—</span>
            ) : (
              display
            )}
          </span>
          <button
            type="button"
            onClick={onStartEdit}
            onPointerDown={stopBubble}
            aria-label={`Edit ${label}`}
            className="-m-0.5 p-0.5 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

type EditField =
  | "target_intake"
  | "preferred_countries"
  | "budget"
  | "assigned_agent_id"
  | "created_at"
  | "due_date";

// Admitverse-only enhanced card with inline-edit pencils on each new field.
// Preserves the existing slim card's behavior for name, phone, star, kebab,
// source badge, and lost-reason preview.
function AdmitverseEnhancedCard({
  lead,
  stageDropdown,
  starButton,
  stopBubble,
  leadHref,
  onUpdateLead,
}: {
  lead: Lead;
  stageDropdown: React.ReactNode;
  starButton: React.ReactNode;
  stopBubble: (e: React.SyntheticEvent) => void;
  leadHref: string;
  onUpdateLead: (leadId: string, update: Partial<Lead>) => void;
}) {
  const [editing, setEditing] = useState<EditField | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [agents, setAgents] = useState<User[] | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Lazy-fetch agents when the user opens the counsellor edit.
  useEffect(() => {
    if (editing !== "assigned_agent_id" || agents !== null || agentsLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgentsLoading(true);
    api
      .get("/users?is_active=true")
      .then(({ data }) => setAgents(data.items || data || []))
      .catch(() => setAgents([]))
      .finally(() => setAgentsLoading(false));
  }, [editing, agents, agentsLoading]);

  const startEdit = (field: EditField, current: string) => {
    setEditing(field);
    setDraft(current);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = () => {
    if (!editing) return;
    const update: Partial<Lead> = {};
    if (editing === "target_intake") {
      const v = draft.trim();
      update.target_intake = v ? v.toLowerCase().replace(/\s+/g, "_") : undefined;
    } else if (editing === "budget") {
      update.budget = draft.trim() || undefined;
    } else if (editing === "preferred_countries") {
      const list = draft
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      update.preferred_countries = list;
    } else if (editing === "assigned_agent_id") {
      update.assigned_agent_id = draft || undefined;
    } else if (editing === "created_at") {
      // YYYY-MM-DD from <input type="date"> → ISO at start-of-day in local TZ
      update.created_at = draft ? new Date(draft).toISOString() : undefined;
    } else if (editing === "due_date") {
      update.due_date = draft ? new Date(draft).toISOString() : undefined;
    }
    onUpdateLead(lead.id, update);
    cancelEdit();
  };

  const intakeDisplay = formatIntake(lead.target_intake);
  const countries = lead.preferred_countries ?? [];
  const countriesPreview = countries.slice(0, 2).join(", ");
  const countriesExtra = countries.length > 2 ? countries.length - 2 : 0;

  const agentName = lead.assigned_agent_name || lead.assigned_agent?.full_name;
  const followUp = formatFollowUp(lead.due_date);
  const created = formatRelative(lead.created_at);

  // For <input type="date"> binding: trim ISO to YYYY-MM-DD.
  const toDateInput = (iso?: string | null): string =>
    iso ? iso.slice(0, 10) : "";

  return (
    <a
      href={leadHref}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-inherit no-underline"
    >
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
        lead.is_important ? "ring-1 ring-yellow-300/70" : ""
      }`}
    >
      <div className="space-y-2 min-w-0">
        {/* Row 1: name + star + kebab */}
        <div className="flex items-start justify-between gap-1 min-w-0">
          <p className="font-medium text-sm truncate flex-1 min-w-0">
            {lead.full_name}
          </p>
          {starButton}
          {stageDropdown}
        </div>

        {/* Phone */}
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </div>
        )}

        {/* Source badge */}
        {lead.lead_source && (
          <Badge variant="outline" className="text-xs">
            {lead.lead_source.name}
          </Badge>
        )}

        {/* Lost reason */}
        {lead.current_stage === "lost" && lead.lost_reason && (
          <p
            className="text-xs text-red-700 line-clamp-2"
            title={lead.lost_reason}
          >
            <span className="font-medium">Lost:</span>{" "}
            {lead.lost_reason.length > 60
              ? `${lead.lost_reason.slice(0, 60).trimEnd()}…`
              : lead.lost_reason}
          </p>
        )}

        {/* Application info (all 3 fields hide-when-empty so the whole section
            collapses if there's nothing to show) */}
        {(intakeDisplay || countries.length > 0 || lead.budget) && (
        <div className="border-t pt-2 space-y-1">
          <InlineRow
            Icon={GraduationCap}
            iconClass="text-indigo-500"
            label="Intake"
            display={intakeDisplay}
            isEmpty={!intakeDisplay}
            hideIfEmpty
            editing={editing === "target_intake"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("target_intake", intakeDisplay ?? lead.target_intake ?? "");
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stopBubble}
              onPointerDown={stopBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="Sep 2026"
              className="h-6 text-xs py-0 px-1"
            />
          </InlineRow>

          <InlineRow
            Icon={Globe}
            iconClass="text-cyan-600"
            label="Country"
            display={
              <>
                {countriesPreview}
                {countriesExtra > 0 && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] leading-none bg-cyan-50 text-cyan-700 border border-cyan-200">
                    +{countriesExtra} more
                  </span>
                )}
              </>
            }
            isEmpty={countries.length === 0}
            hideIfEmpty
            editing={editing === "preferred_countries"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("preferred_countries", countries.join(", "));
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stopBubble}
              onPointerDown={stopBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="USA, UK, Canada"
              className="h-6 text-xs py-0 px-1"
            />
          </InlineRow>

          <InlineRow
            Icon={Wallet}
            iconClass="text-amber-600"
            label="Budget"
            display={lead.budget}
            isEmpty={!lead.budget}
            hideIfEmpty
            editing={editing === "budget"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("budget", lead.budget ?? "");
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stopBubble}
              onPointerDown={stopBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="50 L"
              className="h-6 text-xs py-0 px-1"
            />
          </InlineRow>
        </div>
        )}

        {/* People + timeline */}
        <div className="border-t pt-2 space-y-1">
          <InlineRow
            Icon={UserRound}
            iconClass="text-violet-500"
            label="Counsellor"
            display={agentName}
            isEmpty={!agentName}
            editing={editing === "assigned_agent_id"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("assigned_agent_id", lead.assigned_agent_id ?? "");
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Select
              value={draft || "__unset"}
              onValueChange={(v) => setDraft(v === "__unset" ? "" : v)}
            >
              <SelectTrigger
                className="h-6 text-xs py-0 px-1.5 min-w-[8rem]"
                onClick={stopBubble}
                onPointerDown={stopBubble}
              >
                <SelectValue placeholder="Pick a counsellor" />
              </SelectTrigger>
              <SelectContent
                onClick={stopBubble}
                onPointerDown={stopBubble}
              >
                <SelectItem value="__unset">Unassigned</SelectItem>
                {agentsLoading && (
                  <SelectItem value="__loading" disabled>
                    Loading…
                  </SelectItem>
                )}
                {(agents ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InlineRow>

          <InlineRow
            Icon={Sparkles}
            iconClass="text-emerald-500"
            label="Lead created"
            display={created}
            isEmpty={!created}
            editing={editing === "created_at"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("created_at", toDateInput(lead.created_at));
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Input
              autoFocus
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stopBubble}
              onPointerDown={stopBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="h-6 text-xs py-0 px-1"
            />
          </InlineRow>

          <InlineRow
            Icon={CalendarClock}
            iconClass={followUpIconClass(followUp?.tone)}
            label="Follow up"
            display={
              followUp ? (
                <span className={followUpToneClass(followUp.tone)}>
                  {followUp.label}
                </span>
              ) : null
            }
            isEmpty={!followUp}
            isOverdue={followUp?.isOverdue}
            editing={editing === "due_date"}
            onStartEdit={(e) => {
              e.stopPropagation();
              startEdit("due_date", toDateInput(lead.due_date));
            }}
            onSave={saveEdit}
            onCancel={cancelEdit}
            stopBubble={stopBubble}
          >
            <Input
              autoFocus
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={stopBubble}
              onPointerDown={stopBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="h-6 text-xs py-0 px-1"
            />
          </InlineRow>
        </div>

        {/* Latest note */}
        <LatestNoteSection note={lead.latest_note ?? null} />
      </div>
    </Card>
    </a>
  );
}

// Click-to-edit text field used on the FMC tile. Renders the value as a
// button (with hover pencil) in display mode; switches to an Input in edit
// mode. Enter / blur saves; Escape cancels.
function InlineText({
  value,
  displayNode,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  stopBubble,
  placeholder,
  numericOnly,
  emptyDisplay,
}: {
  value: string;
  displayNode: React.ReactNode;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  stopBubble: (e: React.SyntheticEvent) => void;
  placeholder?: string;
  numericOnly?: boolean;
  emptyDisplay?: React.ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(value);
      cancelledRef.current = false;
    }
  }, [editing, value]);

  if (editing) {
    return (
      <Input
        autoFocus
        onFocus={(e) => e.target.select()}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (numericOnly && v !== "" && !/^\d*\.?\d*$/.test(v)) return;
          setDraft(v);
        }}
        onBlur={() => {
          if (cancelledRef.current) {
            cancelledRef.current = false;
            onCancel();
          } else {
            onSave(draft);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelledRef.current = true;
            (e.target as HTMLInputElement).blur();
          }
        }}
        onClick={stopBubble}
        onPointerDown={stopBubble}
        placeholder={placeholder}
        inputMode={numericOnly ? "decimal" : undefined}
        className="h-6 text-xs py-0 px-1.5"
      />
    );
  }

  return (
    <button
      type="button"
      onMouseDown={stopBubble}
      onClick={(e) => {
        // preventDefault stops the parent anchor from navigating on any
        // browser that doesn't strictly enforce the "button inside anchor"
        // interactive-content rule; stopPropagation keeps drag-handle and
        // other parent listeners out of it.
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      }}
      onPointerDown={stopBubble}
      className="group inline-flex items-center gap-1 min-w-0 text-left rounded -mx-0.5 px-1 hover:bg-muted/60 break-words cursor-text"
    >
      <span className="min-w-0 break-words">
        {value ? displayNode : (emptyDisplay ?? <span className="italic text-muted-foreground">—</span>)}
      </span>
      <Pencil className="h-3 w-3 opacity-30 group-hover:opacity-80 shrink-0 text-muted-foreground" />
    </button>
  );
}
