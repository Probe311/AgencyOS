/**
 * Service de scoring de propension à acheter (Purchase Propensity Scoring)
 * Calcule la probabilité qu'un lead achète basée sur son comportement, ses caractéristiques et son engagement
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface PropensityScoreFactors {
  // Facteurs comportementaux (0-100)
  behavioralScore: number;        // Engagement, interactions, visites
  engagementFrequency: number;    // Fréquence d'engagement (jours)
  emailEngagement: number;        // Ouvertures, clics, réponses
  websiteEngagement: number;      // Visites, pages vues, durée
  contentEngagement: number;      // Téléchargements, ressources
  
  // Facteurs contextuels (0-100)
  contextualScore: number;        // Température, scoring, lifecycle stage
  temperatureScore: number;       // Froid/Tiède/Chaud
  qualityScore: number;           // Score de qualité du lead
  lifecycleStageScore: number;    // Position dans le cycle de vie
  
  // Facteurs de timing (0-100)
  timingScore: number;            // Timing d'achat probable
  timeSinceFirstContact: number;  // Temps écoulé depuis premier contact
  urgencyIndicators: number;      // Indicateurs d'urgence (budget, timeline)
  
  // Facteurs de match (0-100)
  matchScore: number;             // Correspondance avec l'offre
  sectorMatch: number;            // Correspondance secteur
  sizeMatch: number;              // Correspondance taille entreprise
  needMatch: number;              // Correspondance besoin identifié
}

export interface PropensityScoreResult {
  propensityScore: number;        // Score final 0-100
  propensityLevel: 'Très faible' | 'Faible' | 'Moyen' | 'Élevé' | 'Très élevé';
  probability: number;            // Probabilité d'achat en % (0-100)
  factors: PropensityScoreFactors;
  keyIndicators: string[];        // Indicateurs clés expliquant le score
  recommendations: string[];      // Recommandations d'action
  lastCalculatedAt: string;
}

const DEFAULT_WEIGHTS = {
  behavioral: 0.35,    // 35% : Comportement et engagement
  contextual: 0.25,    // 25% : Contexte (température, scoring)
  timing: 0.20,        // 20% : Timing d'achat probable
  match: 0.20,         // 20% : Correspondance avec l'offre
};

/**
 * Calcule le score de propension à acheter pour un lead
 */
