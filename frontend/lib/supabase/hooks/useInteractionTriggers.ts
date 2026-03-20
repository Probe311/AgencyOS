import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { usePostDemoNurturing } from './usePostDemoNurturing';
import { useQuoteFollowUps } from './useQuoteFollowUps';
import { useInvoiceReminders } from './useInvoiceReminders';
import { useProjectOnboarding } from './useProjectOnboarding';
import { useDataTriggers } from './useDataTriggers';

export type InteractionType = 
  | 'email_sent' 
  | 'email_received' 
  | 'call_made' 
  | 'call_received'
  | 'appointment_scheduled' 
  | 'appointment_cancelled' 
  | 'appointment_completed'
  | 'quote_sent' 
  | 'quote_viewed' 
  | 'quote_accepted' 
  | 'quote_refused'
  | 'invoice_sent' 
  | 'invoice_paid' 
  | 'invoice_overdue'
  | 'note_added' 
  | 'comment_added' 
  | 'task_created' 
  | 'task_completed' 
  | 'other';

export interface InteractionEvent {
  id: string;
  leadId: string;
  interactionType: InteractionType;
  interactionSubtype?: string;
  subject?: string;
  content?: string;
  durationMinutes?: number;
  result?: string;
  status?: string;
  relatedId?: string;
  relatedType?: string;
  occurredAt: string;
  createdBy?: string;
  metadata: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}

