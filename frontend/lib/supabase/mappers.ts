// Fonctions de mapping entre les types TypeScript de l'app et les types Supabase
import { Task, Lead, User, Employee, AgencyEvent, Document, Notification, Priority, ProjectStatus, Quote, QuoteItem, Invoice, InvoiceItem, Payment, AutomationWorkflow, AutomationTrigger, AutomationAction, AutomationExecution, AutomationExecutionLog, AutomationRule, AutomationRuleExecution, Permission, RolePermission, ResourcePermission, NotificationSubscription, ChatChannel, Role, ResourceType } from '../../types';
import { getUserAvatar } from '../utils/avatar';
import { 
  SupabaseTask, 
  SupabaseLead, 
  SupabaseUser, 
  SupabaseEmployee, 
  SupabaseEvent, 
  SupabaseDocument, 
  SupabaseNotification,
  SupabaseQuote,
  SupabaseQuoteItem,
  SupabaseInvoice,
  SupabaseInvoiceItem,
  SupabasePayment,
  SupabaseAutomationWorkflow,
  SupabaseAutomationTrigger,
  SupabaseAutomationAction,
  SupabaseAutomationExecution,
  SupabaseAutomationExecutionLog,
  SupabaseAutomationRule,
  SupabaseAutomationRuleExecution,
  SupabasePermission,
  SupabaseRolePermission,
  SupabaseResourcePermission,
  SupabaseNotificationSubscription,
  SupabaseChatChannel
} from './types';

// Mapping Task
export const mapSupabaseTaskToTask = (st: SupabaseTask): Task => {
  return {
    id: st.id,
    title: st.title,
    client: '', // À récupérer depuis project si project_id existe
    department: 'R&D & Tech', // Par défaut, à adapter selon votre logique
    status: st.status as ProjectStatus,
    priority: st.priority as Priority,
    assignee: st.assigned_to || '',
    dueDate: st.due_date || '',
    startDate: null,
    description: st.description || undefined,
    tags: [],
    estimatedTime: undefined,
    subTasks: [],
  };
};

export const mapTaskToSupabaseTask = (task: Partial<Task>): Partial<SupabaseTask> => {
  return {
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    assigned_to: task.assignee || null,
    due_date: task.dueDate || null,
  };
};

// Mapping Lead
export const mapSupabaseLeadToLead = (sl: SupabaseLead): Lead & { notes?: string } => {
  return {
    id: sl.id,
    name: sl.name,
    company: sl.company,
    value: sl.value || 0,
    stage: sl.status as Lead['stage'],
    lastContact: new Date(sl.updated_at).toLocaleDateString('fr-FR'),
    probability: sl.probability || 50,
    email: sl.email || undefined,
    phone: sl.phone || undefined,
    source: (sl.source as Lead['source']) || undefined,
    lifecycleStage: (sl.lifecycle_stage as Lead['lifecycleStage']) || undefined,
    family: (sl.family as Lead['family']) || undefined,
    temperature: (sl.temperature as Lead['temperature']) || undefined,
    notes: sl.notes || undefined,
    latitude: sl.latitude || undefined,
    longitude: sl.longitude || undefined,
    geocodedAddress: sl.geocoded_address || undefined,
  };
};

export const mapLeadToSupabaseLead = (lead: Partial<Lead>): Partial<SupabaseLead> => {
  return {
    name: lead.name,
    email: lead.email || null,
    phone: lead.phone || null,
    company: lead.company,
    status: lead.stage,
    source: lead.source || null,
    family: lead.family || null,
    temperature: lead.temperature || null,
    lifecycle_stage: lead.lifecycleStage || null,
    value: lead.value || null,
    probability: lead.probability || null,
    latitude: lead.latitude || null,
    longitude: lead.longitude || null,
    geocoded_address: lead.geocodedAddress || null,
  };
};

// Mapping User
export const mapSupabaseUserToUser = (su: SupabaseUser): User => {
  return {
    id: su.id,
    name: su.name,
    email: su.email,
    role: su.role as User['role'],
    avatar: su.avatar_url || getUserAvatar(su.email, su.id),
    status: 'Actif',
    lastActive: 'À l\'instant',
  };
};

