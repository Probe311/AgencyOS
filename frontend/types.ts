
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PROJECTS = 'PROJECTS',
  WEB_AGILE = 'WEB_AGILE',
  MARKETING = 'MARKETING',
  PRODUCTION = 'PRODUCTION',
  ACQUISITION = 'ACQUISITION',
  SOCIAL = 'SOCIAL',
  INFLUENCE = 'INFLUENCE',
  EVENTS = 'EVENTS',
  CRM = 'CRM',
  FINANCE = 'FINANCE',
  HR = 'HR',
  ROADMAP = 'ROADMAP',
  SETTINGS = 'SETTINGS',
  CHAT = 'CHAT',
  AGENDA = 'AGENDA',
  DRIVE = 'DRIVE', // Combined Docs & Assets
  REPORTING = 'REPORTING',
  LISTENING = 'LISTENING'
}

export type Department = 'R&D & Tech' | 'Design & Costumes' | 'Marketing & RP' | 'Missions & Ops' | 'Événements' | 'Stratégie' | 'Renseignement';

export enum Priority {
  LOW = 'Basse',
  MEDIUM = 'Moyenne',
  HIGH = 'Haute',
  URGENT = 'Urgente'
}

export enum ProjectStatus {
  TODO = 'À faire',
  IN_PROGRESS = 'En cours',
  REVIEW = 'En revue',
  DONE = 'Terminé'
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string; // Hex color code
  position: number;
  statusValue?: string; // Optional: link to ProjectStatus for backward compatibility
}

export type Role = 'SuperAdmin' | 'Admin' | 'Manager' | 'Éditeur' | 'Lecteur';

export type LifecycleStage = 
  | 'Audience' 
  | 'Lead' 
  | 'MQL' 
  | 'SQL' 
  | 'Contact' 
  | 'Opportunité' 
  | 'Client' 
  | 'Client Actif' 
  | 'Ambassadeur' 
  | 'Inactif' 
  | 'Perdu';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  status: 'Actif' | 'Inactif' | 'Invité';
  lastActive: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId?: string;
  userId: string;
  duration: number; // in minutes
  date: string;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lagDays: number;
  createdAt: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  nonWorkingDays?: NonWorkingDay[];
  workingHours?: WorkingHours[];
}

export interface NonWorkingDay {
  id: string;
  calendarId: string;
  date: string;
  name?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface WorkingHours {
  id: string;
  calendarId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isWorkingDay: boolean;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'overdue';
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  projectId: string;
  taskId?: string;
  title: string;
  description?: string;
  category?: 'Technical' | 'Schedule' | 'Budget' | 'Resource' | 'Quality' | 'External' | 'Other';
  probability: number; // 0-100
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'identified' | 'monitoring' | 'mitigated' | 'resolved' | 'closed';
  mitigationPlan?: string;
  ownerId?: string;
  identifiedDate: string;
  targetResolutionDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  client: string;
  department: Department;
  status: ProjectStatus;
  priority: Priority;
  assignee: string; // Legacy, kept for backward compatibility
  assignees?: string[]; // Array of user IDs for multi-assignation
  dueDate: string;
  startDate?: string;
  tags?: string[];
  estimatedTime?: string;
  subTasks?: SubTask[];
  description?: string;
  attachments?: string[];
  dependencies?: string[]; // Legacy, kept for backward compatibility
  taskDependencies?: TaskDependency[]; // New structured dependencies
  comments?: TaskComment[];
  reminders?: TaskReminder[];
  history?: TaskHistory[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string | null;
  userName?: string;
  userAvatar?: string;
  parentId?: string | null; // For thread replies
  content: string;
  mentions: string[]; // Array of user IDs mentioned
  attachments?: string[]; // Array of file URLs
  reactions?: CommentReaction[]; // Reactions on this comment
  replies?: TaskComment[]; // Thread replies
  createdAt: string;
  updatedAt: string;
}

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  emoji: string; // Emoji character (e.g., '👍', '❤️', '😂')
  createdAt: string;
}

export interface TaskReminder {
  id: string;
  taskId: string;
  userId: string;
  reminderDate: string;
  reminderType: 'due_date' | 'start_date' | 'custom';
  daysBefore: number;
  sent: boolean;
  createdAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string | null;
  userName?: string;
  userAvatar?: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'doc' | 'sheet' | 'slide' | 'folder' | 'pdf' | 'image' | 'video';
  lastModified: string;
  author: string;
  size?: string;
  folderId?: string;
  starred?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf';
  url: string;
  size: string;
  tags: string[];
  uploadDate: string;
}

export interface ListeningAlert {
  id: string;
  keyword: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  trend: 'up' | 'down' | 'stable';
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
}

// Marketing Automation Types
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ScenarioType = 'onboarding' | 'nurturing' | 'relance' | 'custom';
export type TriggerType = 'email_open' | 'email_click' | 'tag_added' | 'tag_removed' | 'web_behavior' | 'lead_created' | 'lead_status_changed' | 'date' | 'form_submit' | 'page_visit';
export type ActionType = 'send_email' | 'add_tag' | 'remove_tag' | 'change_status' | 'assign_to' | 'create_task' | 'wait' | 'condition' | 'webhook' | 'update_field';
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'paused';
export type LogType = 'trigger' | 'action' | 'condition' | 'error' | 'info';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'wait';
  label: string;
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  scenarioType?: ScenarioType;
  status: WorkflowStatus;
  workflowData: WorkflowData;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  triggers?: AutomationTrigger[];
  actions?: AutomationAction[];
}

