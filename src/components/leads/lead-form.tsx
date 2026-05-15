"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTaskCountStore } from "@/stores/task-count-store";
import { useStageConfig } from "@/hooks/use-stage-config";
import { DocsChecklist } from "@/components/leads/docs-checklist";
import type { Lead } from "@/types";

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
  onSuccess: (leadId?: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{8,15}$/;

interface FieldErrors {
  full_name?: string;
  email?: string;
  phone?: string;
}

export function LeadForm({ open, onOpenChange, lead, onSuccess }: LeadFormProps) {
  const isEdit = !!lead;
  const refreshTaskCount = useTaskCountStore((s) => s.refresh);
  const { slug } = useStageConfig();
  const isFmc = slug !== "admitverse";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submittedDocs, setSubmittedDocs] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    alternate_phone: "",
    date_of_birth: "",
    gender: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    highest_qualification: "",
    stream: "",
    passing_year: "",
    college_name: "",
    university: "",
    percentage: "",
    target_degree: "",
    target_intake: "",
    preferred_countries: "",
    preferred_universities: "",
    loan_amount: "",
    bank_name: "",
    bank_status: "",
    docs_required: "6",
    docs_submitted: "",
    assigned_agent_id: "",
    pre_counsellor_id: "",
    lead_source_id: "",
    notes: "",
    tags: "",
  });
  const [users, setUsers] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);

  useEffect(() => {
    setErrors({});
    setSubmittedDocs(lead?.submitted_docs ?? []);
    if (lead) {
      setForm({
        full_name: lead.full_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        alternate_phone: lead.alternate_phone || "",
        date_of_birth: lead.date_of_birth || "",
        gender: lead.gender || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "",
        pincode: lead.pincode || "",
        highest_qualification: lead.highest_qualification || "",
        stream: lead.stream || "",
        passing_year: lead.passing_year?.toString() || "",
        college_name: lead.college_name || "",
        university: lead.university || "",
        percentage: lead.percentage?.toString() || "",
        target_degree: lead.target_degree || "",
        target_intake: lead.target_intake || "",
        preferred_countries: lead.preferred_countries?.join(", ") || "",
        preferred_universities: lead.preferred_universities?.join(", ") || "",
        loan_amount: lead.loan_amount || "",
        bank_name: lead.bank_name || "",
        bank_status: lead.bank_status || "",
        docs_required: lead.docs_required?.toString() || "6",
        docs_submitted: lead.docs_submitted?.toString() || "",
        assigned_agent_id: lead.assigned_agent_id || "",
        pre_counsellor_id: lead.pre_counsellor_id || "",
        lead_source_id: lead.lead_source_id || "",
        notes: lead.notes || "",
        tags: lead.tags?.join(", ") || "",
      });
    } else {
      setForm({
        full_name: "", email: "", phone: "", alternate_phone: "",
        date_of_birth: "", gender: "", city: "", state: "", country: "",
        pincode: "", highest_qualification: "", stream: "", passing_year: "",
        college_name: "", university: "", percentage: "", target_degree: "",
        target_intake: "", preferred_countries: "", preferred_universities: "",
        loan_amount: "", bank_name: "", bank_status: "", docs_required: "6",
        docs_submitted: "",
        assigned_agent_id: "", pre_counsellor_id: "", lead_source_id: "",
        notes: "", tags: "",
      });
    }
  }, [lead, open]);

  // Load picker options when the form opens.
  useEffect(() => {
    if (!open) return;
    api
      .get("/users?is_active=true")
      .then(({ data }) => setUsers(data.items || data || []))
      .catch(() => {});
    api
      .get("/leads/sources/list")
      .then(({ data }) =>
        setSources(Array.isArray(data) ? data : data.items || [])
      )
      .catch(() => {});
  }, [open]);

  const validateField = (key: string, value: string): string | undefined => {
    switch (key) {
      case "full_name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return undefined;
      case "email":
        if (value && !EMAIL_REGEX.test(value)) return "Please enter a valid email address";
        return undefined;
      case "phone":
        if (value && !PHONE_REGEX.test(value)) return "Please enter a valid phone number";
        return undefined;
      default:
        return undefined;
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors || key === "full_name" || key === "email" || key === "phone") {
      const fieldError = validateField(key, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (fieldError) {
          next[key as keyof FieldErrors] = fieldError;
        } else {
          delete next[key as keyof FieldErrors];
        }
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {};
    const nameErr = validateField("full_name", form.full_name);
    if (nameErr) newErrors.full_name = nameErr;
    const emailErr = validateField("email", form.email);
    if (emailErr) newErrors.email = emailErr;
    const phoneErr = validateField("phone", form.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }
    const docsRequired = form.docs_required
      ? parseInt(form.docs_required)
      : undefined;
    const docsSubmitted = form.docs_submitted
      ? parseInt(form.docs_submitted)
      : undefined;
    if (
      !isFmc &&
      docsRequired !== undefined &&
      docsSubmitted !== undefined &&
      docsSubmitted > docsRequired
    ) {
      toast.error("Docs submitted can't exceed docs required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        alternate_phone: form.alternate_phone || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        pincode: form.pincode || undefined,
        highest_qualification: form.highest_qualification || undefined,
        stream: form.stream || undefined,
        passing_year: form.passing_year ? parseInt(form.passing_year) : undefined,
        college_name: form.college_name || undefined,
        university: form.university || undefined,
        percentage: form.percentage ? parseFloat(form.percentage) : undefined,
        target_degree: form.target_degree || undefined,
        target_intake: form.target_intake || undefined,
        preferred_countries: form.preferred_countries
          ? form.preferred_countries.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        preferred_universities: form.preferred_universities
          ? form.preferred_universities.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        assigned_agent_id: form.assigned_agent_id || undefined,
        pre_counsellor_id: form.pre_counsellor_id || null,
        lead_source_id: form.lead_source_id || undefined,
        loan_amount: form.loan_amount || undefined,
        bank_name: form.bank_name || undefined,
        bank_status: form.bank_status || undefined,
        docs_required: docsRequired,
        // FMC drives docs_submitted from the checklist via submitted_docs;
        // other brands keep the manual numeric field.
        docs_submitted: isFmc ? undefined : docsSubmitted,
        submitted_docs: isFmc ? submittedDocs : undefined,
        notes: form.notes || undefined,
        tags: form.tags
          ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      if (isEdit) {
        await api.put(`/leads/${lead.id}`, payload);
        toast.success("Lead updated");
        onSuccess();
      } else {
        const { data } = await api.post("/leads", payload);
        toast.success("Lead created");
        onSuccess(data.id);
      }
      refreshTaskCount();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to save lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEdit ? "Edit Lead" : "Create Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Full Name *</Label>
                    <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} required className={errors.full_name ? "border-red-500" : ""} />
                    {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={errors.email ? "border-red-500" : ""} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={errors.phone ? "border-red-500" : ""} />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Alternate Phone</Label>
                    <Input value={form.alternate_phone} onChange={(e) => updateField("alternate_phone", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Location</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pincode</Label>
                    <Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Education */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Education</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Highest Qualification</Label>
                    <Input value={form.highest_qualification} onChange={(e) => updateField("highest_qualification", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Stream</Label>
                    <Input value={form.stream} onChange={(e) => updateField("stream", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Passing Year</Label>
                    <Input type="number" value={form.passing_year} onChange={(e) => updateField("passing_year", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>College Name</Label>
                    <Input value={form.college_name} onChange={(e) => updateField("college_name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>University</Label>
                    <Input value={form.university} onChange={(e) => updateField("university", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Percentage</Label>
                    <Input type="number" step="0.01" value={form.percentage} onChange={(e) => updateField("percentage", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Preferences</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Target Degree</Label>
                    <Input value={form.target_degree} onChange={(e) => updateField("target_degree", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Target Intake</Label>
                    <Input value={form.target_intake} onChange={(e) => updateField("target_intake", e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Preferred Countries (comma-separated)</Label>
                    <Input value={form.preferred_countries} onChange={(e) => updateField("preferred_countries", e.target.value)} placeholder="USA, UK, Canada" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Preferred Universities (comma-separated)</Label>
                    <Input value={form.preferred_universities} onChange={(e) => updateField("preferred_universities", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Assignment & Source */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Assignment</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Counsellor</Label>
                    <Select
                      value={form.assigned_agent_id || "__unset"}
                      onValueChange={(v) =>
                        updateField("assigned_agent_id", v === "__unset" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                            <span className="text-xs text-muted-foreground ml-1 capitalize">
                              ({u.role})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isFmc && (
                    <div className="space-y-1">
                      <Label>Pre Counsellor</Label>
                      <Select
                        value={form.pre_counsellor_id || "__unset"}
                        onValueChange={(v) =>
                          updateField(
                            "pre_counsellor_id",
                            v === "__unset" ? "" : v
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unset">None</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                              <span className="text-xs text-muted-foreground ml-1 capitalize">
                                ({u.role})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className={isFmc ? "col-span-2 space-y-1" : "space-y-1"}>
                    <Label>Source</Label>
                    <SourceCombobox
                      sources={sources}
                      value={form.lead_source_id}
                      onSelect={(id) => updateField("lead_source_id", id)}
                      onCreated={(src) => {
                        setSources((prev) =>
                          prev.find((s) => s.id === src.id)
                            ? prev
                            : [...prev, src]
                        );
                        updateField("lead_source_id", src.id);
                      }}
                      query={sourceQuery}
                      onQueryChange={setSourceQuery}
                      open={sourceOpen}
                      onOpenChange={setSourceOpen}
                      isCreating={creatingSource}
                      setCreating={setCreatingSource}
                    />
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Loan Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isFmc ? "Loan Amount (in Lakhs)" : "Loan Amount"}</Label>
                    <Input
                      inputMode={isFmc ? "decimal" : "text"}
                      value={form.loan_amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isFmc) {
                          // Numeric-only: digits + one optional decimal point.
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            updateField("loan_amount", val);
                          }
                        } else {
                          updateField("loan_amount", val);
                        }
                      }}
                      placeholder={isFmc ? "25" : "25 L / 2.5 cr / 500000"}
                    />
                    {isFmc && (
                      <p className="text-xs text-muted-foreground">
                        Enter in Lakhs. e.g. 25 = 25L, 100 = 1Cr, 300 = 3Cr
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Bank Name</Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => updateField("bank_name", e.target.value)}
                      placeholder="SBI / Axis Bank / PNB"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Bank Status</Label>
                    <Select
                      value={form.bank_status || "__not_set"}
                      onValueChange={(v) =>
                        updateField("bank_status", v === "__not_set" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__not_set">Not Set</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="docs_reviewed">Docs Reviewed</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="loan_login">Loan Login</SelectItem>
                        <SelectItem value="sanctioned">Sanctioned</SelectItem>
                        <SelectItem value="pf_paid">PF Paid</SelectItem>
                        <SelectItem value="disbursed">Disbursed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Docs Required</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.docs_required}
                      onChange={(e) => updateField("docs_required", e.target.value)}
                    />
                  </div>
                  {!isFmc && (
                    <div className="space-y-1">
                      <Label>Docs Submitted</Label>
                      <Input
                        type="number"
                        min={0}
                        max={form.docs_required || undefined}
                        value={form.docs_submitted}
                        onChange={(e) =>
                          updateField("docs_submitted", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
                {isFmc && (
                  <div className="mt-3 space-y-1.5">
                    <Label>Submitted Documents</Label>
                    <DocsChecklist
                      selected={submittedDocs}
                      onToggle={(key) =>
                        setSubmittedDocs((prev) =>
                          prev.includes(key)
                            ? prev.filter((k) => k !== key)
                            : [...prev, key]
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground pt-1">
                      {submittedDocs.length} of {form.docs_required || "—"} submitted
                    </p>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Other</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Tags (comma-separated)</Label>
                    <Input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} placeholder="hot, priority" />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || hasErrors}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SourceLite { id: string; name: string; }

interface SourceComboboxProps {
  sources: SourceLite[];
  value: string;
  onSelect: (id: string) => void;
  onCreated: (src: SourceLite) => void;
  query: string;
  onQueryChange: (q: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isCreating: boolean;
  setCreating: (v: boolean) => void;
}

function SourceCombobox({
  sources,
  value,
  onSelect,
  onCreated,
  query,
  onQueryChange,
  open,
  onOpenChange,
  isCreating,
  setCreating,
}: SourceComboboxProps) {
  const current = sources.find((s) => s.id === value);
  const trimmed = query.trim();
  const exactMatch = trimmed
    ? sources.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
    : null;

  const handleCreate = async () => {
    if (!trimmed || exactMatch || isCreating) return;
    setCreating(true);
    try {
      const { data } = await api.post<SourceLite>("/leads/sources", {
        name: trimmed,
        source_type: "manual",
      });
      onCreated({ id: data.id, name: data.name });
      onQueryChange("");
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to create source");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {current?.name ?? (
            <span className="text-muted-foreground">Pick or type a source…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search or type to create…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed && !exactMatch ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create &quot;{trimmed}&quot;
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">No sources found.</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {sources.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onSelect(s.id);
                    onQueryChange("");
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === s.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {s.name}
                </CommandItem>
              ))}
              {trimmed && !exactMatch && sources.length > 0 && (
                <CommandItem
                  value={`__create_${trimmed}`}
                  onSelect={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create &quot;{trimmed}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