export async function calculatePropensityToBuy(lead: Lead): Promise<PropensityScoreResult> {
  try {
    const factors: PropensityScoreFactors = {
      behavioralScore: 0,
      engagementFrequency: 0,
      emailEngagement: 0,
      websiteEngagement: 0,
      contentEngagement: 0,
      contextualScore: 0,
      temperatureScore: 0,
      qualityScore: 0,
      lifecycleStageScore: 0,
      timingScore: 0,
      timeSinceFirstContact: 0,
      urgencyIndicators: 0,
      matchScore: 0,
      sectorMatch: 0,
      sizeMatch: 0,
      needMatch: 0,
    };

    // 1. Calcul des facteurs comportementaux
    const behavioralFactors = await calculateBehavioralFactors(lead);
    factors.behavioralScore = behavioralFactors.totalScore;
    factors.engagementFrequency = behavioralFactors.engagementFrequency;
    factors.emailEngagement = behavioralFactors.emailEngagement;
    factors.websiteEngagement = behavioralFactors.websiteEngagement;
    factors.contentEngagement = behavioralFactors.contentEngagement;

    // 2. Calcul des facteurs contextuels
    factors.temperatureScore = calculateTemperatureScore(lead.temperature);
    factors.qualityScore = (lead as any).quality_score || (lead as any).scoring || 0;
    factors.lifecycleStageScore = calculateLifecycleStageScore((lead as any).lifecycle_stage);
    factors.contextualScore = (factors.temperatureScore + factors.qualityScore + factors.lifecycleStageScore) / 3;

    // 3. Calcul des facteurs de timing
    const timingFactors = await calculateTimingFactors(lead);
    factors.timingScore = timingFactors.totalScore;
    factors.timeSinceFirstContact = timingFactors.timeSinceFirstContact;
    factors.urgencyIndicators = timingFactors.urgencyIndicators;

    // 4. Calcul des facteurs de match
    const matchFactors = calculateMatchFactors(lead);
    factors.matchScore = matchFactors.totalScore;
    factors.sectorMatch = matchFactors.sectorMatch;
    factors.sizeMatch = matchFactors.sizeMatch;
    factors.needMatch = matchFactors.needMatch;

    // 5. Calcul du score final pondéré
    const propensityScore = Math.round(
      factors.behavioralScore * DEFAULT_WEIGHTS.behavioral +
      factors.contextualScore * DEFAULT_WEIGHTS.contextual +
      factors.timingScore * DEFAULT_WEIGHTS.timing +
      factors.matchScore * DEFAULT_WEIGHTS.match
    );

    // 6. Déterminer le niveau de propension
    const propensityLevel = getPropensityLevel(propensityScore);

    // 7. Calculer la probabilité d'achat (basée sur le score)
    const probability = calculateProbabilityFromScore(propensityScore);

    // 8. Identifier les indicateurs clés
    const keyIndicators = identifyKeyIndicators(factors, propensityScore);

    // 9. Générer des recommandations
    const recommendations = generateRecommendations(factors, propensityScore, propensityLevel);

    return {
      propensityScore,
      propensityLevel,
      probability,
      factors,
      keyIndicators,
      recommendations,
      lastCalculatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logError(`Erreur calcul propension à acheter pour lead ${lead.id}:`, err);
    throw err;
  }
}

/**
 * Calcule les facteurs comportementaux (engagement, interactions)
 */
async function calculateBehavioralFactors(lead: Lead): Promise<{
  totalScore: number;
  engagementFrequency: number;
  emailEngagement: number;
  websiteEngagement: number;
  contentEngagement: number;
}> {
  try {
    // Récupérer les activités récentes (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activities } = await supabase
      .from('sales_activities')
      .select('activity_type, activity_date')
      .eq('lead_id', lead.id)
      .gte('activity_date', thirtyDaysAgo.toISOString())
      .order('activity_date', { ascending: false });

    // Récupérer les données de tracking email
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('opened, clicked, open_count, click_count, last_opened_at, last_clicked_at')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: false })
      .limit(10);

    // Compter les activités par type
    const activityCounts: Record<string, number> = {};
    (activities || []).forEach(activity => {
      activityCounts[activity.activity_type] = (activityCounts[activity.activity_type] || 0) + 1;
    });

    // Calculer l'engagement email
    let emailEngagement = 0;
    if (emailTracking && emailTracking.length > 0) {
      const totalEmails = emailTracking.length;
      const openedEmails = emailTracking.filter(e => e.opened).length;
      const clickedEmails = emailTracking.filter(e => e.clicked).length;
      const openRate = (openedEmails / totalEmails) * 100;
      const clickRate = (clickedEmails / totalEmails) * 100;
      emailEngagement = (openRate * 0.5) + (clickRate * 0.5); // 50% ouverture, 50% clic
    }

    // Calculer l'engagement website (visites)
    const websiteVisits = activityCounts['website_visit'] || 0;
    const websiteEngagement = Math.min(100, websiteVisits * 20); // 20 points par visite, max 100

    // Calculer l'engagement contenu (téléchargements)
    const contentDownloads = activityCounts['resource_download'] || 0;
    const contentEngagement = Math.min(100, contentDownloads * 30); // 30 points par téléchargement, max 100

    // Calculer la fréquence d'engagement
    const totalActivities = (activities || []).length;
    const daysSinceFirstActivity = activities && activities.length > 0
      ? (Date.now() - new Date(activities[activities.length - 1].activity_date).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const engagementFrequency = daysSinceFirstActivity > 0
      ? Math.min(100, (totalActivities / daysSinceFirstActivity) * 100)
      : 0;

    // Score comportemental total (moyenne pondérée)
    const totalScore = Math.round(
      emailEngagement * 0.3 +
      websiteEngagement * 0.25 +
      contentEngagement * 0.25 +
      engagementFrequency * 0.2
    );

    return {
      totalScore,
      engagementFrequency,
      emailEngagement,
      websiteEngagement,
      contentEngagement,
    };
  } catch (err) {
    logError('Erreur calcul facteurs comportementaux:', err);
    return {
      totalScore: 0,
      engagementFrequency: 0,
      emailEngagement: 0,
      websiteEngagement: 0,
      contentEngagement: 0,
    };
  }
}

