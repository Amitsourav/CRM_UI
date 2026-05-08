"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Calendar,
  MoreVertical,
  Check,
  Star,
  Mail,
  MessageCircle,
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
  Loader2,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";
import { useStageConfig } from "@/hooks/use-stage-config";
import { BANK_STATUS_LABELS } from "@/lib/constants";
import type { BankStatus, Lead, LeadStage, Task } from "@/types";

interface PipelineCardProps {
  lead: Lead;
  onChangeStage: (
    leadId: string,
    fromStage: LeadStage,
    toStage: LeadStage
  ) => void;
  onToggleImportant: (leadId: string, currentValue: boolean) => void;
}

export function PipelineCard({
  lead,
  onChangeStage,
  onToggleImportant,
}: PipelineCardProps) {
  const router = useRouter();
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
  // Admitverse keeps its current slim card unchanged (per brand spec).
  // ───────────────────────────────────────────────────────────────────────
  if (!isFmc) {
    const isOverdue =
      lead.due_date &&
      isBefore(new Date(lead.due_date), startOfDay(new Date()));

    const agentInitials = lead.assigned_agent?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <Card
        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push(`/leads/${lead.id}`)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-1">
            <p className="font-medium text-sm truncate flex-1">
              {lead.full_name}
            </p>
            {StarButton}
            {StageDropdown}
          </div>
          {lead.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </div>
          )}
          {lead.current_stage === "lost" && lead.lost_reason && (
            <p
              className="text-xs text-red-700 line-clamp-2"
              title={lead.lost_reason}
            >
              {lead.lost_reason.length > 60
                ? `${lead.lost_reason.slice(0, 60).trimEnd()}…`
                : lead.lost_reason}
            </p>
          )}
          {lead.lead_source && (
            <Badge variant="outline" className="text-xs">
              {lead.lead_source.name}
            </Badge>
          )}
          <div className="flex items-center justify-between">
            {lead.due_date && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(lead.due_date), "MMM d")}
              </div>
            )}
            {lead.assigned_agent && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {agentInitials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </Card>
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
      onCardClick={() => router.push(`/leads/${lead.id}`)}
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
  onCardClick,
}: {
  lead: Lead;
  stageDropdown: React.ReactNode;
  starButton: React.ReactNode;
  stopBubble: (e: React.SyntheticEvent) => void;
  onCardClick: () => void;
}) {
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);

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

  const toggleTasks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const willOpen = !tasksOpen;
    setTasksOpen(willOpen);
    if (willOpen && tasks === null) {
      setTasksLoading(true);
      try {
        const { data } = await api.get(
          `/leads/${lead.id}/tasks?status=pending&limit=3`
        );
        setTasks((data.items as Task[]) ?? (data as Task[]) ?? []);
      } catch {
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    }
  };

  const bankStatusLabel =
    lead.bank_status && lead.bank_status in BANK_STATUS_LABELS
      ? BANK_STATUS_LABELS[lead.bank_status as BankStatus]
      : null;
  const docsTotal = lead.docs_required;
  const docsDone = lead.docs_submitted;
  const showDocs =
    typeof docsTotal === "number" && docsTotal > 0;

  const agentName = lead.assigned_agent_name || lead.assigned_agent?.full_name;
  const agentRole = lead.assigned_agent_role || lead.assigned_agent?.role;

  const tags = lead.tags ?? [];

  const callCount = lead.call_count ?? 0;
  const taskCount = lead.task_count ?? 0;
  const notesCount = lead.notes_count ?? 0;

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onCardClick}
    >
      <div className="space-y-2">
        {/* Row 1: name + action icons + stage dropdown */}
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm truncate flex-1">
            {lead.full_name}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              aria-label="Email"
              onClick={handleEmail}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Call"
              onClick={handlePhone}
              onPointerDown={stopBubble}
              className="-m-1 p-1 rounded hover:bg-muted text-muted-foreground"
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
            {stageDropdown}
          </div>
        </div>

        {/* Row 2: phone text + star */}
        <div className="flex items-center justify-between gap-2">
          {lead.phone ? (
            <span className="text-xs text-muted-foreground truncate">
              {lead.phone}
            </span>
          ) : (
            <span />
          )}
          {starButton}
        </div>

        {/* Loan / education section */}
        {(lead.target_degree ||
          lead.loan_amount ||
          bankStatusLabel ||
          showDocs) && (
          <div className="border-t pt-2 space-y-1">
            {lead.target_degree && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lead.target_degree}</span>
              </div>
            )}
            {lead.loan_amount && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lead.loan_amount}</span>
              </div>
            )}
            {bankStatusLabel && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Landmark className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{bankStatusLabel}</span>
              </div>
            )}
            {showDocs && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {docsDone ?? 0} / {docsTotal} docs
                </span>
              </div>
            )}
          </div>
        )}

        {/* Lost reason (preserve from previous behavior) */}
        {lead.current_stage === "lost" && lead.lost_reason && (
          <p
            className="text-xs text-red-700 line-clamp-2 border-t pt-2"
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
        <div className="border-t pt-2 space-y-1">
          <p className="text-xs font-medium truncate">
            {agentName ? (
              <>
                {agentName}
                {agentRole && (
                  <span className="text-muted-foreground font-normal capitalize">
                    {" "}
                    ({agentRole})
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground italic font-normal">
                Unassigned
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <PhoneCall className="h-3 w-3" />
              {callCount} {callCount === 1 ? "Call" : "Calls"}
            </span>
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
            </span>
            <span className="flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              {notesCount} {notesCount === 1 ? "Note" : "Notes"}
            </span>
          </div>
        </div>

        {/* Top 3 pending tasks (expandable) */}
        <div className="border-t pt-2">
          <button
            type="button"
            onClick={toggleTasks}
            onPointerDown={stopBubble}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {tasksOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Top 3 pending tasks
          </button>
          {tasksOpen && (
            <div className="mt-1.5 ml-4 space-y-1">
              {tasksLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((t) => (
                  <div key={t.id} className="text-xs">
                    <p className="truncate">{t.title}</p>
                    {t.due_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Due {format(new Date(t.due_date), "MMM d")}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No pending tasks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="border-t pt-2 text-xs text-muted-foreground truncate">
            <span className="font-medium">Tags:</span>{" "}
            {tags.join(" · ")}
          </div>
        )}
      </div>

      {/* AI watermark */}
      {lead.has_active_ai_campaign && (
        <div
          className="absolute bottom-2 right-2 text-purple-500"
          title="Active AI campaign"
        >
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
    </Card>
  );
}
