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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTaskCountStore } from "@/stores/task-count-store";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
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
    notes: "",
    tags: "",
  });

  useEffect(() => {
    setErrors({});
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
        notes: "", tags: "",
      });
    }
  }, [lead, open]);

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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Create Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] pr-4">
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
          </ScrollArea>
          <DialogFooter className="mt-4">
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