export interface AutomationTrigger {
  id: string;
  workflowId: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  position: number;
  createdAt: string;
}

export interface AutomationAction {
  id: string;
  workflowId: string;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  position: number;
  parentActionId?: string;
  delayMinutes: number;
  createdAt: string;
}

export interface AutomationExecution {
  id: string;
  workflowId: string;
  leadId: string;
  userId?: string;
  status: ExecutionStatus;
  currentStep: number;
  executionData: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  logs?: AutomationExecutionLog[];
}

export interface AutomationExecutionLog {
  id: string;
  executionId: string;
  actionId?: string;
  triggerId?: string;
  logType: LogType;
  message: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: Department;
  email: string;
  phone: string;
  avatar: string;
  status: 'Actif' | 'En mission' | 'Télétravail';
  joinDate: string;
  ptoBalance: number;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: 'Instagram' | 'TikTok' | 'Snapchat' | 'Twitter' | 'YouTube' | 'LinkedIn' | 'Autre';
  followers: string;
  engagementRate: number;
  niche: string[];
  status: 'Contact' | 'Négociation' | 'Contrat' | 'Terminé';
  costPerPost: number;
  avatar: string;
}

export interface AgencyEvent {
  id: string;
  name: string;
  client: string;
  date: string;
  venue: string;
  guests: number;
  budget: number;
  status: 'Planification' | 'Confirmé' | 'En cours' | 'Terminé';
  image?: string;
}

export interface ProductionProject {
  id: string;
  name: string;
  client: string;
  department: Department;
  status: 'Sur les rails' | 'À risque' | 'Budget dépassé';
  soldHours: number;
  spentHours: number;
  progress: number;
  startDate: string;
  deadline: string;
  budget: number; 
  cost: number;   
  team: string[]; 
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  workspaceId: string;
  legalName: string; // Raison sociale
  siren?: string; // Numéro SIREN (9 chiffres)
  siret?: string; // Numéro SIRET (14 chiffres)
  vatNumber?: string; // Numéro de TVA intracommunautaire (FR + SIREN)
  addressLine1: string; // Numéro et rue
  addressLine2?: string; // Complément d'adresse
  postalCode: string; // Code postal
  city: string; // Ville
  country?: string; // Pays (défaut: France)
  phone?: string; // Téléphone
  email?: string; // Email
  website?: string; // Site web
  capitalSocial?: number; // Capital social (optionnel)
  legalForm?: string; // Forme juridique (SARL, SAS, etc.)
  rcs?: string; // RCS (Registre du Commerce et des Sociétés)
  logoUrl?: string; // URL du logo de l'agence
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  parentFolderId?: string;
  color: string;
  icon?: string;
  position: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[]; // Sous-dossiers
  projects?: Project[]; // Projets dans ce dossier
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  workspaceId?: string;
  folderId?: string;
  archived: boolean;
  archivedAt?: string;
  position: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  sections?: ProjectSection[]; // Sections/listes du projet
}

export interface ProjectSection {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  position: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: 'Candidature' | 'Screening' | 'Entretien' | 'Offre' | 'Embauché' | 'Rejeté';
  score: number;
  appliedDate: string;
  avatar: string;
}

