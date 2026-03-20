// Types Supabase correspondant au schéma SQL
// Ces types représentent la structure exacte des tables Supabase

export interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  client: string;
  status: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  workspace_id: string | null;
  folder_id: string | null;
  archived: boolean;
  archived_at: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTask {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string;
  status: string;
  lifecycle_stage: string | null;
  source: string | null;
  family: string | null;
  temperature: string | null;
  value: number;
  probability: number;
  notes: string | null;
  assigned_to: string | null;
  converted_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  first_contact_date: string | null;
  last_activity_date: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEmployee {
  id: string;
  user_id: string | null;
  position: string;
  department: string | null;
  hire_date: string | null;
  salary: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export interface SupabaseDocument {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  folder_path: string;
  project_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseNotification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface SupabaseTaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
}

export interface SupabaseTaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  parent_id: string | null;
  content: string;
  mentions: string[];
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface SupabaseTaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_date: string;
  reminder_type: string;
  days_before: number;
  sent: boolean;
  created_at: string;
}

export interface SupabaseTaskHistory {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SupabaseWorkspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseFolder {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string | null;
  parent_folder_id: string | null;
  color: string;
  icon: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProjectSection {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTimeEntry {
  id: string;
  task_id: string;
  project_id: string | null;
  user_id: string;
  duration: number;
  date: string;
  description: string | null;
  billable: boolean;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  lag_days: number;
  created_at: string;
}

export interface SupabaseCalendar {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseNonWorkingDay {
  id: string;
  calendar_id: string;
  date: string;
  name: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface SupabaseWorkingHours {
  id: string;
  calendar_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  created_at: string;
}

export interface SupabaseMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  status: string;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseRisk {
  id: string;
  project_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  probability: number;
  impact: string;
  status: string;
  mitigation_plan: string | null;
  owner_id: string | null;
  identified_date: string;
  target_resolution_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseIntegration {
  id: string;
  provider: string;
  name: string;
  category: string;
  status: string;
  enabled: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  config: Record<string, any> | null;
  account_id: string | null;
  account_name: string | null;
  account_avatar: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseQuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  total: number;
  position: number;
  created_at: string;
}

export interface SupabaseQuote {
  id: string;
  quote_number: string;
  lead_id: string | null;
  project_id: string | null;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  client_address_line1: string | null;
  client_address_line2: string | null;
  client_postal_code: string | null;
  client_city: string | null;
  client_country: string | null;
  client_company: string | null;
  client_siret: string | null;
  client_siren: string | null;
  client_vat_number: string | null;
  title: string;
  description: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: string;
  valid_until: string | null;
  payment_terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  total: number;
  position: number;
  created_at: string;
}

export interface SupabasePayment {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseInvoice {
  id: string;
  invoice_number: string;
  quote_id: string | null;
  project_id: string | null;
  lead_id: string | null;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  client_address_line1: string | null;
  client_address_line2: string | null;
  client_postal_code: string | null;
  client_city: string | null;
  client_country: string | null;
  client_company: string | null;
  client_siret: string | null;
  client_siren: string | null;
  client_vat_number: string | null;
  title: string;
  description: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  due_date: string | null;
  issued_date: string;
  order_reference: string | null;
  payment_terms: string | null;
  legal_mentions: string | null;
  late_payment_penalties: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  notes: string | null;
  terms: string | null;
  stripe_payment_intent_id: string | null;
  e_invoice_transmitted: boolean | null;
  e_invoice_transmitted_at: string | null;
  e_invoice_platform: string | null;
  e_invoice_hash: string | null;
  e_invoice_timestamp: string | null;
  e_invoice_format: string | null;
  e_invoice_file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSalesGoal {
  id: string;
  user_id: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  target_revenue: number;
  target_leads: number;
  target_conversions: number;
  target_deals: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSalesForecast {
  id: string;
  user_id: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  forecasted_revenue: number;
  forecasted_deals: number;
  confidence_level: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSalesActivity {
  id: string;
  user_id: string;
  lead_id: string;
  activity_type: string;
  subject: string | null;
  description: string | null;
  duration: number | null;
  activity_date: string;
  outcome: string | null;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEmailCampaign {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  email_content: string;
  sender_name: string | null;
  sender_email: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEmailSend {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  bounced: boolean;
  unsubscribed: boolean;
  tracking_pixel_id: string | null;
  created_at: string;
}

export interface SupabaseEmailClick {
  id: string;
  send_id: string;
  link_url: string;
  link_text: string | null;
  clicked_at: string;
  click_position_x: number | null;
  click_position_y: number | null;
  device_type: string | null;
  user_agent: string | null;
}

export interface SupabaseCampaignMetrics {
  id: string;
  campaign_id: string;
  metric_date: string;
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  bounces: number;
  unsubscribes: number;
  conversions: number;
  revenue: number;
  cost: number;
  created_at: string;
}

export interface SupabaseCampaignROI {
  id: string;
  campaign_id: string;
  period_start: string;
  period_end: string;
  total_cost: number;
  total_revenue: number;
  total_conversions: number;
  roi_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClient {
  id: string;
  name: string;
  subdomain: string | null;
  domain: string | null;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  status: string;
  plan: string;
  max_users: number;
  max_projects: number;
  max_storage_gb: number;
  trial_ends_at: string | null;
  billing_email: string | null;
  billing_address: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUserClient {
  id: string;
  user_id: string;
  client_id: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
}

export interface SupabaseUser2FA {
  id: string;
  user_id: string;
  enabled: boolean;
  secret: string | null;
  backup_codes: string[] | null;
  method: string;
  phone_number: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUser2FASession {
  id: string;
  user_id: string;
  session_token: string;
  verified_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SupabaseWebhook {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  active: boolean;
  description: string | null;
  headers: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseWebhookEvent {
  id: string;
  event_type: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface SupabaseWebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: string;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  attempts: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface SupabaseAutomationWorkflow {
  id: string;
  name: string;
  description: string | null;
  scenario_type: string | null;
  status: string;
  workflow_data: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAutomationTrigger {
  id: string;
  workflow_id: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  position: number;
  created_at: string;
}

export interface SupabaseAutomationAction {
  id: string;
  workflow_id: string;
  action_type: string;
  action_config: Record<string, any>;
  position: number;
  parent_action_id: string | null;
  delay_minutes: number;
  created_at: string;
}

export interface SupabaseAutomationExecution {
  id: string;
  workflow_id: string;
  lead_id: string;
  user_id: string | null;
  status: string;
  current_step: number;
  execution_data: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface SupabaseAutomationExecutionLog {
  id: string;
  execution_id: string;
  action_id: string | null;
  trigger_id: string | null;
  log_type: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
}

// =====================================================
// AUTOMATION RULES SUPABASE TYPES
// =====================================================
export interface SupabaseAutomationRule {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scope: string;
  project_id: string | null;
  workspace_id: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[] | null;
  actions: any[];
  execution_count: number;
  last_executed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAutomationRuleExecution {
  id: string;
  rule_id: string;
  task_id: string | null;
  project_id: string | null;
  status: string;
  trigger_data: Record<string, any>;
  execution_result: Record<string, any>;
  error_message: string | null;
  executed_at: string;
}

// =====================================================
// PERMISSIONS SUPABASE TYPES
// =====================================================
export interface SupabasePermission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  resource_type: string;
  action: string;
  created_at: string;
}

export interface SupabaseRolePermission {
  id: string;
  role: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
}

export interface SupabaseResourcePermission {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// NOTIFICATION SUBSCRIPTIONS SUPABASE TYPES
// =====================================================
export interface SupabaseNotificationSubscription {
  id: string;
  user_id: string;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  project_id: string | null;
  enabled: boolean;
  channels: string[];
  created_at: string;
  updated_at: string;
}

// =====================================================
// CHAT CHANNEL UPDATE (add project_id)
// =====================================================
export interface SupabaseChatChannel {
  id: string;
  name: string;
  type: string;
  unread: number;
  status: string | null;
  avatar: string | null;
  last_message: string | null;
  last_time: string | null;
  project_id: string | null; // Added for project conversations
  created_at: string;
  updated_at: string;
}

