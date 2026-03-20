/**
 * Système de scoring personnalisable pour les leads
 */

import { logError } from './logger';

export interface ScoringRule {
  id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  rules: ScoringRulesConfig;
  weights?: ScoringWeights;
}

export interface ScoringRulesConfig {
  email_valid?: { weight: number; enabled: boolean };
  phone_valid?: { weight: number; enabled: boolean };
  data_completeness?: { weight: number; enabled: boolean };
  source_reliability?: { weight: number; enabled: boolean };
  custom_rules?: CustomScoringRule[];
}

export interface CustomScoringRule {
  field: string;
  condition: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
  threshold?: number;
  value?: string | number;
  values?: (string | number)[];
  points: number;
}

export interface ScoringWeights {
  email_valid?: number;
  phone_valid?: number;
  data_completeness?: number;
  source_reliability?: number;
  value?: number;
  lifecycle_stage?: number;
  enrichment_score?: number;
  engagement?: number; // Basé sur les activités
  [key: string]: number | undefined;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  email_valid: 25,
  phone_valid: 25,
  data_completeness: 30,
  source_reliability: 20,
};

/**
 * Charge les règles de scoring depuis Supabase
 */
export async function loadScoringRules(): Promise<ScoringRule[]> {
  const { supabase } = await import('../supabase');
  
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    logError('Erreur chargement règles scoring:', error);
    return [];
  }

  return (data || []).map((rule: any) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    is_active: rule.is_active,
    is_default: rule.is_default,
    rules: rule.rules,
    weights: rule.weights || DEFAULT_WEIGHTS,
  }));
}

/**
 * Charge la règle de scoring par défaut
 */
export async function loadDefaultScoringRule(): Promise<ScoringRule | null> {
  const { supabase } = await import('../supabase');
  
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Retourner une règle par défaut si aucune n'existe
    return {
      name: 'Scoring par défaut',
      is_active: true,
      is_default: true,
      rules: {
        email_valid: { weight: 25, enabled: true },
        phone_valid: { weight: 25, enabled: true },
        data_completeness: { weight: 30, enabled: true },
        source_reliability: { weight: 20, enabled: true },
      },
      weights: DEFAULT_WEIGHTS,
    };
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    is_active: data.is_active,
    is_default: data.is_default,
    rules: data.rules,
    weights: data.weights || DEFAULT_WEIGHTS,
  };
}

/**
 * Calcule le score d'un lead selon une règle personnalisée
 */
export async function calculateCustomLeadScore(
  lead: any,
  rule: ScoringRule,
  qualityScore?: any,
  activitiesCount?: number
): Promise<number> {
  const weights = rule.weights || DEFAULT_WEIGHTS;
  let totalScore = 0;
  let totalWeight = 0;

  // Email valide
  if (rule.rules.email_valid?.enabled && weights.email_valid) {
    totalWeight += weights.email_valid;
    if (qualityScore?.emailValid === true) {
      totalScore += weights.email_valid;
    }
  }

  // Téléphone valide
  if (rule.rules.phone_valid?.enabled && weights.phone_valid) {
    totalWeight += weights.phone_valid;
    if (qualityScore?.phoneValid === true) {
      totalScore += weights.phone_valid;
    }
  }

  // Complétude des données
  if (rule.rules.data_completeness?.enabled && weights.data_completeness) {
    totalWeight += weights.data_completeness;
    if (qualityScore?.dataCompleteness) {
      totalScore += (qualityScore.dataCompleteness * weights.data_completeness) / 100;
    }
  }

  // Fiabilité des sources
  if (rule.rules.source_reliability?.enabled && weights.source_reliability) {
    totalWeight += weights.source_reliability;
    if (qualityScore?.sourceReliability) {
      totalScore += (qualityScore.sourceReliability * weights.source_reliability) / 100;
    }
  }

  // Score d'enrichissement
  if (weights.enrichment_score && lead.enrichment_score) {
    totalWeight += weights.enrichment_score;
    totalScore += (lead.enrichment_score * weights.enrichment_score) / 100;
  }

  // Règles personnalisées
  if (rule.rules.custom_rules) {
    for (const customRule of rule.rules.custom_rules) {
      const fieldValue = lead[customRule.field];
      let matches = false;

      switch (customRule.condition) {
        case '>':
          matches = Number(fieldValue) > (customRule.threshold || 0);
          break;
        case '<':
          matches = Number(fieldValue) < (customRule.threshold || 0);
          break;
        case '>=':
          matches = Number(fieldValue) >= (customRule.threshold || 0);
          break;
        case '<=':
          matches = Number(fieldValue) <= (customRule.threshold || 0);
          break;
        case '==':
          matches = fieldValue === customRule.value;
          break;
        case '!=':
          matches = fieldValue !== customRule.value;
          break;
        case 'contains':
          matches = String(fieldValue).toLowerCase().includes(String(customRule.value || '').toLowerCase());
          break;
        case 'in':
          matches = customRule.values?.includes(fieldValue) || false;
          break;
      }

      if (matches) {
        totalScore += customRule.points;
        totalWeight += customRule.points;
      }
    }
  }

  // Engagement (basé sur les activités)
  if (weights.engagement && activitiesCount !== undefined) {
    totalWeight += weights.engagement;
    const engagementScore = Math.min(100, activitiesCount * 10); // 10 points par activité, max 100
    totalScore += (engagementScore * weights.engagement) / 100;
  }

  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
}

/**
 * Priorise les leads selon leur score
 */
export function prioritizeLeads(leads: any[], scores: Record<string, number>): any[] {
  return [...leads].sort((a, b) => {
    const scoreA = scores[a.id] || 0;
    const scoreB = scores[b.id] || 0;
    return scoreB - scoreA; // Tri décroissant
  });
}

/**
 * Sauvegarde une règle de scoring
 */
export async function saveScoringRule(rule: Omit<ScoringRule, 'id'>): Promise<ScoringRule> {
  const { supabase } = await import('../supabase');
  
  // Récupérer l'utilisateur actuel depuis Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .insert({
      name: rule.name,
      description: rule.description,
      is_active: rule.is_active,
      is_default: rule.is_default,
      rules: rule.rules,
      weights: rule.weights || DEFAULT_WEIGHTS,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour une règle de scoring
 */
export async function updateScoringRule(id: string, updates: Partial<ScoringRule>): Promise<void> {
  const { supabase } = await import('../supabase');
  
  const { error } = await supabase
    .from('lead_scoring_rules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