// Mapping Employee
export const mapSupabaseEmployeeToEmployee = (se: SupabaseEmployee, user?: SupabaseUser): Employee => {
  return {
    id: se.id,
    name: user?.name || 'Utilisateur inconnu',
    position: se.position,
    department: (se.department as Employee['department']) || 'R&D & Tech',
    email: user?.email || '',
    phone: '',
    avatar: user?.avatar_url || getUserAvatar(user?.email, se.id),
    status: se.status as Employee['status'],
    joinDate: se.hire_date || '',
    ptoBalance: 0,
  };
};

// Mapping Event
export const mapSupabaseEventToAgencyEvent = (se: SupabaseEvent): AgencyEvent => {
  return {
    id: se.id,
    name: se.title,
    client: '', // À récupérer depuis une relation si nécessaire
    date: se.start_time.split('T')[0],
    venue: se.location || '',
    guests: 0,
    budget: 0,
    status: 'Planification',
    image: undefined,
  };
};

// Mapping Document
export const mapSupabaseDocumentToDocument = (sd: SupabaseDocument): Document => {
  const fileType = sd.file_type?.toLowerCase() || 'doc';
  let type: Document['type'] = 'doc';
  
  if (fileType.includes('image')) type = 'image';
  else if (fileType.includes('video')) type = 'video';
  else if (fileType.includes('pdf')) type = 'pdf';
  else if (fileType.includes('sheet') || fileType.includes('excel')) type = 'sheet';
  else if (fileType.includes('presentation') || fileType.includes('powerpoint')) type = 'slide';
  
  return {
    id: sd.id,
    title: sd.name,
    type,
    lastModified: new Date(sd.updated_at).toLocaleDateString('fr-FR'),
    author: 'Utilisateur', // À récupérer depuis uploaded_by
    size: sd.file_size ? `${(sd.file_size / 1024 / 1024).toFixed(2)} MB` : undefined,
    folderId: sd.folder_path !== '/' ? sd.folder_path : undefined,
  };
};

// Mapping Notification
export const mapSupabaseNotificationToNotification = (sn: SupabaseNotification): Notification => {
  const now = new Date();
  const createdAt = new Date(sn.created_at);
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  let time = '';
  if (diffMins < 1) time = 'À l\'instant';
  else if (diffMins < 60) time = `il y a ${diffMins}m`;
  else if (diffHours < 24) time = `il y a ${diffHours}h`;
  else time = createdAt.toLocaleDateString('fr-FR');
  
  return {
    id: sn.id,
    title: sn.title,
    message: sn.message || '',
    time,
    read: sn.read,
    type: sn.type as Notification['type'],
  };
};

// Mapping Quote
export const mapSupabaseQuoteItemToQuoteItem = (sq: SupabaseQuoteItem): QuoteItem => {
  return {
    id: sq.id,
    quoteId: sq.quote_id,
    description: sq.description,
    quantity: sq.quantity,
    unitPrice: sq.unit_price,
    taxRate: sq.tax_rate || undefined,
    total: sq.total,
    position: sq.position,
    createdAt: sq.created_at,
  };
};

export const mapSupabaseQuoteToQuote = (sq: SupabaseQuote, items?: SupabaseQuoteItem[]): Quote => {
  return {
    id: sq.id,
    quoteNumber: sq.quote_number,
    leadId: sq.lead_id || undefined,
    projectId: sq.project_id || undefined,
    clientName: sq.client_name,
    clientEmail: sq.client_email || undefined,
    clientAddress: sq.client_address || undefined,
    clientAddressLine1: sq.client_address_line1 || undefined,
    clientAddressLine2: sq.client_address_line2 || undefined,
    clientPostalCode: sq.client_postal_code || undefined,
    clientCity: sq.client_city || undefined,
    clientCountry: sq.client_country || undefined,
    clientCompany: sq.client_company || undefined,
    clientSiret: sq.client_siret || undefined,
    clientSiren: sq.client_siren || undefined,
    clientVatNumber: sq.client_vat_number || undefined,
    title: sq.title,
    description: sq.description || undefined,
    subtotal: sq.subtotal,
    taxRate: sq.tax_rate,
    taxAmount: sq.tax_amount,
    total: sq.total,
    currency: sq.currency,
    status: sq.status as Quote['status'],
    validUntil: sq.valid_until || undefined,
    paymentTerms: sq.payment_terms || undefined,
    sentAt: sq.sent_at || undefined,
    viewedAt: sq.viewed_at || undefined,
    acceptedAt: sq.accepted_at || undefined,
    notes: sq.notes || undefined,
    terms: sq.terms || undefined,
    items: items?.map(mapSupabaseQuoteItemToQuoteItem),
    createdBy: sq.created_by || undefined,
    createdAt: sq.created_at,
    updatedAt: sq.updated_at,
  };
};

