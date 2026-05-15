/* ── Enums ── */
export type Role = "admin" | "manager" | "telecaller";

export type LeadStage =
  // FMC legacy (pre-2026-05 pipeline; kept for historical stage_log entries)
  | "lead"
  | "called"
  | "qualified_lead"
  | "won"
  // Shared
  | "connected"
  | "lost"
  | "created"
  | "contacted"
  | "qualified"
  | "processing"
  | "opportunity"
  // FMC pipeline (12 stages)
  | "dnp"
  | "docs_pending"
  | "logged_in"
  | "sanctioned"
  | "pf_paid"
  | "disbursed"
  // Admitverse pipeline
  | "dnp_pre_qualified"
  | "dnp_post_qualified"
  | "important"
  | "partial_docs_collected"
  | "docs_collected"
  | "application_done"
  | "conditional_draft"
  | "ucol"
  | "deposit_paid"
  | "cas_received"
  | "visa_applied"
  | "enrolled";

export type CallDisposition =
  | "dnp"
  | "connected"
  | "busy"
  | "switched_off"
  | "wrong_number"
  | "callback";

export type TaskType =
  | "follow_up"
  | "call"
  | "meeting"
  | "document_collection"
  | "application"
  | "other";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export type NotificationType =
  | "lead_assigned"
  | "task_created"
  | "task_overdue"
  | "dnp_warning"
  | "dnp_auto_lost"
  | "stage_changed"
  | "csv_import_complete"
  | "general";

export type SourceType = "csv" | "meta_ads" | "manual" | "whatsapp";

export type CSVImportStatus =
  | "uploaded"
  | "previewing"
  | "processing"
  | "completed"
  | "failed";

export type BankStatus =
  | "applied"
  | "docs_reviewed"
  | "under_review"
  | "loan_login"
  | "sanctioned"
  | "pf_paid"
  | "disbursed";

/* ── Models ── */
export interface User {
  id: string;
  company_id?: string;
  email: string;
  full_name: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  vertical?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  highest_qualification?: string;
  stream?: string;
  passing_year?: number;
  college_name?: string;
  university?: string;
  percentage?: number;
  target_degree?: string;
  target_intake?: string;
  preferred_countries?: string[];
  preferred_universities?: string[];
  budget?: string;
  current_stage: LeadStage;
  assigned_agent_id?: string;
  assigned_agent?: User;
  // FMC second-line owner ("Pre Counsellor") — Admitverse doesn't use it.
  pre_counsellor_id?: string | null;
  pre_counsellor_name?: string;
  lead_source_id?: string;
  lead_source?: LeadSource;
  call_attempt_count: number;
  due_date?: string;
  connected_time?: string;
  won_time?: string;
  lost_time?: string;
  lost_reason?: string;
  is_important?: boolean;
  // Loan/bank fields (FMC). Optional — Admitverse leads don't populate them.
  loan_amount?: string;
  bank_name?: string | null;
  bank_status?: BankStatus | null;
  docs_required?: number;
  docs_submitted?: number;
  submitted_docs?: string[];
  // Card-shape extras returned by the by-stage endpoint.
  assigned_agent_name?: string;
  assigned_agent_role?: Role;
  task_count?: number;
  call_count?: number;
  notes_count?: number;
  has_active_ai_campaign?: boolean;
  custom_fields?: Record<string, unknown>;
  tags?: string[];
  notes?: string;
  last_call_provider?: string;
  last_call_recording_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  company_id?: string;
  lead_id?: string;
  lead?: Lead;
  assigned_to: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  task_type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date: string;
  completed_at?: string;
  completion_notes?: string;
  stage_log_id?: string;
  created_at: string;
  updated_at: string;
}

export type CallStatus = "pending" | "initiated" | "ringing" | "connected" | "ended" | "failed" | "no_answer";
export type CallSentiment = "positive" | "neutral" | "negative";
export type CallType = "ai" | "live";

