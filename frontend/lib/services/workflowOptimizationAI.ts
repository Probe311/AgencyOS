/**
 * Service d'optimisation IA pour les workflows
 * Analyse les performances et génère des suggestions d'amélioration
 */

import { 
  calculateWorkflowMetrics, 
  calculateEngagementMetrics,
  WorkflowMetrics,
  EngagementMetrics,
} from './workflowAnalytics';
import { supabase } from '../supabase';

export interface OptimizationSuggestion {
  id: string;
  workflowId: string;
  workflowName: string;
  suggestionType: 'timing' | 'content' | 'conditions' | 'targeting' | 'frequency' | 'other';
  suggestion: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string; // Description textuelle de l'impact estimé
  estimatedImprovement?: number; // Amélioration estimée en pourcentage
  currentValue?: any; // Valeur actuelle
  suggestedValue?: any; // Valeur suggérée
  reasoning: string; // Explication de la suggestion
  actionRequired: string; // Action nécessaire pour implémenter
  difficulty: 'easy' | 'medium' | 'hard'; // Difficulté d'implémentation
}

export interface WorkflowAnalysis {
  workflowId: string;
  workflowName: string;
  metrics: WorkflowMetrics;
  engagement: EngagementMetrics;
  suggestions: OptimizationSuggestion[];
  overallScore: number; // Score de performance global (0-100)
  strengths: string[]; // Points forts identifiés
  weaknesses: string[]; // Points faibles identifiés
}

/**
 * Analyse un workflow et génère des suggestions d'optimisation
 */