// Mapping Invoice
export const mapSupabaseInvoiceItemToInvoiceItem = (si: SupabaseInvoiceItem): InvoiceItem => {
  return {
    id: si.id,
    invoiceId: si.invoice_id,
    description: si.description,
    quantity: si.quantity,
    unitPrice: si.unit_price,
    taxRate: si.tax_rate || undefined,
    total: si.total,
    position: si.position,
    createdAt: si.created_at,
  };
};

export const mapSupabasePaymentToPayment = (sp: SupabasePayment): Payment => {
  return {
    id: sp.id,
    invoiceId: sp.invoice_id,
    amount: sp.amount,
    currency: sp.currency,
    paymentMethod: sp.payment_method as Payment['paymentMethod'],
    status: sp.status as Payment['status'],
    stripePaymentIntentId: sp.stripe_payment_intent_id || undefined,
    stripeChargeId: sp.stripe_charge_id || undefined,
    reference: sp.reference || undefined,
    notes: sp.notes || undefined,
    paidAt: sp.paid_at || undefined,
    createdBy: sp.created_by || undefined,
    createdAt: sp.created_at,
    updatedAt: sp.updated_at,
  };
};

export const mapSupabaseInvoiceToInvoice = (si: SupabaseInvoice, items?: SupabaseInvoiceItem[], payments?: SupabasePayment[]): Invoice => {
  return {
    id: si.id,
    invoiceNumber: si.invoice_number,
    quoteId: si.quote_id || undefined,
    projectId: si.project_id || undefined,
    leadId: si.lead_id || undefined,
    clientName: si.client_name,
    clientEmail: si.client_email || undefined,
    clientAddress: si.client_address || undefined,
    clientAddressLine1: si.client_address_line1 || undefined,
    clientAddressLine2: si.client_address_line2 || undefined,
    clientPostalCode: si.client_postal_code || undefined,
    clientCity: si.client_city || undefined,
    clientCountry: si.client_country || undefined,
    clientCompany: si.client_company || undefined,
    clientSiret: si.client_siret || undefined,
    clientSiren: si.client_siren || undefined,
    clientVatNumber: si.client_vat_number || undefined,
    title: si.title,
    description: si.description || undefined,
    subtotal: si.subtotal,
    taxRate: si.tax_rate,
    taxAmount: si.tax_amount,
    total: si.total,
    amountPaid: si.amount_paid,
    amountDue: si.amount_due,
    currency: si.currency,
    status: si.status as Invoice['status'],
    dueDate: si.due_date || undefined,
    issuedDate: si.issued_date,
    orderReference: si.order_reference || undefined,
    paymentTerms: si.payment_terms || undefined,
    legalMentions: si.legal_mentions || undefined,
    latePaymentPenalties: si.late_payment_penalties || undefined,
    sentAt: si.sent_at || undefined,
    viewedAt: si.viewed_at || undefined,
    paidAt: si.paid_at || undefined,
    notes: si.notes || undefined,
    terms: si.terms || undefined,
    stripePaymentIntentId: si.stripe_payment_intent_id || undefined,
    eInvoiceTransmitted: si.e_invoice_transmitted || undefined,
    eInvoiceTransmittedAt: si.e_invoice_transmitted_at || undefined,
    eInvoicePlatform: si.e_invoice_platform || undefined,
    eInvoiceHash: si.e_invoice_hash || undefined,
    eInvoiceTimestamp: si.e_invoice_timestamp || undefined,
    eInvoiceFormat: si.e_invoice_format || undefined,
    eInvoiceFileUrl: si.e_invoice_file_url || undefined,
    items: items?.map(mapSupabaseInvoiceItemToInvoiceItem),
    payments: payments?.map(mapSupabasePaymentToPayment),
    createdBy: si.created_by || undefined,
    createdAt: si.created_at,
    updatedAt: si.updated_at,
  };
};

