/* ── Enums ── */
export type Role = "admin" | "agent";

export type LeadStage =
  | "lead"
  | "called"
  | "connected"
  | "qualified_lead"
  | "won"
  | "lost";

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

/* ── Models ── */
export interface User {
  id: string;
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
  current_stage: LeadStage;
  assigned_agent_id?: string;
  assigned_agent?: User;
  lead_source_id?: string;
  lead_source?: LeadSource;
  call_attempt_count: number;
  due_date?: string;
  connected_time?: string;
  won_time?: string;
  lost_time?: string;
  lost_reason?: string;
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

export interface CallAttempt {
  id: string;
  lead_id: string;
  agent_id: string;
  agent?: User;
  attempt_number: number;
  disposition: CallDisposition;
  conversation_notes: string;
  agent_agenda: string;
  due_date_for_next?: string;
  call_provider?: string;
  call_recording_url?: string;
  external_call_id?: string;
  call_duration_seconds?: number;
  created_at: string;
}

export interface LeadStageLog {
  id: string;
  lead_id: string;
  from_stage?: LeadStage;
  to_stage: LeadStage;
  changed_by: string;
  changed_by_user?: User;
  conversation_notes?: string;
  agent_agenda?: string;
  due_date_set?: string;
  created_at: string;
}

export interface LeadSource {
  id: string;
  name: string;
  source_type: SourceType;
  meta_form_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
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
  leads_by_stage: Record<LeadStage, number>;
  total_calls: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
}
