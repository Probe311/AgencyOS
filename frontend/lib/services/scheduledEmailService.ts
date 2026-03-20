/**
 * Service de gestion des envois programmés d'emails
 * Gère la planification, l'exécution automatique et le suivi des campagnes email programmées
 */

import { supabase } from '../supabase';
import { EmailCampaign } from '../../types';
import { sendEmailWithTracking } from './emailService';
import { replaceVariablesAsync } from '../utils/variableReplacement';
import { Lead } from '../../types';

export interface ScheduledEmailConfig {
  campaignId: string;
  scheduledAt: string; // ISO timestamp
  sendImmediately?: boolean; // Si true, ignore scheduledAt
  timezone?: string; // Fuseau horaire pour l'envoi
  batchSize?: number; // Nombre d'emails à envoyer par batch
  delayBetweenBatches?: number; // Délai en ms entre chaque batch
  maxSendsPerHour?: number; // Limite d'envois par heure
}

export interface ScheduledEmailExecution {
  id: string;
  campaignId: string;
  scheduledAt: string;
  executedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Planifie une campagne email pour un envoi programmé
 */
export async function scheduleCampaignEmail(
  campaign: EmailCampaign,
  scheduledAt: string,
  config?: {
    timezone?: string;
    batchSize?: number;
    delayBetweenBatches?: number;
    maxSendsPerHour?: number;
  }
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    // Vérifier que la campagne existe et a un template/segment
    if (!campaign.templateId || !campaign.segmentId) {
      return {
        success: false,
        error: 'La campagne doit avoir un template et un segment configurés',
      };
    }

    // Mettre à jour le statut de la campagne
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    if (updateError) {
      throw updateError;
    }

    // Créer un enregistrement d'exécution programmée
    const { data: execution, error: execError } = await supabase
      .from('scheduled_email_executions')
      .insert({
        campaign_id: campaign.id,
        scheduled_at: scheduledAt,
        status: 'pending',
        total_recipients: campaign.totalRecipients || 0,
        sent_count: 0,
        failed_count: 0,
        skipped_count: 0,
        metadata: {
          timezone: config?.timezone || 'Europe/Paris',
          batchSize: config?.batchSize || 50,
          delayBetweenBatches: config?.delayBetweenBatches || 1000,
          maxSendsPerHour: config?.maxSendsPerHour || 1000,
        },
      })
      .select()
      .single();

    if (execError) {
      throw execError;
    }

    return {
      success: true,
      executionId: execution.id,
    };
  } catch (error: any) {
    console.error('Erreur planification campagne email:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la planification',
    };
  }
}

/**
 * Annule un envoi programmé
 */
