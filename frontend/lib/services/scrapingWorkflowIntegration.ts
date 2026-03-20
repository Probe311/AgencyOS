/**
 * Service d'intégration entre scraping/prospection et workflows automatisés
 * Déclenche automatiquement des workflows lors de l'ajout de leads scrapés
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { AutomatedAction } from '../supabase/hooks/useAutomatedActions';

/**
 * Déclenche le workflow d'onboarding pour un nouveau lead scrapé
 */
export async function triggerOnboardingForScrapedLead(
  leadId: string,
  leadData: Partial<Lead>
): Promise<{ success: boolean; workflowsTriggered: string[] }> {
  try {
    // Récupérer le lead complet
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead non trouvé');
    }

    const workflowsTriggered: string[] = [];

    // Rechercher le workflow d'onboarding "Nouveau Lead"
    const { data: onboardingWorkflows, error: workflowsError } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('is_active', true)
      .contains('metadata', { scenario_type: 'onboarding' })
      .or('name.ilike.%onboarding%,name.ilike.%nouveau lead%');

    if (workflowsError) {
      console.warn('Erreur récupération workflows onboarding:', workflowsError);
      return { success: false, workflowsTriggered: [] };
    }

    // Exécuter chaque workflow qui correspond aux conditions
    for (const workflow of (onboardingWorkflows || [])) {
      try {
        // Vérifier les conditions du workflow si elles existent
        // Note: On suppose que les conditions sont dans workflow.conditions (JSONB)
        const shouldTrigger = await evaluateWorkflowConditions(workflow, lead as Lead);

        if (!shouldTrigger) {
          continue;
        }

        // Créer l'exécution du workflow
        const { error: execError } = await supabase
          .from('action_executions')
          .insert({
            automated_action_id: workflow.id,
            lead_id: leadId,
            trigger_type: 'scraping_new_lead',
            execution_status: 'pending',
            metadata: {
              source: 'scraping',
              lead_data: leadData,
            },
          });

        if (execError) {
          console.error(`Erreur création exécution workflow ${workflow.id}:`, execError);
          continue;
        }

        workflowsTriggered.push(workflow.id);
      } catch (error) {
        console.error(`Erreur exécution workflow ${workflow.id}:`, error);
      }
    }

    return {
      success: true,
      workflowsTriggered,
    };
  } catch (error) {
    console.error('Erreur déclenchement onboarding lead scrapé:', error);
    return { success: false, workflowsTriggered: [] };
  }
}

/**
 * Évalue les conditions d'un workflow pour un lead
 */
async function evaluateWorkflowConditions(
  workflow: AutomatedAction,
  lead: Lead
): Promise<boolean> {
  try {
    // Si pas de conditions, déclencher toujours
    if (!workflow.conditions) {
      return true;
    }

    // Utiliser le conditionEvaluator pour évaluer les conditions
    const { evaluateConditionGroup } = await import('../utils/conditionEvaluator');
    return await evaluateConditionGroup(lead, workflow.conditions as any);
  } catch (error) {
    console.error('Erreur évaluation conditions workflow:', error);
    // En cas d'erreur, on déclenche quand même pour ne pas bloquer
    return true;
  }
}

/**
 * Enrichit automatiquement un lead scrapé si données incomplètes
 */
export async function enrichScrapedLeadIfNeeded(
  leadId: string,
  minCompletenessThreshold: number = 0.5 // 50% minimum
): Promise<{ enriched: boolean; enrichedFields: string[] }> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Calculer le niveau de complétude
    const completeness = calculateLeadCompleteness(lead as Lead);

    if (completeness >= minCompletenessThreshold) {
      return { enriched: false, enrichedFields: [] };
    }

    // Vérifier si enrichi récemment (éviter enrichissements redondants)
    const { data: recentEnrichment } = await supabase
      .from('lead_enrichment_jobs')
      .select('*')
      .eq('lead_id', leadId)
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // 180 jours
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentEnrichment) {
      return { enriched: false, enrichedFields: [] };
    }

    // Déclencher l'enrichissement automatique
    const { enrichLeadAutomated } = await import('./enrichmentActions');

    const result = await enrichLeadAutomated({
      leadId,
      enrichmentTypes: ['ai', 'web_scraping'], // Enrichissement IA et web scraping
      forceRefresh: false,
      recordActivity: true,
    });

    return {
      enriched: result.success,
      enrichedFields: result.enrichedFields || [],
    };
  } catch (error) {
    console.error('Erreur enrichissement lead scrapé:', error);
    return { enriched: false, enrichedFields: [] };
  }
}

/**
 * Calcule le niveau de complétude d'un lead (0-1)
 */
