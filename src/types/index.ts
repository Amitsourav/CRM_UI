/* ── Enums ── */
export type Role = "admin" | "manager" | "pre_counsellor";

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

// One lender's decision about one file. Shares four words with LeadStage
// (sanctioned / pf_paid / disbursed / lost) and moves independently of it:
// PNB can be `lost` while the lead is still `processing` with Axis.
//
// `docs_reviewed` and `under_review` are no longer offered by
// GET /leads/bank-statuses but remain valid on existing rows, so nothing may
// treat the offered options as the full set.
export type BankStatus =
  | "applied"
  | "docs_reviewed"
  | "under_review"
  | "loan_login"
  | "sanctioned"
  | "pf_paid"
  | "disbursed"
  | "lost";

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
  // Number of leads where this user is the Counsellor or the Pre
  // Counsellor (deduped). Returned by GET /users so admins can sort
  // by who's busiest.
  lead_count?: number;
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
  // Per-tenant serial number stamped by backend. Stable across sort
  // changes and starts at #1 per company.
  serial_no?: number | null;
  lead_source_id?: string;
  lead_source?: LeadSource;
  // Flat human-readable source name on every payload (by-stage,
  // detail, list). Set by backend; prefer over lead_source?.name.
  source_name?: string | null;
  call_attempt_count: number;
  due_date?: string | null;
  connected_time?: string;
  won_time?: string;
  lost_time?: string;
  lost_reason?: string;
  is_important?: boolean;
  // FMC-only: count of times this lead has been moved into the DNP stage.
  dnp_count?: number;
  // FMC-only: number of bank entries in the lead_banks child table.
  bank_count?: number;
  // FMC-only: up to 2 highest-priority bank entries for card rendering.
  // Ordered best-status-first, stable across status changes (tie-break:
  // oldest first). PATCH each via /leads/{leadId}/banks/{entry.id}.
  top_banks?: Array<{ id: string; bank_name: string; bank_status: BankStatus }>;
  // Admitverse-only: university applications. budget stays the editable
  // free-text field; budget_amount/budget_currency are read-only,
  // backend-parsed values for display & sorting. primary_university /
  // application_status / application_count / top_applications summarize the
  // lead's applications for cards & tiles (mirror of FMC's top_banks).
  budget_amount?: number;
  budget_currency?: string;
  primary_university?: string;
  application_status?: ApplicationStatus | string;
  application_count?: number;
  top_applications?: Array<{
    id: string;
    university_name: string;
    program?: string | null;
    application_status: ApplicationStatus;
  }>;
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
  // Most recent remark for the lead — rendered on the Kanban tile.
  latest_note?: {
    body: string;
    author_name: string | null;
    author_role: string;
    created_at: string;
  } | null;
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

export type PfStatus = "paid" | "pending";

// Admitverse-only: university application lifecycle. The status ladder
// mirrors FMC's BankStatus funnel; `rejected`/`withdrawn` are terminal
// off-ramps. Offer-detail fields (offer_date … visa_status) are only
// accepted by the backend once status is `offer_received` or later.
export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "offer_received"
  | "conditional_offer"
  | "unconditional_offer"
  | "deposit_paid"
  | "cas_received"
  | "visa_applied"
  | "visa_approved"
  | "enrolled"
  | "rejected"
  | "withdrawn";

export type VisaStatus = "not_started" | "applied" | "approved" | "rejected";

export interface Application {
  id: string;
  lead_id: string;
  university_name: string;
  program?: string | null;
  intake?: string | null;
  country?: string | null;
  application_status: ApplicationStatus;
  notes?: string | null;
  // Offer-stage fields — backend populates once application_status reaches
  // offer_received / later. PATCH is rejected (400) for earlier statuses.
  // Amounts may serialize as string or number, like BankEntry's money fields.
  offer_date?: string | null; // YYYY-MM-DD
  tuition_fee?: string | number | null;
  scholarship_amount?: string | number | null;
  deposit_amount?: string | number | null;
  deposit_paid_date?: string | null; // YYYY-MM-DD
  cas_number?: string | null;
  visa_status?: VisaStatus | null;
  created_at: string;
  updated_at: string;
}

export interface BankEntry {
  id: string;
  lead_id: string;
  bank_name: string;
  bank_status: BankStatus;
  notes?: string | null;
  // Sanction-stage fields — backend populates once bank_status reaches
  // sanctioned / pf_paid / disbursed. PATCH is rejected when status is
  // applied / docs_reviewed / under_review / loan_login.
  application_id?: string | null;
  sanction_date?: string | null; // YYYY-MM-DD
  loan_amount?: string | number | null; // backend may serialize as either
  roi?: string | number | null;
  tenure_months?: number | null;
  pf_amount?: string | number | null;
  first_tranche_amount?: string | number | null;
  no_of_tranches?: number | null;
  pf_status?: PfStatus | null;
  created_at: string;
  updated_at: string;
}

