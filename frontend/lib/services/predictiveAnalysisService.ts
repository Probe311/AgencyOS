/**
 * Service d'analyse prédictive
 * Utilise l'IA et l'analyse de données pour prédire les tendances et comportements futurs
 */

import { supabase } from '../supabase';
import { callGeminiAPI } from '../ai-client';

export type PredictionType = 
  | 'lead_conversion'
  | 'revenue_forecast'
  | 'churn_risk'
  | 'task_completion'
  | 'campaign_performance'
  | 'workflow_success'
  | 'customer_lifetime_value'
  | 'optimal_contact_time';

export interface PredictiveAnalysis {
  id: string;
  prediction_type: PredictionType;
  entity_id?: string;
  entity_type: 'lead' | 'task' | 'campaign' | 'workflow' | 'customer' | 'global';
  metric_name: string;
  current_value: number;
  predicted_value: number;
  confidence_level: number; // 0-100
  prediction_horizon: number; // jours
  factors: {
    positive: Array<{ factor: string; impact: number }>;
    negative: Array<{ factor: string; impact: number }>;
  };
  recommendations: Array<{
    action: string;
    expected_impact: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  historical_trend?: Array<{ date: string; value: number }>;
  created_at: string;
  expires_at: string;
}

/**
 * Prédit la probabilité de conversion d'un lead
 */
export async function predictLeadConversion(
  leadId: string
): Promise<PredictiveAnalysis> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) throw error;

    // Récupérer l'historique d'activités
    const { data: activities } = await supabase
      .from('sales_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    // Récupérer le tracking email
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('lead_id', leadId);

    // Calculer les facteurs de conversion
    const scoring = parseFloat(lead.scoring?.toString() || '0');
    const activitiesCount = activities?.length || 0;
    const emailOpens = emailTracking?.filter(e => e.open_count > 0).length || 0;
    const emailClicks = emailTracking?.filter(e => e.click_count > 0).length || 0;
    const daysSinceCreated = lead.created_at 
      ? (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Modèle de prédiction simplifié
    let conversionProbability = 0;
    
    // Facteurs positifs
    const positiveFactors: Array<{ factor: string; impact: number }> = [];
    if (scoring >= 75) {
      conversionProbability += 30;
      positiveFactors.push({ factor: 'Scoring élevé (≥75)', impact: 30 });
    }
    if (activitiesCount >= 5) {
      conversionProbability += 20;
      positiveFactors.push({ factor: 'Nombreuses interactions (≥5)', impact: 20 });
    }
    if (emailClicks > 0) {
      conversionProbability += 15;
      positiveFactors.push({ factor: 'Clics dans les emails', impact: 15 });
    }
    if (lead.lifecycleStage === 'SQL' || lead.lifecycleStage === 'Opportunité') {
      conversionProbability += 25;
      positiveFactors.push({ factor: 'Étape avancée dans le pipeline', impact: 25 });
    }

    // Facteurs négatifs
    const negativeFactors: Array<{ factor: string; impact: number }> = [];
    if (daysSinceCreated > 90) {
      conversionProbability -= 20;
      negativeFactors.push({ factor: 'Lead ancien (>90 jours)', impact: -20 });
    }
    if (activitiesCount === 0) {
      conversionProbability -= 15;
      negativeFactors.push({ factor: 'Aucune interaction', impact: -15 });
    }
    if (scoring < 50) {
      conversionProbability -= 10;
      negativeFactors.push({ factor: 'Scoring faible (<50)', impact: -10 });
    }

    conversionProbability = Math.max(0, Math.min(100, conversionProbability));

    // Générer des recommandations avec IA
    const recommendations = await generateConversionRecommendations(lead, activities, emailTracking);

    const analysis: PredictiveAnalysis = {
      id: `prediction-${Date.now()}-${leadId}`,
      prediction_type: 'lead_conversion',
      entity_id: leadId,
      entity_type: 'lead',
      metric_name: 'Probabilité de conversion',
      current_value: scoring,
      predicted_value: conversionProbability,
      confidence_level: activitiesCount >= 3 ? 85 : 65,
      prediction_horizon: 30,
      factors: {
        positive: positiveFactors,
        negative: negativeFactors
      },
      recommendations,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Enregistrer dans la base de données
    await supabase.from('analytics_predictions').insert({
      user_id: lead.user_id,
      prediction_type: 'conversion',
      entity_type: 'lead',
      metric_name: 'Probabilité de conversion',
      current_value: scoring,
      predicted_value: conversionProbability,
      confidence_level: analysis.confidence_level / 100,
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      factors: analysis.factors
    });

    return analysis;
  } catch (error: any) {
    console.error('Error predicting lead conversion:', error);
    throw error;
  }
}

/**
 * Prédit le risque de churn d'un client
 */
export async function predictChurnRisk(
  leadId: string
): Promise<PredictiveAnalysis> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) throw error;

    // Récupérer les activités récentes
    const { data: recentActivities } = await supabase
      .from('sales_activities')
      .select('*')
      .eq('lead_id', leadId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const daysSinceLastActivity = recentActivities && recentActivities.length > 0
      ? (Date.now() - new Date(recentActivities[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Calculer le risque de churn
    let churnRisk = 0;
    const positiveFactors: Array<{ factor: string; impact: number }> = [];
    const negativeFactors: Array<{ factor: string; impact: number }> = [];

    if (daysSinceLastActivity > 60) {
      churnRisk += 40;
      negativeFactors.push({ factor: 'Aucune activité depuis >60 jours', impact: 40 });
    } else if (daysSinceLastActivity > 30) {
      churnRisk += 25;
      negativeFactors.push({ factor: 'Aucune activité depuis >30 jours', impact: 25 });
    }

    if (recentActivities && recentActivities.length < 2) {
      churnRisk += 20;
      negativeFactors.push({ factor: 'Peu d\'interactions récentes', impact: 20 });
    } else if (recentActivities && recentActivities.length >= 5) {
      churnRisk -= 15;
      positiveFactors.push({ factor: 'Interactions régulières', impact: -15 });
    }

    if (lead.lifecycleStage === 'Inactif') {
      churnRisk += 30;
      negativeFactors.push({ factor: 'Statut inactif', impact: 30 });
    }

    churnRisk = Math.max(0, Math.min(100, churnRisk));

    const recommendations: Array<{ action: string; expected_impact: number; priority: 'low' | 'medium' | 'high' }> = [];

    if (churnRisk > 50) {
      recommendations.push({
        action: 'Créer une campagne de réengagement urgente',
        expected_impact: 70,
        priority: 'high'
      });
      recommendations.push({
        action: 'Contacter directement le client',
        expected_impact: 80,
        priority: 'high'
      });
    } else if (churnRisk > 30) {
      recommendations.push({
        action: 'Planifier une relance personnalisée',
        expected_impact: 60,
        priority: 'medium'
      });
    }

    const analysis: PredictiveAnalysis = {
      id: `prediction-${Date.now()}-churn-${leadId}`,
      prediction_type: 'churn_risk',
      entity_id: leadId,
      entity_type: 'lead',
      metric_name: 'Risque de churn',
      current_value: 0,
      predicted_value: churnRisk,
      confidence_level: 75,
      prediction_horizon: 90,
      factors: {
        positive: positiveFactors,
        negative: negativeFactors
      },
      recommendations,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    return analysis;
  } catch (error: any) {
    console.error('Error predicting churn risk:', error);
    throw error;
  }
}

/**
 * Prédit les performances d'une campagne
 */
export async function predictCampaignPerformance(
  campaignId: string
): Promise<PredictiveAnalysis> {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) throw error;

    // Récupérer les campagnes similaires passées
    const { data: similarCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('type', campaign.type)
      .neq('id', campaignId)
      .limit(10);

    // Calculer la moyenne des performances passées
    const avgPerformance = similarCampaigns && similarCampaigns.length > 0
      ? similarCampaigns.reduce((sum, c) => {
          const engagement = parseFloat(c.engagement_rate?.toString() || '0');
          return sum + engagement;
        }, 0) / similarCampaigns.length
      : 50;

    // Ajuster selon les facteurs de la campagne actuelle
    let predictedPerformance = avgPerformance;
    const positiveFactors: Array<{ factor: string; impact: number }> = [];
    const negativeFactors: Array<{ factor: string; impact: number }> = [];

    if (campaign.segment_id) {
      predictedPerformance += 10;
      positiveFactors.push({ factor: 'Segmentation ciblée', impact: 10 });
    }

    if (campaign.template_id) {
      predictedPerformance += 5;
      positiveFactors.push({ factor: 'Template optimisé', impact: 5 });
    }

    predictedPerformance = Math.max(0, Math.min(100, predictedPerformance));

    const recommendations: Array<{ action: string; expected_impact: number; priority: 'low' | 'medium' | 'high' }> = [
      {
        action: 'Tester plusieurs variantes (A/B testing)',
        expected_impact: 15,
        priority: 'medium'
      },
      {
        action: 'Optimiser le timing d\'envoi',
        expected_impact: 10,
        priority: 'low'
      }
    ];

    const analysis: PredictiveAnalysis = {
      id: `prediction-${Date.now()}-campaign-${campaignId}`,
      prediction_type: 'campaign_performance',
      entity_id: campaignId,
      entity_type: 'campaign',
      metric_name: 'Taux d\'engagement prévu',
      current_value: 0,
      predicted_value: predictedPerformance,
      confidence_level: similarCampaigns && similarCampaigns.length >= 5 ? 80 : 60,
      prediction_horizon: 7,
      factors: {
        positive: positiveFactors,
        negative: negativeFactors
      },
      recommendations,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return analysis;
  } catch (error: any) {
    console.error('Error predicting campaign performance:', error);
    throw error;
  }
}

/**
 * Prédit le temps optimal pour contacter un lead
 */
export async function predictOptimalContactTime(
  leadId: string
): Promise<PredictiveAnalysis> {
  try {
    const { data: activities } = await supabase
      .from('sales_activities')
      .select('*')
      .eq('lead_id', leadId)
      .in('activity_type', ['email_sent', 'call_made', 'appointment']);

    // Analyser les heures de contact réussies
    const contactHours: number[] = [];
    activities?.forEach(activity => {
      if (activity.created_at) {
        const hour = new Date(activity.created_at).getHours();
        contactHours.push(hour);
      }
    });

    // Calculer l'heure optimale (moyenne des heures de contact réussies)
    const optimalHour = contactHours.length > 0
      ? Math.round(contactHours.reduce((a, b) => a + b, 0) / contactHours.length)
      : 14; // Par défaut: 14h (après-midi)

    const recommendations: Array<{ action: string; expected_impact: number; priority: 'low' | 'medium' | 'high' }> = [
      {
        action: `Contacter le lead autour de ${optimalHour}h pour maximiser les chances de réponse`,
        expected_impact: 25,
        priority: 'medium'
      }
    ];

    const analysis: PredictiveAnalysis = {
      id: `prediction-${Date.now()}-time-${leadId}`,
      prediction_type: 'optimal_contact_time',
      entity_id: leadId,
      entity_type: 'lead',
      metric_name: 'Heure optimale de contact',
      current_value: 0,
      predicted_value: optimalHour,
      confidence_level: contactHours.length >= 3 ? 75 : 50,
      prediction_horizon: 0,
      factors: {
        positive: [],
        negative: []
      },
      recommendations,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    return analysis;
  } catch (error: any) {
    console.error('Error predicting optimal contact time:', error);
    throw error;
  }
}

/**
 * Génère des recommandations de conversion avec IA
 */
async function generateConversionRecommendations(
  lead: any,
  activities: any[],
  emailTracking: any[]
): Promise<Array<{ action: string; expected_impact: number; priority: 'low' | 'medium' | 'high' }>> {
  try {
    const prompt = `Analyse ce lead et génère 3 recommandations concrètes pour améliorer ses chances de conversion :
Lead: ${JSON.stringify({
  scoring: lead.scoring,
  lifecycleStage: lead.lifecycleStage,
  temperature: lead.temperature,
  activities_count: activities?.length || 0,
  email_opens: emailTracking?.filter(e => e.open_count > 0).length || 0,
  email_clicks: emailTracking?.filter(e => e.click_count > 0).length || 0
}, null, 2)}

Génère 3 actions concrètes et mesurables.`;

    const aiResponse = await callGeminiAPI(prompt);
    
    if (aiResponse) {
      // Parser la réponse IA pour extraire les recommandations
      const recommendations: Array<{ action: string; expected_impact: number; priority: 'low' | 'medium' | 'high' }> = [];
      
      // Format simple : chaque ligne est une recommandation
      const lines = aiResponse.split('\n').filter(l => l.trim() && (l.includes('-') || l.includes('•') || /^\d+\./.test(l)));
      
      lines.slice(0, 3).forEach((line, index) => {
        const cleanLine = line.replace(/^[-•\d.\s]+/, '').trim();
        if (cleanLine) {
          recommendations.push({
            action: cleanLine,
            expected_impact: 60 - (index * 10),
            priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
          });
        }
      });

      return recommendations.length > 0 ? recommendations : [
        {
          action: 'Créer une tâche de suivi personnalisée',
          expected_impact: 50,
          priority: 'medium'
        },
        {
          action: 'Envoyer un email de relance ciblé',
          expected_impact: 40,
          priority: 'medium'
        },
        {
          action: 'Programmer un appel de qualification',
          expected_impact: 60,
          priority: 'high'
        }
      ];
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
  }

  // Recommandations par défaut
  return [
    {
      action: 'Créer une tâche de suivi personnalisée',
      expected_impact: 50,
      priority: 'medium'
    },
    {
      action: 'Envoyer un email de relance ciblé',
      expected_impact: 40,
      priority: 'medium'
    },
    {
      action: 'Programmer un appel de qualification',
      expected_impact: 60,
      priority: 'high'
    }
  ];
}

/**
 * Récupère les analyses prédictives existantes
 */
export async function getPredictiveAnalyses(
  userId: string,
  filters?: {
    prediction_type?: PredictionType;
    entity_type?: string;
    entity_id?: string;
  }
): Promise<PredictiveAnalysis[]> {
  try {
    let query = supabase
      .from('analytics_predictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.prediction_type) {
      query = query.eq('prediction_type', filters.prediction_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;

    // Transformer les données en PredictiveAnalysis
    return (data || []).map((pred: any) => ({
      id: pred.id,
      prediction_type: pred.prediction_type as PredictionType,
      entity_id: pred.entity_id,
      entity_type: pred.entity_type as any,
      metric_name: pred.metric_name,
      current_value: pred.current_value,
      predicted_value: pred.predicted_value,
      confidence_level: (pred.confidence_level || 0) * 100,
      prediction_horizon: 30,
      factors: pred.factors || { positive: [], negative: [] },
      recommendations: [],
      created_at: pred.created_at,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
  } catch (error: any) {
    console.error('Error fetching predictive analyses:', error);
    throw error;
  }
}

/**
 * Génère une analyse prédictive globale
 */
export async function generateGlobalPredictiveAnalysis(
  userId: string
): Promise<PredictiveAnalysis[]> {
  try {
    const analyses: PredictiveAnalysis[] = [];

    // Prédire le revenu futur
    const { data: quotes } = await supabase
      .from('quotes')
      .select('*')
      .eq('status', 'accepted')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (quotes && quotes.length > 0) {
      const totalRevenue = quotes.reduce((sum, q) => sum + (parseFloat(q.total?.toString() || '0') || 0), 0);
      const avgMonthlyRevenue = totalRevenue / 3;
      const predictedRevenue = avgMonthlyRevenue * 1.2; // +20% de croissance

      analyses.push({
        id: `prediction-${Date.now()}-revenue`,
        prediction_type: 'revenue_forecast',
        entity_type: 'global',
        metric_name: 'Revenu prévu (30 jours)',
        current_value: avgMonthlyRevenue,
        predicted_value: predictedRevenue,
        confidence_level: 75,
        prediction_horizon: 30,
        factors: {
          positive: [{ factor: 'Tendance de croissance', impact: 20 }],
          negative: []
        },
        recommendations: [
          {
            action: 'Maintenir le rythme actuel de conversion',
            expected_impact: 10,
            priority: 'medium'
          }
        ],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return analyses;
  } catch (error: any) {
    console.error('Error generating global predictive analysis:', error);
    throw error;
  }
}

