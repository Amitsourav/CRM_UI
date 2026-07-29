import api from "@/lib/api";
import type {
  Lead,
  PaginatedResponse,
  WebsiteLeadCounts,
  WebsiteLeadForm,
  WebsiteSubmission,
  WebsiteSubmissionStatus,
} from "@/types";

export interface WebsiteLeadListParams {
  // Omitted → backend defaults to "new". Pass "" explicitly for all statuses.
  status?: WebsiteSubmissionStatus | "";
  form_key?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface ConvertSubmissionBody {
  assigned_agent_id?: string;
  pre_counsellor_id?: string;
  lead_source_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

// Backend caps page_size at 100; clamp here so a bad caller gets a working
// request rather than a 422.
const MAX_PAGE_SIZE = 100;

/**
 * A convert that lost the race to an existing lead. The backend returns 409,
 * auto-marks the submission `duplicate`, links it, and puts the winning
 * lead's id in the `detail` string as `lead_id=<uuid>`.
 *
 * This is a normal triage outcome, not a failure — callers render it as
 * "Already in CRM" with a link, never as a red error toast.
 */
export class AlreadyLinkedError extends Error {
  readonly leadId: string | null;
  constructor(leadId: string | null, detail?: string) {
    super(detail || "This person is already a lead");
    this.name = "AlreadyLinkedError";
    this.leadId = leadId;
  }
}

// The 409 detail is a human-readable sentence with the id embedded, e.g.
// "active lead already exists lead_id=8f14...". Pull the UUID back out.
const LEAD_ID_RE =
  /lead_id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function extractLeadId(detail: unknown): string | null {
  if (typeof detail !== "string") return null;
  return detail.match(LEAD_ID_RE)?.[1] ?? null;
}

function errorDetail(error: unknown): string | undefined {
  const err = error as { response?: { data?: { detail?: unknown } } };
  const detail = err.response?.data?.detail;
  return typeof detail === "string" ? detail : undefined;
}

function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } }).response?.status;
}

export const websiteLeadsService = {
  list: async (
    params: WebsiteLeadListParams = {}
  ): Promise<PaginatedResponse<WebsiteSubmission>> => {
    const search = new URLSearchParams();
    // status is sent even when empty — "" is the documented "all" value and
    // omitting it would silently fall back to "new".
    if (params.status !== undefined) search.set("status", params.status);
    if (params.form_key) search.set("form_key", params.form_key);
    if (params.q) search.set("q", params.q);
    search.set("page", String(params.page ?? 1));
    search.set(
      "page_size",
      String(Math.min(params.page_size ?? 25, MAX_PAGE_SIZE))
    );

    const { data } = await api.get<PaginatedResponse<WebsiteSubmission>>(
      `/website-leads?${search.toString()}`
    );
    return data;
  },

  counts: async (): Promise<WebsiteLeadCounts> => {
    const { data } = await api.get<WebsiteLeadCounts>("/website-leads/count");
    return data;
  },

  forms: async (): Promise<WebsiteLeadForm[]> => {
    const { data } = await api.get<WebsiteLeadForm[] | { items: WebsiteLeadForm[] }>(
      "/website-leads/forms"
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  },

  get: async (id: string): Promise<WebsiteSubmission> => {
    const { data } = await api.get<WebsiteSubmission>(`/website-leads/${id}`);
    return data;
  },

  /**
   * Creates a real Lead from the submission. Throws {@link AlreadyLinkedError}
   * on 409 so the caller can branch on the outcome instead of parsing strings.
   */
  convert: async (
    id: string,
    body: ConvertSubmissionBody = {}
  ): Promise<Lead> => {
    try {
      const { data } = await api.post<Lead>(
        `/website-leads/${id}/convert`,
        body
      );
      return data;
    } catch (error: unknown) {
      if (errorStatus(error) === 409) {
        const detail = errorDetail(error);
        throw new AlreadyLinkedError(extractLeadId(detail), detail);
      }
      throw error;
    }
  },

  spam: async (id: string): Promise<WebsiteSubmission> => {
    const { data } = await api.post<WebsiteSubmission>(
      `/website-leads/${id}/spam`
    );
    return data;
  },

  // Undoes spam/duplicate — puts the row back in the New tab for triage.
  reopen: async (id: string): Promise<WebsiteSubmission> => {
    const { data } = await api.post<WebsiteSubmission>(
      `/website-leads/${id}/reopen`
    );
    return data;
  },
};
