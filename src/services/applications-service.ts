import api from "@/lib/api";
import type { Application, ApplicationStatus, VisaStatus } from "@/types";

export interface ApplicationCreate {
  university_name: string;
  program?: string | null;
  intake?: string | null;
  country?: string | null;
  application_status?: ApplicationStatus;
  notes?: string | null;
}

export interface ApplicationUpdate {
  application_status?: ApplicationStatus;
  university_name?: string;
  program?: string | null;
  intake?: string | null;
  country?: string | null;
  notes?: string | null;
  // Offer-stage fields — accepted only once application_status is
  // offer_received or later, else backend returns 400.
  offer_date?: string | null;
  tuition_fee?: string | number | null;
  scholarship_amount?: string | number | null;
  deposit_amount?: string | number | null;
  deposit_paid_date?: string | null;
  cas_number?: string | null;
  visa_status?: VisaStatus | null;
}

export const applicationsService = {
  list: async (leadId: string): Promise<Application[]> => {
    const { data } = await api.get<Application[] | { items: Application[] }>(
      `/leads/${leadId}/applications`
    );
    return Array.isArray(data) ? data : (data.items ?? []);
  },
  add: async (
    leadId: string,
    body: ApplicationCreate
  ): Promise<Application> => {
    const { data } = await api.post<Application>(
      `/leads/${leadId}/applications`,
      body
    );
    return data;
  },
  update: async (
    leadId: string,
    entryId: string,
    body: ApplicationUpdate
  ): Promise<Application> => {
    const { data } = await api.patch<Application>(
      `/leads/${leadId}/applications/${entryId}`,
      body
    );
    return data;
  },
  remove: async (leadId: string, entryId: string): Promise<void> => {
    await api.delete(`/leads/${leadId}/applications/${entryId}`);
  },
};
