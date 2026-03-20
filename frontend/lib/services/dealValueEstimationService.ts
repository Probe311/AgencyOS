/**
 * Service d'estimation automatique de la valeur potentielle des deals
 * Calcule la valeur estimée basée sur la taille de l'entreprise, le secteur, le scoring, etc.
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface DealValueEstimationConfig {
  // Multiplicateurs par taille d'entreprise (effectifs)
  companySizeMultipliers?: {
    tpe: number;      // < 10 salariés
    pme: number;      // 10-250 salariés
    eti: number;      // 250-5000 salariés
    large: number;    // > 5000 salariés
  };
  
  // Multiplicateurs par secteur
  sectorMultipliers?: Record<string, number>;
  
  // Multiplicateurs par température
  temperatureMultipliers?: {
    froid: number;
    tiede: number;
    chaud: number;
  };
  
  // Base de calcul (valeur de base)
  baseValue?: number;
  
  // Ajustements selon scoring
  scoringAdjustments?: {
    minScoring?: number;      // Scoring minimum pour calcul
    multiplierByScoring?: boolean; // Appliquer un multiplicateur selon scoring
  };
}

const DEFAULT_CONFIG: DealValueEstimationConfig = {
  companySizeMultipliers: {
    tpe: 0.5,      // TPE: 50% de la base
    pme: 1.0,      // PME: 100% de la base
    eti: 2.5,      // ETI: 250% de la base
    large: 5.0,    // Grande entreprise: 500% de la base
  },
  sectorMultipliers: {
    'Technologie': 1.5,
    'Finance': 1.8,
    'Consulting': 1.2,
    'E-commerce': 1.3,
    'Santé': 1.4,
    'Éducation': 0.8,
    'BTP': 1.1,
    'Retail': 0.9,
    'Industrie': 1.0,
    'Services': 1.0,
  },
  temperatureMultipliers: {
    froid: 0.6,    // Froid: 60% de la valeur
    tiede: 1.0,    // Tiède: 100%
    chaud: 1.5,    // Chaud: 150%
  },
  baseValue: 15000, // Valeur de base: 15k€
  scoringAdjustments: {
    minScoring: 40,
    multiplierByScoring: true,
  },
};

/**
 * Extrait le nombre d'effectifs depuis les données du lead
 */
function getEmployeeCount(lead: Lead): number | null {
  // Vérifier différents champs possibles
  const metadata = (lead as any).metadata || {};
  const geographicData = (lead as any).geographic_data || {};
  
  // Priorité 1: Champ direct employee_count
  if ((lead as any).employee_count) {
    return parseInt((lead as any).employee_count, 10);
  }
  
  // Priorité 2: Dans metadata
  if (metadata.employee_count) {
    return parseInt(metadata.employee_count, 10);
  }
  
  // Priorité 3: Dans geographic_data
  if (geographicData.employee_count) {
    return parseInt(geographicData.employee_count, 10);
  }
  
  // Priorité 4: Depuis company_size si format "XX salariés"
  const companySize = (lead as any).company_size;
  if (typeof companySize === 'string') {
    const match = companySize.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return null;
}

/**
 * Détermine la catégorie de taille d'entreprise
 */
function getCompanySizeCategory(employeeCount: number | null): 'tpe' | 'pme' | 'eti' | 'large' | null {
  if (employeeCount === null || employeeCount === undefined) return null;
  
  if (employeeCount < 10) return 'tpe';
  if (employeeCount <= 250) return 'pme';
  if (employeeCount <= 5000) return 'eti';
  return 'large';
}

/**
 * Calcule la valeur estimée d'un deal pour un lead
 */
export async function estimateDealValue(
  lead: Lead,
  config: DealValueEstimationConfig = DEFAULT_CONFIG
): Promise<number> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let estimatedValue = finalConfig.baseValue || 15000;
    
    // 1. Ajustement selon taille d'entreprise
    const employeeCount = getEmployeeCount(lead);
    const sizeCategory = getCompanySizeCategory(employeeCount);
    
    if (sizeCategory && finalConfig.companySizeMultipliers) {
      const multiplier = finalConfig.companySizeMultipliers[sizeCategory];
      estimatedValue *= multiplier;
    }
    
    // 2. Ajustement selon secteur
    const sector = lead.sector || (lead as any).industry;
    if (sector && finalConfig.sectorMultipliers && finalConfig.sectorMultipliers[sector]) {
      estimatedValue *= finalConfig.sectorMultipliers[sector];
    }
    
    // 3. Ajustement selon température
    const temperature = lead.temperature?.toLowerCase();
    if (temperature && finalConfig.temperatureMultipliers) {
      let tempMultiplier = 1.0;
      if (temperature.includes('froid')) {
        tempMultiplier = finalConfig.temperatureMultipliers.froid;
      } else if (temperature.includes('tiède') || temperature.includes('tiede')) {
        tempMultiplier = finalConfig.temperatureMultipliers.tiede;
      } else if (temperature.includes('chaud')) {
        tempMultiplier = finalConfig.temperatureMultipliers.chaud;
      }
      estimatedValue *= tempMultiplier;
    }
    
    // 4. Ajustement selon scoring
    const scoring = (lead as any).scoring || (lead as any).quality_score || 0;
    const scoringConfig = finalConfig.scoringAdjustments;
    
    if (scoringConfig) {
      // Si scoring < minimum, réduire la valeur
      if (scoringConfig.minScoring && scoring < scoringConfig.minScoring) {
        estimatedValue *= (scoring / scoringConfig.minScoring); // Réduction proportionnelle
      }
      
      // Multiplier selon scoring si activé
      if (scoringConfig.multiplierByScoring && scoring > 0) {
        // Scoring 0-100 → multiplicateur 0.5-1.5
        const scoringMultiplier = 0.5 + (scoring / 100) * 1.0;
        estimatedValue *= scoringMultiplier;
      }
    }
    
    // 5. Ajustement selon lifecycle stage
    const lifecycleStage = (lead as any).lifecycle_stage;
    if (lifecycleStage) {
      switch (lifecycleStage) {
        case 'MQL':
          estimatedValue *= 0.8; // MQL: 80% (pas encore qualifié commercialement)
          break;
        case 'SQL':
          estimatedValue *= 1.0; // SQL: 100%
          break;
        case 'Contact':
          estimatedValue *= 1.1; // Contact: 110%
          break;
        case 'Opportunité':
          estimatedValue *= 1.2; // Opportunité: 120%
          break;
        case 'Client':
          estimatedValue *= 0; // Client: 0 (déjà converti)
          break;
        default:
          // Pas d'ajustement pour autres stages
          break;
      }
    }
    
    // 6. Ajustement selon tags VIP
    const tags = (lead as any).tags || [];
    const hasVIPTag = tags.some((tag: string) => tag.toLowerCase().includes('vip'));
    if (hasVIPTag) {
      estimatedValue *= 1.5; // VIP: +50%
    }
    
    // Arrondir à la centaine la plus proche
    estimatedValue = Math.round(estimatedValue / 100) * 100;
    
    // Valeur minimum: 1000€, maximum: 500000€
    estimatedValue = Math.max(1000, Math.min(500000, estimatedValue));
    
    logInfo(`Valeur estimée du deal pour lead ${lead.id}: ${estimatedValue}€`);
    return estimatedValue;
  } catch (err) {
    logError(`Erreur estimation valeur deal pour lead ${lead.id}:`, err);
    // Retourner une valeur par défaut en cas d'erreur
    return config.baseValue || 15000;
  }
}

