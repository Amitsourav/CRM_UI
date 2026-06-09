"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, Settings } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  invoiceService,
  formatRupees,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
  type Invoice,
  type InvoiceStatus,
} from "@/services/invoice-service";

const FY_OPTIONS = ["2026-27", "2025-26", "2024-25"];

export default function InvoicesListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [financialYear, setFinancialYear] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await invoiceService.list({
        page,
        page_size: 25,
        q: query || undefined,
        status: status === "all" ? "" : status,
        financial_year:
          financialYear === "all" ? undefined : financialYear,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setInvoices(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, [page, status, financialYear, dateFrom, dateTo, query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const url = await invoiceService.downloadUrl(id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Download URL not available");
      }
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoice_no",
      header: "Invoice #",
      cell: (inv) => (
        <Link
          href={`/invoices/${inv.id}`}
          className="font-medium text-primary hover:underline tabular-nums"
        >
          {inv.invoice_no}
        </Link>
      ),
    },
    {
      key: "invoice_date",
      header: "Date",
      sortable: true,
      sortValue: (inv) => inv.invoice_date,
      cell: (inv) =>
        inv.invoice_date
          ? format(new Date(inv.invoice_date), "d MMM yyyy")
          : "—",
    },
    {
      key: "customer",
      header: "Customer",
      cell: (inv) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{inv.customer_name}</p>
          {inv.customer_gstin && (
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums truncate">
              {inv.customer_gstin}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "grand_total",
      header: "Total",
      sortable: true,
      sortValue: (inv) => inv.grand_total ?? 0,
      cell: (inv) => (
        <span className="font-semibold tabular-nums">
          {formatRupees(inv.grand_total)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => (
        <Badge
          variant="outline"
          className={cn("text-xs", INVOICE_STATUS_BADGE[inv.status])}
        >
          {INVOICE_STATUS_LABELS[inv.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (inv) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={downloadingId === inv.id}
          onClick={(e) => {
            e.stopPropagation();
            void handleDownload(inv.id);
          }}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Download
        </Button>
      ),
    },
  ];

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          description={`${total.toLocaleString()} invoice${total === 1 ? "" : "s"}`}
        >
          <Button
            variant="outline"
            onClick={() => router.push("/invoices/settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={() => router.push("/invoices/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </PageHeader>

        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            placeholder="Search invoice #, customer, GSTIN…"
            onSearch={(q) => {
              setQuery(q);
              setPage(1);
            }}
            className="w-72"
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as InvoiceStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {INVOICE_STATUS_LABELS[s]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Financial year</Label>
            <Select
              value={financialYear}
              onValueChange={(v) => {
                setFinancialYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FYs</SelectItem>
                {FY_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>
                    FY {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-[160px]"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          emptyTitle="No invoices yet"
          emptyDescription="Create your first invoice to get started."
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </AdminGuard>
  );
}
