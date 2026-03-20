import { useState } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useEmailTemplates } from './useEmailTemplates';
import {
  updateLeadStatus,
  updateLeadScoring,
  updateLeadTemperature,
  updateLeadTags,
  updateLeadCustomField,
  bulkUpdateLead,
  UpdateStatusParams,
  UpdateScoringParams,
  UpdateTemperatureParams,
  UpdateTagsParams,
  UpdateCustomFieldParams,
} from '../../services/leadDataActions';

export type ActionType = 
  | 'email' 
  | 'sms' 
  | 'whatsapp' 
  | 'in_app_notification' 
  | 'slack_notification'
  | 'teams_notification' 
  | 'voip_call'
  | 'update_status'
  | 'update_scoring'
  | 'update_temperature'
  | 'update_tags'
  | 'update_custom_field'
  | 'bulk_update'
  | 'create_task'
  | 'create_appointment'
  | 'create_note'
  | 'create_quote'
  | 'create_project'
  | 'assign_lead'
  | 'reassign_lead'
  | 'escalate_to_manager'
  | 'transfer_to_team'
  | 'enrich_lead'
  | 'other';

export interface AutomatedAction {
  id: string;
  name: string;
  description?: string;
  actionType: ActionType;
  config: Record<string, any>;
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionExecution {
  id: string;
  automatedActionId: string;
  leadId: string;
  triggerId?: string;
  triggerType?: string;
  executionStatus: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt?: string;
  executedAt?: string;
  errorMessage?: string;
  resultData: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useAutomatedActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Utiliser le service avancé de remplacement de variables
  const replaceVariables = (template: string, variables: Record<string, any>): string => {
    const { replaceVariables: replaceVarsAdvanced } = require('../../utils/variableReplacement');
    return replaceVarsAdvanced(template, { lead: variables.lead || variables, ...variables }, variables);
  };

  const executeAction = async (
    action: AutomatedAction,
    lead: Lead,
    triggerId?: string,
    triggerType?: string,
    scheduledAt?: string
  ): Promise<ActionExecution> => {
    try {
      setLoading(true);

      // Créer l'exécution
      const { data: executionData, error: execError } = await supabase
        .from('action_executions')
        .insert({
          automated_action_id: action.id,
          lead_id: lead.id,
          trigger_id: triggerId,
          trigger_type: triggerType,
          execution_status: scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: scheduledAt,
        })
        .select()
        .single();

      if (execError) throw execError;

      const execution: ActionExecution = {
        id: executionData.id,
        automatedActionId: executionData.automated_action_id,
        leadId: executionData.lead_id,
        triggerId: executionData.trigger_id,
        triggerType: executionData.trigger_type,
        executionStatus: executionData.execution_status,
        scheduledAt: executionData.scheduled_at,
        executedAt: executionData.executed_at,
        errorMessage: executionData.error_message,
        resultData: executionData.result_data || {},
        metadata: executionData.metadata || {},
        createdAt: executionData.created_at,
      };

      // Si l'action est programmée, on ne l'exécute pas maintenant
      if (scheduledAt && new Date(scheduledAt) > new Date()) {
        setError(null);
        return execution;
      }

      // Exécuter l'action selon son type
      await processAction(action, lead, execution);

      setError(null);
      return execution;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ) => {
    try {
      // Marquer comme en traitement
      await supabase
        .from('action_executions')
        .update({ execution_status: 'processing' })
        .eq('id', execution.id);

      let result: Record<string, any> = {};

      switch (action.actionType) {
        case 'email':
          result = await executeEmailAction(action, lead, execution);
          break;
        case 'sms':
          result = await executeSMSAction(action, lead, execution);
          break;
        case 'whatsapp':
          result = await executeWhatsAppAction(action, lead, execution);
          break;
        case 'in_app_notification':
          result = await executeInAppNotification(action, lead, execution);
          break;
        case 'slack_notification':
        case 'teams_notification':
          result = await executeSlackTeamsNotification(action, lead, execution);
          break;
        case 'voip_call':
          result = await executeVoIPCall(action, lead, execution);
          break;
        case 'update_status':
          result = await executeUpdateStatusAction(action, lead, execution);
          break;
        case 'update_scoring':
          result = await executeUpdateScoringAction(action, lead, execution);
          break;
        case 'update_temperature':
          result = await executeUpdateTemperatureAction(action, lead, execution);
          break;
        case 'update_tags':
          result = await executeUpdateTagsAction(action, lead, execution);
          break;
        case 'update_custom_field':
          result = await executeUpdateCustomFieldAction(action, lead, execution);
          break;
        case 'bulk_update':
          result = await executeBulkUpdateAction(action, lead, execution);
          break;
        case 'enrich_lead':
          result = await executeEnrichLeadAction(action, lead, execution);
          break;
        default:
          throw new Error(`Type d'action non supporté : ${action.actionType}`);
      }

      // Marquer comme complété
      await supabase
        .from('action_executions')
        .update({
          execution_status: 'completed',
          executed_at: new Date().toISOString(),
          result_data: result,
        })
        .eq('id', execution.id);
    } catch (err) {
      // Marquer comme échoué
      await supabase
        .from('action_executions')
        .update({
          execution_status: 'failed',
          error_message: (err as Error).message,
        })
        .eq('id', execution.id);
      throw err;
    }
  };

  const executeEmailAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;
    
    // Vérifier le désabonnement
    const { data: preferences } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', lead.id)
      .single();

    if (preferences?.email_unsubscribed) {
      throw new Error('Lead désabonné des emails');
    }

    // Récupérer le template si spécifié
    let subject = config.subject || '';
    let bodyHtml = config.bodyHtml || '';
    let bodyText = config.bodyText || '';

    if (config.templateId) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', config.templateId)
        .single();

      if (template) {
        subject = template.subject || '';
        bodyHtml = template.body_html || '';
        bodyText = template.body_text || '';
      }
    }

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      ...config.variables,
    };