/**
 * Estime et met à jour la valeur potentielle d'un lead
 */
export async function estimateAndUpdateDealValue(
  leadId: string,
  config?: DealValueEstimationConfig
): Promise<number> {
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
    
    // Calculer la valeur estimée
    const estimatedValue = await estimateDealValue(lead, config);
    
    // Mettre à jour le lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        estimated_value: estimatedValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);
    
    if (updateError) throw updateError;
    
    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'data_updated',
        subject: 'Valeur potentielle estimée',
        description: `Valeur potentielle du deal estimée automatiquement : ${estimatedValue}€`,
        activity_date: new Date().toISOString(),
      });
    
    logInfo(`Valeur potentielle ${estimatedValue}€ enregistrée pour lead ${leadId}`);
    return estimatedValue;
  } catch (err) {
    logError(`Erreur mise à jour valeur deal pour lead ${leadId}:`, err);
    throw err;
  }
}

/**
 * Estime la valeur de tous les leads sans valeur estimée
 */
export async function estimateDealValuesForAllLeads(
  config?: DealValueEstimationConfig,
  batchSize: number = 50
): Promise<{ processed: number; errors: number }> {
  try {
    let processed = 0;
    let errors = 0;
    let offset = 0;
    
    while (true) {
      // Récupérer un batch de leads sans valeur estimée
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .or('estimated_value.is.null,estimated_value.eq.0')
        .not('lifecycle_stage', 'eq', 'Client')
        .not('lifecycle_stage', 'eq', 'Perdu')
        .range(offset, offset + batchSize - 1);
      
      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) break;
      
      // Estimer la valeur pour chaque lead
      for (const lead of leads) {
        try {
          await estimateAndUpdateDealValue(lead.id, config);
          processed++;
        } catch (err) {
          logWarn(`Erreur estimation valeur pour lead ${lead.id}:`, err);
          errors++;
        }
      }
      
      offset += batchSize;
      
      // Limiter à 1000 leads pour éviter les traitements trop longs
      if (offset >= 1000) break;
    }
    
    logInfo(`Estimation terminée : ${processed} leads traités, ${errors} erreurs`);
    return { processed, errors };
  } catch (err) {
    logError('Erreur estimation valeurs deals pour tous les leads:', err);
    throw err;
  }
}

/**
 * Recalcule la valeur estimée si les données du lead ont changé significativement
 */
export async function recalculateDealValueIfNeeded(
  leadId: string,
  changedFields: string[],
  config?: DealValueEstimationConfig
): Promise<number | null> {
  // Champs qui impactent la valeur estimée
  const valueImpactFields = [
    'scoring',
    'quality_score',
    'temperature',
    'sector',
    'company_size',
    'lifecycle_stage',
    'tags',
    'metadata',
    'geographic_data',
  ];
  
  // Vérifier si un champ impactant a changé
  const shouldRecalculate = changedFields.some(field => 
    valueImpactFields.some(impactField => field.includes(impactField))
  );
  
  if (!shouldRecalculate) {
    return null;
  }
  
  // Recalculer la valeur
  return await estimateAndUpdateDealValue(leadId, config);
}