export interface RoadmapGoal {
  id: string;
  title: string;
  description: string;
  quarter: 'T1' | 'T2' | 'T3' | 'T4';
  status: 'Pas commencé' | 'En cours' | 'Terminé';
  progress: number;
  department: Department;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // Taux de TVA spécifique pour cette ligne (si différent du taux global)
  total: number;
  position: number;
  createdAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  leadId?: string;
  projectId?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string; // Legacy, utiliser les champs détaillés ci-dessous
  clientAddressLine1?: string; // Numéro et rue
  clientAddressLine2?: string; // Complément d'adresse
  clientPostalCode?: string; // Code postal
  clientCity?: string; // Ville
  clientCountry?: string; // Pays (défaut: France)
  clientCompany?: string;
  clientSiret?: string; // Numéro SIRET du client (14 chiffres)
  clientSiren?: string; // Numéro SIREN du client (9 chiffres)
  clientVatNumber?: string; // Numéro de TVA intracommunautaire du client
  title: string;
  description?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  validUntil?: string;
  orderReference?: string; // Référence de la commande (si applicable)
  paymentTerms?: string; // Conditions de paiement (ex: "30 jours net")
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  notes?: string;
  terms?: string;
  items?: QuoteItem[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // Taux de TVA spécifique pour cette ligne (si différent du taux global)
  total: number;
  position: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'bank_transfer' | 'check' | 'cash' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId?: string;
  projectId?: string;
  leadId?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string; // Legacy, utiliser les champs détaillés ci-dessous
  clientAddressLine1?: string; // Numéro et rue
  clientAddressLine2?: string; // Complément d'adresse
  clientPostalCode?: string; // Code postal
  clientCity?: string; // Ville
  clientCountry?: string; // Pays (défaut: France)
  clientCompany?: string;
  clientSiret?: string; // Numéro SIRET du client (14 chiffres)
  clientSiren?: string; // Numéro SIREN du client (9 chiffres)
  clientVatNumber?: string; // Numéro de TVA intracommunautaire du client
  title: string;
  description?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  dueDate?: string;
  issuedDate: string;
  orderReference?: string; // Référence de la commande client (mention obligatoire)
  paymentTerms?: string; // Conditions de paiement (ex: "30 jours net")
  legalMentions?: string; // Mentions légales spécifiques selon l'activité
  latePaymentPenalties?: string; // Mentions de pénalités de retard
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  stripePaymentIntentId?: string;
  eInvoiceTransmitted?: boolean; // Indique si la facture a été transmise via une plateforme agréée
  eInvoiceTransmittedAt?: string; // Date de transmission à la plateforme agréée
  eInvoicePlatform?: string; // Nom de la plateforme agréée utilisée
  eInvoiceHash?: string; // Hash SHA-256 de la facture pour garantir l'intégrité
  eInvoiceTimestamp?: string; // Horodatage certifié (TSA) de la facture
  eInvoiceFormat?: string; // Format utilisé (Factur-X, UBL, CII)
  eInvoiceFileUrl?: string; // URL du fichier facture électronique généré
  items?: InvoiceItem[];
  payments?: Payment[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesGoal {
  id: string;
  userId?: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  targetRevenue: number;
  targetLeads: number;
  targetConversions: number;
  targetDeals: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesForecast {
  id: string;
  userId?: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  forecastedRevenue: number;
  forecastedDeals: number;
  confidenceLevel: number; // 0-100
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesActivity {
  id: string;
  userId: string;
  leadId: string;
  activityType: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'quote_sent' | 'proposal_sent' | 'follow_up';
  subject?: string;
  description?: string;
  duration?: number; // minutes
  activityDate: string;
  outcome?: string;
  nextFollowupDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmMetrics {
  conversionRate: number; // Taux de conversion global
  averageCycleLength: number; // Durée moyenne du cycle de vente en jours
  winRate: number; // Taux de gain (deals gagnés / deals totaux)
  leadResponseTime: number; // Temps moyen de réponse aux leads en heures
  activitiesPerLead: number; // Nombre moyen d'activités par lead
  revenuePerLead: number; // CA moyen par lead
  dealsByStage: Record<string, number>; // Nombre de deals par étape
  conversionBySource: Record<string, number>; // Conversions par source
  cycleLengthByStage: Record<string, number>; // Durée moyenne par étape
}

export interface SalesPerformance {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  averageCycleLength: number;
  conversionRate: number;
  activitiesCount: number;
  dealsWon: number;
  dealsLost: number;
  winRate: number;
}

export type LeadFamily = 
  | 'Artisans'
  | 'Commerçants'
  | 'Industrie & Manufacturier'
  | 'Professions Libérales'
  | 'Hôtellerie, Restauration & Loisirs'
  | 'Grandes Entreprises & ETI'
  | 'Startups Tech / SaaS';

export type LeadTemperature = 
  | 'Chaud'
  | 'Tiède'
  | 'Froid';

export interface LeadContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  addedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: 'Nouveau' | 'Découverte' | 'Proposition' | 'Négociation' | 'Gagné'; // Keeping legacy support
  lifecycleStage?: LifecycleStage; // New granular stage
  lastContact: string;
  probability: number;
  email?: string;
  phone?: string;
  source?: 'Site Web' | 'LinkedIn' | 'Référence' | 'Pubs' | 'Appel froid' | 'Robot Prospection';
  family?: LeadFamily;
  temperature?: LeadTemperature;
  contacts?: LeadContact[]; // Contacts additionnels (personnes) associés au lead
  certified?: boolean; // Lead certifié (données complètes et vérifiées)
  certifiedAt?: string; // Date de certification
  siret?: string; // Numéro SIRET pour la certification
  latitude?: number; // Coordonnée latitude pour la géolocalisation
  longitude?: number; // Coordonnée longitude pour la géolocalisation
  geocodedAddress?: string; // Adresse utilisée pour le géocodage
}

export interface SocialPost {
  id: string;
  platform: 'linkedin' | 'instagram' | 'twitter';
  content: string;
  date: string;
  status: 'Brouillon' | 'Planifié' | 'Publié';
  image?: string;
  likes?: number;
  comments?: number;
}

export interface FinanceStat {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Marketing Analytics Types
export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

export interface EmailCampaign {
  id: string;
  name: string;
  description?: string;
  subject: string;
  emailContent: string; // HTML
  senderName?: string;
  senderEmail?: string;
  status: EmailCampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: CampaignMetrics;
  roi?: CampaignROI;
}

export interface EmailSend {
  id: string;
  campaignId: string;
  leadId?: string;
  recipientEmail: string;
  recipientName?: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  bounced: boolean;
  unsubscribed: boolean;
  trackingPixelId?: string;
  createdAt: string;
  clicks?: EmailClick[];
}

export interface EmailClick {
  id: string;
  sendId: string;
  linkUrl: string;
  linkText?: string;
  clickedAt: string;
  clickPositionX?: number;
  clickPositionY?: number;
  deviceType?: string;
  userAgent?: string;
}

export interface CampaignMetrics {
  id: string;
  campaignId: string;
  metricDate: string;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  bounces: number;
  unsubscribes: number;
  conversions: number;
  revenue: number;
  cost: number;
  createdAt: string;
}

export interface CampaignROI {
  id: string;
  campaignId: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  totalRevenue: number;
  totalConversions: number;
  roiPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailHeatmapData {
  x: number;
  y: number;
  count: number;
  intensity: number; // 0-1
}

// Email Templates Types
export type EmailTemplateCategory = 'Newsletter' | 'Onboarding' | 'E-commerce' | 'Sales' | 'Event' | 'B2B' | 'Nurturing' | 'Relance' | 'Bienvenue' | 'Custom';

export interface EmailTemplateVariable {
  name: string; // Nom de la variable (ex: "nom", "entreprise")
  description: string; // Description de la variable
  example: string; // Exemple de valeur
  type?: 'string' | 'number' | 'date' | 'currency'; // Type de la variable
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  category: EmailTemplateCategory;
  subject: string;
  htmlContent: string; // HTML avec variables {{variable}}
  textContent?: string; // Version texte brut
  variables: EmailTemplateVariable[]; // Variables disponibles
  previewData: Record<string, any>; // Données d'exemple pour le preview
  thumbnailUrl?: string;
  isPublic: boolean;
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Email Segments Types
export interface EmailSegmentCriteria {
  scoring?: { min?: number; max?: number };
  temperature?: LeadTemperature | LeadTemperature[];
  family?: LeadFamily | LeadFamily[];
  secteur?: string | string[];
  lifecycleStage?: LifecycleStage | LifecycleStage[];
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  [key: string]: any; // Pour critères personnalisés
}

export interface EmailSegment {
  id: string;
  name: string;
  description?: string;
  criteria: EmailSegmentCriteria;
  leadCount: number;
  isDynamic: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// A/B Tests Types
export type ABTestType = 'subject' | 'content' | 'sender' | 'send_time';
export type ABTestStatus = 'draft' | 'running' | 'completed' | 'cancelled';

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  testType: ABTestType;
  variantAId: string;
  variantBId: string;
  splitPercentage: number; // Pourcentage pour variant A (50 = 50/50)
  status: ABTestStatus;
  startDate?: string;
  endDate?: string;
  winnerVariantId?: string;
  confidenceLevel?: number; // Niveau de confiance statistique (0-100)
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Multi-tenant Types
export type ClientStatus = 'active' | 'suspended' | 'cancelled' | 'trial';
export type ClientPlan = 'basic' | 'professional' | 'enterprise' | 'custom';
export type ClientUserRole = 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Viewer';

export interface Client {
  id: string;
  name: string;
  subdomain?: string;
  domain?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor: string;
  status: ClientStatus;
  plan: ClientPlan;
  maxUsers: number;
  maxProjects: number;
  maxStorageGb: number;
  trialEndsAt?: string;
  billingEmail?: string;
  billingAddress?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  users?: ClientUser[];
}

export interface ClientUser {
  id: string;
  userId: string;
  clientId: string;
  role: ClientUserRole;
  isPrimary: boolean;
  joinedAt: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

// 2FA Types
export type TwoFactorMethod = 'totp' | 'sms' | 'email';

export interface User2FA {
  id: string;
  userId: string;
  enabled: boolean;
  secret?: string; // Encrypted TOTP secret
  backupCodes?: string[]; // Encrypted backup codes
  method: TwoFactorMethod;
  phoneNumber?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User2FASession {
  id: string;
  userId: string;
  sessionToken: string;
  verifiedAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'google' | 'meta' | 'linkedin' | 'tiktok';
  status: 'Actif' | 'En pause' | 'Terminé';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

// Webhooks Types
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[]; // Array of event types (e.g., ['task.created', 'lead.updated'])
  active: boolean;
  description?: string;
  headers?: Record<string, string>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deliveries?: WebhookDelivery[];
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  description?: string;
  category?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  status: WebhookDeliveryStatus;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attempts: number;
  nextRetryAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

// Available webhook event types
export const WEBHOOK_EVENT_TYPES = {
  // Tasks
  'task.created': 'Tâche créée',
  'task.updated': 'Tâche mise à jour',
  'task.deleted': 'Tâche supprimée',
  'task.status_changed': 'Statut de tâche changé',
  'task.assigned': 'Tâche assignée',
  'task.completed': 'Tâche terminée',
  // Leads/CRM
  'lead.created': 'Lead créé',
  'lead.updated': 'Lead mis à jour',
  'lead.deleted': 'Lead supprimé',
  'lead.status_changed': 'Statut de lead changé',
  'lead.converted': 'Lead converti',
  // Projects
  'project.created': 'Projet créé',
  'project.updated': 'Projet mis à jour',
  'project.deleted': 'Projet supprimé',
  'project.status_changed': 'Statut de projet changé',
  // Invoices
  'invoice.created': 'Facture créée',
  'invoice.updated': 'Facture mise à jour',
  'invoice.paid': 'Facture payée',
  'invoice.overdue': 'Facture en retard',
  // Quotes
  'quote.created': 'Devis créé',
  'quote.updated': 'Devis mis à jour',
  'quote.accepted': 'Devis accepté',
  'quote.rejected': 'Devis refusé',
  // Users
  'user.created': 'Utilisateur créé',
  'user.updated': 'Utilisateur mis à jour',
  'user.deleted': 'Utilisateur supprimé',
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENT_TYPES;

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: string; 
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'alert' | 'message' | 'task' | 'success';
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'Tâche' | 'Lead' | 'Employé' | 'Projet';
  url?: string;
}

export interface Integration {
  id: string;
  provider: 'linkedin' | 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'pinterest' | 'snapchat' | 'reddit' | 'discord' | 'telegram' | 'google_ads' | 'meta_ads' | 'microsoft_ads' | 'amazon_ads' | 'linkedin_ads' | 'twitter_ads' | 'slack' | 'notion' | 'github' | 'stripe' | 'hubspot' | 'zapier' | 'make';
  name: string;
  category: 'Réseaux Sociaux' | 'Publicité' | 'Productivité & Dev' | 'Finance & CRM' | 'Automatisation';
  status: 'Connecté' | 'Déconnecté' | 'Erreur';
  enabled: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  config?: Record<string, any>;
  accountId?: string;
  accountName?: string;
  accountAvatar?: string;
  lastSyncAt?: string;
  lastError?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  unread: number;
  status?: 'online' | 'offline' | 'busy';
  avatar?: string;
  lastMessage?: string;
  lastTime?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  attachments?: string[];
  reactions?: { emoji: string, count: number, userIds: string[] }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'task' | 'reminder';
  attendees?: string[];
}

// =====================================================
// AUTOMATION RULES TYPES
// =====================================================
export type AutomationRuleStatus = 'draft' | 'active' | 'paused' | 'archived';
export type AutomationRuleScope = 'global' | 'project' | 'workspace';
export type AutomationTriggerType = 
  | 'task_created' 
  | 'task_updated' 
  | 'task_status_changed' 
  | 'task_priority_changed' 
  | 'task_due_date' 
  | 'task_assigned' 
  | 'date' 
  | 'time' 
  | 'event' 
  | 'condition';

export type AutomationActionType = 
  | 'create_task' 
  | 'update_task_status' 
  | 'update_task_priority' 
  | 'assign_task' 
  | 'send_notification' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'update_field' 
  | 'webhook';

export interface AutomationTriggerConfig {
  [key: string]: any;
  // Exemples:
  // - Pour task_status_changed: { from: 'À faire', to: 'En cours' }
  // - Pour task_due_date: { days_before: 1 }
  // - Pour date: { date: '2024-12-31', time: '09:00' }
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logical?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, any>;
  // Exemples:
  // - Pour create_task: { title: 'Nouvelle tâche', project_id: '...', assignee_id: '...' }
  // - Pour update_task_status: { status: 'Terminé' }
  // - Pour send_notification: { message: '...', user_id: '...' }
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  status: AutomationRuleStatus;
  scope: AutomationRuleScope;
  projectId?: string;
  workspaceId?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  executionCount: number;
  lastExecutedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type AutomationRuleExecutionStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface AutomationRuleExecution {
  id: string;
  ruleId: string;
  taskId?: string;
  projectId?: string;
  status: AutomationRuleExecutionStatus;
  triggerData: Record<string, any>;
  executionResult: Record<string, any>;
  errorMessage?: string;
  executedAt: string;
}

// =====================================================
// PERMISSIONS TYPES
// =====================================================
export type PermissionCategory = 'project' | 'document' | 'publication' | 'task' | 'lead' | 'finance' | 'admin';
export type PermissionAction = 'view' | 'edit' | 'delete' | 'publish' | 'manage' | 'comment' | 'assign';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  resourceType: string;
  action: PermissionAction;
  createdAt: string;
}

export interface RolePermission {
  id: string;
  role: Role;
  permissionId: string;
  granted: boolean;
  createdAt: string;
}

export type ResourceType = 'project' | 'document' | 'publication' | 'task' | 'lead';

export interface ResourcePermission {
  id: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  permissionId: string;
  granted: boolean;
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// NOTIFICATION SUBSCRIPTIONS TYPES
// =====================================================
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationEventType = 
  | 'task.created' 
  | 'task.updated' 
  | 'task.status_changed' 
  | 'task.assigned' 
  | 'comment.added' 
  | 'project.created' 
  | 'project.updated' 
  | 'lead.created' 
  | 'lead.updated' 
  | 'lead.converted' 
  | 'invoice.created' 
  | 'invoice.paid';

export interface NotificationSubscription {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  resourceType?: string;
  resourceId?: string;
  projectId?: string;
  enabled: boolean;
  channels: NotificationChannel[];
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// CHAT CHANNEL UPDATE (add project_id)
// =====================================================
export interface ChatChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  unread: number;
  status?: 'online' | 'offline' | 'busy';
  avatar?: string;
  lastMessage?: string;
  lastTime?: string;
  projectId?: string; // Added for project conversations
}
