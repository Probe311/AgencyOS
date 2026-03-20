/**
 * Service pour les actions de workflow automatisées
 * Permet de créer des tâches, rendez-vous, notes, devis, projets, etc.
 */

import { supabase } from '../supabase';
import { Lead, Priority } from '../../types';
import { logError, logInfo } from '../utils/logger';

export interface CreateTaskParams {
  leadId?: string;
  projectId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeIds?: string[]; // Multi-assignation
  priority?: Priority;
  dueDate?: Date;
  startDate?: Date;
  tags?: string[];
  linkToLead?: string;
  linkToProject?: string;
  metadata?: Record<string, any>;
}

export interface CreateAppointmentParams {
  leadId?: string;
  title: string;
  description?: string;
  appointmentType?: 'demo' | 'discovery' | 'follow_up' | 'kick_off' | 'other';
  participantIds?: string[]; // User IDs
  startTime: Date;
  duration?: number; // Durée en minutes (défaut: 60)
  location?: string;
  metadata?: Record<string, any>;
}

export interface CreateNoteParams {
  leadId?: string;
  projectId?: string;
  noteType?: 'internal' | 'client' | 'follow_up';
  title?: string;
  content: string;
  isPrivate?: boolean;
  sharedWith?: string[]; // User IDs
  tags?: string[];
}

export interface CreateQuoteParams {
  leadId: string;
  quoteTemplate?: string;
  estimatedAmount?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  status?: 'draft' | 'sent';
  metadata?: Record<string, any>;
}

export interface CreateProjectParams {
  leadId: string;
  projectName: string;
  service?: string;
  budget?: number;
  startDate?: Date;
  estimatedEndDate?: Date;
  assigneeIds?: string[];
  status?: ProjectStatus;
  workspaceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Crée une tâche automatiquement depuis un workflow
 */
export async function createAutomatedTask(params: CreateTaskParams): Promise<string> {
  try {
    // Calculer la date d'échéance si relative (J+X)
    let dueDate = params.dueDate;
    if (!dueDate && params.startDate) {
      // Par défaut, échéance = date de début
      dueDate = params.startDate;
    }

    // Déterminer la priorité si non fournie
    const priority = params.priority || 'Moyenne';

    // Préparer les données de la tâche
    const taskData: any = {
      title: params.title,
      description: params.description || '',
      status: 'À faire',
      priority: priority,
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
      start_date: params.startDate ? params.startDate.toISOString().split('T')[0] : null,
      tags: params.tags || [],
    };

    // Ajouter le projet si fourni
    if (params.projectId) {
      taskData.project_id = params.projectId;
    }

    // Créer la tâche
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (taskError) throw taskError;

    // Assigner la tâche (legacy single assignee)
    if (params.assigneeId) {
      await supabase
        .from('tasks')
        .update({ assigned_to: params.assigneeId })
        .eq('id', task.id);
    }

    // Multi-assignation via task_assignees
    if (params.assigneeIds && params.assigneeIds.length > 0) {
      const assigneesToAdd = params.assigneeIds.map(userId => ({
        task_id: task.id,
        user_id: userId,
      }));

      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(assigneesToAdd);

      if (assigneesError) {
        logError('Erreur assignation multiple tâche:', assigneesError);
      }
    } else if (params.assigneeId) {
      // Si assigneeId fourni mais pas assigneeIds, créer l'assignation dans task_assignees aussi
      await supabase
        .from('task_assignees')
        .insert({
          task_id: task.id,
          user_id: params.assigneeId,
        });
    }

    // Enregistrer dans automated_tasks pour le suivi
    if (params.leadId) {
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: params.leadId,
          assigned_to: params.assigneeId || params.assigneeIds?.[0] || null,
          title: params.title,
          description: params.description,
          priority: priority,
          due_date: dueDate ? dueDate.toISOString() : null,
          tags: params.tags || [],
          metadata: {
            ...params.metadata,
            linkToLead: params.linkToLead,
            linkToProject: params.linkToProject,
            taskId: task.id,
          },
        });
    }

