import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useLifecycleStages } from './useLifecycleStages';
import { useVIPLeads } from './useVIPLeads';

export type DataChangeType = 
  | 'status_change' 
  | 'score_change' 
  | 'temperature_change' 
  | 'tag_change'
  | 'field_change' 
  | 'duplicate_detected' 
  | 'merge' 
  | 'other';

export interface DataChange {
  id: string;
  leadId: string;
  changeType: DataChangeType;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeDetails: Record<string, any>;
  changedAt: string;
  changedBy?: string;
  processed: boolean;
  processedAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface DataTrigger {
  id: string;
  name: string;
  description?: string;
  triggerType: DataChangeType | 'custom';
  conditions: Record<string, any>;
  actionConfig: {
    actionType: string;
    emailConfig?: Record<string, any>;
    taskConfig?: Record<string, any>;
    notificationConfig?: Record<string, any>;
    workflowConfig?: Record<string, any>;
    [key: string]: any;
  };
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useDataTriggers = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const { transitionLeadStage } = useLifecycleStages();
  const { detectVIPLead } = useVIPLeads();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recordDataChange = async (
    leadId: string,
    changeType: DataChangeType,
    fieldName: string,
    oldValue: any,
    newValue: any,
    changeDetails?: Record<string, any>
  ): Promise<DataChange> => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('data_changes')
        .insert({
          lead_id: leadId,
          change_type: changeType,
          field_name: fieldName,
          old_value: oldValue ? String(oldValue) : null,
          new_value: newValue ? String(newValue) : null,
          change_details: changeDetails || {},
          changed_by: userId,
          processed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const change: DataChange = {
        id: data.id,
        leadId: data.lead_id,
        changeType: data.change_type,
        fieldName: data.field_name,
        oldValue: data.old_value,
        newValue: data.new_value,
        changeDetails: data.change_details || {},
        changedAt: data.changed_at,
        changedBy: data.changed_by,
        processed: data.processed,
        processedAt: data.processed_at,
        metadata: data.metadata || {},
        createdAt: data.created_at,
      };

      // Vérifier les déclencheurs correspondants
      await checkDataTriggers(change);

      setError(null);
      return change;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkDataTriggers = async (change: DataChange) => {
    try {
      // Récupérer les déclencheurs actifs pour ce type de changement
      const { data: triggers } = await supabase
        .from('data_triggers')
        .select('*')
        .eq('trigger_type', change.changeType)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!triggers || triggers.length === 0) return;

      // Récupérer le lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', change.leadId)
        .single();

      if (!lead) return;

      // Vérifier chaque déclencheur
      for (const triggerData of triggers) {
        const trigger: DataTrigger = {
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
        const matches = await evaluateTriggerConditions(trigger, change, lead);
        if (matches) {
          // Exécuter les actions
          await executeTriggerActions(trigger, change, lead);
        }
      }

      // Marquer le changement comme traité
      await supabase
        .from('data_changes')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', change.id);
    } catch (err) {
      console.error('Error checking data triggers:', err);
    }
  };

  const evaluateTriggerConditions = async (
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead
  ): Promise<boolean> => {
    try {
      const conditions = trigger.conditions;

      switch (trigger.triggerType) {
        case 'status_change':
          return await evaluateStatusChangeConditions(conditions, change);

        case 'score_change':
          return await evaluateScoreChangeConditions(conditions, change, lead);

        case 'temperature_change':
          return await evaluateTemperatureChangeConditions(conditions, change);

        case 'tag_change':
          return await evaluateTagChangeConditions(conditions, change, lead);

        case 'field_change':
          return await evaluateFieldChangeConditions(conditions, change);

        case 'duplicate_detected':
          return await evaluateDuplicateConditions(conditions, change);

        default:
          return false;
      }
    } catch (err) {
      console.error('Error evaluating trigger conditions:', err);
      return false;
    }
  };

  const evaluateStatusChangeConditions = async (
    conditions: Record<string, any>,
    change: DataChange
  ): Promise<boolean> => {
    // Vérifier le statut source
    if (conditions.from_status) {
      if (change.oldValue !== conditions.from_status) {
        return false;
      }
    }

    // Vérifier le statut cible
    if (conditions.to_status) {
      if (change.newValue !== conditions.to_status) {
        return false;
      }
    }

    // Vérifier si c'est une liste de statuts
    if (conditions.from_statuses && Array.isArray(conditions.from_statuses)) {
      if (!conditions.from_statuses.includes(change.oldValue)) {
        return false;
      }
    }

    if (conditions.to_statuses && Array.isArray(conditions.to_statuses)) {
      if (!conditions.to_statuses.includes(change.newValue)) {
        return false;
      }
    }

    return true;
  };

  const evaluateScoreChangeConditions = async (
    conditions: Record<string, any>,
    change: DataChange,
    lead: Lead
  ): Promise<boolean> => {
    const oldScore = change.oldValue ? parseFloat(change.oldValue) : 0;
    const newScore = change.newValue ? parseFloat(change.newValue) : 0;
    const scoreDiff = newScore - oldScore;

    // Augmentation
    if (conditions.increase_threshold) {
      if (scoreDiff >= conditions.increase_threshold) {
        return true;
      }
    }

    // Diminution
    if (conditions.decrease_threshold) {
      if (scoreDiff <= -conditions.decrease_threshold) {
        return true;
      }
    }

    // Seuil atteint
    if (conditions.min_score) {
      if (newScore >= conditions.min_score && oldScore < conditions.min_score) {
        return true;
      }
    }

    if (conditions.max_score) {
      if (newScore <= conditions.max_score && oldScore > conditions.max_score) {
        return true;
      }
    }

    return false;
  };

  const evaluateTemperatureChangeConditions = async (
    conditions: Record<string, any>,
    change: DataChange
  ): Promise<boolean> => {
    // Vérifier la transition
    if (conditions.from_temperature && conditions.to_temperature) {
      if (change.oldValue === conditions.from_temperature && 
          change.newValue === conditions.to_temperature) {
        return true;
      }
    }

    // Vérifier si c'est une liste de transitions
    if (conditions.transitions && Array.isArray(conditions.transitions)) {
      const transition = `${change.oldValue} → ${change.newValue}`;
      if (conditions.transitions.includes(transition)) {
        return true;
      }
    }

    return false;
  };

  const evaluateTagChangeConditions = async (
    conditions: Record<string, any>,
    change: DataChange,
    lead: Lead
  ): Promise<boolean> => {
    // Tag ajouté
    if (conditions.tag_added) {
      if (change.changeDetails.tagAdded === conditions.tag_added) {
        return true;
      }
    }

    // Tag supprimé
    if (conditions.tag_removed) {
      if (change.changeDetails.tagRemoved === conditions.tag_removed) {
        return true;
      }
    }

    // Liste de tags
    if (conditions.tags_added && Array.isArray(conditions.tags_added)) {
      const addedTags = change.changeDetails.tagsAdded || [];
      if (conditions.tags_added.some((tag: string) => addedTags.includes(tag))) {
        return true;
      }
    }

    return false;
  };

  const evaluateFieldChangeConditions = async (
    conditions: Record<string, any>,
    change: DataChange
  ): Promise<boolean> => {
    // Champ spécifique
    if (conditions.field_name) {
      if (change.fieldName !== conditions.field_name) {
        return false;
      }
    }

    // Valeur spécifique
    if (conditions.field_value) {
      if (change.newValue !== conditions.field_value) {
        return false;
      }
    }

    // Comparaison de valeur
    if (conditions.field_value_gt) {
      const numValue = parseFloat(change.newValue || '0');
      if (numValue <= conditions.field_value_gt) {
        return false;
      }
    }

    if (conditions.field_value_lt) {
      const numValue = parseFloat(change.newValue || '0');
      if (numValue >= conditions.field_value_lt) {
        return false;
      }
    }

    return true;
  };

  const evaluateDuplicateConditions = async (
    conditions: Record<string, any>,
    change: DataChange
  ): Promise<boolean> => {
    // Score de similarité minimum
    if (conditions.min_similarity) {
      const similarity = change.changeDetails.similarityScore || 0;
      if (similarity < conditions.min_similarity) {
        return false;
      }
    }

    return true;
  };

  const executeTriggerActions = async (
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead
  ) => {
    try {
      const actions = trigger.actionConfig;

      // Enregistrer l'exécution
      const { data: execution } = await supabase
        .from('data_trigger_executions')
        .insert({
          data_trigger_id: trigger.id,
          data_change_id: change.id,
          lead_id: lead.id,
          execution_status: 'pending',
        })
        .select()
        .single();

      try {
        // Notification
        if (actions.actionType === 'notification' || actions.notificationConfig) {
          await createNotification(trigger, change, lead, actions.notificationConfig);
        }

        // Création de tâche
        if (actions.actionType === 'task' || actions.taskConfig) {
          await createTask(trigger, change, lead, actions.taskConfig);
        }

        // Envoi d'email
        if (actions.actionType === 'email' || actions.emailConfig) {
          await sendEmail(trigger, change, lead, actions.emailConfig);
        }

        // Changement de workflow/scénario
        if (actions.workflowConfig) {
          await executeWorkflow(trigger, change, lead, actions.workflowConfig);
        }

        // Marquer l'exécution comme complétée
        if (execution) {
          await supabase
            .from('data_trigger_executions')
            .update({
              execution_status: 'completed',
            })
            .eq('id', execution.id);
        }
      } catch (err) {
        // Marquer l'exécution comme échouée
        if (execution) {
          await supabase
            .from('data_trigger_executions')
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
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système de notifications
    console.log('Notification created:', { trigger: trigger.name, lead: lead.name, change: change.changeType });
  };

  const createTask = async (
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    await supabase
      .from('automated_tasks')
      .insert({
        task_type: config?.taskType || 'follow_up',
        lead_id: lead.id,
        assigned_to: (lead as any).assigned_to || (lead as any).assignedTo,
        title: config?.title || `Action suite à ${change.changeType} : ${lead.name || lead.company}`,
        description: config?.description || `Changement détecté : ${change.fieldName} de "${change.oldValue}" à "${change.newValue}". Déclencheur : ${trigger.name}`,
        priority: config?.priority || 'Moyenne',
        tags: config?.tags || [change.changeType, 'Données'],
        metadata: {
          triggerId: trigger.id,
          changeId: change.id,
          changeType: change.changeType,
        },
      });
  };

  const sendEmail = async (
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead,
    config?: Record<string, any>
  ) => {
    // TODO: Intégrer avec système d'envoi d'emails
    console.log('Email sent:', { trigger: trigger.name, lead: lead.name, template: config?.templateId });
  };

  const executeWorkflow = async (
    trigger: DataTrigger,
    change: DataChange,
    lead: Lead,
    config: Record<string, any>
  ) => {
    try {
      // Exécuter un scénario spécifique selon le type de changement
      if (config.scenario === 'client_conversion' && change.newValue === 'Gagné') {
        // Scénario "Conversion Client" (déjà développé)
        // TODO: Appeler les fonctions appropriées
      } else if (config.scenario === 'vip_escalation' && change.changeDetails.tagAdded === 'VIP') {
        // Scénario "Escalade Lead VIP"
        await detectVIPLead(lead, 90, 50000);
      } else if (config.scenario === 'sql_qualification' && change.newValue && parseFloat(change.newValue) >= 75) {
        // Scénario "Qualification SQL"
        // TODO: Appeler useSQLQualification
      }
    } catch (err) {
      console.error('Error executing workflow:', err);
    }
  };

  return {
    loading,
    error,
    recordDataChange,
    checkDataTriggers,
  };
};

