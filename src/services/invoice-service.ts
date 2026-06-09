import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

// ────────────────────────────────────────────────────────────────────────
// Types — field names match the backend's exact JSON shape.
// ────────────────────────────────────────────────────────────────────────

export interface InvoiceSettings {
  legal_name?: string;
  gstin?: string;
  pan?: string;
  state_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  pincode?: string;
  email?: string;
  phone?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  bank_branch?: string;
  invoice_prefix?: string;
  default_tax_rate?: number;
  default_terms?: string;
  logo_url?: string | null;
  signature_url?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  hsn_sac?: string;
  qty: number;
  rate: number;
  // Server returns this on read; create body omits it.
  amount?: number;
}

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string | null;
  financial_year?: string;
  // Customer block — flat columns, not nested.
  customer_name: string;
  customer_gstin?: string | null;
  customer_state_name?: string | null;
  customer_state_code?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  // Tax fields: either cgst+sgst (intra-state) or igst (inter-state).
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_rate?: number;
  total_tax?: number;
  grand_total: number;
  status: InvoiceStatus;
  void_reason?: string | null;
  notes?: string | null;
  lead_id?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  customer_name: string;
  customer_gstin?: string;
  customer_state_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_date: string;
  due_date?: string | null;
  line_items: InvoiceLineItem[];
  notes?: string;
  lead_id?: string;
}

export interface InvoiceListParams {
  page?: number;
  page_size?: number;
  q?: string;
  status?: InvoiceStatus | "";
  financial_year?: string;
  date_from?: string;
  date_to?: string;
}

export interface InvoiceLeadPrefill {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_state_name?: string;
  customer_state_code?: string;
  lead_id: string;
}

// ────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────

export const invoiceService = {
  getSettings: async (): Promise<InvoiceSettings | null> => {
    const { data } = await api.get<InvoiceSettings | null>(
      "/invoices/settings"
    );
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

  list: async (
    params: InvoiceListParams = {}
  ): Promise<PaginatedResponse<Invoice>> => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.page_size ?? 25));
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.financial_year)
      search.set("financial_year", params.financial_year);
    if (params.date_from) search.set("date_from", params.date_from);
    if (params.date_to) search.set("date_to", params.date_to);
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
  // Returns the fresh signed URL (5-min TTL). Caller opens it in a
  // new tab.
  downloadUrl: async (id: string): Promise<string | null> => {
    const { data } = await api.get<{ url?: string }>(
      `/invoices/${id}/download`
    );
    return data?.url ?? null;
  },
  regeneratePdf: async (id: string): Promise<Invoice> => {
    const { data } = await api.post<Invoice>(
      `/invoices/${id}/regenerate-pdf`,
      {}
    );
    return data;
  },
  setStatus: async (
    id: string,
    status: InvoiceStatus,
    voidReason?: string
  ): Promise<Invoice> => {
    const body: Record<string, unknown> = { status };
    if (status === "void") body.void_reason = voidReason ?? "";
    const { data } = await api.patch<Invoice>(
      `/invoices/${id}/status`,
      body
    );
    return data;
  },
  leadPrefill: async (leadId: string): Promise<InvoiceLeadPrefill> => {
    const { data } = await api.get<InvoiceLeadPrefill>(
      `/invoices/prefill/lead/${leadId}`
    );
    return data;
  },
};

// ────────────────────────────────────────────────────────────────────────
// State name <-> code helpers
//
// First two digits of any Indian GSTIN encode the state code. We use
// this to decide intra-state (CGST+SGST) vs inter-state (IGST) on the
// Create page's tax preview without hitting the backend.
// ────────────────────────────────────────────────────────────────────────

export const INDIAN_STATE_CODES: Array<{ code: string; name: string }> = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (before division)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  INDIAN_STATE_CODES.map((s) => [s.name, s.code])
);

// ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$ — backend regex.
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

// First 2 digits of the customer GSTIN — used to decide CGST+SGST
// vs IGST in the tax preview. Returns null if the GSTIN is empty or
// not yet long enough.
export function stateCodeFromGstin(gstin: string | undefined | null): string | null {
  if (!gstin) return null;
  const trimmed = gstin.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 2);
}

// ────────────────────────────────────────────────────────────────────────
// Tax preview helpers — FE display only; backend re-computes on POST.
// ────────────────────────────────────────────────────────────────────────

export interface TaxPreview {
  subtotal: number;
  taxRate: number; // total rate, e.g. 18
  cgst: number; // 0 when inter-state
  sgst: number;
  igst: number;
  grandTotal: number;
  intraState: boolean | null; // null when undetermined (no GSTIN yet)
}

export function computeTaxPreview(
  lineItems: InvoiceLineItem[],
  customerGstin: string | undefined,
  fmcStateCode: string | undefined,
  taxRate: number
): TaxPreview {
  const subtotal = lineItems.reduce(
    (sum, item) =>
      sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0
  );
  const totalTax = subtotal * (taxRate / 100);

  // Intra-state when both state codes are known and equal. If the
  // customer hasn't typed a GSTIN yet we can't decide — show IGST
  // 18% as the default and flag intraState=null.
  let intraState: boolean | null;
  if (!fmcStateCode) intraState = null;
  else if (!customerGstin || customerGstin.trim().length < 2) intraState = null;
  else intraState = stateCodeFromGstin(customerGstin) === fmcStateCode;

  const cgst = intraState ? totalTax / 2 : 0;
  const sgst = intraState ? totalTax / 2 : 0;
  const igst = intraState ? 0 : totalTax;

  return {
    subtotal: round2(subtotal),
    taxRate,
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    grandTotal: round2(subtotal + totalTax),
    intraState,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ────────────────────────────────────────────────────────────────────────
// Display helpers
// ────────────────────────────────────────────────────────────────────────

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
  issued: "Issued",
  paid: "Paid",
  void: "Void",
};

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  issued: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  void: "bg-gray-100 text-gray-500 border-gray-300 line-through",
};
