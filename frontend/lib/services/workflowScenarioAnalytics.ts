/**
 * Service d'analytics spécifique aux scénarios de workflow
 * Compte les leads en cours dans chaque scénario, performance par scénario
 */

import { supabase } from '../supabase';
import { ActionExecution } from '../supabase/hooks/useAutomatedActions';

export interface ScenarioMetrics {
  scenarioType: string; // 'onboarding', 'nurturing', 'relance', etc.
  leadsInScenario: number;
  leadsEntered: number; // Leads entrés dans le scénario sur la période
  leadsCompleted: number; // Leads ayant complété le scénario
  leadsAbandoned: number; // Leads ayant abandonné le scénario
  conversionRate: number; // Taux de conversion (%)
  abandonmentRate: number; // Taux d'abandon (%)
  averageDuration: number; // Durée moyenne dans le scénario (jours)
  actionsExecuted: number;
  engagementRate: number;
}

export interface ScenarioComparison {
  scenarios: ScenarioMetrics[];
  bestPerformer: ScenarioMetrics | null;
  worstPerformer: ScenarioMetrics | null;
  averageConversionRate: number;
  averageAbandonmentRate: number;
}

/**
 * Compte les leads actuellement dans un scénario
 * Note: Cela nécessite de tracker l'état des leads dans chaque scénario
 * On peut utiliser les exécutions d'actions ou une table dédiée
 */