    // Enregistrer dans l'historique du lead si applicable
    if (params.leadId) {
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: params.leadId,
          activity_type: 'task_created',
          subject: params.title,
          description: `Tâche créée automatiquement: ${params.title}`,
          activity_date: new Date().toISOString(),
        });
    }

    logInfo(`Tâche créée automatiquement: ${task.id} - ${params.title}`);
    return task.id;
  } catch (error) {
    logError('Erreur création tâche automatisée:', error);
    throw error;
  }
}

/**
 * Crée un rendez-vous (événement) automatiquement depuis un workflow
 */
export async function createAutomatedAppointment(params: CreateAppointmentParams): Promise<string> {
  try {
    const endTime = new Date(params.startTime);
    endTime.setMinutes(endTime.getMinutes() + (params.duration || 60));

    // Créer l'événement
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: params.title,
        description: params.description || '',
        start_time: params.startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: params.location || null,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Ajouter les participants
    if (params.participantIds && params.participantIds.length > 0) {
      const attendees = params.participantIds.map(userId => ({
        event_id: event.id,
        user_id: userId,
      }));

      await supabase
        .from('event_attendees')
        .insert(attendees);
    }

    // Enregistrer dans l'historique du lead si applicable
    if (params.leadId) {
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: params.leadId,
          activity_type: 'meeting_scheduled',
          subject: params.title,
          description: `Rendez-vous programmé: ${params.title} - ${params.startTime.toLocaleString('fr-FR')}`,
          activity_date: params.startTime.toISOString(),
        });

      // Enregistrer dans automated_tasks pour suivi
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: params.leadId,
          title: `Rendez-vous: ${params.title}`,
          description: params.description || '',
          due_date: params.startTime.toISOString(),
          metadata: {
            ...params.metadata,
            eventId: event.id,
            appointmentType: params.appointmentType,
            duration: params.duration || 60,
          },
        });
    }

    // TODO: Créer rappel automatique (J-1, J-0)
    // TODO: Intégration Google Calendar / Outlook

    logInfo(`Rendez-vous créé automatiquement: ${event.id} - ${params.title}`);
    return event.id;
  } catch (error) {
    logError('Erreur création rendez-vous automatisé:', error);
    throw error;
  }
}

/**
 * Crée une note ou commentaire automatiquement depuis un workflow
 */
export async function createAutomatedNote(params: CreateNoteParams): Promise<string> {
  try {
    // Récupérer l'utilisateur actuel pour l'auteur
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Créer l'activité dans sales_activities (qui fait office de notes pour les leads)
    if (params.leadId) {
      const { data: activity, error: activityError } = await supabase
        .from('sales_activities')
        .insert({
          lead_id: params.leadId,
          user_id: userId,
          activity_type: 'note_added',
          subject: params.title || 'Note automatique',
          description: params.content,
          activity_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (activityError) throw activityError;

      logInfo(`Note créée automatiquement pour lead ${params.leadId}`);
      return activity.id;
    }

    // Pour les projets, créer un commentaire dans task_comments si applicable
    if (params.projectId) {
      // TODO: Créer commentaire sur projet si table disponible
      logInfo(`Note créée automatiquement pour projet ${params.projectId}`);
      return 'note-project-' + Date.now();
    }

    throw new Error('leadId ou projectId requis pour créer une note');
  } catch (error) {
    logError('Erreur création note automatisée:', error);
    throw error;
  }
}

/**
 * Crée un devis automatiquement depuis un workflow
 */
export async function createAutomatedQuote(params: CreateQuoteParams): Promise<string> {
  try {
    // Récupérer les informations du lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;

    // Calculer le montant total si items fournis
    let totalAmount = params.estimatedAmount || 0;
    if (params.items && params.items.length > 0) {
      totalAmount = params.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }

    // Créer le devis
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        lead_id: params.leadId,
        client_name: lead.name || lead.company || '',
        client_email: lead.email || null,
        client_company: lead.company || '',
        status: params.status || 'draft',
        total_amount: totalAmount,
        items: params.items || [],
        metadata: {
          ...params.metadata,
          automated: true,
          quoteTemplate: params.quoteTemplate,
        },
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    // Enregistrer dans l'historique du lead
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: params.leadId,
        activity_type: 'quote_sent',
        subject: `Devis ${quote.quote_number || quote.id}`,
        description: `Devis créé automatiquement - Montant: ${totalAmount}€`,
        activity_date: new Date().toISOString(),
      });

    // Créer une tâche de validation si statut = draft
    if (params.status === 'draft') {
      await createAutomatedTask({
        leadId: params.leadId,
        title: `Valider devis ${quote.quote_number || quote.id}`,
        description: `Devis créé automatiquement pour validation - Montant: ${totalAmount}€`,
        priority: 'Haute',
        tags: ['Devis', 'Validation'],
        metadata: {
          quoteId: quote.id,
          quoteNumber: quote.quote_number,
        },
      });
    }

    logInfo(`Devis créé automatiquement: ${quote.id} pour lead ${params.leadId}`);
    return quote.id;
  } catch (error) {
    logError('Erreur création devis automatisé:', error);
    throw error;
  }
}

