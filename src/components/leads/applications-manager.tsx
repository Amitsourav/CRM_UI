"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X as IconX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_CLASSES,
  VISA_STATUS_LABELS,
  applicationShowsOfferDetails,
} from "@/lib/constants";
import {
  applicationsService,
  type ApplicationCreate,
} from "@/services/applications-service";
import { UniversityAutocomplete } from "./university-autocomplete";
import { ApplicationOfferDialog } from "./application-offer-dialog";
import type { Application, ApplicationStatus } from "@/types";

const ALL_STATUSES = Object.keys(
  APPLICATION_STATUS_LABELS
) as ApplicationStatus[];

// True when any offer-stage field on the entry has a non-empty value.
// Drives whether we show the read-only summary or a "not yet filled" hint.
function hasAnyOfferDetail(entry: Application): boolean {
  return (
    !!entry.offer_date ||
    entry.tuition_fee != null ||
    entry.scholarship_amount != null ||
    entry.deposit_amount != null ||
    !!entry.deposit_paid_date ||
    !!entry.cas_number ||
    !!entry.visa_status
  );
}

interface ApplicationsManagerProps {
  leadId: string;
  showNotes?: boolean;
  autoOpenAddIfEmpty?: boolean;
  onChanged?: () => void;
}

export function ApplicationsManager({
  leadId,
  showNotes,
  autoOpenAddIfEmpty,
  onChanged,
}: ApplicationsManagerProps) {
  const [entries, setEntries] = useState<Application[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [offerEditingId, setOfferEditingId] = useState<string | null>(null);

  // Add-application form state
  const [addOpen, setAddOpen] = useState(false);
  const [newUniversity, setNewUniversity] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [newIntake, setNewIntake] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newStatus, setNewStatus] = useState<ApplicationStatus>("applied");

  useEffect(() => {
    let cancelled = false;
    applicationsService
      .list(leadId)
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
        if (autoOpenAddIfEmpty && list.length === 0) setAddOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
        if (autoOpenAddIfEmpty) setAddOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, autoOpenAddIfEmpty]);

  const handleStatusChange = async (
    entry: Application,
    status: ApplicationStatus
  ) => {
    if (status === entry.application_status) return;
    const original = entry;
    setEntries((prev) =>
      (prev ?? []).map((e) =>
        e.id === entry.id ? { ...e, application_status: status } : e
      )
    );
    try {
      const updated = await applicationsService.update(leadId, entry.id, {
        application_status: status,
      });
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? updated : e))
      );
      onChanged?.();
    } catch (error: unknown) {
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? original : e))
      );
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(
        err.response?.data?.detail || "Couldn't update application status"
      );
    }
  };

  const handleNotesBlur = async (entry: Application, notes: string) => {
    if ((notes || "") === (entry.notes || "")) return;
    try {
      const updated = await applicationsService.update(leadId, entry.id, {
        notes: notes || null,
      });
      setEntries((prev) =>
        (prev ?? []).map((e) => (e.id === entry.id ? updated : e))
      );
      onChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(
        err.response?.data?.detail || "Couldn't save application notes"
      );
    }
  };

  const handleDelete = async (entry: Application) => {
    const snapshot = entries;
    setEntries((prev) => (prev ?? []).filter((e) => e.id !== entry.id));
    try {
      await applicationsService.remove(leadId, entry.id);
      onChanged?.();
    } catch (error: unknown) {
      setEntries(snapshot);
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't remove application");
    }
  };

  const resetAddForm = () => {
    setNewUniversity("");
    setNewProgram("");
    setNewIntake("");
    setNewCountry("");
    setNewStatus("applied");
    setAddOpen(false);
  };

  const handleAdd = async () => {
    const university = newUniversity.trim();
    if (!university) {
      toast.error("Enter a university");
      return;
    }
    setAdding(true);
    try {
      const body: ApplicationCreate = {
        university_name: university,
        program: newProgram.trim() || null,
        intake: newIntake.trim() || null,
        country: newCountry.trim() || null,
        application_status: newStatus,
      };
      const created = await applicationsService.add(leadId, body);
      setEntries((prev) => [...(prev ?? []), created]);
      resetAddForm();
      onChanged?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      // Duplicate (university + program) → backend 400.
      toast.error(err.response?.data?.detail || "Couldn't add application");
    } finally {
      setAdding(false);
    }
  };

  if (entries === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">
          No applications yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="border rounded-md p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">
                    {entry.university_name}
                  </span>
                  {(entry.program || entry.intake || entry.country) && (
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {[entry.program, entry.country, entry.intake]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
                <Select
                  value={entry.application_status}
                  onValueChange={(v) =>
                    handleStatusChange(entry, v as ApplicationStatus)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "h-7 text-xs w-[170px] border rounded-full px-2",
                      entry.application_status in
                        APPLICATION_STATUS_BADGE_CLASSES &&
                        APPLICATION_STATUS_BADGE_CLASSES[
                          entry.application_status
                        ]
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {APPLICATION_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(entry)}
                  aria-label={`Remove ${entry.university_name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showNotes && (
                <Textarea
                  defaultValue={entry.notes ?? ""}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="text-xs"
                  onBlur={(e) => handleNotesBlur(entry, e.target.value)}
                />
              )}
              {applicationShowsOfferDetails(entry.application_status) && (
                <OfferDetailsPanel
                  entry={entry}
                  onEdit={() => setOfferEditingId(entry.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {offerEditingId &&
        entries &&
        (() => {
          const editing = entries.find((e) => e.id === offerEditingId);
          if (!editing) return null;
          return (
            <ApplicationOfferDialog
              open={true}
              onOpenChange={(o) => !o && setOfferEditingId(null)}
              leadId={leadId}
              entry={editing}
              onSaved={(updated) => {
                setEntries((prev) =>
                  (prev ?? []).map((e) =>
                    e.id === updated.id ? updated : e
                  )
                );
                onChanged?.();
              }}
            />
          );
        })()}

      {/* Add application */}
      {addOpen ? (
        <div className="border rounded-md p-2 space-y-2 bg-muted/30">
          <UniversityAutocomplete
            value={newUniversity}
            onChange={setNewUniversity}
            placeholder="University…"
            compact
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newProgram}
              onChange={(e) => setNewProgram(e.target.value)}
              placeholder="Program (e.g. MSc CS)"
              className="h-7 text-xs"
            />
            <Input
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              placeholder="Country"
              className="h-7 text-xs"
            />
            <Input
              value={newIntake}
              onChange={(e) => setNewIntake(e.target.value)}
              placeholder="Intake (e.g. Sep-2026)"
              className="h-7 text-xs"
            />
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as ApplicationStatus)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={resetAddForm}
              disabled={adding}
            >
              <IconX className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7"
              onClick={handleAdd}
              disabled={adding || !newUniversity.trim()}
            >
              {adding && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add application
        </Button>
      )}
    </div>
  );
}

// Read-only summary of the offer-stage fields plus an Edit button that
// opens the dialog. Rendered under each application whose status is
// offer_received or later. Mirrors FMC's SanctionDetailsPanel.
function OfferDetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium break-words">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

function OfferDetailsPanel({
  entry,
  onEdit,
}: {
  entry: Application;
  onEdit: () => void;
}) {
  const filled = hasAnyOfferDetail(entry);
  const Item = OfferDetailItem;

  const visaLabel = entry.visa_status
    ? VISA_STATUS_LABELS[entry.visa_status]
    : null;

  return (
    <div className="mt-1.5 border-t pt-2 bg-muted/30 -mx-2 -mb-2 px-2 pb-2 rounded-b-md">
      <div className="flex items-center justify-between mb-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <GraduationCap className="h-3.5 w-3.5 text-violet-600" />
          Offer details
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3 mr-1" />
          {filled ? "Edit" : "Add"}
        </Button>
      </div>
      {filled ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
          <Item label="Offer date" value={entry.offer_date} />
          <Item label="Tuition fee" value={entry.tuition_fee} />
          <Item label="Scholarship" value={entry.scholarship_amount} />
          <Item label="Deposit" value={entry.deposit_amount} />
          <Item label="Deposit paid" value={entry.deposit_paid_date} />
          <Item label="CAS number" value={entry.cas_number} />
          <Item label="Visa status" value={visaLabel} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Not filled yet — click Add to enter the offer info.
        </p>
      )}
    </div>
  );
}