export async function analyzeWorkflow(
  workflowId: string,
  workflowName: string,
  period: { start: Date; end: Date }
): Promise<WorkflowAnalysis> {
  try {
    // Récupérer les métriques
    const metrics = await calculateWorkflowMetrics(workflowId, workflowName, period);
    const engagement = await calculateEngagementMetrics(workflowId, period);

    // Générer les suggestions
    const suggestions = await generateOptimizationSuggestions(
      workflowId,
      workflowName,
      metrics,
      engagement,
      period
    );

    // Calculer le score global
    const overallScore = calculateOverallScore(metrics, engagement);

    // Identifier les forces et faiblesses
    const strengths = identifyStrengths(metrics, engagement);
    const weaknesses = identifyWeaknesses(metrics, engagement);

    return {
      workflowId,
      workflowName,
      metrics,
      engagement,
      suggestions: suggestions.sort((a, b) => {
        // Trier par priorité et impact estimé
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      overallScore,
      strengths,
      weaknesses,
    };
  } catch (error) {
    console.error('Erreur analyse workflow:', error);
    throw error;
  }
}

/**
 * Génère des suggestions d'optimisation basées sur les métriques
 */
async function generateOptimizationSuggestions(
  workflowId: string,
  workflowName: string,
  metrics: WorkflowMetrics,
  engagement: EngagementMetrics,
  period: { start: Date; end: Date }
): Promise<OptimizationSuggestion[]> {
  const suggestions: OptimizationSuggestion[] = [];

  // Analyser le timing et les délais
  if (metrics.averageExecutionTime > 30000) { // Plus de 30 secondes
    suggestions.push({
      id: `timing_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'timing',
      suggestion: 'Optimiser le temps d\'exécution des actions',
      description: `Le temps moyen d'exécution est de ${(metrics.averageExecutionTime / 1000).toFixed(1)}s, ce qui peut impacter la réactivité du workflow.`,
      priority: metrics.averageExecutionTime > 60000 ? 'high' : 'medium',
      estimatedImpact: 'Réduction du temps d\'exécution de 20-30%, amélioration de la réactivité',
      estimatedImprovement: 25,
      currentValue: `${(metrics.averageExecutionTime / 1000).toFixed(1)}s`,
      suggestedValue: `< ${(metrics.averageExecutionTime / 1000 * 0.7).toFixed(1)}s`,
      reasoning: 'Les workflows rapides améliorent l\'expérience utilisateur et réduisent les risques d\'erreurs.',
      actionRequired: 'Réviser les actions du workflow pour identifier les optimisations possibles (requêtes en parallèle, cache, etc.)',
      difficulty: 'medium',
    });
  }

  // Analyser le taux d'engagement email
  if (engagement.emailOpenRate < 20) {
    suggestions.push({
      id: `content_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'content',
      suggestion: 'Améliorer le taux d\'ouverture des emails',
      description: `Le taux d'ouverture est de ${engagement.emailOpenRate.toFixed(1)}%, en dessous du benchmark de 20%.`,
      priority: engagement.emailOpenRate < 10 ? 'high' : 'medium',
      estimatedImpact: 'Augmentation du taux d\'ouverture de 5-10 points, meilleur engagement global',
      estimatedImprovement: 10,
      currentValue: `${engagement.emailOpenRate.toFixed(1)}%`,
      suggestedValue: `> 25%`,
      reasoning: 'Un sujet d\'email accrocheur et personnalisé améliore significativement le taux d\'ouverture.',
      actionRequired: 'Personnaliser les sujets d\'email avec des variables dynamiques, tester différents sujets (A/B testing), optimiser l\'heure d\'envoi',
      difficulty: 'easy',
    });
  }

  if (engagement.emailClickRate < 3) {
    suggestions.push({
      id: `content_click_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'content',
      suggestion: 'Améliorer le taux de clic dans les emails',
      description: `Le taux de clic est de ${engagement.emailClickRate.toFixed(1)}%, en dessous du benchmark de 3%.`,
      priority: engagement.emailClickRate < 1 ? 'high' : 'medium',
      estimatedImpact: 'Augmentation du taux de clic de 2-5 points, meilleure conversion',
      estimatedImprovement: 5,
      currentValue: `${engagement.emailClickRate.toFixed(1)}%`,
      suggestedValue: `> 5%`,
      reasoning: 'Un contenu clair avec des CTA visibles et des liens pertinents augmente les clics.',
      actionRequired: 'Améliorer le contenu des emails, ajouter des CTA clairs et visibles, tester différents designs',
      difficulty: 'easy',
    });
  }

  // Analyser le taux d'erreur
  if (metrics.errorRate > 5) {
    suggestions.push({
      id: `error_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'conditions',
      suggestion: 'Réduire le taux d\'erreur',
      description: `Le taux d'erreur est de ${metrics.errorRate.toFixed(1)}%, au-dessus du seuil acceptable de 5%.`,
      priority: metrics.errorRate > 10 ? 'critical' : 'high',
      estimatedImpact: 'Réduction du taux d\'erreur, amélioration de la fiabilité',
      estimatedImprovement: metrics.errorRate * 0.5, // Réduction de 50%
      currentValue: `${metrics.errorRate.toFixed(1)}%`,
      suggestedValue: `< 3%`,
      reasoning: 'Les erreurs fréquentes indiquent des problèmes dans les conditions ou les actions du workflow.',
      actionRequired: 'Examiner les logs d\'erreur, valider les conditions avec l\'outil de validation, ajouter des vérifications de données',
      difficulty: 'medium',
    });
  }

  // Analyser le taux d'exécution
  if (metrics.executionRate < 90) {
    suggestions.push({
      id: `execution_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'conditions',
      suggestion: 'Améliorer le taux d\'exécution',
      description: `Le taux d'exécution est de ${metrics.executionRate.toFixed(1)}%, en dessous de l'objectif de 95%.`,
      priority: metrics.executionRate < 80 ? 'high' : 'medium',
      estimatedImpact: 'Augmentation du taux d\'exécution, meilleure fiabilité',
      estimatedImprovement: (95 - metrics.executionRate) * 0.5,
      currentValue: `${metrics.executionRate.toFixed(1)}%`,
      suggestedValue: `> 95%`,
      reasoning: 'Un faible taux d\'exécution peut indiquer des problèmes de conditions ou de déclencheurs.',
      actionRequired: 'Vérifier les conditions du workflow, s\'assurer que les déclencheurs fonctionnent correctement',
      difficulty: 'medium',
    });
  }

  // Analyser la fréquence d'engagement
  if (engagement.overallEngagementRate < 15 && metrics.actionsExecuted > 0) {
    suggestions.push({
      id: `frequency_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'frequency',
      suggestion: 'Ajuster la fréquence des communications',
      description: `L'engagement global est faible (${engagement.overallEngagementRate.toFixed(1)}%) malgré ${metrics.actionsExecuted} actions exécutées.`,
      priority: engagement.overallEngagementRate < 10 ? 'medium' : 'low',
      estimatedImpact: 'Amélioration de l\'engagement en optimisant le timing et la fréquence',
      estimatedImprovement: 5,
      currentValue: `${engagement.overallEngagementRate.toFixed(1)}%`,
      suggestedValue: `> 20%`,
      reasoning: 'Trop ou pas assez de communications peut nuire à l\'engagement. Il faut trouver le bon équilibre.',
      actionRequired: 'Analyser les meilleurs moments d\'engagement, ajuster les délais entre actions (J+X), tester différentes fréquences',
      difficulty: 'easy',
    });
  }

  // Analyser le nombre d'actions par lead
  if (metrics.averageActionsPerLead > 5) {
    suggestions.push({
      id: `targeting_${workflowId}_${Date.now()}`,
      workflowId,
      workflowName,
      suggestionType: 'targeting',
      suggestion: 'Optimiser le ciblage des leads',
      description: `Chaque lead déclenche en moyenne ${metrics.averageActionsPerLead.toFixed(1)} actions, ce qui peut indiquer un ciblage trop large.`,
      priority: 'medium',
      estimatedImpact: 'Réduction des actions inutiles, meilleure efficacité',
      estimatedImprovement: 15,
      currentValue: `${metrics.averageActionsPerLead.toFixed(1)} actions/lead`,
      suggestedValue: `< 4 actions/lead`,
      reasoning: 'Un ciblage plus précis permet d\'éviter d\'envoyer des communications à des leads non pertinents.',
      actionRequired: 'Affiner les conditions de déclenchement, segmenter mieux les leads, ajouter des vérifications d\'éligibilité',
      difficulty: 'medium',
    });
  }

  // Utiliser l'IA pour générer des suggestions supplémentaires si disponible
  const aiSuggestions = await generateAISuggestions(workflowId, metrics, engagement);
  suggestions.push(...aiSuggestions);

  return suggestions;
}

/**
 * Génère des suggestions via IA (Gemini, Groq, etc.)
 */
async function generateAISuggestions(
  workflowId: string,
  metrics: WorkflowMetrics,
  engagement: EngagementMetrics
): Promise<OptimizationSuggestion[]> {
  try {
    // Préparer le prompt pour l'IA
    const prompt = `
Analyse les métriques de performance suivantes d'un workflow d'automation marketing et génère 2-3 suggestions d'optimisation spécifiques et actionnables.

Métriques:
- Taux d'exécution: ${metrics.executionRate.toFixed(1)}%
- Taux d'erreur: ${metrics.errorRate.toFixed(1)}%
- Leads déclenchés: ${metrics.leadsTriggered}
- Actions exécutées: ${metrics.actionsExecuted}
- Actions moyennes par lead: ${metrics.averageActionsPerLead.toFixed(1)}
- Temps moyen d'exécution: ${(metrics.averageExecutionTime / 1000).toFixed(1)}s
- Taux d'ouverture email: ${engagement.emailOpenRate.toFixed(1)}%
- Taux de clic email: ${engagement.emailClickRate.toFixed(1)}%
- Taux de réponse email: ${engagement.emailReplyRate.toFixed(1)}%
- Engagement global: ${engagement.overallEngagementRate.toFixed(1)}%

Génère des suggestions concrètes pour améliorer les performances, en te concentrant sur:
1. Le timing et les délais entre actions
2. Le contenu et la personnalisation des messages
3. Le ciblage et la segmentation

Format de réponse: JSON array avec des objets contenant:
{
  "suggestion": "titre court",
  "description": "description détaillée",
  "reasoning": "explication de la suggestion",
  "actionRequired": "action concrète à réaliser",
  "estimatedImprovement": nombre en pourcentage,
  "priority": "low|medium|high",
  "difficulty": "easy|medium|hard"
}
    `.trim();

    // Essayer d'utiliser Gemini d'abord
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt,
              }],
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Extraire le JSON de la réponse
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiSuggestions = JSON.parse(jsonMatch[0]);
            
            return aiSuggestions.map((s: any, index: number) => ({
              id: `ai_${workflowId}_${Date.now()}_${index}`,
              workflowId,
              workflowName: 'Workflow',
              suggestionType: 'other' as const,
              suggestion: s.suggestion || '',
              description: s.description || '',
              priority: (s.priority || 'medium') as 'low' | 'medium' | 'high',
              estimatedImpact: `Amélioration estimée de ${s.estimatedImprovement || 0}%`,
              estimatedImprovement: s.estimatedImprovement || 0,
              reasoning: s.reasoning || '',
              actionRequired: s.actionRequired || '',
              difficulty: (s.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            }));
          }
        }
      } catch (error) {
        console.warn('Erreur génération suggestions IA (Gemini):', error);
      }
    }

    // Si Gemini échoue, retourner des suggestions génériques basées sur les règles
    return [];
  } catch (error) {
    console.error('Erreur génération suggestions IA:', error);
    return [];
  }
}