/**
 * Calcule le score basé sur la température
 */
function calculateTemperatureScore(temperature?: string): number {
  switch (temperature?.toLowerCase()) {
    case 'chaud':
      return 90;
    case 'tiède':
    case 'tiede':
      return 60;
    case 'froid':
      return 30;
    default:
      return 50; // Par défaut
  }
}

/**
 * Calcule le score basé sur l'étape du cycle de vie
 */
function calculateLifecycleStageScore(lifecycleStage?: string): number {
  switch (lifecycleStage) {
    case 'Opportunité':
      return 90;
    case 'SQL':
      return 75;
    case 'MQL':
      return 60;
    case 'Contact':
      return 70;
    case 'Lead':
      return 40;
    case 'Audience':
      return 20;
    case 'Client':
      return 0; // Déjà client
    case 'Perdu':
      return 10;
    case 'Inactif':
      return 15;
    default:
      return 50;
  }
}

/**
 * Calcule les facteurs de timing (urgence, temps écoulé)
 */
async function calculateTimingFactors(lead: Lead): Promise<{
  totalScore: number;
  timeSinceFirstContact: number;
  urgencyIndicators: number;
}> {
  try {
    // Récupérer la première activité
    const { data: firstActivity } = await supabase
      .from('sales_activities')
      .select('activity_date')
      .eq('lead_id', lead.id)
      .order('activity_date', { ascending: true })
      .limit(1)
      .single();

    // Calculer le temps écoulé depuis le premier contact
    let timeSinceFirstContact = 0;
    if (firstActivity) {
      const daysSince = (Date.now() - new Date(firstActivity.activity_date).getTime()) / (1000 * 60 * 60 * 24);
      timeSinceFirstContact = daysSince;
      // Score optimal : entre 7 et 30 jours (fenêtre d'achat idéale)
      if (daysSince >= 7 && daysSince <= 30) {
        timeSinceFirstContact = 90; // Score élevé
      } else if (daysSince < 7) {
        timeSinceFirstContact = 60; // Trop tôt
      } else if (daysSince <= 60) {
        timeSinceFirstContact = 70; // Encore dans la fenêtre
      } else {
        timeSinceFirstContact = 30; // Trop tard
      }
    } else {
      // Pas de contact encore
      timeSinceFirstContact = 40;
    }

    // Calculer les indicateurs d'urgence
    let urgencyIndicators = 0;
    const metadata = (lead as any).metadata || {};
    
    // Budget identifié
    if (metadata.budget || metadata.budget_range) {
      urgencyIndicators += 25;
    }
    
    // Timeline identifié (< 3 mois = urgent)
    if (metadata.timeline) {
      const timeline = String(metadata.timeline).toLowerCase();
      if (timeline.includes('immédiat') || timeline.includes('urgent') || timeline.includes('< 1 mois')) {
        urgencyIndicators += 40;
      } else if (timeline.includes('1 mois') || timeline.includes('2 mois') || timeline.includes('3 mois')) {
        urgencyIndicators += 25;
      } else {
        urgencyIndicators += 10;
      }
    }
    
    // Besoin exprimé
    if (metadata.need || metadata.problem) {
      urgencyIndicators += 20;
    }
    
    // Autorité décisionnelle
    if (metadata.decision_maker || metadata.authority) {
      urgencyIndicators += 15;
    }

    const totalScore = Math.round(
      timeSinceFirstContact * 0.6 + urgencyIndicators * 0.4
    );

    return {
      totalScore,
      timeSinceFirstContact: firstActivity 
        ? (Date.now() - new Date(firstActivity.activity_date).getTime()) / (1000 * 60 * 60 * 24)
        : 0,
      urgencyIndicators,
    };
  } catch (err) {
    logError('Erreur calcul facteurs timing:', err);
    return {
      totalScore: 50,
      timeSinceFirstContact: 0,
      urgencyIndicators: 0,
    };
  }
}

/**
 * Calcule les facteurs de match (correspondance avec l'offre)
 */