// Mapping Automation Workflow
export const mapSupabaseAutomationWorkflowToAutomationWorkflow = (
  sw: SupabaseAutomationWorkflow,
  triggers?: SupabaseAutomationTrigger[],
  actions?: SupabaseAutomationAction[]
): AutomationWorkflow => {
  return {
    id: sw.id,
    name: sw.name,
    description: sw.description || undefined,
    scenarioType: sw.scenario_type as AutomationWorkflow['scenarioType'] || undefined,
    status: sw.status as AutomationWorkflow['status'],
    workflowData: sw.workflow_data as AutomationWorkflow['workflowData'],
    createdBy: sw.created_by || undefined,
    createdAt: sw.created_at,
    updatedAt: sw.updated_at,
    triggers: triggers?.map(mapSupabaseAutomationTriggerToAutomationTrigger),
    actions: actions?.map(mapSupabaseAutomationActionToAutomationAction),
  };
};

export const mapAutomationWorkflowToSupabaseAutomationWorkflow = (
  workflow: Partial<AutomationWorkflow>
): Partial<SupabaseAutomationWorkflow> => {
  return {
    name: workflow.name,
    description: workflow.description || null,
    scenario_type: workflow.scenarioType || null,
    status: workflow.status,
    workflow_data: workflow.workflowData || {},
    created_by: workflow.createdBy || null,
  };
};

// Mapping Automation Trigger
export const mapSupabaseAutomationTriggerToAutomationTrigger = (st: SupabaseAutomationTrigger): AutomationTrigger => {
  return {
    id: st.id,
    workflowId: st.workflow_id,
    triggerType: st.trigger_type as AutomationTrigger['triggerType'],
    triggerConfig: st.trigger_config,
    position: st.position,
    createdAt: st.created_at,
  };
};

// Mapping Automation Action
export const mapSupabaseAutomationActionToAutomationAction = (sa: SupabaseAutomationAction): AutomationAction => {
  return {
    id: sa.id,
    workflowId: sa.workflow_id,
    actionType: sa.action_type as AutomationAction['actionType'],
    actionConfig: sa.action_config,
    position: sa.position,
    parentActionId: sa.parent_action_id || undefined,
    delayMinutes: sa.delay_minutes,
    createdAt: sa.created_at,
  };
};

// Mapping Automation Execution
export const mapSupabaseAutomationExecutionToAutomationExecution = (
  se: SupabaseAutomationExecution,
  logs?: SupabaseAutomationExecutionLog[]
): AutomationExecution => {
  return {
    id: se.id,
    workflowId: se.workflow_id,
    leadId: se.lead_id,
    userId: se.user_id || undefined,
    status: se.status as AutomationExecution['status'],
    currentStep: se.current_step,
    executionData: se.execution_data,
    startedAt: se.started_at,
    completedAt: se.completed_at || undefined,
    errorMessage: se.error_message || undefined,
    logs: logs?.map(log => ({
      id: log.id,
      executionId: log.execution_id,
      actionId: log.action_id || undefined,
      triggerId: log.trigger_id || undefined,
      logType: log.log_type as AutomationExecutionLog['logType'],
      message: log.message,
      data: log.data,
      createdAt: log.created_at,
    })),
  };
};

// =====================================================
// AUTOMATION RULES MAPPERS
// =====================================================
export const mapSupabaseAutomationRuleToAutomationRule = (sr: SupabaseAutomationRule): AutomationRule => {
  return {
    id: sr.id,
    name: sr.name,
    description: sr.description || undefined,
    status: sr.status as AutomationRule['status'],
    scope: sr.scope as AutomationRule['scope'],
    projectId: sr.project_id || undefined,
    workspaceId: sr.workspace_id || undefined,
    triggerType: sr.trigger_type as AutomationRule['triggerType'],
    triggerConfig: sr.trigger_config,
    conditions: sr.conditions || [],
    actions: sr.actions,
    executionCount: sr.execution_count,
    lastExecutedAt: sr.last_executed_at || undefined,
    createdBy: sr.created_by || undefined,
    createdAt: sr.created_at,
    updatedAt: sr.updated_at,
  };
};