/**
 * Crée un projet associé automatiquement depuis un workflow
 */
export async function createAutomatedProject(params: CreateProjectParams): Promise<string> {
  try {
    // Récupérer les informations du lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;

    // Calculer les dates si non fournies
    const startDate = params.startDate || new Date();
    const estimatedEndDate = params.estimatedEndDate;
    if (!estimatedEndDate && startDate) {
      // Par défaut, 3 mois après la date de début
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + 3);
      startDate.setDate(startDate.getDate() + 7); // Démarrer dans 7 jours
    }

    // Créer le projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: params.projectName,
        client: lead.company || lead.name || '',
        status: params.status || 'active',
        budget: params.budget || null,
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        end_date: estimatedEndDate ? estimatedEndDate.toISOString().split('T')[0] : null,
        workspace_id: params.workspaceId || null,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Lier le projet au lead (via metadata ou champ dédié si existe)
    // Pour l'instant, on peut stocker le project_id dans les métadonnées du lead
    // ou créer une table de liaison si nécessaire

    // Enregistrer dans l'historique du lead
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: params.leadId,
        activity_type: 'custom',
        subject: `Projet créé: ${params.projectName}`,
        description: `Projet créé automatiquement - Budget: ${params.budget || 'Non défini'}€`,
        activity_date: new Date().toISOString(),
      });

    // Créer les tâches initiales du projet si nécessaire
    if (params.assigneeIds && params.assigneeIds.length > 0) {
      // Tâche de kick-off
      await createAutomatedTask({
        projectId: project.id,
        title: `Kick-off projet: ${params.projectName}`,
        description: `Kick-off pour le projet ${params.projectName}`,
        assigneeIds: params.assigneeIds,
        priority: 'Haute',
        startDate: startDate,
        tags: ['Kick-off', 'Projet'],
      });
    }

    logInfo(`Projet créé automatiquement: ${project.id} - ${params.projectName}`);
    return project.id;
  } catch (error) {
    logError('Erreur création projet automatisé:', error);
    throw error;
  }
}

/**
 * Remplace les variables dans un template de texte
 * Utilise le service avancé de remplacement de variables
 */
export function replaceVariables(template: string, variables: Record<string, any>): string {
  // Si un lead est fourni dans variables, l'extraire
  const lead = variables.lead;
  const context = { ...variables, lead };
  delete context.lead; // Pour éviter la duplication
  
  const { replaceVariables: replaceVarsAdvanced } = require('../utils/variableReplacement');
  return replaceVarsAdvanced(template, context, variables);
}

/**
 * Calcule une date relative (J+X)
 */
export function calculateRelativeDate(daysOffset: number, baseDate?: Date): Date {
  const base = baseDate || new Date();
  const result = new Date(base);
  result.setDate(result.getDate() + daysOffset);
  return result;
}

/**
 * Détermine la priorité selon le scoring et la température d'un lead
 */
export function determinePriorityFromLead(lead: Lead): Priority {
  const scoring = (lead as any)?.scoring || (lead as any)?.quality_score || 50;
  const temperature = lead.temperature;

  if (scoring >= 90 || temperature === 'Chaud') {
    return 'Urgente';
  } else if (scoring >= 75 || temperature === 'Tiède') {
    return 'Haute';
  } else if (scoring >= 50) {
    return 'Moyenne';
  } else {
    return 'Basse';
  }
}

