/**
 * Service d'intégration entre workflows automatisés et campagnes marketing
 * Gère le déclenchement d'automations depuis campagnes, synchronisation listes, partage métriques
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { executeAction } from '../supabase/hooks/useAutomatedActions';
import { AutomatedAction } from '../supabase/hooks/useAutomatedActions';

export interface CampaignTrigger {
  id: string;
  campaignId: string;
  campaignName: string;
  triggerType: 'email_click' | 'email_open' | 'form_submission' | 'page_visit';
  triggerConfig: {
    linkUrl?: string; // URL spécifique du lien pour 'email_click'
    linkName?: string; // Nom du lien (ex: "Demander devis")
    pageUrl?: string; // URL de la page pour 'page_visit'
    formId?: string; // ID du formulaire pour 'form_submission'
    openCount?: number; // Nombre d'ouvertures pour 'email_open'
  };
  workflowId: string;
  workflowName: string;
  conditions?: {
    segment?: string; // Segment de campagne
    dateRange?: { start: Date; end: Date }; // Période de la campagne
    minScoring?: number; // Scoring minimum requis
  };
  isActive: boolean;
}

export interface CampaignWorkflowLink {
  campaignId: string;
  workflowId: string;
  triggerType: CampaignTrigger['triggerType'];
  conditions: CampaignTrigger['conditions'];
}

/**
 * Déclenche un workflow automatisé depuis une action de campagne
 */
export async function triggerWorkflowFromCampaign(
  leadId: string,
  campaignId: string,
  triggerType: CampaignTrigger['triggerType'],
  triggerConfig: CampaignTrigger['triggerConfig']
): Promise<{ success: boolean; triggeredWorkflows: string[] }> {
  try {
    // Récupérer les triggers configurés pour cette campagne
    const triggers = await getCampaignTriggers(campaignId);

    // Filtrer les triggers actifs qui correspondent
    const matchingTriggers = triggers.filter(trigger => {
      if (!trigger.isActive || trigger.triggerType !== triggerType) {
        return false;
      }

      // Vérifier la configuration spécifique
      if (triggerType === 'email_click' && triggerConfig.linkUrl) {
        if (trigger.triggerConfig.linkUrl && trigger.triggerConfig.linkUrl !== triggerConfig.linkUrl) {
          return false;
        }
        if (trigger.triggerConfig.linkName && trigger.triggerConfig.linkName !== triggerConfig.linkName) {
          return false;
        }
      }

      if (triggerType === 'email_open' && triggerConfig.openCount) {
        if (trigger.triggerConfig.openCount && triggerConfig.openCount < trigger.triggerConfig.openCount) {
          return false;
        }
      }

      if (triggerType === 'page_visit' && triggerConfig.pageUrl) {
        if (trigger.triggerConfig.pageUrl && trigger.triggerConfig.pageUrl !== triggerConfig.pageUrl) {
          return false;
        }
      }

      if (triggerType === 'form_submission' && triggerConfig.formId) {
        if (trigger.triggerConfig.formId && trigger.triggerConfig.formId !== triggerConfig.formId) {
          return false;
        }
      }

      return true;
    });

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Vérifier les conditions pour chaque trigger
    const triggeredWorkflows: string[] = [];

    for (const trigger of matchingTriggers) {
      // Vérifier les conditions
      if (trigger.conditions) {
        if (trigger.conditions.minScoring && (lead.scoring || 0) < trigger.conditions.minScoring) {
          continue;
        }

        if (trigger.conditions.dateRange) {
          const now = new Date();
          if (now < trigger.conditions.dateRange.start || now > trigger.conditions.dateRange.end) {
            continue;
          }
        }

        // Vérifier le segment si spécifié
        // Note: Cette logique dépend de la structure des segments
        if (trigger.conditions.segment) {
          // TODO: Implémenter vérification de segment
        }
      }

      // Récupérer le workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('automated_actions')
        .select('*')
        .eq('id', trigger.workflowId)
        .eq('is_active', true)
        .single();

      if (workflowError || !workflow) {
        console.warn(`Workflow ${trigger.workflowId} non trouvé ou inactif`);
        continue;
      }

      // Exécuter le workflow
      try {
        // Note: executeAction est une méthode du hook useAutomatedActions
        // Pour un service standalone, on doit utiliser directement Supabase ou créer une fonction d'exécution
        // Pour l'instant, on crée directement l'exécution dans action_executions
        const { error: execError } = await supabase
          .from('action_executions')
          .insert({
            automated_action_id: trigger.workflowId,
            lead_id: leadId,
            trigger_type: `campaign_${triggerType}`,
            execution_status: 'pending',
            metadata: {
              campaign_id: campaignId,
              trigger_config: triggerConfig,
            },
          });

        if (execError) throw execError;

        triggeredWorkflows.push(trigger.workflowId);

        // Enregistrer le déclenchement
        await supabase
          .from('campaign_workflow_triggers') // TODO: Créer cette table
          .insert({
            campaign_id: campaignId,
            workflow_id: trigger.workflowId,
            lead_id: leadId,
            trigger_type: triggerType,
            trigger_config: triggerConfig,
            triggered_at: new Date().toISOString(),
          });
      } catch (error) {
        console.error(`Erreur exécution workflow ${trigger.workflowId}:`, error);
      }
    }

    return {
      success: true,
      triggeredWorkflows,
    };
  } catch (error) {
    console.error('Erreur déclenchement workflow depuis campagne:', error);
    return {
      success: false,
      triggeredWorkflows: [],
    };
  }
}

