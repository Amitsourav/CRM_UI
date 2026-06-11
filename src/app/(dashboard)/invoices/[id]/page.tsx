"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/shared/admin-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  invoiceService,
  formatRupees,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  type Invoice,
} from "@/services/invoice-service";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    invoiceService
      .get(id)
      .then(setInvoice)
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        if (e.response?.status === 404) toast.error("Invoice not found");
        else toast.error("Couldn't load invoice");
        router.push("/invoices");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleDownload = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const url = await invoiceService.downloadUrl(invoice.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Download URL not available");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await invoiceService.regeneratePdf(invoice.id);
      setInvoice(updated);
      toast.success("PDF regenerated");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Couldn't regenerate PDF");
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await invoiceService.setStatus(invoice.id, "paid");
      setInvoice(updated);
      toast.success("Marked paid");
    } catch (error: unknown) {
      const e = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (e.response?.status === 403) {
        toast.error("You don't have permission");
      } else {
        toast.error(e.response?.data?.detail || "Couldn't mark paid");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVoidConfirm = async () => {
    if (!invoice) return;
    if (!voidReason.trim()) {
      toast.error("Please add a void reason");
      return;
    }
    setBusy(true);
    try {
      const updated = await invoiceService.setStatus(
        invoice.id,
        "void",
        voidReason.trim()
      );
      setInvoice(updated);
      setVoidOpen(false);
      setVoidReason("");
      toast.success("Invoice voided");
    } catch (error: unknown) {
      const e = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (e.response?.status === 403) {
        toast.error("You don't have permission");
      } else {
        toast.error(e.response?.data?.detail || "Couldn't void invoice");
      }
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <AdminGuard>
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminGuard>
    );
  }

  const canMarkPaid = invoice.status === "issued";
  const canVoid = invoice.status !== "void";

  const cgst = invoice.cgst_amount ?? 0;
  const sgst = invoice.sgst_amount ?? 0;
  const igst = invoice.igst_amount ?? 0;
  const intraState = cgst > 0 || sgst > 0;

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tabular-nums">
                {invoice.invoice_no}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  INVOICE_STATUS_BADGE[invoice.status]
                )}
              >
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.invoice_date
                ? format(new Date(invoice.invoice_date), "d MMM yyyy")
                : ""}
              {invoice.financial_year ? ` · FY ${invoice.financial_year}` : ""}
              {invoice.due_date
                ? ` · Due ${format(new Date(invoice.due_date), "d MMM yyyy")}`
                : ""}
            </p>
            {invoice.status === "void" && invoice.void_reason && (
              <p className="text-xs text-red-700">
                Voided: {invoice.void_reason}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={handleRegenerate}
              title="Use after updating logo or signature"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate PDF
            </Button>
            {canMarkPaid && (
              <Button onClick={handleMarkPaid} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </Button>
            )}
            {canVoid && (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() => setVoidOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Void
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billed to</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_gstin && (
                <p className="font-mono text-xs">
                  GSTIN {invoice.customer_gstin}
                </p>
              )}
              {invoice.customer_state_name && (
                <p className="text-muted-foreground">
                  {invoice.customer_state_name}
                  {invoice.customer_state_code
                    ? ` (${invoice.customer_state_code})`
                    : ""}
                </p>
              )}
              {invoice.customer_address && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {invoice.customer_address}
                </p>
              )}
              {invoice.customer_email && (
                <p className="text-muted-foreground">
                  {invoice.customer_email}
                </p>
              )}
              {invoice.customer_phone && (
                <p className="text-muted-foreground">
                  {invoice.customer_phone}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryRow label="Subtotal" value={invoice.subtotal} />
              {intraState ? (
                <>
                  <SummaryRow label="CGST" value={cgst} />
                  <SummaryRow label="SGST" value={sgst} />
                </>
              ) : (
                <SummaryRow label="IGST" value={igst} />
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t font-semibold">
                <span>Grand total</span>
                <span className="tabular-nums">
                  {formatRupees(invoice.grand_total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Lead ID</th>
                    <th className="px-3 py-2 font-medium">HSN/SAC</th>
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Rate</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.line_items ?? []).map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-xs">
                        {renderLeadCell(item)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.hsn_sac ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.qty}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatRupees(item.rate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatRupees(item.amount ?? item.qty * item.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={voidOpen} onOpenChange={(o) => !busy && setVoidOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>
              Voiding is irreversible. The invoice remains in the audit log
              but can no longer be edited, paid, or used.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason *</Label>
            <Textarea
              id="void-reason"
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Why is this invoice being voided?"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy || !voidReason.trim()}
              onClick={handleVoidConfirm}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Void invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}

// Per-row Lead ID renderer — backend's hybrid resolver populates
// lead_serial_no + lead_name when the entry resolves to a real lead.
// Falls through to a raw display for free-text entries and numeric
// strings that didn't resolve.
function renderLeadCell(line: Invoice["line_items"][number]): ReactNode {
  if (line.lead_serial_no != null && line.lead_name) {
    return (
      <span>
        <span className="font-mono tabular-nums">#{line.lead_serial_no}</span>
        <span className="text-muted-foreground"> · </span>
        <span>{line.lead_name}</span>
      </span>
    );
  }
  if (line.lead_serial_no != null) {
    return (
      <span className="font-mono tabular-nums">#{line.lead_serial_no}</span>
    );
  }
  if (line.lead_id) {
    if (/^\d+$/.test(line.lead_id)) {
      return (
        <span className="font-mono tabular-nums">#{line.lead_id}</span>
      );
    }
    return <span className="font-mono break-all">{line.lead_id}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatRupees(value)}</span>
    </div>
  );
}
