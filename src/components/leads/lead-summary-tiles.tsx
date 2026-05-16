"use client";

import { Card } from "@/components/ui/card";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  IndianRupee,
  Landmark,
  PhoneCall,
  StickyNote,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLakhs } from "@/lib/utils";
import {
  formatFollowUp,
  followUpIconClass,
  followUpToneClass,
} from "@/lib/follow-up";
import { useStageConfig } from "@/hooks/use-stage-config";
import {
  BANK_STATUS_BADGE_CLASSES,
  BANK_STATUS_LABELS,
} from "@/lib/constants";
import type { BankStatus, Lead } from "@/types";

interface LeadSummaryTilesProps {
  lead: Lead;
  counsellorName?: string;
  preCounsellorName?: string;
  onOpenBanksTab?: () => void;
}

// Compact at-a-glance strip rendered between the lead header and the
// tabs. Surfaces the most important fields so telecallers don't have
// to switch tabs to spot urgency / ownership / loan state.
export function LeadSummaryTiles({
  lead,
  counsellorName,
  preCounsellorName,
  onOpenBanksTab,
}: LeadSummaryTilesProps) {
  const { slug, getEntry } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const stageEntry = getEntry(lead.current_stage);
  const followUp = formatFollowUp(lead.due_date);
  const primaryBank =
    lead.top_banks?.[0] ??
    (lead.bank_name
      ? {
          bank_name: lead.bank_name,
          bank_status: (lead.bank_status as BankStatus) ?? "applied",
        }
      : null);
  const { display: loanDisplay } = formatLakhs(lead.loan_amount);
  const docsTotal = lead.docs_required ?? 0;
  const docsDone = lead.docs_submitted ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {/* Stage */}
      <Tile icon={<span className={cn("h-3 w-3 rounded-full", stageEntry.color)} />} label="Stage">
        <span className={cn("text-sm font-medium", stageEntry.textClass)}>
          {stageEntry.label}
        </span>
      </Tile>

      {/* Follow-up */}
      <Tile
        icon={
          <CalendarClock
            className={cn("h-4 w-4", followUpIconClass(followUp?.tone))}
          />
        }
        label="Follow up"
      >
        {followUp ? (
          <span className={cn("text-sm", followUpToneClass(followUp.tone))}>
            {followUp.label}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </Tile>

      {/* Counsellor */}
      <Tile
        icon={<UserRound className="h-4 w-4 text-violet-500" />}
        label="Counsellor"
      >
        <span className="text-sm font-medium truncate">
          {counsellorName || (
            <span className="italic text-muted-foreground font-normal">
              Unassigned
            </span>
          )}
        </span>
      </Tile>

      {/* Pre Counsellor (FMC only) */}
      {isFmc && (
        <Tile
          icon={<UserRound className="h-4 w-4 text-blue-500" />}
          label="Pre Counsellor"
        >
          <span className="text-sm font-medium truncate">
            {preCounsellorName || (
              <span className="italic text-muted-foreground font-normal">
                —
              </span>
            )}
          </span>
        </Tile>
      )}

      {/* Loan amount (FMC) / Budget (AV) */}
      {isFmc ? (
        <Tile
          icon={<IndianRupee className="h-4 w-4 text-amber-600" />}
          label="Loan amount"
        >
          {lead.loan_amount ? (
            <span className="text-sm font-medium">{loanDisplay} Lakhs</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </Tile>
      ) : (
        <Tile
          icon={<Wallet className="h-4 w-4 text-amber-600" />}
          label="Budget"
        >
          <span className="text-sm font-medium truncate">
            {lead.budget || (
              <span className="text-muted-foreground font-normal">—</span>
            )}
          </span>
        </Tile>
      )}

      {/* Primary bank (FMC) — click opens Banks tab */}
      {isFmc && (
        <Tile
          icon={<Landmark className="h-4 w-4 text-blue-500" />}
          label="Primary bank"
          onClick={onOpenBanksTab}
        >
          {primaryBank ? (
            <span className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="font-medium truncate">{primaryBank.bank_name}</span>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] leading-none shrink-0",
                  primaryBank.bank_status in BANK_STATUS_BADGE_CLASSES
                    ? BANK_STATUS_BADGE_CLASSES[primaryBank.bank_status]
                    : "bg-muted text-muted-foreground border-transparent"
                )}
              >
                {BANK_STATUS_LABELS[primaryBank.bank_status] ??
                  primaryBank.bank_status}
              </span>
              {(lead.bank_count ?? 0) > 1 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  +{(lead.bank_count ?? 1) - 1}
                </span>
              )}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              Add bank
            </span>
          )}
        </Tile>
      )}

      {/* Docs progress (FMC) */}
      {isFmc && docsTotal > 0 && (
        <Tile
          icon={<FileText className="h-4 w-4 text-cyan-600" />}
          label="Docs"
        >
          <span
            className={cn(
              "text-sm font-medium",
              docsDone === 0
                ? "text-muted-foreground"
                : docsDone >= docsTotal
                  ? "text-green-700"
                  : docsDone / docsTotal >= 0.5
                    ? "text-blue-700"
                    : "text-amber-700"
            )}
          >
            {docsDone} / {docsTotal}
          </span>
        </Tile>
      )}

      {/* Activity counts */}
      <Tile
        icon={<PhoneCall className="h-4 w-4 text-blue-500" />}
        label="Calls"
      >
        <span className="text-sm font-medium">{lead.call_count ?? 0}</span>
      </Tile>
      <Tile
        icon={<ClipboardList className="h-4 w-4 text-orange-500" />}
        label="Tasks"
      >
        <span className="text-sm font-medium">{lead.task_count ?? 0}</span>
      </Tile>
      <Tile
        icon={<StickyNote className="h-4 w-4 text-violet-500" />}
        label="Notes"
      >
        <span className="text-sm font-medium">{lead.notes_count ?? 0}</span>
      </Tile>
    </div>
  );
}

function Tile({
  icon,
  label,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <Card
      className={cn(
        "p-2.5 min-w-0",
        clickable && "cursor-pointer hover:bg-muted/40 transition-colors"
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}
