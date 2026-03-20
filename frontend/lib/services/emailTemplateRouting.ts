/**
 * Service de routage de templates d'emails selon les critères du lead
 * Sélection automatique du template le plus adapté (secteur, famille, température, etc.)
 */

import { Lead } from '../../types';
import { EmailTemplate } from '../../types';
import { getEmailTemplates, TemplateFilter } from './emailTemplateLibrary';
import { evaluateConditionGroup, ConditionGroup } from '../utils/conditionEvaluator';
import { logInfo, logWarn } from '../utils/logger';

export interface TemplateRoutingRule {
  condition: ConditionGroup;
  templateId?: string;
  templateCategory?: string;
  templateFamily?: string;
  templateTemperature?: string;
  templateSector?: string;
  priority?: number; // Plus la priorité est élevée, plus la règle est prioritaire
  fallback?: boolean; // Template par défaut si aucune autre règle ne correspond
}

/**
 * Route vers le template d'email le plus approprié selon les critères du lead
 */
export async function routeEmailTemplate(
  lead: Lead,
  options?: {
    defaultCategory?: string;
    defaultTemplateId?: string;
    routingRules?: TemplateRoutingRule[];
    preferLanguage?: string;
  }
): Promise<EmailTemplate | null> {
  try {
    const routingRules = options?.routingRules || getDefaultTemplateRoutingRules();
    
    // Évaluer les règles dans l'ordre de priorité (du plus élevé au plus bas)
    const sortedRules = [...routingRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of sortedRules) {
      try {
        const matches = await evaluateConditionGroup(rule.condition, lead);
        
        if (matches) {
          logInfo(`Règle de routage template matchée pour lead ${lead.id}, priorité: ${rule.priority || 0}`);
          
          // Récupérer le template selon les critères de la règle
          const template = await getTemplateFromRule(rule, lead, options?.preferLanguage);
          
          if (template) {
            return template;
          }
        }
      } catch (error) {
        logWarn(`Erreur évaluation règle routage template:`, error);
        continue;
      }
    }
    
    // Aucune règle ne correspond, utiliser le template par défaut
    return await getDefaultTemplate(lead, options);
    
  } catch (error) {
    logWarn('Erreur routage template email:', error);
    return await getDefaultTemplate(lead, options);
  }
}

/**
 * Récupère le template depuis une règle de routage
 */
async function getTemplateFromRule(
  rule: TemplateRoutingRule,
  lead: Lead,
  preferLanguage?: string
): Promise<EmailTemplate | null> {
  try {
    // Si un templateId spécifique est défini, le récupérer directement
    if (rule.templateId) {
      const { getEmailTemplateById } = await import('./emailTemplateLibrary');
      return await getEmailTemplateById(rule.templateId);
    }
    
    // Sinon, chercher selon les critères
    const filter: TemplateFilter = {};
    
    if (rule.templateCategory) {
      filter.category = rule.templateCategory as any;
    }
    
    if (rule.templateFamily) {
      filter.family = rule.templateFamily;
    }
    
    if (rule.templateTemperature) {
      filter.temperature = rule.templateTemperature as any;
    }
    
    if (rule.templateSector) {
      filter.sector = rule.templateSector;
    }
    
    // Préférer la langue du lead si disponible
    if (preferLanguage) {
      filter.language = preferLanguage;
    }
    
    const templates = await getEmailTemplates(filter);
    
    if (templates && templates.length > 0) {
      // Retourner le premier template correspondant (ou le template officiel si disponible)
      const officialTemplate = templates.find(t => (t as any).isOfficial);
      return officialTemplate || templates[0];
    }
    
    return null;
  } catch (error) {
    logWarn('Erreur récupération template depuis règle:', error);
    return null;
  }
}

/**
 * Récupère le template par défaut
 */
async function getDefaultTemplate(
  lead: Lead,
  options?: {
    defaultCategory?: string;
    defaultTemplateId?: string;
    preferLanguage?: string;
  }
): Promise<EmailTemplate | null> {
  try {
    // Si un template par défaut est spécifié, l'utiliser
    if (options?.defaultTemplateId) {
      const { getEmailTemplateById } = await import('./emailTemplateLibrary');
      const template = await getEmailTemplateById(options.defaultTemplateId);
      if (template) return template;
    }
    
    // Sinon, chercher selon la catégorie par défaut
    if (options?.defaultCategory) {
      const filter: TemplateFilter = {
        category: options.defaultCategory as any,
      };
      
      if (options?.preferLanguage) {
        filter.language = options.preferLanguage;
      }
      
      const templates = await getEmailTemplates(filter);
      if (templates && templates.length > 0) {
        const officialTemplate = templates.find(t => (t as any).isOfficial);
        return officialTemplate || templates[0];
      }
    }
    
    // En dernier recours, chercher un template de bienvenue
    const filter: TemplateFilter = {
      category: 'Bienvenue',
    };
    
    if (options?.preferLanguage) {
      filter.language = options.preferLanguage;
    }
    
    const templates = await getEmailTemplates(filter);
    if (templates && templates.length > 0) {
      return templates[0];
    }
    
    return null;
  } catch (error) {
    logWarn('Erreur récupération template par défaut:', error);
    return null;
  }
}

/**
 * Retourne les règles de routage par défaut
 */
