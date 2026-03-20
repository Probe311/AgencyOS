/**
 * Service de monitoring et analytics des automations
 * Calcule les métriques de performance, taux d'exécution, conversion, engagement
 */

import { supabase } from '../supabase';
import { ActionExecution } from '../supabase/hooks/useAutomatedActions';

export interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;
  period: {
    start: Date;
    end: Date;
  };
  executionRate: number; // Taux d'exécution (%)
  totalExecutions: number;
  scheduledExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  averageExecutionTime: number; // ms
  errorRate: number; // Taux d'erreur (%)
  conversionRate?: number; // Taux de conversion si applicable
  engagementRate?: number; // Taux d'engagement si applicable
  leadsTriggered: number;
  actionsExecuted: number;
  averageActionsPerLead: number;
}

export interface WorkflowPerformance {
  workflowId: string;
  workflowName: string;
  scenarioType?: string; // 'onboarding', 'nurturing', 'relance', etc.
  metrics: WorkflowMetrics;
  trends: {
    executionRate: number[]; // Évolution dans le temps
    errorRate: number[];
    conversionRate?: number[];
  };
}

export interface ActionAnalytics {
  actionId: string;
  actionName: string;
  actionType: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  totalCost?: number; // Si applicable (SMS, API, etc.)
  leadsAffected: number;
}

export interface EngagementMetrics {
  emailOpenRate: number; // %
  emailClickRate: number; // %
  emailReplyRate: number; // %
  smsDeliveryRate: number; // %
  callConnectRate: number; // %
  overallEngagementRate: number; // %
}

/**
 * Calcule les métriques de performance d'un workflow
 */
export async function calculateWorkflowMetrics(
  workflowId: string,
  workflowName: string,
  period: { start: Date; end: Date }
): Promise<WorkflowMetrics> {
  try {
    // Récupérer toutes les exécutions d'actions liées à ce workflow
    // Note: On suppose qu'il y a une table action_executions avec un champ workflow_id
    // Sinon, on peut utiliser automated_action_id pour regrouper
    const { data: executions, error } = await supabase
      .from('action_executions')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .eq('automated_action_id', workflowId) // Note: À adapter selon la structure réelle
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erreur récupération exécutions (table action_executions peut ne pas exister):', error);
      // Retourner des métriques vides si la table n'existe pas encore
      return {
        workflowId,
        workflowName,
        period,
        executionRate: 0,
        totalExecutions: 0,
        scheduledExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        cancelledExecutions: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        leadsTriggered: 0,
        actionsExecuted: 0,
        averageActionsPerLead: 0,
      };
    }

    const allExecutions = (executions || []) as ActionExecution[];
    const totalExecutions = allExecutions.length;
    const scheduledExecutions = allExecutions.filter(e => e.executionStatus === 'scheduled').length;
    const completedExecutions = allExecutions.filter(e => e.executionStatus === 'completed').length;
    const failedExecutions = allExecutions.filter(e => e.executionStatus === 'failed').length;
    const cancelledExecutions = allExecutions.filter(e => e.executionStatus === 'cancelled').length;

    // Calculer le taux d'exécution
    const executionRate = scheduledExecutions > 0 
      ? (completedExecutions / scheduledExecutions) * 100 
      : 0;

    // Calculer le temps moyen d'exécution
    const completedWithDuration = allExecutions.filter(e => 
      e.executionStatus === 'completed' && e.executedAt && e.scheduledAt
    );
    let averageExecutionTime = 0;
    if (completedWithDuration.length > 0) {
      const totalDuration = completedWithDuration.reduce((sum, e) => {
        const scheduled = new Date(e.scheduledAt!).getTime();
        const executed = new Date(e.executedAt!).getTime();
        return sum + (executed - scheduled);
      }, 0);
      averageExecutionTime = totalDuration / completedWithDuration.length;
    }

    // Taux d'erreur
    const errorRate = totalExecutions > 0 
      ? (failedExecutions / totalExecutions) * 100 
      : 0;

    // Compter les leads uniques
    const uniqueLeadIds = new Set(allExecutions.map(e => e.leadId));
    const leadsTriggered = uniqueLeadIds.size;

    // Nombre d'actions exécutées
    const actionsExecuted = completedExecutions;

    // Actions moyennes par lead
    const averageActionsPerLead = leadsTriggered > 0 
      ? actionsExecuted / leadsTriggered 
      : 0;

    return {
      workflowId,
      workflowName,
      period,
      executionRate,
      totalExecutions,
      scheduledExecutions,
      completedExecutions,
      failedExecutions,
      cancelledExecutions,
      averageExecutionTime,
      errorRate,
      leadsTriggered,
      actionsExecuted,
      averageActionsPerLead,
    };
  } catch (error) {
    console.error('Erreur calcul métriques workflow:', error);
    throw error;
  }
}

/**
 * Calcule le taux de conversion par scénario
 */