export const mapAutomationRuleToSupabaseAutomationRule = (
  rule: Partial<AutomationRule>
): Partial<SupabaseAutomationRule> => {
  return {
    name: rule.name,
    description: rule.description || null,
    status: rule.status,
    scope: rule.scope,
    project_id: rule.projectId || null,
    workspace_id: rule.workspaceId || null,
    trigger_type: rule.triggerType,
    trigger_config: rule.triggerConfig || {},
    conditions: rule.conditions || null,
    actions: rule.actions || [],
    created_by: rule.createdBy || null,
  };
};

export const mapSupabaseAutomationRuleExecutionToAutomationRuleExecution = (
  se: SupabaseAutomationRuleExecution
): AutomationRuleExecution => {
  return {
    id: se.id,
    ruleId: se.rule_id,
    taskId: se.task_id || undefined,
    projectId: se.project_id || undefined,
    status: se.status as AutomationRuleExecution['status'],
    triggerData: se.trigger_data,
    executionResult: se.execution_result,
    errorMessage: se.error_message || undefined,
    executedAt: se.executed_at,
  };
};

// =====================================================
// PERMISSIONS MAPPERS
// =====================================================
export const mapSupabasePermissionToPermission = (sp: SupabasePermission): Permission => {
  return {
    id: sp.id,
    name: sp.name,
    description: sp.description || undefined,
    category: sp.category as Permission['category'],
    resourceType: sp.resource_type,
    action: sp.action as Permission['action'],
    createdAt: sp.created_at,
  };
};

export const mapSupabaseRolePermissionToRolePermission = (srp: SupabaseRolePermission): RolePermission => {
  return {
    id: srp.id,
    role: srp.role as RolePermission['role'],
    permissionId: srp.permission_id,
    granted: srp.granted,
    createdAt: srp.created_at,
  };
};

export const mapSupabaseResourcePermissionToResourcePermission = (
  srp: SupabaseResourcePermission
): ResourcePermission => {
  return {
    id: srp.id,
    userId: srp.user_id,
    resourceType: srp.resource_type as ResourcePermission['resourceType'],
    resourceId: srp.resource_id,
    permissionId: srp.permission_id,
    granted: srp.granted,
    grantedBy: srp.granted_by || undefined,
    createdAt: srp.created_at,
    updatedAt: srp.updated_at,
  };
};

export const mapResourcePermissionToSupabaseResourcePermission = (
  permission: Partial<ResourcePermission>
): Partial<SupabaseResourcePermission> => {
  return {
    user_id: permission.userId,
    resource_type: permission.resourceType,
    resource_id: permission.resourceId,
    permission_id: permission.permissionId,
    granted: permission.granted,
    granted_by: permission.grantedBy || null,
  };
};

// =====================================================
// NOTIFICATION SUBSCRIPTIONS MAPPERS
// =====================================================
export const mapSupabaseNotificationSubscriptionToNotificationSubscription = (
  sns: SupabaseNotificationSubscription
): NotificationSubscription => {
  return {
    id: sns.id,
    userId: sns.user_id,
    eventType: sns.event_type as NotificationSubscription['eventType'],
    resourceType: sns.resource_type || undefined,
    resourceId: sns.resource_id || undefined,
    projectId: sns.project_id || undefined,
    enabled: sns.enabled,
    channels: sns.channels as NotificationSubscription['channels'],
    createdAt: sns.created_at,
    updatedAt: sns.updated_at,
  };
};

export const mapNotificationSubscriptionToSupabaseNotificationSubscription = (
  subscription: Partial<NotificationSubscription>
): Partial<SupabaseNotificationSubscription> => {
  return {
    user_id: subscription.userId,
    event_type: subscription.eventType,
    resource_type: subscription.resourceType || null,
    resource_id: subscription.resourceId || null,
    project_id: subscription.projectId || null,
    enabled: subscription.enabled,
    channels: subscription.channels || [],
  };
};

// =====================================================
// CHAT CHANNEL MAPPER UPDATE
// =====================================================
export const mapSupabaseChatChannelToChatChannel = (sc: SupabaseChatChannel): ChatChannel => {
  return {
    id: sc.id,
    name: sc.name,
    type: sc.type as ChatChannel['type'],
    unread: sc.unread,
    status: sc.status as ChatChannel['status'] || undefined,
    avatar: sc.avatar || undefined,
    lastMessage: sc.last_message || undefined,
    lastTime: sc.last_time || undefined,
    projectId: sc.project_id || undefined, // Added for project conversations
  };
};