    subject = replaceVariables(subject, variables);
    bodyHtml = replaceVariables(bodyHtml, variables);
    bodyText = replaceVariables(bodyText, variables);

    // Déterminer l'expéditeur
    const fromEmail = config.fromEmail || (lead as any).assigned_to_email || 'noreply@agencyos.com';
    const fromName = config.fromName || (lead as any).assigned_to_name || 'AgencyOS';

    // Enregistrer l'action email
    const { data: emailAction } = await supabase
      .from('email_actions')
      .insert({
        action_execution_id: execution.id,
        template_id: config.templateId,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        from_email: fromEmail,
        from_name: fromName,
        reply_to: config.replyTo || fromEmail,
        to_email: lead.email || '',
        to_name: lead.name || lead.company || '',
        cc: config.cc || [],
        bcc: config.bcc || [],
        attachments: config.attachments || [],
        variables,
        tracking_enabled: config.trackingEnabled !== false,
      })
      .select()
      .single();

    // TODO: Intégrer avec service d'envoi d'email (SendGrid, Mailgun, etc.)
    // Pour l'instant, on simule l'envoi
    await supabase
      .from('email_actions')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', emailAction.id);

    return {
      emailActionId: emailAction.id,
      sent: true,
      sentAt: new Date().toISOString(),
    };
  };

  const executeSMSAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Vérifier le consentement SMS
    const { data: preferences } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', lead.id)
      .single();

    if (preferences?.sms_unsubscribed) {
      throw new Error('Lead désabonné des SMS');
    }

    if (!lead.phone) {
      throw new Error('Numéro de téléphone manquant');
    }

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      lien: config.link || '',
      ...config.variables,
    };

    let message = replaceVariables(config.message || '', variables);

    // Vérifier la longueur (160 caractères)
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    // Enregistrer l'action SMS
    const { data: smsAction } = await supabase
      .from('sms_actions')
      .insert({
        action_execution_id: execution.id,
        provider: config.provider || 'twilio',
        to_phone: lead.phone,
        message,
        variables,
      })
      .select()
      .single();

    // TODO: Intégrer avec API SMS (Twilio, MessageBird, etc.)
    // Pour l'instant, on simule l'envoi
    await supabase
      .from('sms_actions')
      .update({
        sent_at: new Date().toISOString(),
        cost: config.cost || 0.05, // Coût par défaut
      })
      .eq('id', smsAction.id);

    return {
      smsActionId: smsAction.id,
      sent: true,
      sentAt: new Date().toISOString(),
      cost: config.cost || 0.05,
    };
  };

  const executeWhatsAppAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Vérifier le consentement WhatsApp
    const { data: preferences } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', lead.id)
      .single();

    if (preferences?.whatsapp_unsubscribed) {
      throw new Error('Lead désabonné de WhatsApp');
    }

    if (!lead.phone) {
      throw new Error('Numéro de téléphone manquant');
    }

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      lien: config.link || '',
      ...config.variables,
    };

    // Enregistrer l'action WhatsApp
    const { data: whatsappAction } = await supabase
      .from('whatsapp_actions')
      .insert({
        action_execution_id: execution.id,
        provider: config.provider || 'twilio',
        to_phone: lead.phone,
        message_type: config.messageType || 'text',
        message_text: config.messageText || '',
        media_url: config.mediaUrl,
        template_name: config.templateName,
        template_params: config.templateParams || {},
        variables,
      })
      .select()
      .single();

    // TODO: Intégrer avec API WhatsApp Business (Twilio, MessageBird, etc.)
    // Pour l'instant, on simule l'envoi
    await supabase
      .from('whatsapp_actions')
      .update({
        sent_at: new Date().toISOString(),
        cost: config.cost || 0.10, // Coût par défaut
      })
      .eq('id', whatsappAction.id);

    return {
      whatsappActionId: whatsappAction.id,
      sent: true,
      sentAt: new Date().toISOString(),
      cost: config.cost || 0.10,
    };
  };

  const executeInAppNotification = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Déterminer l'utilisateur destinataire
    const userId = config.userId || (lead as any).assigned_to;
    if (!userId) {
      throw new Error('Utilisateur destinataire non spécifié');
    }

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      ...config.variables,
    };

    let title = replaceVariables(config.title || '', variables);
    let message = replaceVariables(config.message || '', variables);

    // Enregistrer la notification
    const { data: notification } = await supabase
      .from('in_app_notifications')
      .insert({
        action_execution_id: execution.id,
        user_id: userId,
        title,
        message,
        priority: config.priority || 'Moyenne',
        action_url: config.actionUrl || `/leads/${lead.id}`,
        action_label: config.actionLabel || 'Voir le lead',
        metadata: {
          leadId: lead.id,
          leadName: lead.name || lead.company,
        },
      })
      .select()
      .single();

    // TODO: Envoyer notification push si supporté
    return {
      notificationId: notification.id,
      sent: true,
      createdAt: notification.created_at,
    };
  };

  const executeSlackTeamsNotification = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Remplacer les variables
    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      ...config.variables,
    };

    let message = replaceVariables(config.message || '', variables);

    // Construire le message structuré
    const structuredMessage = {
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
        ...(config.actionButtons || []).map((button: any) => ({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: button.label,
              },
              url: button.url,
            },
          ],
        })),
      ],
    };

    // Enregistrer la notification
    const { data: notification } = await supabase
      .from('slack_teams_notifications')
      .insert({
        action_execution_id: execution.id,
        platform: action.actionType === 'slack_notification' ? 'slack' : 'teams',
        webhook_url: config.webhookUrl,
        channel: config.channel,
        message: JSON.stringify(structuredMessage),
        mentions: config.mentions || [],
        action_buttons: config.actionButtons || [],
      })
      .select()
      .single();

    // TODO: Envoyer webhook vers Slack/Teams
    // Pour l'instant, on simule l'envoi
    await supabase
      .from('slack_teams_notifications')
      .update({
        sent_at: new Date().toISOString(),
        response_status: 200,
      })
      .eq('id', notification.id);

    return {
      notificationId: notification.id,
      sent: true,
      sentAt: new Date().toISOString(),
    };
  };

  const executeVoIPCall = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    if (!lead.phone) {
      throw new Error('Numéro de téléphone manquant');
    }

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      ...config.variables,
    };

    let script = config.script || '';
    Object.entries(variables).forEach(([key, value]) => {
      script = script.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    // Enregistrer l'appel
    const { data: call } = await supabase
      .from('voip_calls')
      .insert({
        action_execution_id: execution.id,
        provider: config.provider || 'twilio',
        from_phone: config.fromPhone,
        to_phone: lead.phone,
        call_type: config.callType || 'outbound',
        script,
        scheduled_at: config.scheduledAt,
      })
      .select()
      .single();

    // TODO: Intégrer avec API VoIP (Twilio, Vonage, etc.)
    // Pour l'instant, on simule l'appel
    if (!config.scheduledAt || new Date(config.scheduledAt) <= new Date()) {
      await supabase
        .from('voip_calls')
        .update({
          initiated_at: new Date().toISOString(),
          call_status: 'completed',
          duration_seconds: 120, // Durée simulée
          cost: config.cost || 0.15, // Coût par défaut
        })
        .eq('id', call.id);
    }

    return {
      callId: call.id,
      initiated: true,
      initiatedAt: new Date().toISOString(),
      cost: config.cost || 0.15,
    };
  };

  // Fonctions d'exécution pour les actions sur les données
  const executeUpdateStatusAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const params: UpdateStatusParams = {
      leadId: lead.id,
      newStatus: action.config.newStatus,
      newLifecycleStage: action.config.newLifecycleStage,
      reason: action.config.reason || 'Mise à jour automatique via workflow',
      notifyTeam: action.config.notifyTeam || false,
    };

    await updateLeadStatus(params);
    return { success: true, action: 'status_updated', params };
  };

  const executeUpdateScoringAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const params: UpdateScoringParams = {
      leadId: lead.id,
      change: action.config.change || 0,
      reason: action.config.reason || 'Modification automatique via workflow',
      notifyIfSignificant: action.config.notifyIfSignificant || false,
    };

    const newScoring = await updateLeadScoring(params);
    return { success: true, action: 'scoring_updated', newScoring, params };
  };

  const executeUpdateTemperatureAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const params: UpdateTemperatureParams = {
      leadId: lead.id,
      newTemperature: action.config.newTemperature,
      reason: action.config.reason || 'Changement automatique via workflow',
    };

    await updateLeadTemperature(params);
    return { success: true, action: 'temperature_updated', params };
  };

  const executeUpdateTagsAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const params: UpdateTagsParams = {
      leadId: lead.id,
      tagsToAdd: action.config.tagsToAdd || [],
      tagsToRemove: action.config.tagsToRemove || [],
      reason: action.config.reason || 'Modification automatique via workflow',
    };

    const newTags = await updateLeadTags(params);
    return { success: true, action: 'tags_updated', newTags, params };
  };

  const executeUpdateCustomFieldAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const params: UpdateCustomFieldParams = {
      leadId: lead.id,
      fieldName: action.config.fieldName,
      fieldValue: action.config.fieldValue,
      reason: action.config.reason || 'Mise à jour automatique via workflow',
    };

    await updateLeadCustomField(params);
    return { success: true, action: 'custom_field_updated', params };
  };

  const executeBulkUpdateAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    await bulkUpdateLead(lead.id, {
      status: action.config.status,
      lifecycleStage: action.config.lifecycleStage,
      scoring: action.config.scoring,
      scoringChange: action.config.scoringChange,
      temperature: action.config.temperature,
      tags: action.config.tags,
      tagsToAdd: action.config.tagsToAdd,
      tagsToRemove: action.config.tagsToRemove,
      customFields: action.config.customFields,
      reason: action.config.reason || 'Mise à jour multiple automatique via workflow',
    });

    return { success: true, action: 'bulk_update', updates: action.config };
  };

  const executeCreateTaskAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;
    
    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      ...config.variables,
    };

    const title = replaceVariables(config.title || 'Tâche automatique', variables);
    const description = config.description ? replaceVariables(config.description, variables) : undefined;

    // Calculer la date d'échéance
    let dueDate: Date | undefined;
    if (config.dueDateOffset !== undefined) {
      dueDate = calculateRelativeDate(config.dueDateOffset);
    } else if (config.dueDate) {
      dueDate = new Date(config.dueDate);
    }

    // Déterminer la priorité
    let priority = config.priority;
    if (!priority && config.priorityFromLead) {
      priority = determinePriorityFromLead(lead);
    }

    const taskParams: CreateTaskParams = {
      leadId: lead.id,
      projectId: config.projectId,
      title,
      description,
      assigneeId: config.assigneeId,
      assigneeIds: config.assigneeIds,
      priority: priority as any,
      dueDate,
      tags: config.tags || [],
      metadata: {
        ...config.metadata,
        workflowActionId: action.id,
        executionId: execution.id,
      },
    };

    const taskId = await createAutomatedTask(taskParams);
    return { success: true, action: 'task_created', taskId, params: taskParams };
  };

  const executeCreateAppointmentAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Remplacer les variables
    const variables = {
      nom: lead.name || '',
      entreprise: lead.company || '',
      ...config.variables,
    };

    const title = replaceVariables(config.title || 'Rendez-vous automatique', variables);
    const description = config.description ? replaceVariables(config.description, variables) : undefined;

    // Calculer la date de début
    let startTime: Date;
    if (config.startTimeOffset !== undefined) {
      startTime = calculateRelativeDate(config.startTimeOffset);
      // Définir l'heure par défaut (10h) si non spécifiée
      if (!config.startTime) {
        startTime.setHours(10, 0, 0, 0);
      } else {
        const [hours, minutes] = config.startTime.split(':').map(Number);
        startTime.setHours(hours, minutes || 0, 0, 0);
      }
    } else if (config.startTime) {
      startTime = new Date(config.startTime);
    } else {
      // Par défaut, demain à 10h
      startTime = calculateRelativeDate(1);
      startTime.setHours(10, 0, 0, 0);
    }

    const appointmentParams: CreateAppointmentParams = {
      leadId: lead.id,
      title,
      description,
      appointmentType: config.appointmentType,
      participantIds: config.participantIds,
      startTime,
      duration: config.duration || 60,
      location: config.location,
      metadata: {
        ...config.metadata,
        workflowActionId: action.id,
        executionId: execution.id,
      },
    };

    const eventId = await createAutomatedAppointment(appointmentParams);
    return { success: true, action: 'appointment_created', eventId, params: appointmentParams };
  };

  const executeCreateNoteAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Remplacer les variables
    const variables = {
      nom: lead.name || '',
      entreprise: lead.company || '',
      ...config.variables,
    };

    const content = replaceVariables(config.content || '', variables);
    const title = config.title ? replaceVariables(config.title, variables) : undefined;

    const noteParams: CreateNoteParams = {
      leadId: lead.id,
      projectId: config.projectId,
      noteType: config.noteType || 'internal',
      title,
      content,
      isPrivate: config.isPrivate || false,
      sharedWith: config.sharedWith,
      tags: config.tags,
    };

    const noteId = await createAutomatedNote(noteParams);
    return { success: true, action: 'note_created', noteId, params: noteParams };
  };

  const executeCreateQuoteAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    const quoteParams: CreateQuoteParams = {
      leadId: lead.id,
      quoteTemplate: config.quoteTemplate,
      estimatedAmount: config.estimatedAmount,
      items: config.items,
      status: config.status || 'draft',
      metadata: {
        ...config.metadata,
        workflowActionId: action.id,
        executionId: execution.id,
      },
    };

    const quoteId = await createAutomatedQuote(quoteParams);
    return { success: true, action: 'quote_created', quoteId, params: quoteParams };
  };

  const executeCreateProjectAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const config = action.config;

    // Remplacer les variables (le nouveau service extrait automatiquement toutes les variables du lead)
    const variables = {
      lead,
      service: config.service || 'Service',
      ...config.variables,
    };

    const projectName = replaceVariables(config.projectName || '{{entreprise}} - {{service}}', variables);

    // Calculer les dates
    let startDate: Date | undefined;
    if (config.startDateOffset !== undefined) {
      startDate = calculateRelativeDate(config.startDateOffset);
    } else if (config.startDate) {
      startDate = new Date(config.startDate);
    }

    let estimatedEndDate: Date | undefined;
    if (config.endDateOffset !== undefined && startDate) {
      estimatedEndDate = calculateRelativeDate(config.endDateOffset, startDate);
    } else if (config.endDate) {
      estimatedEndDate = new Date(config.endDate);
    }

    const projectParams: CreateProjectParams = {
      leadId: lead.id,
      projectName,
      service: config.service,
      budget: config.budget,
      startDate,
      estimatedEndDate,
      assigneeIds: config.assigneeIds,
      status: config.status || 'active',
      workspaceId: config.workspaceId,
      metadata: {
        ...config.metadata,
        workflowActionId: action.id,
        executionId: execution.id,
      },
    };

    const projectId = await createAutomatedProject(projectParams);
    return { success: true, action: 'project_created', projectId, params: projectParams };
  };

  const executeEnrichLeadAction = async (
    action: AutomatedAction,
    lead: Lead,
    execution: ActionExecution
  ): Promise<Record<string, any>> => {
    const { enrichLeadAutomated } = await import('../../services/enrichmentActions');
    const config = action.config;

    const enrichmentParams = {
      leadId: lead.id,
      enrichmentTypes: config.enrichmentTypes || ['ai', 'web_scraping'],
      forceRefresh: config.forceRefresh || false,
      recordActivity: config.recordActivity !== false,
    };

    const result = await enrichLeadAutomated(enrichmentParams);
    return {
      success: result.success,
      action: 'lead_enriched',
      enrichedFields: result.enrichedFields,
      aiInsights: result.aiInsights,
      apiData: result.apiData,
      errors: result.errors,
    };
  };

  return {
    loading,
    error,
    executeAction,
  };
};