export function getDefaultTemplateRoutingRules(): TemplateRoutingRule[] {
  return [
    // Règle 1 : Secteur Tech → Templates Tech (priorité haute)
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'sector',
            operator: '=',
            value: 'Tech',
          },
        ],
      },
      templateSector: 'Tech',
      priority: 100,
    },
    
    // Règle 2 : Secteur Retail → Templates Retail
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'sector',
            operator: '=',
            value: 'Retail',
          },
        ],
      },
      templateSector: 'Retail',
      priority: 100,
    },
    
    // Règle 3 : Secteur BTP → Templates BTP
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'sector',
            operator: '=',
            value: 'BTP',
          },
        ],
      },
      templateSector: 'BTP',
      priority: 100,
    },
    
    // Règle 4 : Famille Artisans → Templates Artisans (priorité plus haute que secteur seul)
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'family',
            operator: '=',
            value: 'Artisans',
          },
        ],
      },
      templateFamily: 'Artisans',
      priority: 110,
    },
    
    // Règle 5 : Famille Startups Tech → Templates Startups Tech
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'family',
            operator: '=',
            value: 'Startups Tech',
          },
        ],
      },
      templateFamily: 'Startups Tech',
      priority: 110,
    },
    
    // Règle 6 : Température Chaud → Templates Chaud
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'temperature',
            operator: '=',
            value: 'Chaud',
          },
        ],
      },
      templateTemperature: 'Chaud',
      priority: 80,
    },
    
    // Règle 7 : Température Tiède → Templates Tiède
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'temperature',
            operator: '=',
            value: 'Tiède',
          },
        ],
      },
      templateTemperature: 'Tiède',
      priority: 80,
    },
    
    // Règle 8 : Température Froid → Templates Froid
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'temperature',
            operator: '=',
            value: 'Froid',
          },
        ],
      },
      templateTemperature: 'Froid',
      priority: 80,
    },
    
    // Règle 9 : Scoring élevé (> 75) + Température Chaud → Template prioritaire
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'scoring',
            operator: '>=',
            value: 75,
          },
          {
            field: 'temperature',
            operator: '=',
            value: 'Chaud',
          },
        ],
      },
      templateTemperature: 'Chaud',
      templateCategory: 'Nurturing',
      priority: 120,
    },
    
    // Règle 10 : Étape cycle de vie MQL → Templates MQL
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'lifecycle_stage',
            operator: '=',
            value: 'MQL',
          },
        ],
      },
      templateCategory: 'Onboarding',
      priority: 90,
    },
    
    // Règle 11 : Étape cycle de vie SQL → Templates SQL
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'lifecycle_stage',
            operator: '=',
            value: 'SQL',
          },
        ],
      },
      templateCategory: 'Onboarding',
      priority: 90,
    },
    
    // Règle 12 : Étape Opportunité → Templates Relance
    {
      condition: {
        operator: 'AND',
        conditions: [
          {
            field: 'lifecycle_stage',
            operator: '=',
            value: 'Opportunité',
          },
        ],
      },
      templateCategory: 'Relance',
      priority: 90,
    },
  ];
}

/**
 * Sélectionne le meilleur template pour un lead selon plusieurs critères combinés
 */
export async function selectBestTemplate(
  lead: Lead,
  context?: {
    scenario?: 'onboarding' | 'nurturing' | 'relance' | 'satisfaction';
    preferLanguage?: string;
    routingRules?: TemplateRoutingRule[];
  }
): Promise<EmailTemplate | null> {
  try {
    // Déterminer la catégorie par défaut selon le scénario
    let defaultCategory = 'Bienvenue';
    
    if (context?.scenario) {
      const categoryMap: Record<string, string> = {
        onboarding: 'Onboarding',
        nurturing: 'Nurturing',
        relance: 'Relance',
        satisfaction: 'Onboarding',
      };
      defaultCategory = categoryMap[context.scenario] || 'Bienvenue';
    }
    
    // Utiliser le routage pour trouver le meilleur template
    return await routeEmailTemplate(lead, {
      defaultCategory,
      routingRules: context?.routingRules || getDefaultTemplateRoutingRules(),
      preferLanguage: context?.preferLanguage,
    });
  } catch (error) {
    logWarn('Erreur sélection meilleur template:', error);
    return null;
  }
}

/**
 * Crée une règle de routage personnalisée
 */
export function createTemplateRoutingRule(
  condition: ConditionGroup,
  templateCriteria: {
    templateId?: string;
    templateCategory?: string;
    templateFamily?: string;
    templateTemperature?: string;
    templateSector?: string;
  },
  priority?: number
): TemplateRoutingRule {
  return {
    condition,
    ...templateCriteria,
    priority: priority || 50,
  };
}

/**
 * Évalue plusieurs templates candidats et retourne le meilleur selon un score
 */
export async function scoreTemplates(
  lead: Lead,
  templateIds: string[]
): Promise<Array<{ template: EmailTemplate; score: number }>> {
  try {
    const { getEmailTemplateById } = await import('./emailTemplateLibrary');
    const scored: Array<{ template: EmailTemplate; score: number }> = [];
    
    for (const templateId of templateIds) {
      const template = await getEmailTemplateById(templateId);
      if (!template) continue;
      
      let score = 0;
      
      // Score selon correspondance secteur
      if (template.sector && lead.sector === template.sector) {
        score += 30;
      }
      
      // Score selon correspondance famille
      if ((template as any).family && (lead as any).family === (template as any).family) {
        score += 40; // Famille plus importante que secteur
      }
      
      // Score selon correspondance température
      if ((template as any).temperature && lead.temperature === (template as any).temperature) {
        score += 20;
      }
      
      // Score selon correspondance étape cycle de vie
      if ((template as any).lifecycleStage && (lead as any).lifecycle_stage === (template as any).lifecycleStage) {
        score += 25;
      }
      
      // Bonus pour template officiel
      if ((template as any).isOfficial) {
        score += 10;
      }
      
      scored.push({ template, score });
    }
    
    // Trier par score décroissant
    return scored.sort((a, b) => b.score - a.score);
  } catch (error) {
    logWarn('Erreur scoring templates:', error);
    return [];
  }
}

