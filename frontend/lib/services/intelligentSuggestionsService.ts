/**
 * Service de suggestions intelligentes avancées
 * Fournit des suggestions contextuelles pour améliorer la productivité et les performances
 */

import { supabase } from '../supabase';
import { callGeminiAPI } from '../ai-client';

export type SuggestionCategory = 
  | 'lead_management' 
  | 'task_optimization' 
  | 'workflow_improvement' 
  | 'content_optimization' 
  | 'timing_optimization'
  | 'resource_allocation'
  | 'communication'
  | 'sales_strategy';

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IntelligentSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  priority: SuggestionPriority;
  impact_score: number; // 0-100
  confidence: number; // 0-100
  action_items: Array<{
    action: string;
    priority: string;
    estimated_impact: number;
  }>;
  context: Record<string, any>;
  related_entities?: {
    lead_ids?: string[];
    task_ids?: string[];
    workflow_ids?: string[];
    campaign_ids?: string[];
  };
  is_applied: boolean;
  is_dismissed: boolean;
  created_at: string;
  applied_at?: string;
}

/**
 * Génère des suggestions intelligentes basées sur l'analyse des données
 */
export async function generateIntelligentSuggestions(
  userId: string,
  categories?: SuggestionCategory[]
): Promise<IntelligentSuggestion[]> {
  try {
    // Récupérer les données contextuelles
    const [leadsData, tasksData, workflowsData, campaignsData] = await Promise.all([
      supabase.from('leads').select('*').limit(100),
      supabase.from('tasks').select('*').limit(100),
      supabase.from('workflows').select('*').limit(50),
      supabase.from('campaigns').select('*').limit(50)
    ]);

    const leads = leadsData.data || [];
    const tasks = tasksData.data || [];
    const workflows = workflowsData.data || [];
    const campaigns = campaignsData.data || [];

    // Analyser les données et générer des suggestions
    const suggestions: IntelligentSuggestion[] = [];

    // 1. Suggestions pour la gestion des leads
    if (!categories || categories.includes('lead_management')) {
      const leadSuggestions = await generateLeadManagementSuggestions(leads);
      suggestions.push(...leadSuggestions);
    }

    // 2. Suggestions pour l'optimisation des tâches
    if (!categories || categories.includes('task_optimization')) {
      const taskSuggestions = await generateTaskOptimizationSuggestions(tasks);
      suggestions.push(...taskSuggestions);
    }

    // 3. Suggestions pour l'amélioration des workflows
    if (!categories || categories.includes('workflow_improvement')) {
      const workflowSuggestions = await generateWorkflowImprovementSuggestions(workflows);
      suggestions.push(...workflowSuggestions);
    }

    // 4. Suggestions pour l'optimisation du contenu
    if (!categories || categories.includes('content_optimization')) {
      const contentSuggestions = await generateContentOptimizationSuggestions(campaigns);
      suggestions.push(...contentSuggestions);
    }

    // 5. Suggestions pour l'optimisation du timing
    if (!categories || categories.includes('timing_optimization')) {
      const timingSuggestions = await generateTimingOptimizationSuggestions(leads, tasks);
      suggestions.push(...timingSuggestions);
    }

    // 6. Suggestions pour l'allocation des ressources
    if (!categories || categories.includes('resource_allocation')) {
      const resourceSuggestions = await generateResourceAllocationSuggestions(tasks, leads);
      suggestions.push(...resourceSuggestions);
    }

    // 7. Suggestions pour la communication
    if (!categories || categories.includes('communication')) {
      const communicationSuggestions = await generateCommunicationSuggestions(leads, campaigns);
      suggestions.push(...communicationSuggestions);
    }

    // 8. Suggestions pour la stratégie commerciale
    if (!categories || categories.includes('sales_strategy')) {
      const salesSuggestions = await generateSalesStrategySuggestions(leads, workflows);
      suggestions.push(...salesSuggestions);
    }

    // Enregistrer les suggestions dans la base de données
    if (suggestions.length > 0) {
      await supabase.from('intelligent_suggestions').insert(
        suggestions.map(s => ({
          user_id: userId,
          ...s
        }))
      );
    }

    return suggestions;
  } catch (error: any) {
    console.error('Error generating intelligent suggestions:', error);
    throw error;
  }
}

