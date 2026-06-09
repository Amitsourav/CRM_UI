"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
  Plus,
  Search,
  Trash2,
  X as IconX,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import api from "@/lib/api";
import { formatLeadSerial } from "@/lib/utils";
import {
  invoiceService,
  computeTaxPreview,
  formatRupees,
  INDIAN_STATE_CODES,
  STATE_NAME_TO_CODE,
  isValidGstin,
  type InvoiceLineItem,
  type InvoiceSettings,
} from "@/services/invoice-service";
import type { Lead } from "@/types";

interface CustomerForm {
  customer_name: string;
  customer_gstin: string;
  customer_state_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
}

function emptyCustomer(): CustomerForm {
  return {
    customer_name: "",
    customer_gstin: "",
    customer_state_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
  };
}

function emptyLineItem(): InvoiceLineItem {
  return { description: "", hsn_sac: "", qty: 1, rate: 0 };
}

function CreateInvoiceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLeadIdFromUrl = searchParams.get("lead_id") || undefined;
  // The lead this invoice is linked to. Either preset from the URL
  // (lead-detail → Create Invoice flow) or chosen via the picker
  // below. Sent verbatim as lead_id in the POST body.
  const [linkedLeadId, setLinkedLeadId] = useState<string | undefined>(
    initialLeadIdFromUrl
  );
  // Light view of the linked lead used by the chip. Filled either
  // from the picker (search result) or from the prefill response on
  // the URL flow.
  const [linkedLeadDetails, setLinkedLeadDetails] =
    useState<LinkedLeadDetails | null>(null);
  // Plain-text "paste a UUID" fallback for admins who already have a
  // lead id handy and don't want to use the search picker. Only used
  // when the search picker hasn't linked a lead.
  const [manualLeadId, setManualLeadId] = useState("");

  const [settings, setSettings] = useState<InvoiceSettings | null | undefined>(
    undefined
  ); // undefined = loading, null = backend returned null (not configured)
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer());
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    emptyLineItem(),
  ]);
  const [invoiceDate, setInvoiceDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  useEffect(() => {
    invoiceService
      .getSettings()
      .then((data) => setSettings(data ?? null))
      .catch(() => {
        toast.error("Couldn't load settings");
        setSettings(null);
      });
  }, []);

  // Runs whenever a lead is linked (from URL or via picker) so the
  // customer block stays in sync with /invoices/prefill/lead/{id}.
  useEffect(() => {
    if (!linkedLeadId) return;
    setPrefillLoading(true);
    invoiceService
      .leadPrefill(linkedLeadId)
      .then((p) => {
        setCustomer({
          customer_name: p.customer_name ?? "",
          customer_gstin: "",
          customer_state_name: p.customer_state_name ?? "",
          customer_email: p.customer_email ?? "",
          customer_phone: p.customer_phone ?? "",
          customer_address: p.customer_address ?? "",
        });
        // Seed chip details when the picker didn't populate them
        // (i.e. when the URL drove the link). Phone/serial come back
        // only from the search-result Lead object, so the URL-flow
        // chip just shows name.
        if (!linkedLeadDetails) {
          setLinkedLeadDetails({
            id: linkedLeadId,
            full_name: p.customer_name ?? "Linked lead",
            phone: p.customer_phone ?? null,
            serial_no: null,
          });
        }
      })
      .catch(() => toast.error("Couldn't prefill from lead"))
      .finally(() => setPrefillLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedLeadId]);

  const updateCust = (p: Partial<CustomerForm>) =>
    setCustomer((c) => ({ ...c, ...p }));

  const updateLine = (idx: number, p: Partial<InvoiceLineItem>) =>
    setLineItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...p } : row))
    );

  const addLine = () => setLineItems((prev) => [...prev, emptyLineItem()]);
  const removeLine = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  // FMC state code derived from settings.state_name so the preview
  // matches whatever the admin configured in /invoices/settings.
  const fmcStateCode = useMemo(() => {
    if (!settings?.state_name) return undefined;
    return STATE_NAME_TO_CODE[settings.state_name];
  }, [settings]);

  const taxRate = settings?.default_tax_rate ?? 18;

  const preview = useMemo(
    () =>
      computeTaxPreview(
        lineItems,
        customer.customer_gstin,
        fmcStateCode,
        taxRate
      ),
    [lineItems, customer.customer_gstin, fmcStateCode, taxRate]
  );

  const handleSubmit = async () => {
    if (!customer.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customer.customer_state_name) {
      toast.error("Customer state is required");
      return;
    }
    if (
      customer.customer_gstin.trim() &&
      !isValidGstin(customer.customer_gstin)
    ) {
      toast.error("Customer GSTIN format is invalid");
      return;
    }
    const cleanLines = lineItems
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        hsn_sac: l.hsn_sac?.trim() || undefined,
        qty: Number(l.qty) || 0,
        rate: Number(l.rate) || 0,
      }));
    if (cleanLines.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await invoiceService.create({
        customer_name: customer.customer_name.trim(),
        customer_gstin:
          customer.customer_gstin.trim().toUpperCase() || undefined,
        customer_state_name: customer.customer_state_name,
        customer_email: customer.customer_email.trim() || undefined,
        customer_phone: customer.customer_phone.trim() || undefined,
        customer_address: customer.customer_address.trim() || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        line_items: cleanLines,
        notes: notes.trim() || undefined,
        // Picker wins over the manual paste-a-UUID input. Either one
        // unset → omit lead_id entirely.
        lead_id: linkedLeadId || manualLeadId.trim() || undefined,
      });
      toast.success(`Invoice ${created.invoice_no} created`);
      router.push(`/invoices/${created.id}`);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── loading and settings-not-configured states ────────────────────
  if (settings === undefined) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  if (settings === null) {
    return (
      <AdminGuard>
        <div className="max-w-xl mx-auto py-10">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-lg font-semibold">Settings not configured</h2>
              <p className="text-sm text-muted-foreground">
                You need to set up FMC's billing info before creating an
                invoice — legal name, GSTIN, state, address, and bank details
                all show up on every PDF.
              </p>
              <Button asChild>
                <Link href="/invoices/settings">Open Invoice Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminGuard>
    );
  }

  // ─── normal create flow ────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader
          title="Create Invoice"
          description={
            linkedLeadId
              ? "Prefilled from the linked lead."
              : "Issue a new invoice."
          }
        >
          <Button
            variant="outline"
            onClick={() => router.push("/invoices")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">From (FMC)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{settings.legal_name}</p>
              <p className="font-mono text-xs">GSTIN {settings.gstin}</p>
              {settings.pan && (
                <p className="font-mono text-xs">PAN {settings.pan}</p>
              )}
              <p className="text-muted-foreground">
                {[settings.address_line1, settings.address_line2]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-muted-foreground">
                {[settings.city, settings.state_name, settings.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {settings.email && (
                <p className="text-muted-foreground">{settings.email}</p>
              )}
              {settings.phone && (
                <p className="text-muted-foreground">{settings.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bill to
                {prefillLoading && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    prefilling…
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Customer name *</Label>
                <Input
                  id="cust-name"
                  value={customer.customer_name}
                  onChange={(e) => updateCust({ customer_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-gstin">GSTIN</Label>
                  <Input
                    id="cust-gstin"
                    value={customer.customer_gstin}
                    onChange={(e) =>
                      updateCust({
                        customer_gstin: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={15}
                    className="font-mono tracking-wider"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Select
                    value={customer.customer_state_name}
                    onValueChange={(v) =>
                      updateCust({ customer_state_name: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATE_CODES.map((s) => (
                        <SelectItem key={s.code} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-email">Email</Label>
                  <Input
                    id="cust-email"
                    type="email"
                    value={customer.customer_email}
                    onChange={(e) =>
                      updateCust({ customer_email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input
                    id="cust-phone"
                    value={customer.customer_phone}
                    onChange={(e) =>
                      updateCust({ customer_phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-addr">Address</Label>
                <Textarea
                  id="cust-addr"
                  rows={2}
                  value={customer.customer_address}
                  onChange={(e) =>
                    updateCust({ customer_address: e.target.value })
                  }
                />
              </div>
              <div className="border-t pt-3 space-y-1.5">
                <Label>Linked lead (optional)</Label>
                <LeadPicker
                  linkedLeadId={linkedLeadId}
                  linkedLeadDetails={linkedLeadDetails}
                  // The lead-detail "Create Invoice" flow preselects
                  // via ?lead_id=. In that case the chip is read-only —
                  // admins can't accidentally unlink and end up with a
                  // detached invoice.
                  readOnly={Boolean(initialLeadIdFromUrl)}
                  onPick={(lead) => {
                    setLinkedLeadId(lead.id);
                    setLinkedLeadDetails(lead);
                  }}
                  onClear={() => {
                    setLinkedLeadId(undefined);
                    setLinkedLeadDetails(null);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Line items</CardTitle>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" />
                Add row
              </Button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-[160px_1fr] sm:items-center">
              <Label htmlFor="lead-id" className="text-xs">
                Lead ID (optional)
              </Label>
              <Input
                id="lead-id"
                value={linkedLeadId ?? manualLeadId}
                onChange={(e) => setManualLeadId(e.target.value)}
                placeholder="Paste a lead UUID to link this invoice"
                disabled={Boolean(linkedLeadId)}
                className="font-mono text-xs"
              />
              <span className="hidden sm:block" />
              <p className="text-[11px] text-muted-foreground">
                {linkedLeadId
                  ? "Linked via the search picker above. Unlink there to edit."
                  : "Or use the search picker in the Bill to card. Backend rejects with a 400 if the UUID doesn't belong to this tenant."}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium w-[45%]">Description *</th>
                    <th className="px-3 py-2 font-medium">
                      HSN/SAC
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </th>
                    <th className="px-3 py-2 font-medium w-[80px] text-right">Qty</th>
                    <th className="px-3 py-2 font-medium w-[140px] text-right">Rate</th>
                    <th className="px-3 py-2 font-medium w-[150px] text-right">Amount</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row, idx) => {
                    const qty = Number(row.qty) || 0;
                    const rate = Number(row.rate) || 0;
                    const amount = qty * rate;
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.description}
                            onChange={(e) =>
                              updateLine(idx, { description: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.hsn_sac ?? ""}
                            maxLength={10}
                            onChange={(e) =>
                              updateLine(idx, { hsn_sac: e.target.value })
                            }
                            className="font-mono text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            value={row.qty}
                            onChange={(e) =>
                              updateLine(idx, { qty: Number(e.target.value) })
                            }
                            className="text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.rate}
                            onChange={(e) =>
                              updateLine(idx, { rate: Number(e.target.value) })
                            }
                            className="text-right tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatRupees(amount)}
                        </td>
                        <td className="px-1 py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={lineItems.length === 1}
                            onClick={() => removeLine(idx)}
                            className="h-8 w-8"
                            aria-label="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2" colSpan={4}>
                      <span className="text-sm font-medium">Subtotal</span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatRupees(preview.subtotal)}
                    </td>
                    <td className="px-2 py-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-date">Invoice date *</Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due-date">Due date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Per-invoice context, e.g. Q1 2026 commission"
                />
                <p className="text-[11px] text-muted-foreground">
                  Default terms from Settings are applied separately by the
                  backend — leave Notes empty unless this invoice needs its
                  own context.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tax preview
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {preview.intraState === true
                    ? `Intra-state — CGST ${preview.taxRate / 2}% + SGST ${preview.taxRate / 2}%`
                    : preview.intraState === false
                      ? `Inter-state — IGST ${preview.taxRate}%`
                      : `IGST ${preview.taxRate}% (enter GSTIN to confirm split)`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={preview.subtotal} />
              {preview.intraState === true ? (
                <>
                  <Row label={`CGST ${preview.taxRate / 2}%`} value={preview.cgst} />
                  <Row label={`SGST ${preview.taxRate / 2}%`} value={preview.sgst} />
                </>
              ) : (
                <Row label={`IGST ${preview.taxRate}%`} value={preview.igst} />
              )}
              <div className="flex items-center justify-between pt-2 mt-2 border-t font-semibold text-base">
                <span>Grand total</span>
                <span className="tabular-nums">
                  {formatRupees(preview.grandTotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Preview only — backend recomputes on submit.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatRupees(value)}</span>
    </div>
  );
}

// Minimal slice of a Lead used by the chip — name + serial + phone.
interface LinkedLeadDetails {
  id: string;
  full_name: string;
  phone?: string | null;
  serial_no?: number | null;
}

// Lead picker for the Create Invoice form. When the admin types in
// the search box, hits GET /leads?q=... and lists matches. Picking a
// lead lifts the selection up so the parent can call
// /invoices/prefill/lead/{id} and stamp lead_id on the POST body.
//
// readOnly is true when the link came from the URL (?lead_id=, used
// by the lead-detail → Create Invoice flow). In that mode the chip
// renders without an X so admins can't accidentally detach.
function LeadPicker({
  linkedLeadId,
  linkedLeadDetails,
  readOnly,
  onPick,
  onClear,
}: {
  linkedLeadId: string | undefined;
  linkedLeadDetails: LinkedLeadDetails | null;
  readOnly?: boolean;
  onPick: (lead: LinkedLeadDetails) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/leads?q=${encodeURIComponent(q)}&page=1&page_size=20`
        );
        if (cancelled) return;
        const items: Lead[] = Array.isArray(data) ? data : data?.items ?? [];
        setResults(items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  if (linkedLeadId) {
    const d = linkedLeadDetails;
    const serial = d ? formatLeadSerial(d.serial_no) : null;
    return (
      <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs max-w-full">
        {serial && (
          <span className="font-mono text-muted-foreground tabular-nums shrink-0">
            {serial}
          </span>
        )}
        <span className="font-medium truncate">
          {d?.full_name ?? "Linked lead"}
        </span>
        {d?.phone && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground tabular-nums truncate">
              📞 {d.phone}
            </span>
          </>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={onClear}
            className="-mr-1 p-0.5 rounded hover:bg-muted shrink-0"
            aria-label="Unlink lead"
          >
            <IconX className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Search className="mr-1 h-3.5 w-3.5" />
          Search lead by name / phone / email…
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, phone, email…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim().length < 2 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : searching ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Searching…
              </p>
            ) : results.length === 0 ? (
              <CommandEmpty>No leads found.</CommandEmpty>
            ) : (
              results.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={lead.id}
                  onSelect={() => {
                    onPick({
                      id: lead.id,
                      full_name: lead.full_name,
                      phone: lead.phone ?? null,
                      serial_no: lead.serial_no ?? null,
                    });
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.full_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {lead.phone || lead.email || "No contact"}
                      </p>
                    </div>
                    {formatLeadSerial(lead.serial_no) && (
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {formatLeadSerial(lead.serial_no)}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CreateInvoiceInner />
    </Suspense>
  );
}
