"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/shared/admin-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CheckCircle, Download, Loader2, XCircle } from "lucide-react";
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

  useEffect(() => {
    invoiceService
      .get(id)
      .then(setInvoice)
      .catch(() => {
        toast.error("Invoice not found");
        router.push("/invoices");
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await invoiceService.markPaid(invoice.id);
      setInvoice(updated);
      toast.success("Invoice marked paid");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't mark paid");
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await invoiceService.voidInvoice(invoice.id);
      setInvoice(updated);
      toast.success("Invoice voided");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't void invoice");
    } finally {
      setBusy(false);
      setVoidOpen(false);
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

  const canMarkPaid = invoice.status === "draft" || invoice.status === "sent";
  const canVoid = invoice.status !== "void";

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                Invoice {invoice.invoice_no}
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
              {invoice.fy ? ` · FY ${invoice.fy}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void invoiceService.download(invoice.id)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {canMarkPaid && (
              <Button onClick={handleMarkPaid} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Paid
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
              <p className="font-medium">{invoice.customer?.name}</p>
              {invoice.customer?.gstin && (
                <p className="font-mono text-xs">{invoice.customer.gstin}</p>
              )}
              <p className="text-muted-foreground">
                {invoice.customer?.state}
              </p>
              {invoice.customer?.address && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {invoice.customer.address}
                </p>
              )}
              {invoice.customer?.email && (
                <p className="text-muted-foreground">
                  {invoice.customer.email}
                </p>
              )}
              {invoice.customer?.phone && (
                <p className="text-muted-foreground">
                  {invoice.customer.phone}
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
              {invoice.cgst > 0 && (
                <SummaryRow label="CGST" value={invoice.cgst} />
              )}
              {invoice.sgst > 0 && (
                <SummaryRow label="SGST" value={invoice.sgst} />
              )}
              {invoice.igst > 0 && (
                <SummaryRow label="IGST" value={invoice.igst} />
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatRupees(invoice.total)}
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
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.hsn_sac ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatRupees(item.rate)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatRupees(
                          item.amount ?? item.quantity * item.rate
                        )}
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

      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void this invoice?"
        description="Voiding is irreversible. The invoice will remain in the audit log but can no longer be edited, paid, or used."
        confirmLabel="Void"
        destructive
        onConfirm={handleVoid}
      />
    </AdminGuard>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatRupees(value)}</span>
    </div>
  );
}