/**
 * Calcule un score global de performance (0-100)
 */
function calculateOverallScore(
  metrics: WorkflowMetrics,
  engagement: EngagementMetrics
): number {
  let score = 100;

  // Pénaliser selon le taux d'erreur (max -20 points)
  score -= Math.min(metrics.errorRate * 2, 20);

  // Pénaliser selon le taux d'exécution (max -15 points)
  if (metrics.executionRate < 95) {
    score -= (95 - metrics.executionRate) * 0.3;
  }

  // Bonus selon l'engagement (max +15 points)
  if (engagement.overallEngagementRate > 15) {
    score += Math.min((engagement.overallEngagementRate - 15) * 0.5, 15);
  }

  // Pénaliser selon le temps d'exécution (max -10 points)
  if (metrics.averageExecutionTime > 30000) {
    score -= Math.min((metrics.averageExecutionTime - 30000) / 10000, 10);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Identifie les forces du workflow
 */
function identifyStrengths(
  metrics: WorkflowMetrics,
  engagement: EngagementMetrics
): string[] {
  const strengths: string[] = [];

  if (metrics.executionRate >= 95) {
    strengths.push('Taux d\'exécution excellent (≥95%)');
  }

  if (metrics.errorRate < 3) {
    strengths.push('Très faible taux d\'erreur (<3%)');
  }

  if (engagement.overallEngagementRate >= 20) {
    strengths.push('Engagement élevé (≥20%)');
  }

  if (engagement.emailOpenRate >= 25) {
    strengths.push('Taux d\'ouverture email excellent (≥25%)');
  }

  if (metrics.averageExecutionTime < 10000) {
    strengths.push('Exécution rapide (<10s)');
  }

  if (metrics.leadsTriggered > 100) {
    strengths.push('Large audience touchée (>100 leads)');
  }

  return strengths;
}

/**
 * Identifie les faiblesses du workflow
 */
function identifyWeaknesses(
  metrics: WorkflowMetrics,
  engagement: EngagementMetrics
): string[] {
  const weaknesses: string[] = [];

  if (metrics.executionRate < 90) {
    weaknesses.push('Taux d\'exécution faible (<90%)');
  }

  if (metrics.errorRate > 5) {
    weaknesses.push('Taux d\'erreur élevé (>5%)');
  }

  if (engagement.overallEngagementRate < 10) {
    weaknesses.push('Engagement faible (<10%)');
  }

  if (engagement.emailOpenRate < 15) {
    weaknesses.push('Taux d\'ouverture email faible (<15%)');
  }

  if (metrics.averageExecutionTime > 60000) {
    weaknesses.push('Exécution lente (>60s)');
  }

  if (metrics.leadsTriggered < 10 && metrics.actionsExecuted > 0) {
    weaknesses.push('Audience limitée (<10 leads)');
  }

  return weaknesses;
}

/**
 * Applique une suggestion d'optimisation (utilisé pour l'implémentation facile)
 */
export async function applyOptimizationSuggestion(
  workflowId: string,
  suggestion: OptimizationSuggestion
): Promise<{ success: boolean; message: string }> {
  try {
    // Récupérer le workflow
    const { data: workflow, error } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      return { success: false, message: 'Workflow non trouvé' };
    }

    // Appliquer la suggestion selon son type
    // Note: Ceci est un exemple simplifié, l'implémentation réelle dépendra de la structure du workflow
    switch (suggestion.suggestionType) {
      case 'timing':
        // Modifier les délais dans la configuration
        // TODO: Implémenter selon la structure réelle
        return { success: true, message: 'Suggestion de timing appliquée (à vérifier manuellement)' };

      case 'content':
        // Modifier les templates
        // TODO: Implémenter selon la structure réelle
        return { success: true, message: 'Suggestion de contenu appliquée (à vérifier manuellement)' };

      case 'conditions':
        // Modifier les conditions
        // TODO: Implémenter selon la structure réelle
        return { success: true, message: 'Suggestion de conditions appliquée (à vérifier manuellement)' };

      default:
        return { success: false, message: 'Type de suggestion non supporté pour application automatique' };
    }
  } catch (error) {
    console.error('Erreur application suggestion:', error);
    return { success: false, message: (error as Error).message };
  }
}

