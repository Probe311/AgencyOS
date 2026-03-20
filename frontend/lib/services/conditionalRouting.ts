/**
 * Service de routage conditionnel pour les workflows d'automation
 * Implémente les règles IF-THEN-ELSE pour le routage selon scoring, température, secteur, etc.
 */

import { evaluateConditionGroup, ConditionGroup } from '../utils/conditionEvaluator';
import { assignLeadAutomated, AssignLeadParams } from './assignmentActions';
import { Lead } from '../../types';
import { logInfo } from '../utils/logger';

export interface RoutingRule {
  condition: ConditionGroup;
  thenMethod?: 'senior' | 'standard' | 'junior' | 'manager' | 'nurturing' | 'round_robin' | 'geographic' | 'skill_based' | 'workload' | 'performance';
  elseMethod?: 'senior' | 'standard' | 'junior' | 'manager' | 'nurturing' | 'round_robin' | 'geographic' | 'skill_based' | 'workload' | 'performance';
  thenRules?: any;
  elseRules?: any;
}

/**
 * Priorise l'affectation selon scoring et température
 */
export async function routeByScoreAndTemperature(lead: Lead, params?: AssignLeadParams): Promise<string | null> {
  const scoring = (lead as any)?.scoring || (lead as any)?.quality_score || 50;
  const temperature = lead.temperature || 'Froid';

  // Scoring élevé (> 75) ou Température "Chaud" → commercial senior
  if (scoring > 75 || temperature === 'Chaud') {
    logInfo(`Lead ${lead.id} : Scoring élevé (${scoring}) ou température ${temperature} → commercial senior`);
    // Utiliser performance avec top 20%
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: 50,
          topPercentage: 20,
          useWeights: true,
        },
      },
      reason: 'Priorisation scoring/température élevé',
    });
  }
  
  // Scoring moyen (50-75) ou Température "Tiède" → commercial standard
  if (scoring >= 50 && scoring <= 75 || temperature === 'Tiède') {
    logInfo(`Lead ${lead.id} : Scoring moyen (${scoring}) ou température ${temperature} → commercial standard`);
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'round_robin',
      reason: 'Priorisation scoring/température moyen',
    });
  }
  
  // Scoring faible (< 50) ou Température "Froid" → nurturing automatique (pas d'attribution immédiate)
  logInfo(`Lead ${lead.id} : Scoring faible (${scoring}) ou température ${temperature} → nurturing automatique`);
  // Retourner null = pas d'attribution, le lead restera en nurturing
  return null;
}

/**
 * Route selon famille et secteur (compétences)
 */
export async function routeByFamilyAndSector(lead: Lead, params?: AssignLeadParams): Promise<string | null> {
  const family = lead.family;
  const sector = lead.sector || lead.industry;

  if (!family && !sector) {
    // Pas de famille ni secteur → attribution générale
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'round_robin',
      reason: 'Routage général (pas de famille/secteur)',
    });
  }

  // Utiliser skill-based pour attribuer selon famille/secteur
  return await assignLeadAutomated({
    ...params,
    leadId: lead.id,
    assignmentMethod: 'skill_based',
    rules: {
      skillBased: {
        families: family ? { [family]: [] } : undefined, // TODO: Récupérer depuis config
        sectors: sector ? { [sector]: [] } : undefined, // TODO: Récupérer depuis config
      },
    },
    reason: `Routage famille/secteur: ${family || 'N/A'} / ${sector || 'N/A'}`,
  });
}

/**
 * Interface pour les seuils configurables de taille d'entreprise
 */
export interface CompanySizeThresholds {
  tpeMax?: number; // Maximum pour TPE (défaut: 10)
  pmeMax?: number; // Maximum pour PME (défaut: 250)
  etiMax?: number; // Maximum pour ETI (défaut: 5000)
  pmeMinConversionRate?: number; // Taux conversion min pour PME (défaut: 30)
  pmeTopPercentage?: number; // Top % pour PME (défaut: 50)
  etiMinConversionRate?: number; // Taux conversion min pour ETI (défaut: 40)
  etiTopPercentage?: number; // Top % pour ETI (défaut: 30)
  largeEnterpriseMinConversionRate?: number; // Taux conversion min pour Grande entreprise (défaut: 50)
  largeEnterpriseTopPercentage?: number; // Top % pour Grande entreprise (défaut: 10)
}

/**
 * Route selon taille d'entreprise avec seuils configurables
 */
