import api from "@/lib/api";

export interface StartCallRequest {
  lead_id: string;
  agent_id: string;
  phone_number: string;
  lead_name?: string;
}

export interface StartCallResponse {
  call_id: string;
  status: string;
  success: boolean;
  message: string;
}

export interface CallStatus {
  call_id: string;
  status: string;
  duration: number;
  turns: number;
  language: string;
  is_live: boolean;
}

export interface ActiveCall {
  call_id: string;
  lead_id: string;
  duration: number;
  turns: number;
}

/**
 * Normalize a phone number to E.164. Defaults to +91 for 10-digit Indian
 * numbers. Returns the raw string unchanged if it doesn't match a known
 * shape so the backend validator still gets a chance to reject it.
 */
export function toE164(raw: string): string {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  return raw;
}

export async function startCall(
  data: StartCallRequest
): Promise<StartCallResponse> {
  const res = await api.post("/voice/outbound", {
    ...data,
    phone_number: toE164(data.phone_number),
  });
  return res.data;
}

export async function getCallStatus(call_id: string): Promise<CallStatus> {
  const res = await api.get(`/voice/call/${call_id}/status`);
  return res.data;
}

export async function getActiveCalls(): Promise<{
  active_calls: ActiveCall[];
}> {
  const res = await api.get("/voice/active-calls");
  return res.data;
}
