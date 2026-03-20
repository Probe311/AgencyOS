import { supabase } from '../supabase';

export type NotificationType = 'unsubscribe' | 'error' | 'sequence_interruption' | 'workflow_paused' | 'workflow_completed';
export type NotificationChannel = 'email' | 'in_app' | 'webhook' | 'slack';

export interface AutomationNotification {
  id: string;
  workflow_id?: string;
  lead_id?: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

/**
 * Service de notifications pour les automations
 */
export class AutomationNotificationsService {
  /**
   * Envoie une notification de désabonnement
   */
  static async notifyUnsubscribe(
    leadId: string,
    reason?: string,
    workflowId?: string
  ): Promise<void> {
    try {
      // Récupérer les informations du lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('email, name, user_id')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        console.error('Lead not found for unsubscribe notification:', leadError);
        return;
      }

      // Récupérer les workflows actifs qui incluent ce lead
      const activeWorkflows = workflowId
        ? [{ id: workflowId }]
        : await this.getActiveWorkflowsForLead(leadId);

      // Créer les notifications
      const notifications: Omit<AutomationNotification, 'id' | 'created_at'>[] = [];

      for (const workflow of activeWorkflows) {
        // Interrompre le workflow pour ce lead
        await this.interruptWorkflowForLead(workflow.id, leadId);

        notifications.push({
          workflow_id: workflow.id,
          lead_id: leadId,
          notification_type: 'unsubscribe',
          title: 'Désabonnement détecté',
          message: `Le lead ${lead.name || lead.email} s'est désabonné${reason ? ` : ${reason}` : ''}`,
          severity: 'warning',
          channels: ['in_app', 'email'],
          metadata: {
            reason,
            lead_email: lead.email,
            lead_name: lead.name,
          },
        });
      }

      // Envoyer les notifications
      await this.sendNotifications(notifications, lead.user_id);

      // Mettre à jour le lead
      await supabase
        .from('leads')
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
          unsubscribed_reason: reason,
        })
        .eq('id', leadId);
    } catch (error: any) {
      console.error('Error notifying unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification d'erreur
   */
  static async notifyError(
    workflowId: string,
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      // Récupérer le workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('name, user_id')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        console.error('Workflow not found for error notification:', workflowError);
        return;
      }

      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      const notification: Omit<AutomationNotification, 'id' | 'created_at'> = {
        workflow_id: workflowId,
        notification_type: 'error',
        title: `Erreur dans le workflow "${workflow.name}"`,
        message: errorMessage,
        severity: 'error',
        channels: ['in_app', 'email'],
        metadata: {
          error_stack: errorStack,
          context,
        },
      };

      await this.sendNotifications([notification], workflow.user_id);

      // Enregistrer l'erreur dans les logs
      await supabase
        .from('workflow_execution_logs')
        .insert([{
          workflow_id: workflowId,
          execution_status: 'error',
          error_message: errorMessage,
          error_details: { stack: errorStack, context },
          executed_at: new Date().toISOString(),
        }]);
    } catch (err: any) {
      console.error('Error notifying error:', err);
    }
  }

  /**
   * Envoie une notification d'interruption de séquence
   */
  static async notifySequenceInterruption(
    workflowId: string,
    leadId: string,
    reason: string
  ): Promise<void> {
    try {
      // Récupérer les informations
      const [{ data: workflow }, { data: lead }] = await Promise.all([
        supabase.from('workflows').select('name, user_id').eq('id', workflowId).single(),
        supabase.from('leads').select('email, name').eq('id', leadId).single(),
      ]);

      if (!workflow || !lead) {
        console.error('Workflow or lead not found for sequence interruption');
        return;
      }

      const notification: Omit<AutomationNotification, 'id' | 'created_at'> = {
        workflow_id: workflowId,
        lead_id: leadId,
        notification_type: 'sequence_interruption',
        title: 'Séquence interrompue',
        message: `La séquence pour ${lead.name || lead.email} a été interrompue : ${reason}`,
        severity: 'warning',
        channels: ['in_app'],
        metadata: {
          reason,
          lead_email: lead.email,
          lead_name: lead.name,
        },
      };

      await this.sendNotifications([notification], workflow.user_id);
    } catch (error: any) {
      console.error('Error notifying sequence interruption:', error);
    }
  }

  /**
   * Envoie une notification de workflow en pause
   */
  static async notifyWorkflowPaused(
    workflowId: string,
    reason: string
  ): Promise<void> {
    try {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('name, user_id')
        .eq('id', workflowId)
        .single();

      if (error || !workflow) {
        console.error('Workflow not found for pause notification:', error);
        return;
      }

      const notification: Omit<AutomationNotification, 'id' | 'created_at'> = {
        workflow_id: workflowId,
        notification_type: 'workflow_paused',
        title: `Workflow "${workflow.name}" en pause`,
        message: `Le workflow a été mis en pause : ${reason}`,
        severity: 'info',
        channels: ['in_app'],
        metadata: { reason },
      };

      await this.sendNotifications([notification], workflow.user_id);
    } catch (error: any) {
      console.error('Error notifying workflow pause:', error);
    }
  }

  /**
   * Envoie une notification de workflow terminé
   */
  static async notifyWorkflowCompleted(
    workflowId: string,
    stats?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('name, user_id')
        .eq('id', workflowId)
        .single();

      if (error || !workflow) {
        console.error('Workflow not found for completion notification:', error);
        return;
      }

      const notification: Omit<AutomationNotification, 'id' | 'created_at'> = {
        workflow_id: workflowId,
        notification_type: 'workflow_completed',
        title: `Workflow "${workflow.name}" terminé`,
        message: `Le workflow s'est terminé avec succès${stats ? `. ${JSON.stringify(stats)}` : ''}`,
        severity: 'info',
        channels: ['in_app'],
        metadata: { stats },
      };

      await this.sendNotifications([notification], workflow.user_id);
    } catch (error: any) {
      console.error('Error notifying workflow completion:', error);
    }
  }

  /**
   * Envoie les notifications via les canaux configurés
   */
  private static async sendNotifications(
    notifications: Omit<AutomationNotification, 'id' | 'created_at'>[],
    userId: string
  ): Promise<void> {
    try {
      // Créer les notifications dans la base de données
      const notificationsToInsert = notifications.map(notif => ({
        ...notif,
        user_id: userId,
        sent_at: new Date().toISOString(),
      }));

      const { data: insertedNotifications, error: insertError } = await supabase
        .from('automation_notifications')
        .insert(notificationsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        return;
      }

      // Envoyer via les différents canaux
      for (const notification of insertedNotifications || []) {
        for (const channel of notification.channels) {
          try {
            switch (channel) {
              case 'email':
                await this.sendEmailNotification(notification, userId);
                break;
              case 'in_app':
                // Les notifications in-app sont déjà créées dans la base
                break;
              case 'webhook':
                await this.sendWebhookNotification(notification, userId);
                break;
              case 'slack':
                await this.sendSlackNotification(notification, userId);
                break;
            }
          } catch (channelError: any) {
            console.error(`Error sending notification via ${channel}:`, channelError);
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Envoie une notification par email
   */
  private static async sendEmailNotification(
    notification: AutomationNotification,
    userId: string
  ): Promise<void> {
    // TODO: Implémenter l'envoi d'email
    // Utiliser le service d'email existant
    console.log('Email notification:', notification);
  }

  /**
   * Envoie une notification via webhook
   */
  private static async sendWebhookNotification(
    notification: AutomationNotification,
    userId: string
  ): Promise<void> {
    // TODO: Implémenter l'envoi via webhook
    // Récupérer les webhooks configurés pour l'utilisateur
    console.log('Webhook notification:', notification);
  }

  /**
   * Envoie une notification via Slack
   */
  private static async sendSlackNotification(
    notification: AutomationNotification,
    userId: string
  ): Promise<void> {
    // TODO: Implémenter l'envoi via Slack
    // Récupérer la configuration Slack de l'utilisateur
    console.log('Slack notification:', notification);
  }

  /**
   * Récupère les workflows actifs pour un lead
   */
  private static async getActiveWorkflowsForLead(leadId: string): Promise<Array<{ id: string }>> {
    // Récupérer les workflows qui ont ce lead dans leur séquence
    const { data: workflows, error } = await supabase
      .from('workflow_executions')
      .select('workflow_id')
      .eq('lead_id', leadId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active workflows:', error);
      return [];
    }

    return (workflows || []).map(w => ({ id: w.workflow_id }));
  }

  /**
   * Interrompt un workflow pour un lead
   */
  private static async interruptWorkflowForLead(workflowId: string, leadId: string): Promise<void> {
    // Mettre à jour le statut de l'exécution du workflow
    await supabase
      .from('workflow_executions')
      .update({
        status: 'interrupted',
        interrupted_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId)
      .eq('lead_id', leadId)
      .eq('status', 'active');
  }

  /**
   * Récupère les notifications non lues pour un utilisateur
   */
  static async getUnreadNotifications(userId: string, limit: number = 50): Promise<AutomationNotification[]> {
    const { data, error } = await supabase
      .from('automation_notifications')
      .select('*')
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await supabase
      .from('automation_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await supabase
      .from('automation_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
  }
}

