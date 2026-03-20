/**
 * Service pour déclencher des workflows depuis les clics dans les emails
 * S'intègre avec le système de tracking email pour détecter les clics et déclencher les workflows
 */

import { supabase } from '../supabase';
import { triggerWorkflowFromCampaign } from './campaignWorkflowIntegration';

/**
 * Traite un clic dans un email et déclenche les workflows associés
 * Cette fonction est appelée par l'endpoint API /api/tracking/redirect
 */
export async function handleEmailClickForWorkflow(
  trackingId: string,
  linkUrl: string,
  linkName?: string
): Promise<{ triggered: boolean; workflows: string[] }> {
  try {
    // Récupérer les données de tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*, lead_id, metadata')
      .eq('id', trackingId)
      .single();

    if (trackingError || !tracking) {
      console.error('Tracking email non trouvé:', trackingError);
      return { triggered: false, workflows: [] };
    }

    // Extraire le campaign_id depuis metadata si disponible
    const campaignId = tracking.metadata?.campaign_id as string | undefined;

    if (!campaignId) {
      // Si pas de campaign_id, on ne peut pas déclencher de workflow spécifique
      return { triggered: false, workflows: [] };
    }

    // Déclencher les workflows associés à cette campagne
    const result = await triggerWorkflowFromCampaign(
      tracking.lead_id as string,
      campaignId,
      'email_click',
      {
        linkUrl,
        linkName,
      }
    );

    return {
      triggered: result.success,
      workflows: result.triggeredWorkflows,
    };
  } catch (error) {
    console.error('Erreur traitement clic email pour workflow:', error);
    return { triggered: false, workflows: [] };
  }
}

/**
 * Traite une ouverture d'email et déclenche les workflows associés si configuré
 */
export async function handleEmailOpenForWorkflow(
  trackingId: string,
  openCount: number
): Promise<{ triggered: boolean; workflows: string[] }> {
  try {
    // Récupérer les données de tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*, lead_id, metadata')
      .eq('id', trackingId)
      .single();

    if (trackingError || !tracking) {
      console.error('Tracking email non trouvé:', trackingError);
      return { triggered: false, workflows: [] };
    }

    const campaignId = tracking.metadata?.campaign_id as string | undefined;

    if (!campaignId) {
      return { triggered: false, workflows: [] };
    }

    // Déclencher les workflows configurés pour les ouvertures multiples
    // Ex: Si ouvert 3+ fois sans réponse → notification commercial
    const result = await triggerWorkflowFromCampaign(
      tracking.lead_id as string,
      campaignId,
      'email_open',
      {
        openCount,
      }
    );

    return {
      triggered: result.success,
      workflows: result.triggeredWorkflows,
    };
  } catch (error) {
    console.error('Erreur traitement ouverture email pour workflow:', error);
    return { triggered: false, workflows: [] };
  }
}