function calculateMatchFactors(lead: Lead): {
  totalScore: number;
  sectorMatch: number;
  sizeMatch: number;
  needMatch: number;
} {
  let sectorMatch = 50; // Score par défaut
  let sizeMatch = 50;
  let needMatch = 50;

  // Correspondance secteur (secteurs prioritaires = score plus élevé)
  const prioritySectors = ['Technologie', 'Finance', 'E-commerce', 'Santé', 'Consulting'];
  const sector = (lead as any).sector || (lead as any).industry;
  if (sector && prioritySectors.includes(sector)) {
    sectorMatch = 90;
  } else if (sector) {
    sectorMatch = 60;
  }

  // Correspondance taille (basée sur company_size)
  const companySize = (lead as any).company_size;
  if (companySize) {
    const size = typeof companySize === 'string' 
      ? parseInt(companySize.replace(/[^0-9]/g, '')) 
      : companySize;
    
    // PME/ETI = meilleur match (10-5000 salariés)
    if (size >= 10 && size <= 5000) {
      sizeMatch = 85;
    } else if (size < 10) {
      sizeMatch = 60; // TPE
    } else {
      sizeMatch = 70; // Grande entreprise
    }
  }

  // Correspondance besoin (basée sur description, tags, metadata)
  const metadata = (lead as any).metadata || {};
  const description = lead.description || '';
  const tags = (lead as any).tags || [];
  
  if (metadata.need || metadata.problem || description.includes('besoin') || description.includes('problème')) {
    needMatch = 85;
  } else if (tags.some((tag: string) => tag.toLowerCase().includes('intéressé') || tag.toLowerCase().includes('besoin'))) {
    needMatch = 75;
  } else {
    needMatch = 40;
  }

  const totalScore = Math.round((sectorMatch + sizeMatch + needMatch) / 3);

  return {
    totalScore,
    sectorMatch,
    sizeMatch,
    needMatch,
  };
}

/**
 * Détermine le niveau de propension à partir du score
 */
function getPropensityLevel(score: number): 'Très faible' | 'Faible' | 'Moyen' | 'Élevé' | 'Très élevé' {
  if (score >= 80) return 'Très élevé';
  if (score >= 65) return 'Élevé';
  if (score >= 50) return 'Moyen';
  if (score >= 35) return 'Faible';
  return 'Très faible';
}

/**
 * Calcule la probabilité d'achat en % basée sur le score
 */
function calculateProbabilityFromScore(score: number): number {
  // Conversion non-linéaire : score élevé = probabilité exponentiellement plus élevée
  if (score >= 80) return 75 + ((score - 80) * 1.25); // 75-100%
  if (score >= 65) return 50 + ((score - 65) * 1.67); // 50-75%
  if (score >= 50) return 25 + ((score - 50) * 1.67); // 25-50%
  if (score >= 35) return 10 + ((score - 35) * 1);    // 10-25%
  return score * 0.29; // 0-10%
}

/**
 * Identifie les indicateurs clés expliquant le score
 */
function identifyKeyIndicators(factors: PropensityScoreFactors, score: number): string[] {
  const indicators: string[] = [];

  if (factors.emailEngagement > 70) {
    indicators.push('Engagement email élevé');
  }
  if (factors.websiteEngagement > 70) {
    indicators.push('Visites fréquentes du site');
  }
  if (factors.contentEngagement > 50) {
    indicators.push('Téléchargements de ressources');
  }
  if (factors.temperatureScore > 70) {
    indicators.push('Température élevée');
  }
  if (factors.urgencyIndicators > 60) {
    indicators.push('Indicateurs d\'urgence forts');
  }
  if (factors.needMatch > 70) {
    indicators.push('Besoin clairement identifié');
  }
  if (factors.qualityScore > 75) {
    indicators.push('Score de qualité élevé');
  }
  if (factors.lifecycleStageScore > 70) {
    indicators.push('Avancé dans le cycle de vie');
  }

  if (indicators.length === 0) {
    indicators.push('Engagement limité');
    if (factors.behavioralScore < 30) {
      indicators.push('Peu d\'interactions');
    }
    if (factors.contextualScore < 40) {
      indicators.push('Profil incomplet');
    }
  }

  return indicators;
}

/**
 * Génère des recommandations d'action basées sur les facteurs
 */