export interface InteractionTrigger {
  id: string;
  name: string;
  description?: string;
  triggerType: InteractionType | 'custom';
  conditions: Record<string, any>;
  actionConfig: {
    actionType: string;
    emailConfig?: Record<string, any>;
    taskConfig?: Record<string, any>;
    notificationConfig?: Record<string, any>;
    workflowConfig?: Record<string, any>;
    statusConfig?: Record<string, any>;
    [key: string]: any;
  };
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useInteractionTriggers = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const { startNurturingAfterDemo } = usePostDemoNurturing();
  const { startFollowUpSequence } = useQuoteFollowUps();
  const { checkOverdueInvoices } = useInvoiceReminders();
  const { startProjectOnboarding } = useProjectOnboarding();
  const { recordDataChange } = useDataTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recordInteraction = async (
    leadId: string,
    interactionType: InteractionType,
    interactionData: {
      subtype?: string;
      subject?: string;
      content?: string;
      durationMinutes?: number;
      result?: string;
      status?: string;
      relatedId?: string;
      relatedType?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<InteractionEvent> => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('interaction_events')
        .insert({
          lead_id: leadId,
          interaction_type: interactionType,
          interaction_subtype: interactionData.subtype,
          subject: interactionData.subject,
          content: interactionData.content,
          duration_minutes: interactionData.durationMinutes,
          result: interactionData.result,
          status: interactionData.status,
          related_id: interactionData.relatedId,
          related_type: interactionData.relatedType,
          metadata: interactionData.metadata || {},
          created_by: userId,
          processed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const event: InteractionEvent = {
        id: data.id,
        leadId: data.lead_id,
        interactionType: data.interaction_type,
        interactionSubtype: data.interaction_subtype,
        subject: data.subject,
        content: data.content,
        durationMinutes: data.duration_minutes,
        result: data.result,
        status: data.status,
        relatedId: data.related_id,
        relatedType: data.related_type,
        occurredAt: data.occurred_at,
        createdBy: data.created_by,
        metadata: data.metadata || {},
        processed: data.processed,
        processedAt: data.processed_at,
        createdAt: data.created_at,
      };

      // Vérifier les déclencheurs correspondants
      await checkInteractionTriggers(event);

      setError(null);
      return event;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkInteractionTriggers = async (event: InteractionEvent) => {
    try {
      // Récupérer les déclencheurs actifs pour ce type d'interaction
      const { data: triggers } = await supabase
        .from('interaction_triggers')
        .select('*')
        .eq('trigger_type', event.interactionType)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!triggers || triggers.length === 0) return;

      // Récupérer le lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', event.leadId)
        .single();

      if (!lead) return;

      // Vérifier chaque déclencheur
      for (const triggerData of triggers) {
        const trigger: InteractionTrigger = {
          id: triggerData.id,
          name: triggerData.name,
          description: triggerData.description,
          triggerType: triggerData.trigger_type,
          conditions: triggerData.conditions || {},
          actionConfig: triggerData.action_config || {},
          isActive: triggerData.is_active,
          priority: triggerData.priority,
          createdBy: triggerData.created_by,
          createdAt: triggerData.created_at,
          updatedAt: triggerData.updated_at,
        };

        // Évaluer les conditions
        const matches = await evaluateTriggerConditions(trigger, event, lead);
        if (matches) {
          // Exécuter les actions
          await executeTriggerActions(trigger, event, lead);
        }
      }

      // Marquer l'événement comme traité
      await supabase
        .from('interaction_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', event.id);
    } catch (err) {
      console.error('Error checking interaction triggers:', err);
    }
  };

  const evaluateTriggerConditions = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead
  ): Promise<boolean> => {
    try {
      const conditions = trigger.conditions;

      // Vérifier les mots-clés dans le sujet
      if (conditions.subject_keywords && Array.isArray(conditions.subject_keywords)) {
        const subject = (event.subject || '').toLowerCase();
        const hasKeyword = conditions.subject_keywords.some((keyword: string) =>
          subject.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Vérifier la durée (pour appels, rendez-vous)
      if (conditions.duration_min && event.durationMinutes) {
        if (event.durationMinutes < conditions.duration_min) {
          return false;
        }
      }

      // Vérifier le résultat (pour appels)
      if (conditions.result) {
        if (event.result !== conditions.result) {
          return false;
        }
      }

      // Vérifier le type (pour rendez-vous, tâches)
      if (conditions.subtype) {
        if (event.interactionSubtype !== conditions.subtype) {
          return false;
        }
      }

      // Vérifier le statut
      if (conditions.status) {
        if (event.status !== conditions.status) {
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error evaluating trigger conditions:', err);
      return false;
    }
  };

  const executeTriggerActions = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead
  ) => {
    try {
      const actions = trigger.actionConfig;

      // Enregistrer l'exécution
      const { data: execution } = await supabase
        .from('interaction_trigger_executions')
        .insert({
          interaction_trigger_id: trigger.id,
          interaction_event_id: event.id,
          lead_id: lead.id,
          execution_status: 'pending',
        })
        .select()
        .single();

      try {
        // Notification
        if (actions.actionType === 'notification' || actions.notificationConfig) {
          await createNotification(trigger, event, lead, actions.notificationConfig);
        }

        // Création de tâche
        if (actions.actionType === 'task' || actions.taskConfig) {
          await createTask(trigger, event, lead, actions.taskConfig);
        }

        // Envoi d'email
        if (actions.actionType === 'email' || actions.emailConfig) {
          await sendEmail(trigger, event, lead, actions.emailConfig);
        }

        // Changement de statut
        if (actions.statusConfig) {
          await updateStatus(lead, actions.statusConfig);
        }

        // Exécution de workflow/scénario
        if (actions.workflowConfig) {
          await executeWorkflow(trigger, event, lead, actions.workflowConfig);
        }

        // Mise à jour timeline
        await updateTimeline(event, lead);

        // Marquer l'exécution comme complétée
        if (execution) {
          await supabase
            .from('interaction_trigger_executions')
            .update({
              execution_status: 'completed',
            })
            .eq('id', execution.id);
        }
      } catch (err) {
        // Marquer l'exécution comme échouée
        if (execution) {
          await supabase
            .from('interaction_trigger_executions')
            .update({
              execution_status: 'failed',
              error_message: (err as Error).message,
            })
            .eq('id', execution.id);
        }
        throw err;
      }
    } catch (err) {
      console.error('Error executing trigger actions:', err);
    }
  };

  const createNotification = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système de notifications
    console.log('Notification created:', { trigger: trigger.name, lead: lead.name, event: event.interactionType });
  };

  const createTask = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    await supabase
      .from('automated_tasks')
      .insert({
        task_type: config?.taskType || 'follow_up',
        lead_id: lead.id,
        assigned_to: (lead as any).assigned_to || (lead as any).assignedTo,
        title: config?.title || `Action suite à ${event.interactionType} : ${lead.name || lead.company}`,
        description: config?.description || `Interaction : ${event.interactionType}. ${event.subject || ''}. Déclencheur : ${trigger.name}`,
        priority: config?.priority || 'Moyenne',
        tags: config?.tags || [event.interactionType, 'Interaction'],
        metadata: {
          triggerId: trigger.id,
          eventId: event.id,
          interactionType: event.interactionType,
        },
      });
  };

  const sendEmail = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système d'envoi d'emails
    console.log('Email sent:', { trigger: trigger.name, lead: lead.name, template: config?.templateId });
  };

  const updateStatus = async (lead: Lead, config: Record<string, any>) => {
    if (config.newStatus) {
      await supabase
        .from('leads')
        .update({ lifecycle_stage: config.newStatus })
        .eq('id', lead.id);

      // Enregistrer le changement
      await recordDataChange(
        lead.id,
        'status_change',
        'lifecycle_stage',
        lead.lifecycleStage,
        config.newStatus
      );
    }
  };

  const executeWorkflow = async (
    trigger: InteractionTrigger,
    event: InteractionEvent,
    lead: Lead,
    config: Record<string, any>
  ) => {
    try {
      // Exécuter un scénario spécifique selon le type d'interaction
      if (config.scenario === 'post_demo_nurturing' && event.interactionType === 'appointment_completed' && event.interactionSubtype === 'demo') {
        // Récupérer la demo
        if (event.relatedId) {
          const { data: demo } = await supabase
            .from('demos')
            .select('*')
            .eq('id', event.relatedId)
            .single();

          if (demo) {
            await startNurturingAfterDemo(demo, lead);
          }
        }
      } else if (config.scenario === 'quote_follow_up' && event.interactionType === 'quote_sent') {
        // Scénario "Relance Opportunité"
        if (event.relatedId) {
          // Récupérer le quote
          const { data: quote } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', event.relatedId)
            .single();

          if (quote) {
            // Mapper le quote pour startFollowUpSequence
            const quoteObj = {
              id: quote.id,
              leadId: quote.lead_id,
              quoteNumber: quote.quote_number,
              title: quote.title || `Devis ${quote.quote_number}`,
              amount: quote.total || 0,
              currency: quote.currency || 'EUR',
              status: quote.status || 'sent',
              sentAt: quote.sent_at,
              viewedAt: quote.viewed_at,
              acceptedAt: quote.accepted_at,
              expiresAt: quote.valid_until,
              items: quote.items || [],
              terms: quote.terms,
              notes: quote.notes,
              createdBy: quote.created_by,
              createdAt: quote.created_at,
              updatedAt: quote.updated_at,
            };
            // startFollowUpSequence envoie la première relance
            await startFollowUpSequence(quoteObj, 1, 'email');
          }
        }
      } else if (config.scenario === 'invoice_reminder' && event.interactionType === 'invoice_overdue') {
        // Scénario "Relance Facture Impayée"
        await checkOverdueInvoices();
      } else if (config.scenario === 'client_onboarding' && event.interactionType === 'quote_accepted') {
        // Scénario "Conversion Client"
        if (event.relatedId) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', event.relatedId)
            .single();

          if (quote) {
            // Créer un projet pour le client
            const { data: project } = await supabase
              .from('projects')
              .insert({
                name: `Projet ${lead.name || lead.company}`,
                client: lead.name || lead.company,
                status: 'active',
                budget: quote.total,
              })
              .select()
              .single();

            if (project) {
              await startProjectOnboarding(project.id, lead.id, {
                name: project.name,
                budget: quote.total,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error executing workflow:', err);
    }
  };

  const updateTimeline = async (event: InteractionEvent, lead: Lead) => {
    try {
      // Enregistrer dans sales_activities
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: lead.id,
          activity_type: event.interactionType,
          description: `${event.interactionType}: ${event.subject || event.content || ''}`,
          metadata: {
            eventId: event.id,
            interactionType: event.interactionType,
            relatedId: event.relatedId,
            relatedType: event.relatedType,
          },
        });
    } catch (err) {
      console.error('Error updating timeline:', err);
    }
  };

  return {
    loading,
    error,
    recordInteraction,
    checkInteractionTriggers,
  };
};