function calculateLeadCompleteness(lead: Lead): number {
  const requiredFields = ['name', 'email', 'company', 'sector', 'phone'];
  const optionalFields = ['address', 'city', 'postal_code', 'website', 'description'];

  let score = 0;
  let totalWeight = 0;

  // Champs requis (poids 2x)
  for (const field of requiredFields) {
    totalWeight += 2;
    if (lead[field as keyof Lead] && (lead[field as keyof Lead] as string)?.trim()) {
      score += 2;
    }
  }

  // Champs optionnels (poids 1x)
  for (const field of optionalFields) {
    totalWeight += 1;
    if (lead[field as keyof Lead] && (lead[field as keyof Lead] as string)?.trim()) {
      score += 1;
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Qualifie automatiquement un lead selon son scoring après scraping
 */
export async function qualifyScrapedLeadByScoring(leadId: string): Promise<{
  qualified: boolean;
  newLifecycleStage?: string;
  scoring: number;
}> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      throw new Error('Lead non trouvé');
    }

    const scoring = lead.scoring || lead.quality_score || 0;

    // Règles de qualification basées sur le scoring
    let newLifecycleStage: string | undefined;

    if (scoring >= 75) {
      newLifecycleStage = 'SQL'; // Sales Qualified Lead
    } else if (scoring >= 60) {
      newLifecycleStage = 'MQL'; // Marketing Qualified Lead
    }

    // Mettre à jour le lifecycle stage si nécessaire
    if (newLifecycleStage && lead.lifecycle_stage !== newLifecycleStage) {
      await supabase
        .from('leads')
        .update({
          lifecycle_stage: newLifecycleStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      // Enregistrer la transition
      await supabase
        .from('lifecycle_transitions')
        .insert({
          lead_id: leadId,
          from_stage: lead.lifecycle_stage || 'Lead',
          to_stage: newLifecycleStage,
          transition_date: new Date().toISOString(),
          trigger_type: 'scoring_qualification',
        });
    }

    return {
      qualified: !!newLifecycleStage,
      newLifecycleStage,
      scoring,
    };
  } catch (error) {
    console.error('Erreur qualification lead par scoring:', error);
    return {
      qualified: false,
      scoring: 0,
    };
  }
}

/**
 * Affecte automatiquement un lead scrapé selon les règles d'affectation
 */
export async function assignScrapedLeadAutomatically(
  leadId: string
): Promise<{ assigned: boolean; assignedTo?: string }> {
  try {
    const { assignLeadAutomated } = await import('./assignmentActions');

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Utiliser les règles d'affectation automatiques
    const result = await assignLeadAutomated({
      leadId,
      ruleId: undefined, // Utiliser la règle par défaut
      respectExistingAssignment: false, // Nouveau lead, pas d'assignation existante
    });

    return {
      assigned: result.success,
      assignedTo: result.assignedTo,
    };
  } catch (error) {
    console.error('Erreur affectation automatique lead scrapé:', error);
    return { assigned: false };
  }
}

/**
 * Envoie automatiquement un email de prospection à un lead scrapé
 */
export async function sendProspectingEmailForScrapedLead(
  leadId: string,
  leadData: Partial<Lead>,
  config?: {
    templateId?: string;
    delayMinutes?: number;
  }
): Promise<{ sent: boolean; emailId?: string; error?: string }> {
  try {
    // Récupérer le lead complet
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Vérifier que le lead a un email valide
    if (!lead.email || !lead.email.trim()) {
      return { sent: false, error: 'Aucun email disponible pour ce lead' };
    }

    // Vérifier le consentement RGPD (désabonnement)
    const { isLeadUnsubscribed } = await import('./unsubscriptionService');
    const isUnsubscribed = await isLeadUnsubscribed(leadId, 'email_marketing');

    if (isUnsubscribed) {
      return { sent: false, error: 'Lead désabonné, envoi impossible' };
    }

    // Récupérer le template d'email
    let template: any = null;
    
    if (config?.templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', config.templateId)
        .single();

      if (!templateError && templateData) {
        template = templateData;
      }
    }

    // Si pas de template spécifique, utiliser un template par défaut "Bienvenue" ou "Prospection"
    if (!template) {
      const { getEmailTemplates } = await import('./emailTemplateLibrary');
      const defaultTemplates = await getEmailTemplates({
        category: 'Bienvenue',
        tags: ['prospection'],
      });

      if (defaultTemplates && defaultTemplates.length > 0) {
        template = defaultTemplates[0];
      } else {
        // Fallback : template minimal
        template = {
          subject: 'Découvrez nos services',
          html_content: `<p>Bonjour {{nom}},</p><p>Nous avons découvert votre entreprise et nous pensons que nos services pourraient vous intéresser.</p><p>Cordialement,</p>`,
        };
      }
    }

    // Remplacer les variables dynamiques dans le template
    const { replaceVariablesAsync } = await import('../utils/variableReplacement');
    
    // Remplacer les variables de manière asynchrone pour avoir les données comportementales
    const subject = await replaceVariablesAsync(template.subject || 'Découvrez nos services', lead as Lead);
    const htmlContent = await replaceVariablesAsync(template.html_content || template.text_content || '', lead as Lead);

    // Créer un ID d'email pour le tracking
    const emailId = `email_${leadId}_${Date.now()}`;

    // Préparer l'email avec tracking et footer de désabonnement
    const { sendEmailWithTracking } = await import('./emailService');
    
    // Gérer le délai si configuré
    const delayMs = (config?.delayMinutes || 0) * 60 * 1000;
    
    const sendEmailDelayed = async () => {
      try {
        // Récupérer l'email de l'utilisateur actuel pour l'expéditeur
        const { data: userData } = await supabase.auth.getUser();
        let fromEmail = 'noreply@agencyos.com'; // Email par défaut

        if (userData?.user?.email) {
          fromEmail = userData.user.email;
        }

        // Récupérer l'email assigné si disponible
        if (lead.assigned_to) {
          const { data: assignedUser } = await supabase
            .from('users')
            .select('email')
            .eq('id', lead.assigned_to)
            .single();

          if (assignedUser?.email) {
            fromEmail = assignedUser.email;
          }
        }

        const result = await sendEmailWithTracking({
          to: lead.email,
          from: fromEmail,
          subject,
          html: htmlContent,
          emailId,
          leadId,
        });

        // Enregistrer l'activité dans la timeline
        await supabase
          .from('sales_activities')
          .insert({
            lead_id: leadId,
            activity_type: 'email_sent',
            title: 'Email de prospection envoyé automatiquement',
            description: `Email de prospection envoyé automatiquement après scraping (template: ${template.name || 'par défaut'})`,
            metadata: {
              email_id: emailId,
              template_id: template.id,
              subject,
              automatic: true,
              source: 'scraping',
            },
          });

        return { sent: result.success, emailId, error: result.error };
      } catch (err: any) {
        console.error('Erreur envoi email prospection:', err);
        return { sent: false, error: err.message || 'Erreur lors de l\'envoi' };
      }
    };

    if (delayMs > 0) {
      // Planifier l'envoi avec délai
      setTimeout(() => {
        sendEmailDelayed();
      }, delayMs);
      return { sent: true, emailId: `scheduled_${emailId}` };
    } else {
      // Envoi immédiat
      return await sendEmailDelayed();
    }
  } catch (error: any) {
    console.error('Erreur envoi email prospection:', error);
    return { sent: false, error: error.message || 'Erreur lors de l\'envoi de l\'email' };
  }
}

/**
 * Traite complètement un nouveau lead scrapé (enrichissement, qualification, affectation, onboarding)
 */
export async function processScrapedLead(
  leadId: string,
  leadData: Partial<Lead>,
  options: {
    enrichIfIncomplete?: boolean;
    qualifyByScoring?: boolean;
    assignAutomatically?: boolean;
    triggerOnboarding?: boolean;
    sendProspectingEmail?: boolean; // Nouvelle option
  } = {}
): Promise<{
  enriched: boolean;
  qualified: boolean;
  assigned: boolean;
  onboardingTriggered: boolean;
  emailSent: boolean;
  workflowsTriggered: string[];
}> {
  try {
    // Récupérer la configuration de scraping pour vérifier si l'email automatique est activé
    const { getScrapingConfig } = await import('./scrapingConfigService');
    const scrapingConfig = await getScrapingConfig();

    const {
      enrichIfIncomplete = true,
      qualifyByScoring = true,
      assignAutomatically = true,
      triggerOnboarding = true,
      sendProspectingEmail = scrapingConfig.advanced?.enableAutoProspectingEmail || false, // Utiliser la config par défaut
    } = options;

    let enriched = false;
    let qualified = false;
    let assigned = false;
    let onboardingTriggered = false;
    let emailSent = false;
    const workflowsTriggered: string[] = [];

    // 1. Enrichissement si incomplet
    if (enrichIfIncomplete) {
      const enrichResult = await enrichScrapedLeadIfNeeded(leadId);
      enriched = enrichResult.enriched;
    }

    // 2. Qualification selon scoring
    if (qualifyByScoring) {
      const qualifyResult = await qualifyScrapedLeadByScoring(leadId);
      qualified = qualifyResult.qualified;
    }

    // 3. Affectation automatique
    if (assignAutomatically) {
      const assignResult = await assignScrapedLeadAutomatically(leadId);
      assigned = assignResult.assigned;
    }

    // 4. Déclencher onboarding
    if (triggerOnboarding) {
      const onboardingResult = await triggerOnboardingForScrapedLead(leadId, leadData);
      onboardingTriggered = onboardingResult.success;
      workflowsTriggered.push(...onboardingResult.workflowsTriggered);
    }

    // 5. Envoyer email de prospection si activé
    if (sendProspectingEmail) {
      const emailResult = await sendProspectingEmailForScrapedLead(leadId, leadData, {
        templateId: scrapingConfig.advanced?.prospectingEmailTemplateId,
        delayMinutes: scrapingConfig.advanced?.prospectingEmailDelay,
      });
      emailSent = emailResult.sent;
      
      if (emailResult.error) {
        console.warn('Erreur envoi email prospection:', emailResult.error);
      }
    }

    return {
      enriched,
      qualified,
      assigned,
      onboardingTriggered,
      emailSent,
      workflowsTriggered,
    };
  } catch (error) {
    console.error('Erreur traitement complet lead scrapé:', error);
    return {
      enriched: false,
      qualified: false,
      assigned: false,
      onboardingTriggered: false,
      emailSent: false,
      workflowsTriggered: [],
    };
  }
}

