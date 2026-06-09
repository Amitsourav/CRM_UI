"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  invoiceService,
  computeTaxes,
  formatRupees,
  INDIAN_STATES,
  type InvoiceCustomer,
  type InvoiceLineItem,
  type InvoiceSettings,
} from "@/services/invoice-service";

function emptyLineItem(): InvoiceLineItem {
  return { description: "", hsn_sac: "", quantity: 1, rate: 0, tax_rate: 18 };
}

function emptyCustomer(): InvoiceCustomer {
  return { name: "", gstin: "", state: "", email: "", phone: "", address: "" };
}

function CreateInvoiceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("lead_id") || undefined;

  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [customer, setCustomer] = useState<InvoiceCustomer>(emptyCustomer());
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
      .then(setSettings)
      .catch(() => toast.error("Couldn't load FMC settings"))
      .finally(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    if (!leadId) return;
    setPrefillLoading(true);
    invoiceService
      .leadPrefill(leadId)
      .then((p) => {
        if (p?.customer) {
          setCustomer({
            ...emptyCustomer(),
            ...p.customer,
          });
        }
      })
      .catch(() => toast.error("Couldn't prefill from lead"))
      .finally(() => setPrefillLoading(false));
  }, [leadId]);

  const updateLine = (idx: number, patch: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLineItem()]);
  const removeLine = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const taxes = useMemo(
    () => computeTaxes(lineItems, customer.state, settings?.state),
    [lineItems, customer.state, settings?.state]
  );

  const handleSubmit = async () => {
    if (!customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customer.state) {
      toast.error("Customer state is required (decides CGST/SGST vs IGST)");
      return;
    }
    if (lineItems.length === 0 || lineItems.every((l) => !l.description.trim())) {
      toast.error("Add at least one line item");
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanLines = lineItems
        .filter((l) => l.description.trim())
        .map((l) => ({
          description: l.description.trim(),
          hsn_sac: l.hsn_sac?.trim() || undefined,
          quantity: Number(l.quantity) || 0,
          rate: Number(l.rate) || 0,
          tax_rate: l.tax_rate == null ? 18 : Number(l.tax_rate),
        }));
      const created = await invoiceService.create({
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        customer,
        line_items: cleanLines,
        notes: notes.trim() || null,
        lead_id: leadId ?? null,
      });
      toast.success(`Invoice ${created.invoice_no} created`);
      router.push(`/invoices/${created.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader
          title="New Invoice"
          description={
            leadId ? "Prefilled from the linked lead." : "Create a new invoice."
          }
        >
          <Button
            variant="outline"
            onClick={() => router.push("/invoices")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || settingsLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">From</CardTitle>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : settings ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {settings.legal_name ?? "Set legal name in Settings"}
                  </p>
                  {settings.gstin && (
                    <p className="font-mono text-xs">{settings.gstin}</p>
                  )}
                  <p className="text-muted-foreground">
                    {[settings.address_line1, settings.address_line2]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-muted-foreground">
                    {[settings.city, settings.state, settings.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {settings.email && (
                    <p className="text-muted-foreground">{settings.email}</p>
                  )}
                  {settings.phone && (
                    <p className="text-muted-foreground">{settings.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600">
                  Settings not loaded. Open /invoices/settings to configure.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Billed to
                {prefillLoading && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    prefilling…
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Name *</Label>
                <Input
                  id="cust-name"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-gstin">GSTIN</Label>
                  <Input
                    id="cust-gstin"
                    value={customer.gstin ?? ""}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, gstin: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Select
                    value={customer.state}
                    onValueChange={(v) =>
                      setCustomer((c) => ({ ...c, state: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
                    value={customer.email ?? ""}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input
                    id="cust-phone"
                    value={customer.phone ?? ""}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-addr">Address</Label>
                <Textarea
                  id="cust-addr"
                  rows={2}
                  value={customer.address ?? ""}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, address: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" />
              Add row
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium w-[40%]">Description *</th>
                    <th className="px-3 py-2 font-medium">HSN/SAC</th>
                    <th className="px-3 py-2 font-medium w-[80px] text-right">Qty</th>
                    <th className="px-3 py-2 font-medium w-[120px] text-right">Rate</th>
                    <th className="px-3 py-2 font-medium w-[80px] text-right">Tax %</th>
                    <th className="px-3 py-2 font-medium w-[140px] text-right">Amount</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row, idx) => {
                    const qty = Number(row.quantity) || 0;
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
                            value={row.quantity}
                            onChange={(e) =>
                              updateLine(idx, {
                                quantity: Number(e.target.value),
                              })
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
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={row.tax_rate ?? 18}
                            onChange={(e) =>
                              updateLine(idx, {
                                tax_rate: Number(e.target.value),
                              })
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
                  placeholder="Terms, payment instructions, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tax preview
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {taxes.intraState
                    ? "Intra-state — CGST + SGST"
                    : customer.state
                      ? "Inter-state — IGST"
                      : "Pick customer state"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={taxes.subtotal} />
              {taxes.intraState ? (
                <>
                  <Row label="CGST" value={taxes.cgst} />
                  <Row label="SGST" value={taxes.sgst} />
                </>
              ) : (
                <Row label="IGST" value={taxes.igst} />
              )}
              <div className="flex items-center justify-between pt-2 mt-2 border-t font-semibold text-base">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatRupees(taxes.total)}
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

export default function CreateInvoicePage() {
  // Wrap in Suspense because useSearchParams is a CSR hook that
  // suspends in Next.js app router; without it the build trips on
  // the "missing Suspense boundary" rule.
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CreateInvoiceInner />
    </Suspense>
  );
}