export async function getLeadsInScenario(
  scenarioType: string,
  date?: Date
): Promise<number> {
  try {
    // Récupérer les leads qui ont une action automatisée active pour ce scénario
    // On peut utiliser les action_executions avec statut 'pending' ou 'scheduled'
    const cutoffDate = date || new Date();
    
    const { data, error } = await supabase
      .from('action_executions')
      .select('lead_id', { count: 'exact', head: true })
      .in('execution_status', ['pending', 'scheduled', 'processing'])
      .gte('created_at', new Date(cutoffDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 90 derniers jours
      .contains('metadata', { scenario_type: scenarioType }); // Si scenario_type est stocké dans metadata

    if (error) {
      console.warn('Erreur comptage leads dans scénario:', error);
      return 0;
    }

    // Alternative: Compter les leads uniques
    const { data: uniqueLeads, error: uniqueError } = await supabase
      .from('action_executions')
      .select('lead_id')
      .in('execution_status', ['pending', 'scheduled', 'processing'])
      .gte('created_at', new Date(cutoffDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (uniqueError) {
      console.warn('Erreur comptage leads uniques:', uniqueError);
      return 0;
    }

    const uniqueLeadIds = new Set((uniqueLeads || []).map(e => e.lead_id));
    return uniqueLeadIds.size;
  } catch (error) {
    console.error('Erreur getLeadsInScenario:', error);
    return 0;
  }
}

/**
 * Calcule les métriques complètes pour un scénario
 */
export async function calculateScenarioMetrics(
  scenarioType: string,
  period: { start: Date; end: Date }
): Promise<ScenarioMetrics> {
  try {
    // Récupérer toutes les exécutions d'actions pour ce scénario
    const { data: executions, error } = await supabase
      .from('action_executions')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .contains('metadata', { scenario_type: scenarioType });

    if (error) {
      console.warn('Erreur récupération exécutions scénario:', error);
    }

    const allExecutions = (executions || []) as ActionExecution[];
    const uniqueLeadIds = new Set(allExecutions.map(e => e.leadId));
    const leadsEntered = uniqueLeadIds.size;

    // Leads actuellement dans le scénario
    const leadsInScenario = await getLeadsInScenario(scenarioType, period.end);

    // Compter les leads ayant complété le scénario (statut 'completed' pour toutes actions)
    const completedExecutions = allExecutions.filter(e => e.executionStatus === 'completed');
    const leadsCompleted = new Set(
      completedExecutions
        .filter(e => {
          // Un lead a complété si toutes ses actions sont complétées
          const leadExecutions = allExecutions.filter(ex => ex.leadId === e.leadId);
          return leadExecutions.every(ex => ex.executionStatus === 'completed');
        })
        .map(e => e.leadId)
    ).size;

    // Compter les leads abandonnés (pas d'activité depuis 30+ jours)
    const cutoffDate = new Date(period.end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const abandonedLeads = new Set(
      allExecutions
        .filter(e => {
          const lastExecution = allExecutions
            .filter(ex => ex.leadId === e.leadId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          return lastExecution && new Date(lastExecution.createdAt) < cutoffDate &&
                 !completedExecutions.some(ex => ex.leadId === e.leadId);
        })
        .map(e => e.leadId)
    ).size;

    const conversionRate = leadsEntered > 0 ? (leadsCompleted / leadsEntered) * 100 : 0;
    const abandonmentRate = leadsEntered > 0 ? (abandonedLeads / leadsEntered) * 100 : 0;

    // Calculer la durée moyenne (si lifecycle_transitions disponible)
    const { data: transitions, error: transitionsError } = await supabase
      .from('lifecycle_transitions')
      .select('lead_id, transition_date')
      .in('lead_id', Array.from(uniqueLeadIds))
      .gte('transition_date', period.start.toISOString())
      .lte('transition_date', period.end.toISOString());

    let averageDuration = 0;
    if (!transitionsError && transitions && transitions.length > 0) {
      const durations: number[] = [];
      const transitionsByLead: Record<string, typeof transitions> = {};
      
      for (const transition of transitions) {
        if (!transitionsByLead[transition.lead_id]) {
          transitionsByLead[transition.lead_id] = [];
        }
        transitionsByLead[transition.lead_id].push(transition);
      }

      for (const leadId in transitionsByLead) {
        const leadTransitions = transitionsByLead[leadId]
          .sort((a, b) => new Date(a.transition_date).getTime() - new Date(b.transition_date).getTime());
        
        if (leadTransitions.length > 1) {
          const firstTransition = leadTransitions[0];
          const lastTransition = leadTransitions[leadTransitions.length - 1];
          const duration = new Date(lastTransition.transition_date).getTime() - 
                          new Date(firstTransition.transition_date).getTime();
          durations.push(duration / (1000 * 60 * 60 * 24)); // En jours
        }
      }

      if (durations.length > 0) {
        averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      }
    }

    // Calculer engagement (taux d'ouverture/clic emails)
    const { data: emailTracking, error: emailError } = await supabase
      .from('email_tracking')
      .select('open_count, click_count')
      .in('lead_id', Array.from(uniqueLeadIds))
      .gte('sent_at', period.start.toISOString())
      .lte('sent_at', period.end.toISOString());

    let engagementRate = 0;
    if (!emailError && emailTracking && emailTracking.length > 0) {
      const totalEmails = emailTracking.length;
      const totalOpens = emailTracking.reduce((sum, e) => sum + (e.open_count || 0), 0);
      const totalClicks = emailTracking.reduce((sum, e) => sum + (e.click_count || 0), 0);
      engagementRate = totalEmails > 0 
        ? ((totalOpens * 0.6 + totalClicks * 0.4) / totalEmails) * 100 
        : 0;
    }

    return {
      scenarioType,
      leadsInScenario,
      leadsEntered,
      leadsCompleted,
      leadsAbandoned: abandonedLeads,
      conversionRate,
      abandonmentRate,
      averageDuration,
      actionsExecuted: completedExecutions.length,
      engagementRate,
    };
  } catch (error) {
    console.error('Erreur calculateScenarioMetrics:', error);
    return {
      scenarioType,
      leadsInScenario: 0,
      leadsEntered: 0,
      leadsCompleted: 0,
      leadsAbandoned: 0,
      conversionRate: 0,
      abandonmentRate: 0,
      averageDuration: 0,
      actionsExecuted: 0,
      engagementRate: 0,
    };
  }
}

/**
 * Compare les performances entre scénarios
 */
export async function compareScenarios(
  scenarioTypes: string[],
  period: { start: Date; end: Date }
): Promise<ScenarioComparison> {
  try {
    const metricsPromises = scenarioTypes.map(type => 
      calculateScenarioMetrics(type, period)
    );
    
    const scenarios = await Promise.all(metricsPromises);

    const bestPerformer = scenarios.reduce((best, current) => 
      current.conversionRate > (best?.conversionRate || 0) ? current : best, 
      scenarios[0] || null
    );

    const worstPerformer = scenarios.reduce((worst, current) => 
      current.conversionRate < (worst?.conversionRate || Infinity) ? current : worst, 
      scenarios[0] || null
    );

    const averageConversionRate = scenarios.length > 0
      ? scenarios.reduce((sum, s) => sum + s.conversionRate, 0) / scenarios.length
      : 0;

    const averageAbandonmentRate = scenarios.length > 0
      ? scenarios.reduce((sum, s) => sum + s.abandonmentRate, 0) / scenarios.length
      : 0;

    return {
      scenarios,
      bestPerformer,
      worstPerformer,
      averageConversionRate,
      averageAbandonmentRate,
    };
  } catch (error) {
    console.error('Erreur compareScenarios:', error);
    return {
      scenarios: [],
      bestPerformer: null,
      worstPerformer: null,
      averageConversionRate: 0,
      averageAbandonmentRate: 0,
    };
  }
}

/**
 * Récupère la répartition des leads par scénario
 */
export async function getLeadsDistributionByScenario(
  scenarioTypes: string[]
): Promise<Record<string, number>> {
  try {
    const distribution: Record<string, number> = {};
    
    const countsPromises = scenarioTypes.map(async (type) => {
      const count = await getLeadsInScenario(type);
      return { type, count };
    });

    const results = await Promise.all(countsPromises);
    
    for (const result of results) {
      distribution[result.type] = result.count;
    }

    return distribution;
  } catch (error) {
    console.error('Erreur getLeadsDistributionByScenario:', error);
    return {};
  }
}