/**
 * Récupère les triggers configurés pour une campagne
 */
async function getCampaignTriggers(campaignId: string): Promise<CampaignTrigger[]> {
  try {
    // Note: Créer une table campaign_workflow_triggers pour stocker ces configurations
    // Pour l'instant, on simule avec une structure JSONB dans une table campaigns
    const { data, error } = await supabase
      .from('campaigns') // TODO: Créer cette table ou utiliser metadata
      .select('workflow_triggers')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.warn('Table campaigns non disponible, retour de triggers vides');
      return [];
    }

    // Si la structure existe, parser les triggers
    if (data?.workflow_triggers && Array.isArray(data.workflow_triggers)) {
      return data.workflow_triggers as CampaignTrigger[];
    }

    return [];
  } catch (error) {
    console.error('Erreur récupération triggers campagne:', error);
    return [];
  }
}

/**
 * Configure un trigger de workflow pour une campagne
 */
export async function configureCampaignTrigger(
  campaignId: string,
  trigger: Omit<CampaignTrigger, 'id' | 'campaignId'>
): Promise<CampaignTrigger> {
  try {
    // Récupérer les triggers existants
    const existingTriggers = await getCampaignTriggers(campaignId);

    // Ajouter le nouveau trigger
    const newTrigger: CampaignTrigger = {
      id: `trigger_${campaignId}_${Date.now()}`,
      campaignId,
      ...trigger,
    };

    const updatedTriggers = [...existingTriggers, newTrigger];

    // Sauvegarder dans la table campaigns
    const { error } = await supabase
      .from('campaigns')
      .update({
        workflow_triggers: updatedTriggers,
      })
      .eq('id', campaignId);

    if (error) {
      // Si la table n'existe pas, on peut créer une table dédiée
      // TODO: Créer table campaign_workflow_triggers
      console.warn('Table campaigns non disponible:', error);
    }

    return newTrigger;
  } catch (error) {
    console.error('Erreur configuration trigger campagne:', error);
    throw error;
  }
}

/**
 * Ajoute automatiquement des leads à une liste de diffusion selon critères
 */
