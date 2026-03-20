import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useLeadReactivation } from './useLeadReactivation';

export type TriggerEventType = 
  | 'recruitment' 
  | 'fundraising' 
  | 'expansion' 
  | 'relocation' 
  | 'tech_change' 
  | 'media_event' 
  | 'leadership_change' 
  | 'other';

export type TriggerEventSource = 'scraping' | 'monitoring' | 'ai' | 'manual';

export type TriggerActionType = 
  | 'data_enrichment' 
  | 'score_update' 
  | 'temperature_update' 
  | 'tag_update'
  | 'email_sent' 
  | 'task_created' 
  | 'notification_sent' 
  | 'reactivation';

export type TriggerActionStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export interface TriggerEvent {
  id: string;
  leadId: string;
  eventType: TriggerEventType;
  eventTitle: string;
  eventDescription?: string;
  eventDate?: string;
  detectedAt: string;
  source: TriggerEventSource;
  sourceUrl?: string;
  confidenceScore: number;
  isPositive: boolean;
  dataBefore: Record<string, any>;
  dataAfter: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerEventAction {
  id: string;
  triggerEventId: string;
  actionType: TriggerActionType;
  actionStatus: TriggerActionStatus;
  actionData: Record<string, any>;
  executedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export const useTriggerEvents = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const { reactivateLostLead } = useLeadReactivation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectTriggerEvent = async (
    leadId: string,
    eventType: TriggerEventType,
    eventData: {
      title: string;
      description?: string;
      date?: string;
      source: TriggerEventSource;
      sourceUrl?: string;
      confidenceScore?: number;
      isPositive?: boolean;
      dataBefore?: Record<string, any>;
      dataAfter?: Record<string, any>;
    }
  ): Promise<TriggerEvent> => {
    try {
      setLoading(true);

      // Récupérer les données actuelles du lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) throw new Error('Lead non trouvé');

      const dataBefore = eventData.dataBefore || {
        lifecycleStage: lead.lifecycle_stage,
        qualityScore: lead.quality_score,
        temperature: lead.temperature,
        tags: lead.tags || [],
      };

      // Créer l'événement
      const { data, error: insertError } = await supabase
        .from('trigger_events')
        .insert({
          lead_id: leadId,
          event_type: eventType,
          event_title: eventData.title,
          event_description: eventData.description,
          event_date: eventData.date,
          source: eventData.source,
          source_url: eventData.sourceUrl,
          confidence_score: eventData.confidenceScore || 80,
          is_positive: eventData.isPositive !== false,
          data_before: dataBefore,
          data_after: eventData.dataAfter || {},
          processed: false,
          metadata: {
            leadName: lead.name || lead.company,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const triggerEvent: TriggerEvent = {
        id: data.id,
        leadId: data.lead_id,
        eventType: data.event_type,
        eventTitle: data.event_title,
        eventDescription: data.event_description,
        eventDate: data.event_date,
        detectedAt: data.detected_at,
        source: data.source,
        sourceUrl: data.source_url,
        confidenceScore: data.confidence_score,
        isPositive: data.is_positive,
        dataBefore: data.data_before,
        dataAfter: data.data_after,
        processed: data.processed,
        processedAt: data.processed_at,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Traiter l'événement
      await processTriggerEvent(triggerEvent, lead);

      setError(null);
      return triggerEvent;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processTriggerEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      // 1. Enrichir les données
      await enrichDataFromEvent(triggerEvent, lead);

      // 2. Mettre à jour le scoring
      await updateScoreFromEvent(triggerEvent, lead);

      // 3. Mettre à jour la température
      await updateTemperatureFromEvent(triggerEvent, lead);

      // 4. Mettre à jour les tags
      await updateTagsFromEvent(triggerEvent, lead);

      // 5. Enregistrer dans la timeline
      await recordInTimeline(triggerEvent, lead);

      // 6. Actions automatiques selon type d'événement
      await executeEventSpecificActions(triggerEvent, lead);

      // 7. Notification commercial
      await notifySalesTeam(triggerEvent, lead);

      // 8. Réactivation si lead inactif/perdu
      if (lead.lifecycleStage === 'Inactif' || lead.lifecycleStage === 'Perdu') {
        if (triggerEvent.isPositive) {
          await reactivateFromEvent(triggerEvent, lead);
        }
      }

      // Marquer comme traité
      await supabase
        .from('trigger_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', triggerEvent.id);
    } catch (err) {
      console.error('Error processing trigger event:', err);
    }
  };

  const enrichDataFromEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      const updates: Record<string, any> = {};

      // Mettre à jour selon le type d'événement
      switch (triggerEvent.eventType) {
        case 'recruitment':
          // Mise à jour effectifs
          if (triggerEvent.dataAfter.employeeCount) {
            updates.employee_count = triggerEvent.dataAfter.employeeCount;
          }
          break;
        case 'fundraising':
          // Mise à jour financement
          if (triggerEvent.dataAfter.fundingAmount) {
            updates.funding_amount = triggerEvent.dataAfter.fundingAmount;
          }
          break;
        case 'expansion':
          // Mise à jour localisation
          if (triggerEvent.dataAfter.locations) {
            updates.locations = triggerEvent.dataAfter.locations;
          }
          break;
        case 'relocation':
          // Mise à jour adresse
          if (triggerEvent.dataAfter.address) {
            updates.address = triggerEvent.dataAfter.address;
          }
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('leads')
          .update(updates)
          .eq('id', lead.id);

        // Enregistrer l'action
        await recordAction(triggerEvent.id, 'data_enrichment', {
          updates,
        });
      }
    } catch (err) {
      console.error('Error enriching data:', err);
    }
  };

  const updateScoreFromEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      if (!triggerEvent.isPositive) return;

      // Augmenter le score selon le type d'événement
      let scoreIncrease = 0;
      switch (triggerEvent.eventType) {
        case 'fundraising':
          scoreIncrease = 15;
          break;
        case 'expansion':
          scoreIncrease = 10;
          break;
        case 'recruitment':
          scoreIncrease = 8;
          break;
        case 'media_event':
          scoreIncrease = 5;
          break;
        default:
          scoreIncrease = 3;
      }

      const newScore = Math.min((lead.qualityScore || 0) + scoreIncrease, 100);

      await supabase
        .from('leads')
        .update({ quality_score: newScore })
        .eq('id', lead.id);

      // Enregistrer l'action
      await recordAction(triggerEvent.id, 'score_update', {
        oldScore: lead.qualityScore || 0,
        newScore,
        increase: scoreIncrease,
      });
    } catch (err) {
      console.error('Error updating score:', err);
    }
  };

  const updateTemperatureFromEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      if (!triggerEvent.isPositive) return;

      // Mettre à jour la température
      const currentTemp = lead.temperature || 'Froid';
      let newTemp = currentTemp;

      if (currentTemp === 'Froid' && triggerEvent.confidenceScore >= 70) {
        newTemp = 'Tiède';
      } else if (currentTemp === 'Tiède' && triggerEvent.confidenceScore >= 80) {
        newTemp = 'Chaud';
      }

      if (newTemp !== currentTemp) {
        await supabase
          .from('leads')
          .update({ temperature: newTemp })
          .eq('id', lead.id);

        // Enregistrer l'action
        await recordAction(triggerEvent.id, 'temperature_update', {
          oldTemperature: currentTemp,
          newTemperature: newTemp,
        });
      }
    } catch (err) {
      console.error('Error updating temperature:', err);
    }
  };

  const updateTagsFromEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      const currentTags = lead.tags || [];
      const eventTag = `Événement: ${triggerEvent.eventType}`;

      if (!currentTags.includes(eventTag)) {
        const newTags = [...currentTags, eventTag];

        await supabase
          .from('leads')
          .update({ tags: newTags })
          .eq('id', lead.id);

        // Enregistrer l'action
        await recordAction(triggerEvent.id, 'tag_update', {
          addedTags: [eventTag],
        });
      }
    } catch (err) {
      console.error('Error updating tags:', err);
    }
  };

  const recordInTimeline = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      // Enregistrer dans sales_activities
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: lead.id,
          activity_type: 'event',
          description: `Événement détecté : ${triggerEvent.eventTitle}`,
          metadata: {
            eventType: triggerEvent.eventType,
            eventId: triggerEvent.id,
            source: triggerEvent.source,
          },
        });
    } catch (err) {
      console.error('Error recording in timeline:', err);
    }
  };

  const executeEventSpecificActions = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      let emailSubject = '';
      let emailContent = '';

      switch (triggerEvent.eventType) {
        case 'recruitment':
          emailSubject = 'Félicitations pour votre croissance !';
          emailContent = `Nous avons appris que vous recrutez. Félicitations pour votre croissance ! Nous pourrions vous aider avec nos solutions de recrutement.`;
          break;
        case 'fundraising':
          emailSubject = 'Félicitations pour votre financement !';
          emailContent = `Félicitations pour votre levée de fonds ! Nous pourrions vous accompagner dans votre scaling.`;
          break;
        case 'expansion':
          emailSubject = 'Félicitations pour votre expansion !';
          emailContent = `Félicitations pour votre expansion ! Nous proposons des solutions multi-sites adaptées.`;
          break;
        case 'relocation':
          emailSubject = 'Bienvenue dans votre nouvelle région !';
          emailContent = `Nous avons appris votre déménagement. Bienvenue ! Nous proposons des services locaux adaptés.`;
          break;
        case 'tech_change':
          emailSubject = 'Nous avons vu votre évolution technologique';
          emailContent = `Nous avons remarqué votre évolution technologique. Nous pourrions vous aider avec une migration ou un upgrade.`;
          break;
        default:
          return; // Pas d'email pour les autres types
      }

      // TODO: Envoyer l'email via le système d'envoi
      // Enregistrer l'action
      await recordAction(triggerEvent.id, 'email_sent', {
        subject: emailSubject,
        content: emailContent,
      });
    } catch (err) {
      console.error('Error executing event-specific actions:', err);
    }
  };

  const notifySalesTeam = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      // Créer une tâche pour le commercial
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: lead.assignedTo,
          title: `Contacter ${lead.name || lead.company} - Événement ${triggerEvent.eventType}`,
          description: `Événement déclencheur détecté : ${triggerEvent.eventTitle}\n\n${triggerEvent.eventDescription || ''}\n\nSource : ${triggerEvent.source}\nConfiance : ${triggerEvent.confidenceScore}%`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // J+1
          tags: ['Événement', 'Opportunité', triggerEvent.eventType],
          metadata: {
            triggerEventId: triggerEvent.id,
            eventType: triggerEvent.eventType,
            isPositive: triggerEvent.isPositive,
          },
        });

      // Enregistrer l'action
      await recordAction(triggerEvent.id, 'task_created', {
        taskType: 'follow_up',
        priority: 'Haute',
      });

      await recordAction(triggerEvent.id, 'notification_sent', {
        recipient: lead.assignedTo,
        type: 'task',
      });
    } catch (err) {
      console.error('Error notifying sales team:', err);
    }
  };

  const reactivateFromEvent = async (triggerEvent: TriggerEvent, lead: Lead) => {
    try {
      // Réactiver le lead
      const newStage = lead.qualityScore && lead.qualityScore >= 75 ? 'MQL' : 'Lead';

      await supabase
        .from('leads')
        .update({
          lifecycle_stage: newStage,
          // TODO: Retirer tag "Perdu" et ajouter tag "Réactivé"
        })
        .eq('id', lead.id);

      // Utiliser le hook de réactivation pour les notifications
      // reactivateLostLead attend (lead: Lead, signalType: SignalType, signalData: Record<string, any>, minScore?: number)
      // SignalType peut être 'event_detected' pour les événements déclencheurs
      const signalData = {
        eventType: triggerEvent.eventType,
        eventTitle: triggerEvent.eventTitle,
        eventDescription: triggerEvent.eventDescription,
        source: triggerEvent.source,
        confidenceScore: triggerEvent.confidenceScore,
        triggerEventId: triggerEvent.id,
        detectedAt: triggerEvent.detectedAt,
        isPositive: triggerEvent.isPositive,
      };
      
      // Appeler la fonction de réactivation avec 'event_detected' comme signalType
      try {
        await reactivateLostLead(lead, 'event_detected', signalData, 50);
      } catch (err) {
        // Si la réactivation échoue (lead pas "Perdu" ou score insuffisant), on fait la réactivation manuelle
        console.warn('Could not use reactivateLostLead hook, doing manual reactivation:', err);
        
        // Réactivation manuelle
        await supabase
          .from('leads')
          .update({
            lifecycle_stage: newStage,
          })
          .eq('id', lead.id);
      }

      // Enregistrer l'action
      await recordAction(triggerEvent.id, 'reactivation', {
        oldStage: lead.lifecycleStage,
        newStage,
      });
    } catch (err) {
      console.error('Error reactivating from event:', err);
    }
  };

  const recordAction = async (
    triggerEventId: string,
    actionType: TriggerActionType,
    actionData: Record<string, any>
  ) => {
    try {
      await supabase
        .from('trigger_event_actions')
        .insert({
          trigger_event_id: triggerEventId,
          action_type: actionType,
          action_status: 'completed',
          action_data: actionData,
          executed_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Error recording action:', err);
    }
  };

  return {
    loading,
    error,
    detectTriggerEvent,
    processTriggerEvent,
  };
};