export interface CallAttempt {
  id: string;
  lead_id: string;
  company_id: string;
  call_type: CallType;
  call_status: CallStatus;
  ai_agent_id?: string;
  telecaller_id?: string;
  agent_id: string;
  bolna_call_id?: string;
  attempt_number: number;
  disposition?: string;
  conversation_notes?: string;
  agent_agenda?: string;
  transcript?: string;
  summary?: string;
  sentiment?: CallSentiment;
  sentiment_score?: number;
  cost?: number;
  call_duration_seconds?: number;
  call_recording_url?: string;
  call_provider?: string;
  external_call_id?: string;
  due_date_for_next?: string;
  started_at?: string;
  ended_at?: string;
  connected_at?: string;
  duration?: number;
  provider_call_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CallAttemptWithLead extends CallAttempt {
  lead_name?: string;
  lead_phone?: string;
  agent_name?: string;
}

export interface CallStats {
  total_calls: number;
  connected_calls: number;
  failed_calls: number;
  no_answer_calls: number;
  avg_duration_seconds: number;
  total_cost: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  calls_by_type: {
    ai: number;
    live: number;
  };
  calls_by_day: Array<{
    date: string;
    count: number;
  }>;
}

export interface CallFilters {
  search?: string;
  telecaller_id?: string;
  call_status?: string;
  call_type?: string;
  sentiment?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface LeadStageLog {
  id: string;
  company_id?: string;
  lead_id: string;
  from_stage?: LeadStage;
  to_stage: LeadStage;
  changed_by: string;
  changed_by_user?: User;
  conversation_notes?: string;
  agent_agenda?: string;
  lost_reason?: string;
  due_date_set?: string;
  created_at: string;
}

export interface LeadSource {
  id: string;
  company_id?: string;
  name: string;
  source_type: SourceType;
  meta_form_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  company_id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  lead_id?: string;
  task_id?: string;
  created_at: string;
}

export interface CSVImport {
  id: string;
  company_id?: string;
  uploaded_by: string;
  file_name: string;
  status: CSVImportStatus;
  total_rows: number;
  success_count: number;
  failure_count: number;
  duplicate_count: number;
  error_details: Array<{ row: number; error: string }>;
  column_mapping: Record<string, string>;
  raw_headers: string[];
  lead_source_id?: string;
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPricing {
  total_usd: number;
  total_inr: number;
  monthly_1000_mins_inr: number;
  savings_vs_bolna_pct: number;
  breakdown: {
    stt_usd: number;
    tts_usd: number;
    llm_usd: number;
    telephony_usd: number;
    platform_usd: number;
  };
  breakdown_pct: {
    stt: number;
    tts: number;
    llm: number;
    telephony: number;
    platform: number;
  };
  dual_tts_enabled?: boolean;
}

export interface ProviderOption {
  value: string;
  label: string;
}

export interface ProviderOptions {
  stt_providers: ProviderOption[];
  stt_models?: Record<string, ProviderOption[]>;
  tts_providers: ProviderOption[];
  tts_models?: Record<string, ProviderOption[]>;
  tts_genders?: ProviderOption[];
  llm_providers: ProviderOption[];
  llm_models: ProviderOption[];
  voices: Record<string, Record<string, ProviderOption[]>>;
  languages: ProviderOption[];
  secondary_languages: ProviderOption[];
  language_styles: ProviderOption[];
  roles: ProviderOption[];
  tones: ProviderOption[];
  ambient_noise_options: ProviderOption[];
  telephony_providers: ProviderOption[];
  tts_providers_english?: ProviderOption[];
  tts_voices_english?: Record<string, ProviderOption[]>;
  tts_providers_hindi?: ProviderOption[];
  tts_voices_hindi?: Record<string, ProviderOption[]>;
}

export interface AIAgent {
  id: string;
  company_id: string;
  created_by?: string;

  name: string;
  role: string;
  tone: string;
  is_default: boolean;
  is_active: boolean;

  system_prompt: string;
  welcome_message: string;
  final_message_en: string;
  final_message_hi: string;
  silence_message_en: string;
  silence_message_hi: string;

  llm_provider: string;
  llm_model: string;
  llm_temperature: number;
  llm_max_tokens: number;

  stt_provider: string;
  stt_model: string;
  stt_keywords?: string;

  tts_provider: string;
  tts_model: string;
  tts_voice: string;
  tts_gender: string;
  tts_speed: number;
  tts_buffer_size: number;
  tts_stability: number;
  tts_similarity_boost: number;

  tts_provider_english?: string | null;
  tts_model_english?: string | null;
  tts_voice_english?: string | null;
  tts_provider_hindi?: string | null;
  tts_model_hindi?: string | null;
  tts_voice_hindi?: string | null;

  primary_language: string;
  secondary_language: string;
  auto_language_switch: boolean;
  language_style: string;

  endpointing_ms: number;
  linear_delay_ms: number;
  words_before_interrupt: number;
  max_response_words: number;
  precise_transcript: boolean;

  telephony_provider: string;
  phone_number?: string;
  call_timeout_seconds: number;
  hangup_on_silence_seconds: number;
  call_start_time: string;
  call_end_time: string;
  restrict_call_hours: boolean;
  voicemail_detection: boolean;

  noise_cancellation: boolean;
  noise_cancellation_level: number;
  ambient_noise: string;
  silence_detection_seconds: number;

  webhook_url?: string;

  created_at: string;
  updated_at: string;

  pricing?: AgentPricing;
}

/* ── API Shapes ── */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
}

export interface CSVPreview {
  import_id: string;
  file_name: string;
  raw_headers: string[];
  suggested_mapping: Record<string, string>;
  preview_rows: Record<string, string>[];
}

export interface DashboardReport {
  total_leads: number;
  new_leads_today: number;
  leads_by_stage: Record<string, number>;
  total_agents: number;
  active_agents: number;
  tasks_pending: number;
  tasks_overdue: number;
  tasks_completed_today: number;
  conversion_rate: number;
}

export interface PipelineReport {
  stages: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export interface AgentReport {
  agent_id: string;
  agent_name: string;
  total_leads: number;
  won: number;
  lost: number;
  total_calls: number;
  tasks_completed: number;
  tasks_overdue: number;
}

export interface SourceReport {
  source_id: string;
  source_name: string;
  total_leads: number;
  won: number;
  lost: number;
  conversion_rate: number;
}

export interface TrendDataPoint {
  date: string;
  leads: number;
  calls: number;
  conversions: number;
}

export interface UserStats {
  total_leads: number;
  leads_by_stage: Partial<Record<LeadStage, number>>;
  total_calls: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
}