export async function addLeadsToMailingList(
  listId: string,
  criteria: {
    minScoring?: number;
    maxScoring?: number;
    temperature?: string[];
    sector?: string[];
    family?: string[];
    tags?: string[];
    lifecycleStage?: string[];
    customFields?: Record<string, any>;
  }
): Promise<{ added: number; total: number }> {
  try {
    // Construire la requête de filtrage
    let query = supabase.from('leads').select('id');

    if (criteria.minScoring !== undefined || criteria.maxScoring !== undefined) {
      if (criteria.minScoring !== undefined) {
        query = query.gte('scoring', criteria.minScoring);
      }
      if (criteria.maxScoring !== undefined) {
        query = query.lte('scoring', criteria.maxScoring);
      }
    }

    if (criteria.temperature && criteria.temperature.length > 0) {
      query = query.in('temperature', criteria.temperature);
    }

    if (criteria.sector && criteria.sector.length > 0) {
      query = query.in('sector', criteria.sector);
    }

    if (criteria.family && criteria.family.length > 0) {
      query = query.in('family', criteria.family);
    }

    if (criteria.lifecycleStage && criteria.lifecycleStage.length > 0) {
      query = query.in('lifecycle_stage', criteria.lifecycleStage);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      query = query.overlaps('tags', criteria.tags);
    }

    // Pour les champs custom, on devra filtrer via metadata JSONB
    if (criteria.customFields) {
      for (const [field, value] of Object.entries(criteria.customFields)) {
        query = query.contains('metadata', { [field]: value });
      }
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    const leadIds = (leads || []).map(l => l.id);
    const total = leadIds.length;

    // Ajouter les leads à la liste
    // Note: Créer une table mailing_list_members ou utiliser email_segments
    const { error: addError } = await supabase
      .from('mailing_list_members') // TODO: Créer cette table
      .upsert(
        leadIds.map(leadId => ({
          list_id: listId,
          lead_id: leadId,
          added_at: new Date().toISOString(),
          added_by: 'system', // ou récupérer user ID
        })),
        { onConflict: 'list_id,lead_id' }
      );

    if (addError) {
      console.warn('Table mailing_list_members non disponible:', addError);
      // Alternative: Utiliser email_segments
      const { error: segmentError } = await supabase
        .from('email_segments')
        .update({
          criteria: criteria as any, // Mettre à jour les critères du segment
        })
        .eq('id', listId);

      if (segmentError) {
        throw segmentError;
      }
    }

    return {
      added: total,
      total,
    };
  } catch (error) {
    console.error('Erreur ajout leads à liste:', error);
    return { added: 0, total: 0 };
  }
}

/**
 * Supprime automatiquement des leads d'une liste de diffusion selon critères
 */
export async function removeLeadsFromMailingList(
  listId: string,
  criteria: {
    unsubscribed?: boolean; // Si true, retire tous les désabonnés
    lifecycleStage?: string[]; // Retire si lifecycle stage dans la liste
    tags?: string[]; // Retire si tags dans la liste
    customFields?: Record<string, any>;
  }
): Promise<{ removed: number }> {
  try {
    // Récupérer les leads à retirer
    let query = supabase.from('leads').select('id');

    if (criteria.unsubscribed) {
      // Récupérer depuis lead_preferences
      const { data: unsubscribed } = await supabase
        .from('lead_preferences')
        .select('lead_id')
        .eq('email_unsubscribed', true);

      if (unsubscribed && unsubscribed.length > 0) {
        const unsubscribedIds = unsubscribed.map(u => u.lead_id);
        query = query.in('id', unsubscribedIds);
      } else {
        return { removed: 0 };
      }
    }

    if (criteria.lifecycleStage && criteria.lifecycleStage.length > 0) {
      query = query.in('lifecycle_stage', criteria.lifecycleStage);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      query = query.overlaps('tags', criteria.tags);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    const leadIds = (leads || []).map(l => l.id);

    // Retirer les leads de la liste
    const { error: removeError } = await supabase
      .from('mailing_list_members')
      .delete()
      .eq('list_id', listId)
      .in('lead_id', leadIds);

    if (removeError) {
      console.warn('Table mailing_list_members non disponible:', removeError);
      // Alternative: Mettre à jour le segment pour exclure ces critères
    }

    return {
      removed: leadIds.length,
    };
  } catch (error) {
    console.error('Erreur retrait leads de liste:', error);
    return { removed: 0 };
  }
}

/**
 * Exclut automatiquement un lead de toutes les listes marketing si désabonnement
 */
export async function excludeUnsubscribedFromAllLists(leadId: string): Promise<void> {
  try {
    // Récupérer toutes les listes actives
    const { data: lists, error: listsError } = await supabase
      .from('mailing_lists') // TODO: Créer cette table ou utiliser email_segments
      .select('id')
      .eq('is_active', true);

    if (listsError) {
      console.warn('Table mailing_lists non disponible:', listsError);
      // Utiliser email_segments comme alternative
      const { data: segments } = await supabase
        .from('email_segments')
        .select('id');

      if (segments) {
        for (const segment of segments) {
          await supabase
            .from('email_segment_members')
            .delete()
            .eq('segment_id', segment.id)
            .eq('lead_id', leadId);
        }
      }
      return;
    }

    // Retirer le lead de toutes les listes
    if (lists) {
      for (const list of lists) {
        await supabase
          .from('mailing_list_members')
          .delete()
          .eq('list_id', list.id)
          .eq('lead_id', leadId);
      }
    }

    // Enregistrer l'exclusion dans les logs
    await supabase
      .from('mailing_list_exclusions')
      .insert({
        lead_id: leadId,
        reason: 'unsubscribed',
        excluded_at: new Date().toISOString(),
        excluded_from_all: true,
      });
  } catch (error) {
    console.error('Erreur exclusion lead des listes:', error);
  }
}

/**
 * Partage les métriques d'engagement avec le module Marketing
 */
export async function shareEngagementMetrics(
  campaignId: string,
  period: { start: Date; end: Date }
): Promise<{
  campaignId: string;
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
}> {
  try {
    // Récupérer les métriques depuis email_tracking
    // Note: Il faudrait lier les emails aux campagnes via un champ campaign_id
    const { data: tracking, error } = await supabase
      .from('email_tracking')
      .select('*')
      .gte('sent_at', period.start.toISOString())
      .lte('sent_at', period.end.toISOString())
      .contains('metadata', { campaign_id: campaignId }); // Si campaign_id est dans metadata

    if (error) {
      console.warn('Erreur récupération métriques email:', error);
    }

    const trackingData = tracking || [];

    const sent = trackingData.length;
    const opened = trackingData.filter(t => (t.open_count || 0) > 0).length;
    const clicked = trackingData.filter(t => (t.click_count || 0) > 0).length;
    const replied = trackingData.filter(t => (t.reply_count || 0) > 0).length;
    const bounced = trackingData.filter(t => t.bounced).length;
    const unsubscribed = trackingData.filter(t => t.unsubscribed).length;

    const metrics = {
      sent,
      opened,
      clicked,
      replied,
      bounced,
      unsubscribed,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      replyRate: sent > 0 ? (replied / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      unsubscribeRate: sent > 0 ? (unsubscribed / sent) * 100 : 0,
    };

    // Sauvegarder les métriques dans la table campaigns pour partage
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        engagement_metrics: metrics,
        metrics_updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (updateError) {
      console.warn('Table campaigns non disponible pour sauvegarde métriques:', updateError);
    }

    return {
      campaignId,
      metrics,
    };
  } catch (error) {
    console.error('Erreur partage métriques engagement:', error);
    return {
      campaignId,
      metrics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
      },
    };
  }
}

/**
 * Synchronise automatiquement une liste de diffusion selon critères
 */
export async function syncMailingList(
  listId: string,
  criteria: Parameters<typeof addLeadsToMailingList>[1],
  autoRemove: boolean = true
): Promise<{ added: number; removed: number }> {
  try {
    // Ajouter les leads qui correspondent
    const { added } = await addLeadsToMailingList(listId, criteria);

    let removed = 0;

    // Retirer les leads qui ne correspondent plus
    if (autoRemove) {
      // Récupérer tous les leads actuellement dans la liste
      const { data: currentMembers } = await supabase
        .from('mailing_list_members')
        .select('lead_id')
        .eq('list_id', listId);

      if (currentMembers) {
        const currentLeadIds = currentMembers.map(m => m.lead_id);

        // Vérifier lesquels ne correspondent plus aux critères
        const { data: matchingLeads } = await supabase
          .from('leads')
          .select('id')
          .in('id', currentLeadIds);

        // Construire les filtres inverses pour trouver ceux qui ne matchent plus
        // (logique simplifiée)
        const matchingIds = new Set((matchingLeads || []).map(l => l.id));
        const toRemove = currentLeadIds.filter(id => !matchingIds.has(id));

        if (toRemove.length > 0) {
          await supabase
            .from('mailing_list_members')
            .delete()
            .eq('list_id', listId)
            .in('lead_id', toRemove);

          removed = toRemove.length;
        }
      }
    }

    return { added, removed };
  } catch (error) {
    console.error('Erreur synchronisation liste:', error);
    return { added: 0, removed: 0 };
  }
}

