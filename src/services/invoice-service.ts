import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export interface InvoiceSettings {
  gstin?: string;
  legal_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  phone?: string;
  pan?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  logo_url?: string | null;
  signature_url?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  hsn_sac?: string;
  quantity: number;
  rate: number;
  // Optional; FE defaults to 18% in the preview when missing.
  tax_rate?: number;
  // Server-computed; safe to ignore on create.
  amount?: number;
}

export interface InvoiceCustomer {
  name: string;
  gstin?: string;
  state: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string | null;
  fy?: string;
  customer: InvoiceCustomer;
  line_items: InvoiceLineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: InvoiceStatus;
  notes?: string | null;
  lead_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  invoice_date: string;
  due_date?: string | null;
  customer: InvoiceCustomer;
  line_items: InvoiceLineItem[];
  notes?: string | null;
  lead_id?: string | null;
}

export interface InvoiceListParams {
  page?: number;
  page_size?: number;
  status?: InvoiceStatus | "all";
  fy?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface InvoiceLeadPrefill {
  customer: InvoiceCustomer;
}

// ────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────

export const invoiceService = {
  // Settings ----------------------------------------------------------
  getSettings: async (): Promise<InvoiceSettings> => {
    const { data } = await api.get<InvoiceSettings>("/invoices/settings");
    return data;
  },
  saveSettings: async (body: InvoiceSettings): Promise<InvoiceSettings> => {
    const { data } = await api.put<InvoiceSettings>("/invoices/settings", body);
    return data;
  },
  uploadLogo: async (file: File): Promise<InvoiceSettings> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<InvoiceSettings>(
      "/invoices/settings/logo",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },
  uploadSignature: async (file: File): Promise<InvoiceSettings> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<InvoiceSettings>(
      "/invoices/settings/signature",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  // Invoices ----------------------------------------------------------
  list: async (params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.page_size ?? 20));
    if (params.status && params.status !== "all")
      search.set("status", params.status);
    if (params.fy) search.set("fy", params.fy);
    if (params.date_from) search.set("date_from", params.date_from);
    if (params.date_to) search.set("date_to", params.date_to);
    if (params.search) search.set("q", params.search);
    const { data } = await api.get<PaginatedResponse<Invoice>>(
      `/invoices?${search.toString()}`
    );
    return data;
  },
  get: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },
  create: async (body: InvoiceCreate): Promise<Invoice> => {
    const { data } = await api.post<Invoice>("/invoices", body);
    return data;
  },
  markPaid: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/mark-paid`, {});
    return data;
  },
  voidInvoice: async (id: string, reason?: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(`/invoices/${id}/void`, {
      reason: reason ?? "",
    });
    return data;
  },
  // Backend returns either { url } JSON or a redirect to the signed PDF.
  // Either way, opening the endpoint in a new tab lets the browser
  // follow the redirect / display the JSON if the backend changes.
  download: async (id: string): Promise<void> => {
    try {
      const { data } = await api.get<{ url?: string }>(
        `/invoices/${id}/download`
      );
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        window.open(`/api/v1/invoices/${id}/download`, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(`/api/v1/invoices/${id}/download`, "_blank", "noopener,noreferrer");
    }
  },
  leadPrefill: async (leadId: string): Promise<InvoiceLeadPrefill> => {
    const { data } = await api.get<InvoiceLeadPrefill>(
      `/invoices/prefill/lead/${leadId}`
    );
    return data;
  },
};

// ────────────────────────────────────────────────────────────────────────
// Helpers shared between Create & Detail pages
// ────────────────────────────────────────────────────────────────────────

export const INDIAN_STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export interface TaxBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  intraState: boolean;
}

// FE-side preview only — backend recalculates on POST.
//   intra-state (customer state matches settings state) → CGST + SGST
//   inter-state → IGST
// Defaults to 18% when a line item omits tax_rate.
export function computeTaxes(
  lineItems: InvoiceLineItem[],
  customerState: string,
  fmcState: string | undefined
): TaxBreakdown {
  let subtotal = 0;
  let totalTax = 0;
  for (const item of lineItems) {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxRate =
      item.tax_rate == null || Number.isNaN(Number(item.tax_rate))
        ? 18
        : Number(item.tax_rate);
    const amount = qty * rate;
    subtotal += amount;
    totalTax += amount * (taxRate / 100);
  }
  const sameState =
    !!customerState &&
    !!fmcState &&
    customerState.trim().toLowerCase() === fmcState.trim().toLowerCase();
  const cgst = sameState ? totalTax / 2 : 0;
  const sgst = sameState ? totalTax / 2 : 0;
  const igst = sameState ? 0 : totalTax;
  const total = subtotal + cgst + sgst + igst;
  return {
    subtotal: round2(subtotal),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    total: round2(total),
    intraState: sameState,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatRupees(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return "—";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  void: "bg-red-50 text-red-700 border-red-200",
};