export async function calculateConversionRate(
  workflowId: string,
  scenarioType: string,
  period: { start: Date; end: Date }
): Promise<number> {
  try {
    // Récupérer les leads qui sont entrés dans le scénario
    // Cela nécessite de tracker les leads dans chaque scénario
    // Pour l'instant, on utilise les exécutions d'actions comme proxy
    const { data: executions, error } = await supabase
      .from('action_executions')
      .select('lead_id, execution_status')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .eq('automated_action_id', workflowId);

    if (error) throw error;

    const allExecutions = executions || [];
    const uniqueLeadIds = new Set(allExecutions.map(e => e.lead_id));
    const leadsEntered = uniqueLeadIds.size;

    if (leadsEntered === 0) return 0;

    // Compter les leads convertis (statut "Client" ou lifecycle_stage "Client")
    // Il faudrait vérifier le statut actuel des leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, lifecycle_stage, status')
      .in('id', Array.from(uniqueLeadIds));

    if (leadsError) throw leadsError;

    const convertedLeads = (leads || []).filter(lead => 
      lead.lifecycle_stage === 'Client' || lead.status === 'Gagné'
    ).length;

    return (convertedLeads / leadsEntered) * 100;
  } catch (error) {
    console.error('Erreur calcul taux conversion:', error);
    return 0;
  }
}

/**
 * Calcule les métriques d'engagement (email, SMS, etc.)
 */
export async function calculateEngagementMetrics(
  workflowId: string,
  period: { start: Date; end: Date }
): Promise<EngagementMetrics> {
  try {
    // Récupérer les exécutions d'actions de type email
    const { data: emailExecutions, error: emailError } = await supabase
      .from('action_executions')
      .select('id, result_data')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .eq('automated_action_id', workflowId)
      .contains('result_data', { action_type: 'email' });

    if (emailError) throw emailError;

    // Récupérer les données de tracking email depuis email_tracking
    // Note: Il faudrait lier les action_executions aux email_tracking via un ID commun
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('open_count, click_count, reply_count')
      .gte('sent_at', period.start.toISOString())
      .lte('sent_at', period.end.toISOString());

    if (trackingError) {
      console.warn('Erreur récupération tracking email:', trackingError);
    }

    const totalEmails = (emailTracking || []).length;
    const totalOpens = (emailTracking || []).reduce((sum, e) => sum + (e.open_count || 0), 0);
    const totalClicks = (emailTracking || []).reduce((sum, e) => sum + (e.click_count || 0), 0);
    const totalReplies = (emailTracking || []).reduce((sum, e) => sum + (e.reply_count || 0), 0);

    const emailOpenRate = totalEmails > 0 ? (totalOpens / totalEmails) * 100 : 0;
    const emailClickRate = totalEmails > 0 ? (totalClicks / totalEmails) * 100 : 0;
    const emailReplyRate = totalEmails > 0 ? (totalReplies / totalEmails) * 100 : 0;

    // Pour SMS et calls, on pourrait avoir des métriques similaires
    // Pour l'instant, on retourne 0 si non disponible
    const smsDeliveryRate = 0; // TODO: Implémenter quand SMS tracking disponible
    const callConnectRate = 0; // TODO: Implémenter quand VoIP tracking disponible

    // Taux d'engagement global (moyenne pondérée)
    const overallEngagementRate = (
      emailOpenRate * 0.4 + 
      emailClickRate * 0.4 + 
      emailReplyRate * 0.2
    );

    return {
      emailOpenRate,
      emailClickRate,
      emailReplyRate,
      smsDeliveryRate,
      callConnectRate,
      overallEngagementRate,
    };
  } catch (error) {
    console.error('Erreur calcul métriques engagement:', error);
    return {
      emailOpenRate: 0,
      emailClickRate: 0,
      emailReplyRate: 0,
      smsDeliveryRate: 0,
      callConnectRate: 0,
      overallEngagementRate: 0,
    };
  }
}

/**
 * Calcule le temps moyen dans chaque étape
 */
export async function calculateAverageTimePerStage(
  scenarioType: string,
  period: { start: Date; end: Date }
): Promise<Record<string, number>> {
  try {
    // Récupérer les transitions de cycle de vie depuis lifecycle_transitions
    // Note: Cette table devrait exister pour tracker les transitions
    const { data: transitions, error } = await supabase
      .from('lifecycle_transitions')
      .select('from_stage, to_stage, transition_date, lead_id')
      .gte('transition_date', period.start.toISOString())
      .lte('transition_date', period.end.toISOString());

    if (error) {
      // Si la table n'existe pas, retourner des valeurs par défaut
      console.warn('Table lifecycle_transitions non disponible:', error);
      return {};
    }

    const allTransitions = transitions || [];
    const stageTimes: Record<string, number[]> = {};

    // Grouper les transitions par lead
    const transitionsByLead: Record<string, typeof allTransitions> = {};
    for (const transition of allTransitions) {
      if (!transitionsByLead[transition.lead_id]) {
        transitionsByLead[transition.lead_id] = [];
      }
      transitionsByLead[transition.lead_id].push(transition);
    }

    // Calculer le temps entre chaque étape pour chaque lead
    for (const leadId in transitionsByLead) {
      const leadTransitions = transitionsByLead[leadId].sort((a, b) => 
        new Date(a.transition_date).getTime() - new Date(b.transition_date).getTime()
      );

      for (let i = 0; i < leadTransitions.length - 1; i++) {
        const fromTransition = leadTransitions[i];
        const toTransition = leadTransitions[i + 1];
        const stageKey = `${fromTransition.to_stage} → ${toTransition.to_stage}`;
        
        if (!stageTimes[stageKey]) {
          stageTimes[stageKey] = [];
        }

        const timeDiff = new Date(toTransition.transition_date).getTime() - 
                        new Date(fromTransition.transition_date).getTime();
        stageTimes[stageKey].push(timeDiff);
      }
    }

    // Calculer la moyenne pour chaque étape
    const averages: Record<string, number> = {};
    for (const stageKey in stageTimes) {
      const times = stageTimes[stageKey];
      const average = times.reduce((sum, t) => sum + t, 0) / times.length;
      averages[stageKey] = average / (1000 * 60 * 60 * 24); // Convertir en jours
    }

    return averages;
  } catch (error) {
    console.error('Erreur calcul temps moyen par étape:', error);
    return {};
  }
}