export async function routeByCompanySize(
  lead: Lead, 
  params?: AssignLeadParams,
  thresholds?: CompanySizeThresholds
): Promise<string | null> {
  // Valeurs par défaut des seuils
  const defaults: Required<CompanySizeThresholds> = {
    tpeMax: 10,
    pmeMax: 250,
    etiMax: 5000,
    pmeMinConversionRate: 30,
    pmeTopPercentage: 50,
    etiMinConversionRate: 40,
    etiTopPercentage: 30,
    largeEnterpriseMinConversionRate: 50,
    largeEnterpriseTopPercentage: 10,
  };
  
  const config = { ...defaults, ...thresholds };
  
  const companySize = lead.company_size || '';
  
  // Extraire le nombre de salariés depuis company_size (format: "1-10", "11-50", etc.)
  const extractEmployeeCount = (size: string): number | null => {
    const match = size.match(/(\d+)-(\d+)/);
    if (match) {
      return Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2); // Moyenne
    }
    const singleMatch = size.match(/(\d+)/);
    if (singleMatch) {
      return parseInt(singleMatch[1]);
    }
    return null;
  };

  const employeeCount = extractEmployeeCount(companySize);
  
  if (employeeCount === null) {
    // Taille inconnue → attribution standard
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'round_robin',
      reason: 'Routage standard (taille inconnue)',
    });
  }

  // TPE (< seuil TPE) → commercial junior ou standard
  if (employeeCount < config.tpeMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'round_robin',
      reason: `Routage TPE (< ${config.tpeMax} salariés)`,
    });
  }
  
  // PME (seuil TPE - seuil PME) → commercial standard ou senior
  if (employeeCount >= config.tpeMax && employeeCount <= config.pmeMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: config.pmeMinConversionRate,
          topPercentage: config.pmeTopPercentage,
        },
      },
      reason: `Routage PME (${config.tpeMax}-${config.pmeMax} salariés)`,
    });
  }
  
  // ETI (seuil PME - seuil ETI) → commercial senior ou manager
  if (employeeCount > config.pmeMax && employeeCount <= config.etiMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: config.etiMinConversionRate,
          topPercentage: config.etiTopPercentage,
        },
      },
      reason: `Routage ETI (${config.pmeMax + 1}-${config.etiMax} salariés)`,
    });
  }
  
  // Grande entreprise (> seuil ETI) → manager ou direction
  // Récupérer les managers
  const { supabase } = await import('../supabase');
  const { data: managers } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'Manager')
    .limit(1);
  
  if (managers && managers.length > 0) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      userId: managers[0].id,
      assignmentMethod: 'custom',
      reason: `Routage Grande entreprise (> ${config.etiMax} salariés) → Manager`,
    });
  }

  // Fallback: utiliser performance top %
  return await assignLeadAutomated({
    ...params,
    leadId: lead.id,
    assignmentMethod: 'performance',
    rules: {
      performance: {
        minConversionRate: config.largeEnterpriseMinConversionRate,
        topPercentage: config.largeEnterpriseTopPercentage,
      },
    },
    reason: `Routage Grande entreprise (> ${config.etiMax} salariés) → Top performers`,
  });
}

/**
 * Interface pour les seuils configurables de valeur de deal
 */
export interface DealValueThresholds {
  smallMax?: number; // Maximum pour petit deal (défaut: 5000)
  mediumMax?: number; // Maximum pour deal moyen (défaut: 20000)
  largeMax?: number; // Maximum pour gros deal (défaut: 50000)
  mediumMinConversionRate?: number; // Taux conversion min pour deal moyen (défaut: 30)
  mediumTopPercentage?: number; // Top % pour deal moyen (défaut: 50)
  largeMinConversionRate?: number; // Taux conversion min pour gros deal (défaut: 40)
  largeTopPercentage?: number; // Top % pour gros deal (défaut: 30)
  xlargeMinConversionRate?: number; // Taux conversion min pour très gros deal (défaut: 50)
  xlargeTopPercentage?: number; // Top % pour très gros deal (défaut: 10)
}

/**
 * Route selon valeur potentielle du deal avec seuils configurables
 */
export async function routeByDealValue(
  lead: Lead, 
  params?: AssignLeadParams,
  thresholds?: DealValueThresholds
): Promise<string | null> {
  // Valeurs par défaut des seuils
  const defaults: Required<DealValueThresholds> = {
    smallMax: 5000,
    mediumMax: 20000,
    largeMax: 50000,
    mediumMinConversionRate: 30,
    mediumTopPercentage: 50,
    largeMinConversionRate: 40,
    largeTopPercentage: 30,
    xlargeMinConversionRate: 50,
    xlargeTopPercentage: 10,
  };
  
  const config = { ...defaults, ...thresholds };
  const estimatedValue = (lead as any)?.estimated_value || (lead as any)?.deal_amount || 0;
  
  // Deal < seuil petit → commercial junior
  if (estimatedValue > 0 && estimatedValue < config.smallMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'round_robin',
      reason: `Routage deal < ${config.smallMax}€ → commercial junior`,
    });
  }
  
  // Deal seuil petit - seuil moyen → commercial standard
  if (estimatedValue >= config.smallMax && estimatedValue < config.mediumMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: config.mediumMinConversionRate,
          topPercentage: config.mediumTopPercentage,
        },
      },
      reason: `Routage deal ${config.smallMax}-${config.mediumMax}€ → commercial standard`,
    });
  }
  
  // Deal seuil moyen - seuil gros → commercial senior
  if (estimatedValue >= config.mediumMax && estimatedValue < config.largeMax) {
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: config.largeMinConversionRate,
          topPercentage: config.largeTopPercentage,
        },
      },
      reason: `Routage deal ${config.mediumMax}-${config.largeMax}€ → commercial senior`,
    });
  }
  
  // Deal > seuil gros → manager ou direction
  if (estimatedValue >= config.largeMax) {
    const { supabase } = await import('../supabase');
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Manager')
      .limit(1);
    
    if (managers && managers.length > 0) {
      return await assignLeadAutomated({
        ...params,
        leadId: lead.id,
        userId: managers[0].id,
        assignmentMethod: 'custom',
        reason: `Routage deal > ${config.largeMax}€ → Manager`,
      });
    }
    
    // Fallback: utiliser performance top %
    return await assignLeadAutomated({
      ...params,
      leadId: lead.id,
      assignmentMethod: 'performance',
      rules: {
        performance: {
          minConversionRate: config.xlargeMinConversionRate,
          topPercentage: config.xlargeTopPercentage,
        },
      },
      reason: `Routage deal > ${config.largeMax}€ → Top performers`,
    });
  }
  
  // Valeur inconnue → attribution standard
  return await assignLeadAutomated({
    ...params,
    leadId: lead.id,
    assignmentMethod: 'round_robin',
    reason: 'Routage standard (valeur inconnue)',
  });
}