export interface Remark {
  id: string;
  lead_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
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

/* ── Website Leads (public form submission inbox) ── */

// Submissions from the marketing-site lead forms land in a review inbox
// rather than the pipeline — the forms are public and collect junk. A
// counsellor triages each one: Convert → a real Lead, Spam → dismissed.
// `duplicate` is set by the backend, never by the UI: it means ingest (or
// a rejected convert) matched an already-active lead by email/phone.
export type WebsiteSubmissionStatus =
  | "new"
  | "converted"
  | "duplicate"
  | "spam";

export interface WebsiteSubmission {
  id: string;
  form_key: string;
  form_name: string;
  source: string;
  page?: string | null;
  tag?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  // Everything else the form posted. Forms add fields without a frontend
  // change, so this is rendered generically — never key-by-key.
  payload?: Record<string, unknown> | null;
  external_id?: string | null;
  status: WebsiteSubmissionStatus;
  // Non-null on a `new` row when ingest already matched an existing lead;
  // converting such a row returns 409. Also set once converted.
  lead_id?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface WebsiteLeadCounts {
  new: number;
  converted: number;
  duplicate: number;
  spam: number;
  total: number;
}

export interface WebsiteLeadForm {
  form_key: string;
  form_name: string;
  total: number;
  new: number;
}

/* ── Bank Share Grid (FMC only) ── */

// One lead × one bank. Presence of this object in a row's `shares` map is
// the *only* signal that the file was shared with that bank — a missing key
// is a blank cell. Never infer sharing from `bank_status`.
export interface BankShareSummary {
  /** PATCH target for this lender's status. */
  entry_id?: string | null;
  shared_at: string;
  /** This lender's own figure, in lakhs. Null until it reaches `sanctioned`. */
  loan_amount_lakh?: number | string | null;
  shared_by_name?: string | null;
  // How the share was recorded — "whatsapp" today; the bot is the only writer.
  source?: string | null;
  bank_status?: BankStatus | string | null;
  message_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
}

/**
 * A lender that has actually committed money. Once one exists, it — not the
 * student's asking figure — is the real number for the row.
 */
export interface PfPaidBank {
  bank_name: string;
  /** Already in lakhs; display as-is. */
  loan_amount_lakh: number | string;
}

export interface BankShareGridRow {
  lead_id: string;
  serial_no?: number | null;
  full_name: string;
  phone?: string | null;
  // Null when the lead is unassigned.
  counsellor_name?: string | null;
  current_stage: LeadStage;
  // What the student asked for. Lakhs, as a string ("17.5"); legacy rows may
  // hold free text ("19 L").
  loan_amount?: string | number | null;
  // What a lender committed. Empty for most rows — including leads moved to
  // pf_paid before the bank became mandatory — so `loan_amount` is the
  // fallback, not an error case.
  pf_paid_banks?: PfPaidBank[];
  // Keyed by bank name; keys are a subset of the response's `banks`.
  shares: Record<string, BankShareSummary>;
}

export interface BankShareGridResponse
  extends PaginatedResponse<BankShareGridRow> {
  // Canonical column order from the backend. Render columns from this —
  // a hard-coded list would silently drift from the backend's 18.
  banks: string[];
}

export interface BankShareMessage {
  id: string;
  body: string;
  // Frequently null for the bank's staff — fall back to sender_phone.
  sender_name?: string | null;
  sender_phone?: string | null;
  is_our_team: boolean;
  created_at: string;
}

export interface BankShareThread {
  bank_name: string;
  shared_at: string;
  shared_by_name?: string | null;
  bank_status?: BankStatus | string | null;
  messages: BankShareMessage[];
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

/* ── Commission reconciliation (FMC, admin-only) ── */

/**
 * A lender as the admin screen sees it, from GET /leads/banks/manage.
 * `commission_rate` is a percentage and is null until an admin sets one —
 * a lender without it can't have commission worked out, and marking a file
 * disbursed against it fails.
 */
export interface ManagedBank {
  id: string;
  /**
   * A route, not a bank: "UC Axis" and "Axis Direct (UC Code)" are the same
   * lender at different rates. Always shown in full — shortening it to the
   * bank name merges two different prices.
   */
  name: string;
  /**
   * Null where the route is ambiguous — plain "Axis" could be either of the
   * above, and the backend refuses to guess rather than pick a rate.
   */
  commission_rate?: string | number | null;
  /**
   * A route with sub-products rather than a bank, so it can carry no rate of
   * its own. A file left on one can never earn commission.
   */
  is_aggregator?: boolean;
  /** Files currently on this route. */
  usage_count?: number;
  is_active?: boolean;
}

/**
 * Where a disbursement's commission has got to.
 *   to_bill     — disbursed, never invoiced   (question 1: unbilled)
 *   billed      — invoiced, nothing in yet
 *   short_paid  — they paid less than owed    (question 3: shortfall)
 *   paid        — settled
 *   written_off — given up on, out of the outstanding total
 */
export type ReconciliationStatus =
  | "to_bill"
  | "billed"
  | "short_paid"
  | "paid"
  | "written_off";

/**
 * One disbursement — a tranche of what a lender actually released, which is
 * what commission is earned on. Never the sanctioned figure: a lender can
 * approve ₹30L and release it as two ₹15L tranches, which is two bills.
 *
 * Every amount here is in RUPEES, as sent. Amounts posted back are in lakhs.
 */
export interface DisbursementRow {
  id: string;
  lead_id: string;
  lead_name: string;
  serial_no?: number | null;
  bank_name: string;
  tranche_no: number;
  disbursed_amount: string | number;
  disbursed_on: string;
  commission_rate?: string | number | null;
  /**
   * Off for disbursements that earn nothing. The rate stays visible so the
   * report can still show what it would have been worth.
   */
  earns_commission?: boolean;
  commission_amount?: string | number | null;
  gst_amount?: string | number | null;
  /** Null until invoicing lands, so `to_bill` means "not yet on a bill". */
  invoice_id?: string | null;
  amount_received?: string | number | null;
  tds_deducted?: string | number | null;
  received_on?: string | null;
  shortfall?: string | number | null;
  status: ReconciliationStatus;
  days_outstanding?: number | null;
  utr_reference?: string | null;
  source?: string | null;
  write_off_reason?: string | null;
  notes?: string | null;
}

/** Covers the whole filtered set, not the page — never re-sum the rows. */
export interface ReconciliationTotals {
  count: number;
  disbursed_total: string | number;
  commission_total: string | number;
  gst_total: string | number;
  received_total: string | number;
  tds_total: string | number;
  outstanding_total: string | number;
}

export interface ReconciliationResponse
  extends PaginatedResponse<DisbursementRow> {
  totals: ReconciliationTotals;
}

/** One row per lender — the "who do we chase this month" view. */
export interface LenderSummaryRow {
  bank_name: string;
  files: number;
  disbursed_total: string | number;
  commission_total: string | number;
  gst_total?: string | number;
  received_total: string | number;
  tds_total: string | number;
  /** (commission + gst) − (received + tds) — same formula as /reconciliation. */
  outstanding_total: string | number;
  unbilled_count: number;
  /**
   * The other side of the ledger: a lender can carry sanctioned files and no
   * disbursements at all, which is approved money that hasn't converted.
   */
  sanctioned_files?: number;
  sanctioned_total?: string | number;
  gross_theoretical_revenue?: string | number;
  files_missing_amount?: number;
}

/**
 * What we would earn if every sanction drew down in full, against what has
 * actually been earned. FMC's own vocabulary — gross, net, revenue, drawdown
 * gap — is used verbatim on screen.
 */
export interface TheoreticalRevenue {
  files: number;
  files_counted: number;
  /**
   * Files left out of the sums entirely rather than counted as zero, so every
   * figure here is a floor. Both counts belong on screen with the totals.
   */
  files_missing_amount: number;
  files_missing_rate: number;
  sanctioned_total: string | number;
  gross_theoretical_revenue: string | number;
  /** Percentage, editable — an assumption about the future, not a record. */
  net_theoretical_factor: string | number;
  net_theoretical_revenue: string | number;
  disbursed_total: string | number;
  revenue: string | number;
  drawdown_gap: string | number;
}

export interface ReconciliationSettings {
  net_theoretical_factor: string | number;
}

/* ── Reconciliation dashboard (admin, FMC) ── */

/**
 * The whole book in one call. Every amount is RUPEES and every percentage is
 * already computed — nothing on this surface does arithmetic, because the
 * figures have to match the backend's to the rupee.
 */
export interface DashboardFunnel {
  sanctioned_total: number;
  sanctioned_files: number;
  confirmed_total: number;
  confirmed_files: number;
  disbursed_total: number;
  tranches: number;
  /** Commission + GST. An entitlement, not cash. */
  earned_total: number;
  /** Cash received + TDS withheld — both discharge the debt. */
  collected_total: number;
  outstanding_total: number;
  /** Each step against the one BEFORE it, never against the top. */
  confirmed_pct_of_sanctioned: number;
  disbursed_pct_of_confirmed: number;
  collected_pct_of_earned: number;
}

export interface DashboardPipelineAhead {
  confirmed_files: number;
  sanctioned_total: number;
  drawn_total: number;
  undrawn_total: number;
  /** A floor: files whose lender has no rate are excluded, not zeroed. */
  future_commission: number;
  drawn_pct: number;
  files_missing_rate: number;
}

export interface DashboardMonth {
  month: string;
  tranches: number;
  disbursed: number;
  /** By disbursement month. */
  earned: number;
  /** By receipt month — deliberately a different date from `earned`. */
  collected: number;
}

export interface DashboardLender {
  bank_name: string;
  /** Drives portfolio mix and concentration with no extra call. */
  share_of_disbursed_pct?: number;
  tranches: number;
  disbursed_total: number;
  earned_total: number;
  collected_total: number;
  outstanding_total: number;
  collected_pct: number;
}

export type AgeingBucket = "0_30" | "31_60" | "61_90" | "over_90" | "no_date";

export interface DashboardAgeing {
  buckets: Array<{
    bucket: AgeingBucket;
    tranches: number;
    outstanding: number;
  }>;
  /** Can exceed the funnel's outstanding: this floors each row at zero. */
  total_outstanding: number;
  undateable_outstanding: number;
  undateable_pct: number;
}

export interface DashboardDataQuality {
  tranches: number;
  tranches_without_date: number;
  payments_without_receipt_date: number;
  tranches_with_tds: number;
  tranches_awaiting_payment: number;
  /** Paid but light, mostly by rounding — not the number to headline. */
  tranches_short: number;
  /** Short by over ₹100 and over 2% — the only one worth acting on. */
  tranches_materially_short: number;
  tranches_written_off: number;
  tranches_earning_nothing: number;
  live_files: number;
  files_without_sanctioned_amount: number;
  files_that_cannot_be_priced: number;
  /** Parked on an aggregator, so they can never earn until moved. */
  files_on_aggregator: number;
}

export interface ReconciliationDashboard {
  funnel: DashboardFunnel;
  pipeline_ahead: DashboardPipelineAhead;
  monthly: DashboardMonth[];
  by_lender: DashboardLender[];
  ageing: DashboardAgeing;
  data_quality: DashboardDataQuality;
}

/* ── Loan intelligence: drill-down, pipeline, sources, exceptions ── */

export type DrilldownSegment =
  | "stage"
  | "lender"
  | "ageing_bucket"
  | "source"
  | "funnel_step";

export interface DrilldownItem {
  lead_id: string;
  serial_no?: number | null;
  full_name: string;
  stage: string;
  bank_name?: string | null;
  sanctioned: number;
  disbursed: number;
  earned: number;
  collected: number;
  outstanding: number;
}

/**
 * The panels don't all count the same thing — ageing and by-lender count
 * tranches, the stage funnel counts students — so a drawer showing one count
 * looks like it contradicts the number just clicked. Both are shown.
 */
export interface DrilldownResponse {
  segment: DrilldownSegment;
  value: string;
  /** Students. */
  total: number;
  /** Tranches within the same segment. */
  tranche_total: number;
  page: number;
  page_size: number;
  items: DrilldownItem[];
}

export interface PipelineStageRow {
  stage: string;
  leads: number;
  sanctioned: number;
  disbursed: number;
}

export interface RevenueBridge {
  booked: number;
  /** A floor: files whose lender has no rate are excluded, not zeroed. */
  unlockable: number;
  undrawn_total: number;
  drawn_pct: number;
  files_missing_rate: number;
}

export interface OpportunityRow {
  lead_id: string;
  serial_no?: number | null;
  full_name: string;
  stage: string;
  bank_name?: string | null;
  sanctioned: number;
  disbursed: number;
  pending: number;
  /** The 80% haircut is already applied. Never multiply again. */
  potential_net_revenue: number;
}

export interface PipelineForecast {
  stage_funnel: PipelineStageRow[];
  revenue_bridge: RevenueBridge;
  opportunities: OpportunityRow[];
}

export interface SourceRow {
  source_id?: string | null;
  source_name: string;
  /** Students who actually disbursed, not every lead carrying the source. */
  students: number;
  tranches: number;
  disbursed_total: number;
  commission_total: number;
  collected_total: number;
  revenue_per_student: number;
  collected_pct: number;
  share_of_disbursed_pct: number;
}

export interface SourcesResponse {
  sources: SourceRow[];
  /** Its own field, deliberately unranked — it's the biggest bucket. */
  unattributed: SourceRow;
}

export interface ExceptionRow {
  severity: "high" | "medium" | "low" | string;
  code: string;
  issue: string;
  /** Written for a person to read — belongs in the row, not a tooltip. */
  why: string;
  lead_id: string;
  serial_no?: number | null;
  full_name: string;
  bank_name?: string | null;
  amount?: number | null;
}

export interface ExceptionsResponse {
  total: number;
  by_code: Record<string, number>;
  items: ExceptionRow[];
}