export async function cancelScheduledEmail(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('scheduled_email_executions')
      .update({
        status: 'cancelled',
        executed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
      .eq('status', 'pending');

    if (error) {
      throw error;
    }

    // Mettre à jour le statut de la campagne si nécessaire
    await supabase
      .from('campaigns')
      .update({
        status: 'draft',
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (await supabase.from('scheduled_email_executions').select('campaign_id').eq('id', executionId).single()).data?.campaign_id);

    return { success: true };
  } catch (error: any) {
    console.error('Erreur annulation envoi programmé:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'annulation',
    };
  }
}

/**
 * Exécute une campagne email programmée
 * Cette fonction est appelée par un cron job ou un scheduler externe
 */
export async function executeScheduledCampaign(
  executionId: string
): Promise<{ success: boolean; sent: number; failed: number; skipped: number; error?: string }> {
  try {
    // Récupérer l'exécution programmée
    const { data: execution, error: execError } = await supabase
      .from('scheduled_email_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execError || !execution) {
      throw new Error('Exécution programmée non trouvée');
    }

    if (execution.status !== 'pending') {
      return {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        error: `L'exécution n'est plus en attente (statut: ${execution.status})`,
      };
    }

    // Marquer comme en cours de traitement
    await supabase
      .from('scheduled_email_executions')
      .update({
        status: 'processing',
        executed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', execution.campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campagne non trouvée');
    }

    // Récupérer le template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', (campaign as any).template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template non trouvé');
    }

    // Récupérer les destinataires depuis le segment ou la liste
    const { getMailingListMembers } = await import('./mailingListService');
    const { supabase: supabaseClient } = await import('../supabase');

    let recipients: Lead[] = [];

    if ((campaign as any).segment_id) {
      // Segment dynamique - récupérer les leads du segment
      const { data: segmentData } = await supabaseClient
        .from('email_segments')
        .select('criteria')
        .eq('id', (campaign as any).segment_id)
        .single();

      if (segmentData?.criteria) {
        // Utiliser calculateSegmentMembersFromCriteria pour récupérer les IDs des leads
        const { calculateSegmentMembersFromCriteria } = await import('../supabase/hooks/useEmailSegments');
        const leadIds = await calculateSegmentMembersFromCriteria(segmentData.criteria) || [];
        
        // Récupérer les données complètes des leads
        if (leadIds.length > 0) {
          const { data: leadsData } = await supabaseClient
            .from('leads')
            .select('*')
            .in('id', leadIds);
          
          recipients = (leadsData || []) as Lead[];
        }
      }
    } else if ((campaign as any).mailing_list_id) {
      // Liste de diffusion
      const members = await getMailingListMembers((campaign as any).mailing_list_id);
      
      if (members && members.length > 0) {
        // Récupérer les leads depuis les IDs
        const leadIds = members.map((m) => m.leadId).filter(Boolean) as string[];
        if (leadIds.length > 0) {
          const { data: leadsData } = await supabaseClient
            .from('leads')
            .select('*')
            .in('id', leadIds);
          
          recipients = (leadsData || []) as Lead[];
        }
      }
    } else {
      // Pas de destinataires configurés
      throw new Error('Aucun segment ou liste de diffusion configuré pour cette campagne');
    }

    // Vérifier le désabonnement avant envoi
    const { isLeadUnsubscribed } = await import('./unsubscriptionService');

    const config = execution.metadata || {};
    const batchSize = config.batchSize || 50;
    const delayBetweenBatches = config.delayBetweenBatches || 1000;
    const maxSendsPerHour = config.maxSendsPerHour || 1000;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Traiter par batches pour éviter de surcharger le serveur
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Vérifier la limite d'envois par heure
      const { data: recentSends } = await supabase
        .from('email_tracking')
        .select('id')
        .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1);

      const recentSendsCount = recentSends?.length || 0;
      if (recentSendsCount >= maxSendsPerHour) {
        console.warn(`Limite d'envois par heure atteinte (${maxSendsPerHour}). Pause de 1 heure.`);
        // Planifier la reprise dans 1 heure
        await supabase
          .from('scheduled_email_executions')
          .update({
            status: 'pending',
            scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            metadata: {
              ...config,
              paused: true,
              resumeFrom: i,
            },
          })
          .eq('id', executionId);
        break;
      }

      // Envoyer les emails du batch
      const batchPromises = batch.map(async (lead) => {
        try {
          // Vérifier le désabonnement
          const isUnsubscribed = await isLeadUnsubscribed(lead.id, 'email_marketing');
          if (isUnsubscribed) {
            skippedCount++;
            return;
          }

          // Remplacer les variables dans le template
          const subject = await replaceVariablesAsync(template.subject || '', { lead });
          const htmlContent = await replaceVariablesAsync(template.html_content || template.text_content || '', { lead });

          // Récupérer l'expéditeur
          const { data: userData } = await supabase.auth.getUser();
          let fromEmail = 'noreply@agencyos.com';

          if (userData?.user?.email) {
            fromEmail = userData.user.email;
          }

          // Créer un ID d'email pour le tracking
          const emailId = `campaign_${campaign.id}_${lead.id}_${Date.now()}`;

          // Envoyer l'email avec tracking
          const result = await sendEmailWithTracking({
            to: lead.email || '',
            from: fromEmail,
            subject,
            html: htmlContent,
            emailId,
            leadId: lead.id,
          });

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (error: any) {
          console.error(`Erreur envoi email pour lead ${lead.id}:`, error);
          failedCount++;
        }
      });

      await Promise.all(batchPromises);

      // Délai entre batches (sauf pour le dernier)
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Mettre à jour l'exécution
    const finalStatus = failedCount === recipients.length ? 'failed' : 'completed';

    await supabase
      .from('scheduled_email_executions')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
        executed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    // Mettre à jour le statut de la campagne
    await supabase
      .from('campaigns')
      .update({
        status: finalStatus === 'completed' ? 'sent' : 'sending',
        sent_at: finalStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.campaign_id);

    return {
      success: finalStatus === 'completed',
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
    };
  } catch (error: any) {
    console.error('Erreur exécution campagne programmée:', error);

    // Marquer comme échoué
    await supabase
      .from('scheduled_email_executions')
      .update({
        status: 'failed',
        error_message: error.message || 'Erreur inconnue',
        executed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    return {
      success: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error.message || 'Erreur lors de l\'exécution',
    };
  }
}

/**
 * Vérifie et exécute les campagnes programmées dont l'heure d'envoi est arrivée
 * Cette fonction doit être appelée périodiquement (cron job, scheduler)
 */
export async function processScheduledEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  try {
    const now = new Date().toISOString();

    // Récupérer toutes les exécutions en attente dont l'heure est arrivée
    const { data: pendingExecutions, error } = await supabase
      .from('scheduled_email_executions')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(10); // Traiter max 10 à la fois

    if (error) {
      throw error;
    }

    if (!pendingExecutions || pendingExecutions.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Traiter chaque exécution
    for (const execution of pendingExecutions) {
      const result = await executeScheduledCampaign(execution.id);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return {
      processed: pendingExecutions.length,
      sent: totalSent,
      failed: totalFailed,
    };
  } catch (error: any) {
    console.error('Erreur traitement envois programmés:', error);
    return { processed: 0, sent: 0, failed: 0 };
  }
}

/**
 * Récupère les exécutions programmées d'une campagne
 */
export async function getScheduledExecutions(
  campaignId: string
): Promise<ScheduledEmailExecution[]> {
  try {
    const { data, error } = await supabase
      .from('scheduled_email_executions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((e: any) => ({
      id: e.id,
      campaignId: e.campaign_id,
      scheduledAt: e.scheduled_at,
      executedAt: e.executed_at,
      status: e.status,
      totalRecipients: e.total_recipients,
      sentCount: e.sent_count,
      failedCount: e.failed_count,
      skippedCount: e.skipped_count,
      errorMessage: e.error_message,
      metadata: e.metadata,
    }));
  } catch (error: any) {
    console.error('Erreur récupération exécutions programmées:', error);
    return [];
  }
}