/**
 * Calcule le ROI des automations
 */
export async function calculateAutomationROI(
  workflowId: string,
  period: { start: Date; end: Date }
): Promise<{
  timeSaved: number; // Heures économisées
  conversionsGenerated: number;
  revenueGenerated?: number; // Revenu généré (si disponible)
  cost: number; // Coût des automations (API, infrastructure)
  roi: number; // ROI en pourcentage
}> {
  try {
    const metrics = await calculateWorkflowMetrics(workflowId, '', period);
    const engagement = await calculateEngagementMetrics(workflowId, period);

    // Estimation du temps économisé (en heures)
    // On estime qu'une action automatisée économise 5 minutes en moyenne
    const timeSavedPerAction = 5 / 60; // 5 minutes = 5/60 heures
    const timeSaved = metrics.actionsExecuted * timeSavedPerAction;

    // Conversions générées
    const conversionsGenerated = Math.floor(
      (metrics.leadsTriggered * (engagement.overallEngagementRate / 100)) * 0.1 // Estimation: 10% d'engagement → conversion
    );

    // Coût des automations (exemple: 0.01€ par action)
    const costPerAction = 0.01;
    const cost = metrics.actionsExecuted * costPerAction;

    // ROI = (Bénéfices - Coûts) / Coûts * 100
    // Bénéfices = temps économisé (monétisé) + conversions générées
    // Estimation: 1 heure = 50€, 1 conversion = 100€
    const hourlyRate = 50;
    const conversionValue = 100;
    const benefits = (timeSaved * hourlyRate) + (conversionsGenerated * conversionValue);
    const roi = cost > 0 ? ((benefits - cost) / cost) * 100 : 0;

    return {
      timeSaved,
      conversionsGenerated,
      revenueGenerated: conversionsGenerated * conversionValue,
      cost,
      roi,
    };
  } catch (error) {
    console.error('Erreur calcul ROI:', error);
    return {
      timeSaved: 0,
      conversionsGenerated: 0,
      cost: 0,
      roi: 0,
    };
  }
}

/**
 * Récupère l'historique complet des actions automatisées
 */
export async function getAutomationHistory(filters?: {
  workflowId?: string;
  leadId?: string;
  actionType?: string;
  period?: { start: Date; end: Date };
  limit?: number;
}): Promise<ActionExecution[]> {
  try {
    let query = supabase
      .from('action_executions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.workflowId) {
      // Note: La structure peut varier selon le schéma réel
      // Si workflowId correspond à automated_action_id, utiliser directement
      query = query.eq('automated_action_id', filters.workflowId);
    }

    if (filters?.leadId) {
      query = query.eq('lead_id', filters.leadId);
    }

    if (filters?.actionType) {
      // Note: Il faudrait joindre avec automated_actions pour filtrer par type
      // Pour l'instant, on peut filtrer via metadata ou result_data
      query = query.contains('metadata', { action_type: filters.actionType });
    }

    if (filters?.period) {
      query = query
        .gte('created_at', filters.period.start.toISOString())
        .lte('created_at', filters.period.end.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as ActionExecution[];
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    return [];
  }
}

/**
 * Exporte l'historique au format CSV
 */
export async function exportAutomationHistoryCSV(
  filters?: Parameters<typeof getAutomationHistory>[0]
): Promise<string> {
  const history = await getAutomationHistory(filters);

  const headers = [
    'ID',
    'Action ID',
    'Lead ID',
    'Statut',
    'Type Déclencheur',
    'Date Création',
    'Date Exécution',
    'Date Planifiée',
    'Message Erreur',
  ];

  const rows = history.map(execution => [
    execution.id,
    execution.automatedActionId,
    execution.leadId,
    execution.executionStatus,
    execution.triggerType || '',
    execution.createdAt,
    execution.executedAt || '',
    execution.scheduledAt || '',
    execution.errorMessage || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