/**
 * Génère des suggestions pour la gestion des leads
 */
async function generateLeadManagementSuggestions(leads: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser les leads non contactés depuis plus de 7 jours
  const staleLeads = leads.filter(lead => {
    if (!lead.last_activity_at) return true;
    const daysSinceActivity = (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity > 7;
  });

  if (staleLeads.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-1`,
      category: 'lead_management',
      title: `${staleLeads.length} leads non contactés depuis plus de 7 jours`,
      description: `Vous avez ${staleLeads.length} leads qui n'ont pas été contactés récemment. Une relance pourrait améliorer votre taux de conversion.`,
      priority: staleLeads.length > 10 ? 'high' : 'medium',
      impact_score: Math.min(80, staleLeads.length * 5),
      confidence: 85,
      action_items: [
        {
          action: `Créer une campagne de relance pour ${staleLeads.length} leads`,
          priority: 'high',
          estimated_impact: 70
        },
        {
          action: 'Configurer un workflow automatique de relance',
          priority: 'medium',
          estimated_impact: 60
        }
      ],
      context: {
        stale_leads_count: staleLeads.length,
        average_days_since_activity: staleLeads.reduce((sum, lead) => {
          if (!lead.last_activity_at) return sum + 30;
          const days = (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / staleLeads.length
      },
      related_entities: {
        lead_ids: staleLeads.slice(0, 10).map(l => l.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  // Analyser les leads avec scoring élevé mais pas encore qualifiés
  const highScoreLeads = leads.filter(lead => {
    const score = parseFloat(lead.scoring?.toString() || '0');
    return score >= 75 && lead.lifecycleStage !== 'SQL' && lead.lifecycleStage !== 'Opportunité';
  });

  if (highScoreLeads.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-2`,
      category: 'lead_management',
      title: `${highScoreLeads.length} leads à fort potentiel à qualifier`,
      description: `Vous avez ${highScoreLeads.length} leads avec un scoring élevé (≥75) qui pourraient être qualifiés pour la vente.`,
      priority: 'high',
      impact_score: 90,
      confidence: 90,
      action_items: [
        {
          action: `Qualifier ${highScoreLeads.length} leads en SQL`,
          priority: 'high',
          estimated_impact: 85
        },
        {
          action: 'Créer des tâches de suivi pour ces leads',
          priority: 'medium',
          estimated_impact: 70
        }
      ],
      context: {
        high_score_leads_count: highScoreLeads.length,
        average_scoring: highScoreLeads.reduce((sum, lead) => sum + parseFloat(lead.scoring?.toString() || '0'), 0) / highScoreLeads.length
      },
      related_entities: {
        lead_ids: highScoreLeads.slice(0, 10).map(l => l.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Génère des suggestions pour l'optimisation des tâches
 */
async function generateTaskOptimizationSuggestions(tasks: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser les tâches en retard
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== 'Terminé';
  });

  if (overdueTasks.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-3`,
      category: 'task_optimization',
      title: `${overdueTasks.length} tâches en retard`,
      description: `Vous avez ${overdueTasks.length} tâches dont la date d'échéance est dépassée.`,
      priority: 'urgent',
      impact_score: 95,
      confidence: 100,
      action_items: [
        {
          action: `Réorganiser les priorités pour ${overdueTasks.length} tâches`,
          priority: 'urgent',
          estimated_impact: 90
        },
        {
          action: 'Réassigner les tâches si nécessaire',
          priority: 'high',
          estimated_impact: 75
        }
      ],
      context: {
        overdue_tasks_count: overdueTasks.length
      },
      related_entities: {
        task_ids: overdueTasks.slice(0, 10).map(t => t.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  // Analyser la répartition des tâches par utilisateur
  const tasksByUser: Record<string, number> = {};
  tasks.forEach(task => {
    if (task.assignedTo) {
      tasksByUser[task.assignedTo] = (tasksByUser[task.assignedTo] || 0) + 1;
    }
  });

  const maxTasks = Math.max(...Object.values(tasksByUser));
  const minTasks = Math.min(...Object.values(tasksByUser));
  const imbalance = maxTasks - minTasks;

  if (imbalance > 5) {
    suggestions.push({
      id: `suggestion-${Date.now()}-4`,
      category: 'task_optimization',
      title: 'Déséquilibre dans la répartition des tâches',
      description: `La charge de travail est inégale entre les membres de l'équipe (écart de ${imbalance} tâches).`,
      priority: 'medium',
      impact_score: 65,
      confidence: 90,
      action_items: [
        {
          action: 'Rééquilibrer la charge de travail',
          priority: 'medium',
          estimated_impact: 70
        }
      ],
      context: {
        max_tasks: maxTasks,
        min_tasks: minTasks,
        imbalance
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Génère des suggestions pour l'amélioration des workflows
 */
async function generateWorkflowImprovementSuggestions(workflows: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser les workflows inactifs
  const inactiveWorkflows = workflows.filter(w => !w.is_active);

  if (inactiveWorkflows.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-5`,
      category: 'workflow_improvement',
      title: `${inactiveWorkflows.length} workflows inactifs`,
      description: `Vous avez ${inactiveWorkflows.length} workflows désactivés qui pourraient être réactivés ou supprimés.`,
      priority: 'low',
      impact_score: 40,
      confidence: 100,
      action_items: [
        {
          action: 'Réviser les workflows inactifs',
          priority: 'low',
          estimated_impact: 50
        }
      ],
      context: {
        inactive_workflows_count: inactiveWorkflows.length
      },
      related_entities: {
        workflow_ids: inactiveWorkflows.slice(0, 5).map(w => w.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Génère des suggestions pour l'optimisation du contenu
 */
async function generateContentOptimizationSuggestions(campaigns: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Utiliser l'IA pour générer des suggestions avancées
  try {
    const prompt = `Analyse les campagnes suivantes et génère des suggestions d'optimisation :
${JSON.stringify(campaigns.slice(0, 5), null, 2)}

Génère 2-3 suggestions concrètes pour améliorer les performances des campagnes.`;

    const aiResponse = await callGeminiAPI(prompt);
    
    if (aiResponse) {
      suggestions.push({
        id: `suggestion-${Date.now()}-6`,
        category: 'content_optimization',
        title: 'Suggestions d\'optimisation de contenu (IA)',
        description: aiResponse.substring(0, 200),
        priority: 'medium',
        impact_score: 70,
        confidence: 75,
        action_items: [
          {
            action: 'Appliquer les suggestions d\'optimisation',
            priority: 'medium',
            estimated_impact: 70
          }
        ],
        context: {
          ai_generated: true,
          campaigns_analyzed: campaigns.length
        },
        related_entities: {
          campaign_ids: campaigns.slice(0, 5).map(c => c.id)
        },
        is_applied: false,
        is_dismissed: false,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error generating AI content suggestions:', error);
  }

  return suggestions;
}

/**
 * Génère des suggestions pour l'optimisation du timing
 */
async function generateTimingOptimizationSuggestions(leads: any[], tasks: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser les meilleurs moments pour contacter les leads
  const contactTimes: number[] = [];
  leads.forEach(lead => {
    if (lead.last_activity_at) {
      const hour = new Date(lead.last_activity_at).getHours();
      contactTimes.push(hour);
    }
  });

  if (contactTimes.length > 10) {
    const avgHour = contactTimes.reduce((a, b) => a + b, 0) / contactTimes.length;
    
    if (avgHour < 9 || avgHour > 17) {
      suggestions.push({
        id: `suggestion-${Date.now()}-7`,
        category: 'timing_optimization',
        title: 'Optimiser les heures de contact',
        description: `Les contacts se font principalement en dehors des heures de bureau (moyenne: ${avgHour.toFixed(1)}h). Pensez à programmer vos relances pendant les heures de bureau (9h-17h).`,
        priority: 'medium',
        impact_score: 60,
        confidence: 80,
        action_items: [
          {
            action: 'Ajuster les heures de relance automatique',
            priority: 'medium',
            estimated_impact: 65
          }
        ],
        context: {
          average_contact_hour: avgHour
        },
        is_applied: false,
        is_dismissed: false,
        created_at: new Date().toISOString()
      });
    }
  }

  return suggestions;
}

/**
 * Génère des suggestions pour l'allocation des ressources
 */
async function generateResourceAllocationSuggestions(tasks: any[], leads: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser la charge de travail
  const activeTasks = tasks.filter(t => t.status !== 'Terminé' && t.status !== 'Annulé');
  
  if (activeTasks.length > 50) {
    suggestions.push({
      id: `suggestion-${Date.now()}-8`,
      category: 'resource_allocation',
      title: 'Charge de travail élevée',
      description: `Vous avez ${activeTasks.length} tâches actives. Pensez à prioriser ou à déléguer certaines tâches.`,
      priority: 'high',
      impact_score: 75,
      confidence: 90,
      action_items: [
        {
          action: 'Prioriser les tâches les plus importantes',
          priority: 'high',
          estimated_impact: 80
        },
        {
          action: 'Déléguer certaines tâches',
          priority: 'medium',
          estimated_impact: 70
        }
      ],
      context: {
        active_tasks_count: activeTasks.length
      },
      related_entities: {
        task_ids: activeTasks.slice(0, 10).map(t => t.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Génère des suggestions pour la communication
 */
async function generateCommunicationSuggestions(leads: any[], campaigns: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser les leads sans réponse depuis longtemps
  const unresponsiveLeads = leads.filter(lead => {
    if (!lead.last_activity_at) return true;
    const daysSinceActivity = (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity > 14;
  });

  if (unresponsiveLeads.length > 5) {
    suggestions.push({
      id: `suggestion-${Date.now()}-9`,
      category: 'communication',
      title: `${unresponsiveLeads.length} leads sans réponse`,
      description: `Vous avez ${unresponsiveLeads.length} leads qui n'ont pas répondu depuis plus de 14 jours. Une relance personnalisée pourrait les réengager.`,
      priority: 'medium',
      impact_score: 65,
      confidence: 75,
      action_items: [
        {
          action: `Créer une campagne de réengagement pour ${unresponsiveLeads.length} leads`,
          priority: 'medium',
          estimated_impact: 60
        }
      ],
      context: {
        unresponsive_leads_count: unresponsiveLeads.length
      },
      related_entities: {
        lead_ids: unresponsiveLeads.slice(0, 10).map(l => l.id)
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Génère des suggestions pour la stratégie commerciale
 */
async function generateSalesStrategySuggestions(leads: any[], workflows: any[]): Promise<IntelligentSuggestion[]> {
  const suggestions: IntelligentSuggestion[] = [];

  // Analyser le taux de conversion
  const convertedLeads = leads.filter(l => l.stage === 'Gagné' || l.lifecycleStage === 'Client');
  const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0;

  if (conversionRate < 10 && leads.length > 20) {
    suggestions.push({
      id: `suggestion-${Date.now()}-10`,
      category: 'sales_strategy',
      title: 'Taux de conversion faible',
      description: `Votre taux de conversion est de ${conversionRate.toFixed(1)}%. Pensez à améliorer votre processus de qualification et de suivi.`,
      priority: 'high',
      impact_score: 85,
      confidence: 90,
      action_items: [
        {
          action: 'Améliorer le processus de qualification',
          priority: 'high',
          estimated_impact: 80
        },
        {
          action: 'Optimiser les workflows de suivi',
          priority: 'medium',
          estimated_impact: 70
        }
      ],
      context: {
        conversion_rate: conversionRate,
        total_leads: leads.length,
        converted_leads: convertedLeads.length
      },
      is_applied: false,
      is_dismissed: false,
      created_at: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Récupère les suggestions existantes
 */
export async function getIntelligentSuggestions(
  userId: string,
  filters?: {
    category?: SuggestionCategory;
    priority?: SuggestionPriority;
    is_applied?: boolean;
    is_dismissed?: boolean;
  }
): Promise<IntelligentSuggestion[]> {
  try {
    let query = supabase
      .from('intelligent_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.is_applied !== undefined) {
      query = query.eq('is_applied', filters.is_applied);
    }
    if (filters?.is_dismissed !== undefined) {
      query = query.eq('is_dismissed', filters.is_dismissed);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching intelligent suggestions:', error);
    throw error;
  }
}

/**
 * Marque une suggestion comme appliquée
 */
export async function applySuggestion(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('intelligent_suggestions')
      .update({
        is_applied: true,
        applied_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error applying suggestion:', error);
    throw error;
  }
}

/**
 * Ignore une suggestion
 */
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('intelligent_suggestions')
      .update({ is_dismissed: true })
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error dismissing suggestion:', error);
    throw error;
  }
}