function generateRecommendations(
  factors: PropensityScoreFactors,
  score: number,
  level: string
): string[] {
  const recommendations: string[] = [];

  if (score >= 80) {
    recommendations.push('Priorité maximale : Contact immédiat recommandé');
    recommendations.push('Préparer une proposition personnalisée');
    recommendations.push('Proposer un rendez-vous dans les 24h');
  } else if (score >= 65) {
    recommendations.push('Priorité élevée : Relance dans les 48h');
    recommendations.push('Enrichir le profil si des données manquent');
    recommendations.push('Créer une séquence de nurturing ciblée');
  } else if (score >= 50) {
    recommendations.push('Priorité moyenne : Maintenir l\'engagement');
    recommendations.push('Augmenter la fréquence des contacts');
    recommendations.push('Proposer du contenu éducatif pertinent');
  } else if (score >= 35) {
    recommendations.push('Priorité faible : Focus sur l\'engagement');
    recommendations.push('Qualifier davantage le lead');
    recommendations.push('Comprendre les besoins réels');
  } else {
    recommendations.push('Priorité très faible : Nurturing long terme');
    recommendations.push('Construire la relation progressivement');
    recommendations.push('Éduquer sur les bénéfices');
  }

  // Recommandations spécifiques selon les facteurs faibles
  if (factors.emailEngagement < 30) {
    recommendations.push('Améliorer l\'engagement email (sujets, contenu)');
  }
  if (factors.needMatch < 40) {
    recommendations.push('Identifier les besoins précis du lead');
  }
  if (factors.urgencyIndicators < 30) {
    recommendations.push('Créer de l\'urgence (offre limitée, deadline)');
  }
  if (factors.websiteEngagement < 30) {
    recommendations.push('Encourager les visites du site (liens dans emails)');
  }

  return recommendations;
}

/**
 * Calcule et met à jour le score de propension à acheter pour un lead
 */
export async function calculateAndUpdatePropensityScore(leadId: string): Promise<PropensityScoreResult> {
  try {
    // Récupérer le lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;
    if (!leadData) throw new Error(`Lead ${leadId} introuvable`);

    const lead = leadData as Lead;

    // Calculer le score
    const result = await calculatePropensityToBuy(lead);

    // Mettre à jour le lead (dans metadata pour ne pas polluer le schéma)
    const metadata = (lead as any).metadata || {};
    metadata.propensityScore = result.propensityScore;
    metadata.propensityLevel = result.propensityLevel;
    metadata.propensityProbability = result.probability;
    metadata.propensityFactors = result.factors;
    metadata.propensityCalculatedAt = result.lastCalculatedAt;

    await supabase
      .from('leads')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'data_updated',
        subject: 'Score de propension à acheter calculé',
        description: `Score de propension : ${result.propensityScore}/100 (${result.propensityLevel}) - Probabilité : ${result.probability.toFixed(1)}%`,
        activity_date: new Date().toISOString(),
        metadata: {
          propensityScore: result.propensityScore,
          propensityLevel: result.propensityLevel,
          probability: result.probability,
          keyIndicators: result.keyIndicators,
        },
      });

    logInfo(`Score de propension calculé pour lead ${leadId}: ${result.propensityScore}/100 (${result.propensityLevel})`);
    return result;
  } catch (err) {
    logError(`Erreur calcul propension pour lead ${leadId}:`, err);
    throw err;
  }
}

/**
 * Calcule le score de propension pour tous les leads actifs
 */
export async function calculatePropensityForAllLeads(
  batchSize: number = 50
): Promise<{ processed: number; errors: number }> {
  try {
    let processed = 0;
    let errors = 0;
    let offset = 0;

    while (true) {
      // Récupérer un batch de leads actifs
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .not('lifecycle_stage', 'eq', 'Client')
        .not('lifecycle_stage', 'eq', 'Perdu')
        .range(offset, offset + batchSize - 1);

      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) break;

      // Calculer le score pour chaque lead
      for (const lead of leads) {
        try {
          await calculateAndUpdatePropensityScore(lead.id);
          processed++;
        } catch (err) {
          logWarn(`Erreur calcul propension pour lead ${lead.id}:`, err);
          errors++;
        }
      }

      offset += batchSize;

      // Limiter à 1000 leads pour éviter les traitements trop longs
      if (offset >= 1000) break;
    }

    logInfo(`Calcul propension terminé : ${processed} leads traités, ${errors} erreurs`);
    return { processed, errors };
  } catch (err) {
    logError('Erreur calcul propension pour tous les leads:', err);
    throw err;
  }
}

