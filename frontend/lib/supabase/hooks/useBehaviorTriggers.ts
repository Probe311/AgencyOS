import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useTriggerEvents } from './useTriggerEvents';

export type BehaviorEventType = 
  | 'email_open' 
  | 'email_click' 
  | 'website_visit' 
  | 'resource_download' 
  | 'form_submit' 
  | 'event_detected' 
  | 'other';

export interface BehaviorEvent {
  id: string;
  leadId: string;
  eventType: BehaviorEventType;
  eventSubtype?: string;
  eventData: Record<string, any>;
  occurredAt: string;
  source?: string;
  sourceId?: string;
  metadata: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}

export interface BehaviorTrigger {
  id: string;
  name: string;
  description?: string;
  triggerType: BehaviorEventType | 'custom';
  conditions: Record<string, any>;
  actionConfig: {
    actionType: string;
    notificationConfig?: Record<string, any>;
    taskConfig?: Record<string, any>;
    emailConfig?: Record<string, any>;
    scoringConfig?: Record<string, any>;
    temperatureConfig?: Record<string, any>;
    lifecycleConfig?: Record<string, any>;
    [key: string]: any;
  };
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useBehaviorTriggers = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const { detectTriggerEvent } = useTriggerEvents();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recordBehaviorEvent = async (
    leadId: string,
    eventType: BehaviorEventType,
    eventData: {
      subtype?: string;
      data?: Record<string, any>;
      source?: string;
      sourceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<BehaviorEvent> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('behavior_events')
        .insert({
          lead_id: leadId,
          event_type: eventType,
          event_subtype: eventData.subtype,
          event_data: eventData.data || {},
          source: eventData.source,
          source_id: eventData.sourceId,
          metadata: eventData.metadata || {},
          processed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const event: BehaviorEvent = {
        id: data.id,
        leadId: data.lead_id,
        eventType: data.event_type,
        eventSubtype: data.event_subtype,
        eventData: data.event_data,
        occurredAt: data.occurred_at,
        source: data.source,
        sourceId: data.source_id,
        metadata: data.metadata,
        processed: data.processed,
        processedAt: data.processed_at,
        createdAt: data.created_at,
      };

      // Vérifier les déclencheurs correspondants
      await checkBehaviorTriggers(event);

      setError(null);
      return event;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkBehaviorTriggers = async (event: BehaviorEvent) => {
    try {
      // Récupérer les déclencheurs actifs pour ce type d'événement
      const { data: triggers } = await supabase
        .from('behavior_triggers')
        .select('*')
        .eq('trigger_type', event.eventType)
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
        const trigger: BehaviorTrigger = {
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
    } catch (err) {
      console.error('Error checking behavior triggers:', err);
    }
  };

  const evaluateTriggerConditions = async (
    trigger: BehaviorTrigger,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    try {
      const conditions = trigger.conditions;

      switch (trigger.triggerType) {
        case 'email_open':
          return await evaluateEmailOpenConditions(conditions, event, lead);

        case 'email_click':
          return await evaluateEmailClickConditions(conditions, event, lead);

        case 'website_visit':
          return await evaluateWebsiteVisitConditions(conditions, event, lead);

        case 'resource_download':
          return await evaluateResourceDownloadConditions(conditions, event, lead);

        case 'form_submit':
          return await evaluateFormSubmitConditions(conditions, event, lead);

        default:
          return false;
      }
    } catch (err) {
      console.error('Error evaluating trigger conditions:', err);
      return false;
    }
  };

  const evaluateEmailOpenConditions = async (
    conditions: Record<string, any>,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    // Première ouverture
    if (conditions.first_open) {
      if (event.eventSubtype === 'first_open') {
        return true;
      }
    }

    // Ouvertures multiples
    if (conditions.open_count) {
      const { data: emailTracking } = await supabase
        .from('email_tracking')
        .select('open_count')
        .eq('lead_id', event.leadId)
        .eq('email_id', event.sourceId)
        .single();

      if (emailTracking && emailTracking.open_count >= conditions.open_count) {
        return true;
      }
    }

    // Dernière ouverture récente
    if (conditions.last_open_hours) {
      const hoursSinceLastOpen = (Date.now() - new Date(event.occurredAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastOpen <= conditions.last_open_hours) {
        return true;
      }
    }

    return false;
  };

  const evaluateEmailClickConditions = async (
    conditions: Record<string, any>,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    // Clic simple
    if (conditions.any_click) {
      return true;
    }

    // Clic sur lien spécifique
    if (conditions.specific_link) {
      const clickedLink = event.eventData.link_url || event.eventData.url;
      if (clickedLink && clickedLink.includes(conditions.specific_link)) {
        return true;
      }
    }

    // Nombre de clics
    if (conditions.click_count) {
      const { data: emailTracking } = await supabase
        .from('email_tracking')
        .select('total_clicks')
        .eq('lead_id', event.leadId)
        .eq('email_id', event.sourceId)
        .single();

      if (emailTracking && emailTracking.total_clicks >= conditions.click_count) {
        return true;
      }
    }

    return false;
  };

  const evaluateWebsiteVisitConditions = async (
    conditions: Record<string, any>,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    // Visite simple
    if (conditions.any_visit) {
      return true;
    }

    // Page spécifique
    if (conditions.page_url) {
      const pageUrl = event.eventData.page_url || event.eventData.url;
      if (pageUrl && pageUrl.includes(conditions.page_url)) {
        return true;
      }
    }

    // Durée de visite
    if (conditions.duration_min) {
      const duration = event.eventData.duration_seconds || 0;
      if (duration >= conditions.duration_min * 60) {
        return true;
      }
    }

    // Fréquence de visites
    if (conditions.visits_count && conditions.visits_days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - conditions.visits_days);

      const { data: visits } = await supabase
        .from('website_visits')
        .select('id')
        .eq('lead_id', event.leadId)
        .gte('visit_started_at', daysAgo.toISOString());

      if (visits && visits.length >= conditions.visits_count) {
        return true;
      }
    }

    return false;
  };

  const evaluateResourceDownloadConditions = async (
    conditions: Record<string, any>,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    // Téléchargement simple
    if (conditions.any_download) {
      return true;
    }

    // Type de ressource
    if (conditions.resource_type) {
      const resourceType = event.eventData.resource_type;
      if (resourceType === conditions.resource_type) {
        return true;
      }
    }

    // Nom de ressource spécifique
    if (conditions.resource_name) {
      const resourceName = event.eventData.resource_name;
      if (resourceName && resourceName.includes(conditions.resource_name)) {
        return true;
      }
    }

    return false;
  };

  const evaluateFormSubmitConditions = async (
    conditions: Record<string, any>,
    event: BehaviorEvent,
    lead: Lead
  ): Promise<boolean> => {
    // Soumission simple
    if (conditions.any_submit) {
      return true;
    }

    // Type de formulaire
    if (conditions.form_type) {
      const formType = event.eventData.form_type;
      if (formType === conditions.form_type) {
        return true;
      }
    }

    // Nom de formulaire spécifique
    if (conditions.form_name) {
      const formName = event.eventData.form_name;
      if (formName && formName.includes(conditions.form_name)) {
        return true;
      }
    }

    return false;
  };

  const executeTriggerActions = async (
    trigger: BehaviorTrigger,
    event: BehaviorEvent,
    lead: Lead
  ) => {
    try {
      const actions = trigger.actionConfig;

      // Notification commercial
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

      // Mise à jour du scoring
      if (actions.scoringConfig) {
        await updateScoring(lead, actions.scoringConfig);
      }

      // Mise à jour de la température
      if (actions.temperatureConfig) {
        await updateTemperature(lead, actions.temperatureConfig);
      }

      // Changement de cycle de vie
      if (actions.lifecycleConfig) {
        await updateLifecycleStage(lead, actions.lifecycleConfig);
      }
    } catch (err) {
      console.error('Error executing trigger actions:', err);
    }
  };

  const createNotification = async (
    trigger: BehaviorTrigger,
    event: BehaviorEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système de notifications
    console.log('Notification created:', { trigger: trigger.name, lead: lead.name, event: event.eventType });
  };

  const createTask = async (
    trigger: BehaviorTrigger,
    event: BehaviorEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    await supabase
      .from('automated_tasks')
      .insert({
        task_type: config?.taskType || 'follow_up',
        lead_id: lead.id,
        assigned_to: (lead as any).assigned_to || (lead as any).assignedTo,
        title: config?.title || `Action suite à ${event.eventType} : ${lead.name || lead.company}`,
        description: config?.description || `Événement détecté : ${event.eventType}. Déclencheur : ${trigger.name}`,
        priority: config?.priority || 'Moyenne',
        tags: config?.tags || [event.eventType, 'Comportement'],
        metadata: {
          triggerId: trigger.id,
          eventId: event.id,
          eventType: event.eventType,
        },
      });
  };

  const sendEmail = async (
    trigger: BehaviorTrigger,
    event: BehaviorEvent,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système d'envoi d'emails
    console.log('Email sent:', { trigger: trigger.name, lead: lead.name, template: config?.templateId });
  };

  const updateScoring = async (lead: Lead, config: Record<string, any>) => {
    const currentScore = (lead as any).quality_score || (lead as any).qualityScore || 0;
    const increase = config.increase || 0;
    const newScore = Math.min(currentScore + increase, 100);

    await supabase
      .from('leads')
      .update({ quality_score: newScore })
      .eq('id', lead.id);
  };

  const updateTemperature = async (lead: Lead, config: Record<string, any>) => {
    if (config.newTemperature) {
      await supabase
        .from('leads')
        .update({ temperature: config.newTemperature })
        .eq('id', lead.id);
    }
  };

  const updateLifecycleStage = async (lead: Lead, config: Record<string, any>) => {
    if (config.newStage) {
      await supabase
        .from('leads')
        .update({ lifecycle_stage: config.newStage })
        .eq('id', lead.id);
    }
  };

  return {
    loading,
    error,
    recordBehaviorEvent,
    checkBehaviorTriggers,
  };
};

