/**
 * Service d'évaluation de conditions pour le routage conditionnel
 * Supporte IF-THEN-ELSE avec opérateurs, combinaisons ET/OU, conditions imbriquées
 */

import { Lead } from '../../types';

export type ConditionOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'daysAgo' | 'hoursAgo' | 'hasAction' | 'hasNotAction' | 'actionCount';
export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: any;
  // Pour conditions temporelles : unité (days, hours, minutes)
  timeUnit?: 'days' | 'hours' | 'minutes';
  // Pour conditions comportementales : période de recherche
  period?: {
    start?: Date | string;
    end?: Date | string;
    days?: number; // Nombre de jours dans le passé
  };
  // Pour conditions comportementales : type d'action
  actionType?: 'email_open' | 'email_click' | 'website_visit' | 'resource_download' | 'form_submission' | 'email_sent' | 'call_made' | 'appointment' | 'quote_viewed' | 'quote_accepted';
}

export interface ConditionGroup {
  operator?: LogicalOperator; // AND, OR, NOT
  conditions?: Condition[];
  groups?: ConditionGroup[]; // Pour imbrication
}

export interface ConditionalRule {
  condition: ConditionGroup;
  thenAction?: string | ConditionGroup; // Action si condition vraie
  elseAction?: string | ConditionGroup; // Action si condition fausse
}

/**
 * Calcule le nombre de jours/heures/minutes depuis une date
 */
function getTimeSince(date: Date | string | null | undefined, unit: 'days' | 'hours' | 'minutes' = 'days'): number | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  
  switch (unit) {
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60));
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'days':
    default:
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

/**
 * Récupère la valeur d'un champ depuis un lead
 */
async function getFieldValue(lead: Lead, field: string): Promise<any> {
  const fieldMap: Record<string, string> = {
    'scoring': 'scoring',
    'quality_score': 'quality_score',
    'température': 'temperature',
    'temperature': 'temperature',
    'secteur': 'sector',
    'sector': 'sector',
    'industry': 'industry',
    'famille': 'family',
    'family': 'family',
    'taille_entreprise': 'company_size',
    'company_size': 'company_size',
    'valeur_potentielle': 'estimated_value',
    'estimated_value': 'estimated_value',
    'deal_amount': 'deal_amount',
    'statut': 'status',
    'status': 'status',
    'lifecycle_stage': 'lifecycle_stage',
    'ville': 'city',
    'city': 'city',
    'région': 'region',
    'region': 'region',
  };

  const mappedField = fieldMap[field.toLowerCase()] || field;
  let value = (lead as any)[mappedField];

  // Gestion des champs imbriqués
  if (mappedField === 'scoring' && !value) {
    value = (lead as any).quality_score;
  }
  
  if (mappedField === 'sector' && !value) {
    value = (lead as any).industry;
  }

  if (mappedField === 'city' && !value && (lead as any).geographic_data) {
    value = (lead as any).geographic_data.city;
  }

  if (mappedField === 'region' && !value && (lead as any).geographic_data) {
    value = (lead as any).geographic_data.region;
  }

  // Gestion des tags (array)
  if (field.toLowerCase() === 'tags' || field.toLowerCase() === 'tag') {
    value = (lead as any).tags || [];
  }

  // Gestion des dates (pour conditions temporelles)
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('created') || field.toLowerCase().includes('updated')) {
    if (field.toLowerCase() === 'created_at' || field.toLowerCase() === 'date_creation') {
      value = lead.created_at;
    } else if (field.toLowerCase() === 'updated_at' || field.toLowerCase() === 'date_modification') {
      value = (lead as any).updated_at;
    } else if (field.toLowerCase() === 'last_activity_at' || field.toLowerCase() === 'derniere_interaction') {
      value = lead.last_activity_at;
    }
  }

  // Gestion des champs de date relative (dernière interaction, etc.)
  if (field.toLowerCase() === 'days_since_last_activity' || field.toLowerCase() === 'jours_depuis_interaction') {
    value = getTimeSince(lead.last_activity_at, 'days');
  }

  if (field.toLowerCase() === 'days_since_created' || field.toLowerCase() === 'jours_depuis_creation') {
    value = getTimeSince(lead.created_at, 'days');
  }

  return value;
}

/**
 * Vérifie si un lead a effectué une action comportementale
 */
async function hasBehavioralAction(
  leadId: string,
  actionType: Condition['actionType'],
  period?: Condition['period']
): Promise<boolean> {
  const { supabase } = await import('../supabase');
  
  if (!actionType) return false;

  // Mapping des types d'actions vers les tables/colonnes appropriées
  const actionTypeMap: Record<string, { table: string; typeField: string; typeValue: string }> = {
    'email_open': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_opened' },
    'email_click': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_clicked' },
    'website_visit': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'website_visited' },
    'resource_download': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'resource_downloaded' },
    'form_submission': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'form_submitted' },
    'email_sent': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_sent' },
    'call_made': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'call_made' },
    'appointment': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'appointment' },
    'quote_viewed': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'quote_viewed' },
    'quote_accepted': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'quote_accepted' },
  };
  
  const mapping = actionTypeMap[actionType];
  if (!mapping) {
    console.warn(`Type d'action non reconnu: ${actionType}`);
    return false;
  }

  // Construire la requête selon le type d'action
  // Pour email_open/click, utiliser aussi email_tracking si disponible
  if (actionType === 'email_open' || actionType === 'email_click') {
    const { supabase: sb } = await import('../supabase');
    let query = sb.from('email_tracking').select('id').eq('lead_id', leadId);
    
    if (actionType === 'email_open') {
      query = query.gt('open_count', 0);
    } else if (actionType === 'email_click') {
      query = query.gt('click_count', 0);
    }
    
    // Filtrer par période
    if (period) {
      const startDate = period.days 
        ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)
        : (period.start ? (typeof period.start === 'string' ? new Date(period.start) : period.start) : null);
      if (startDate) {
        query = query.gte('opened_at', startDate.toISOString());
      }
    }
    
    const { data, error } = await query.limit(1);
    if (!error && data && data.length > 0) {
      return true;
    }
  }

  // Sinon, utiliser sales_activities
  let query = supabase.from(mapping.table).select('id').eq('lead_id', leadId);
  query = query.eq(mapping.typeField, mapping.typeValue);
  
  // Filtrer par période
  if (period) {
    const dateField = mapping.table === 'sales_activities' ? 'activity_date' : 'created_at';
    if (period.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.days);
      query = query.gte(dateField, startDate.toISOString());
    } else {
      if (period.start) {
        query = query.gte(dateField, typeof period.start === 'string' ? period.start : period.start.toISOString());
      }
      if (period.end) {
        query = query.lte(dateField, typeof period.end === 'string' ? period.end : period.end.toISOString());
      }
    }
  }
  
  const { data, error } = await query.limit(1);
  
  if (error) {
    console.error('Erreur vérification action comportementale:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

/**
 * Compte le nombre d'actions comportementales d'un lead
 */
async function countBehavioralActions(
  leadId: string,
  actionType: Condition['actionType'],
  period?: Condition['period']
): Promise<number> {
  const { supabase } = await import('../supabase');
  
  if (!actionType) return 0;

  const actionTypeMap: Record<string, { table: string; typeField: string; typeValue: string }> = {
    'email_open': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_opened' },
    'email_click': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_clicked' },
    'website_visit': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'website_visited' },
    'resource_download': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'resource_downloaded' },
    'form_submission': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'form_submitted' },
    'email_sent': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'email_sent' },
    'call_made': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'call_made' },
    'appointment': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'appointment' },
    'quote_viewed': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'quote_viewed' },
    'quote_accepted': { table: 'sales_activities', typeField: 'activity_type', typeValue: 'quote_accepted' },
  };
  
  const mapping = actionTypeMap[actionType];
  if (!mapping) {
    console.warn(`Type d'action non reconnu: ${actionType}`);
    return 0;
  }

  // Pour email_open/click, utiliser email_tracking pour un comptage plus précis
  if (actionType === 'email_open' || actionType === 'email_click') {
    const { supabase: sb } = await import('../supabase');
    let query = sb.from('email_tracking').select('open_count, click_count', { count: 'exact' }).eq('lead_id', leadId);
    
    // Filtrer par période
    if (period) {
      const startDate = period.days 
        ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)
        : (period.start ? (typeof period.start === 'string' ? new Date(period.start) : period.start) : null);
      if (startDate) {
        query = query.gte('opened_at', startDate.toISOString());
      }
    }
    
    const { data, error } = await query;
    if (!error && data) {
      if (actionType === 'email_open') {
        return data.reduce((sum, item) => sum + (item.open_count || 0), 0);
      } else if (actionType === 'email_click') {
        return data.reduce((sum, item) => sum + (item.click_count || 0), 0);
      }
    }
  }

  // Sinon, utiliser sales_activities
  const dateField = mapping.table === 'sales_activities' ? 'activity_date' : 'created_at';
  let query = supabase.from(mapping.table).select('id', { count: 'exact', head: true }).eq('lead_id', leadId).eq(mapping.typeField, mapping.typeValue);
  
  // Filtrer par période
  if (period) {
    if (period.days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.days);
      query = query.gte(dateField, startDate.toISOString());
    } else {
      if (period.start) {
        query = query.gte(dateField, typeof period.start === 'string' ? period.start : period.start.toISOString());
      }
      if (period.end) {
        query = query.lte(dateField, typeof period.end === 'string' ? period.end : period.end.toISOString());
      }
    }
  }
  
  const { count, error } = await query;
  
  if (error) {
    console.error('Erreur comptage actions comportementales:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Compare deux valeurs selon un opérateur
 */
async function compareValues(
  value: any,
  operator: ConditionOperator,
  expected: any,
  condition?: Condition,
  leadId?: string
): Promise<boolean> {
  // Conversion de types si nécessaire
  const isNumeric = typeof expected === 'number' || !isNaN(Number(expected));
  const numValue = isNumeric ? Number(value) : null;
  const numExpected = isNumeric ? Number(expected) : null;

  switch (operator) {
    case '=':
      if (isNumeric && numValue !== null && numExpected !== null) {
        return numValue === numExpected;
      }
      return String(value || '').toLowerCase() === String(expected || '').toLowerCase();
    
    case '!=':
      if (isNumeric && numValue !== null && numExpected !== null) {
        return numValue !== numExpected;
      }
      return String(value || '').toLowerCase() !== String(expected || '').toLowerCase();
    
    case '>':
      if (numValue !== null && numExpected !== null) {
        return numValue > numExpected;
      }
      return false;
    
    case '<':
      if (numValue !== null && numExpected !== null) {
        return numValue < numExpected;
      }
      return false;
    
    case '>=':
      if (numValue !== null && numExpected !== null) {
        return numValue >= numExpected;
      }
      return false;
    
    case '<=':
      if (numValue !== null && numExpected !== null) {
        return numValue <= numExpected;
      }
      return false;
    
    case 'contains':
      const strValue = String(value || '').toLowerCase();
      const strExpected = String(expected || '').toLowerCase();
      return strValue.includes(strExpected);
    
    case 'startsWith':
      return String(value || '').toLowerCase().startsWith(String(expected || '').toLowerCase());
    
    case 'endsWith':
      return String(value || '').toLowerCase().endsWith(String(expected || '').toLowerCase());
    
    case 'in':
      const expectedArray = Array.isArray(expected) ? expected : [expected];
      if (Array.isArray(value)) {
        // Vérifier si au moins un élément de value est dans expectedArray
        return value.some(v => expectedArray.includes(String(v).toLowerCase()));
      }
      return expectedArray.includes(String(value || '').toLowerCase());
    
    case 'notIn':
      const expectedArrayNot = Array.isArray(expected) ? expected : [expected];
      if (Array.isArray(value)) {
        return !value.some(v => expectedArrayNot.includes(String(v).toLowerCase()));
      }
      return !expectedArrayNot.includes(String(value || '').toLowerCase());
    
    case 'daysAgo':
    case 'hoursAgo':
      // Comparer le temps écoulé depuis une date
      if (!value) return false; // Pas de date = condition fausse
      const timeUnit = condition?.timeUnit || (operator === 'hoursAgo' ? 'hours' : 'days');
      const timeSince = getTimeSince(value, timeUnit);
      if (timeSince === null) return false;
      
      // expected est le nombre de jours/heures
      const expectedNum = Number(expected);
      if (operator === 'daysAgo') {
        // Comparer avec >= pour "depuis X jours ou plus"
        return timeSince >= expectedNum;
      } else {
        return timeSince >= expectedNum;
      }
    
    case 'hasAction':
      // Vérifier si le lead a effectué une action
      if (!leadId || !condition?.actionType) return false;
      return await hasBehavioralAction(leadId, condition.actionType, condition.period);
    
    case 'hasNotAction':
      // Vérifier si le lead n'a PAS effectué une action
      if (!leadId || !condition?.actionType) return true; // Pas d'action = condition vraie
      return !(await hasBehavioralAction(leadId, condition.actionType, condition.period));
    
    case 'actionCount':
      // Compter le nombre d'actions et comparer
      if (!leadId || !condition?.actionType) return false;
      const count = await countBehavioralActions(leadId, condition.actionType, condition.period);
      // expected peut être un nombre ou une expression comme "3+", "2-5"
      if (typeof expected === 'string' && expected.endsWith('+')) {
        const minCount = parseInt(expected);
        return count >= minCount;
      }
      return count >= Number(expected);
    
    default:
      return false;
  }
}

/**
 * Évalue une condition unique
 */
async function evaluateCondition(lead: Lead, condition: Condition): Promise<boolean> {
  const value = await getFieldValue(lead, condition.field);
  
  // Pour les opérateurs comportementaux, on n'a pas besoin de valeur de champ
  if (['hasAction', 'hasNotAction', 'actionCount'].includes(condition.operator)) {
    return await compareValues(null, condition.operator, condition.value, condition, lead.id);
  }
  
  return await compareValues(value, condition.operator, condition.value, condition, lead.id);
}

/**
 * Évalue un groupe de conditions avec opérateurs logiques
 */
export async function evaluateConditionGroup(lead: Lead, group: ConditionGroup): Promise<boolean> {
  if (!group.conditions && !group.groups) {
    return true; // Groupe vide = vrai
  }

  const operator = group.operator || 'AND';

  // Évaluer les conditions simples
  const conditionResults: boolean[] = [];
  if (group.conditions) {
    const results = await Promise.all(group.conditions.map(cond => evaluateCondition(lead, cond)));
    conditionResults.push(...results);
  }

  // Évaluer les groupes imbriqués
  if (group.groups) {
    const results = await Promise.all(group.groups.map(g => evaluateConditionGroup(lead, g)));
    conditionResults.push(...results);
  }

  if (conditionResults.length === 0) {
    return true;
  }

  // Appliquer l'opérateur logique
  if (operator === 'AND') {
    return conditionResults.every(result => result === true);
  } else if (operator === 'OR') {
    return conditionResults.some(result => result === true);
  } else if (operator === 'NOT') {
    return !conditionResults.every(result => result === true);
  }

  return false;
}

/**
 * Évalue une règle conditionnelle (IF-THEN-ELSE)
 */
export async function evaluateConditionalRule(lead: Lead, rule: ConditionalRule): Promise<'then' | 'else' | null> {
  const conditionResult = await evaluateConditionGroup(lead, rule.condition);
  
  if (conditionResult) {
    return 'then';
  } else if (rule.elseAction) {
    return 'else';
  }
  
  return null;
}

/**
 * Formate une condition en texte lisible
 */
export function formatCondition(condition: Condition): string {
  const operatorLabels: Partial<Record<ConditionOperator, string>> = {
    '=': '=',
    '!=': '≠',
    '>': '>',
    '<': '<',
    '>=': '≥',
    '<=': '≤',
    'contains': 'contient',
    'startsWith': 'commence par',
    'endsWith': 'se termine par',
    'in': 'dans',
    'notIn': 'pas dans',
    'daysAgo': 'il y a X jours',
    'hoursAgo': 'il y a X heures',
    'hasAction': 'a effectué',
    'hasNotAction': 'n\'a pas effectué',
    'actionCount': 'nombre d\'actions',
  };
  
  const operatorLabel = operatorLabels[condition.operator] || condition.operator;
  
  // Formatage spécial pour conditions comportementales
  if (condition.operator === 'hasAction' || condition.operator === 'hasNotAction') {
    const periodStr = condition.period?.days ? ` dans les ${condition.period.days} derniers jours` : '';
    return `${operatorLabel} ${condition.actionType || 'action'}${periodStr}`;
  }
  
  if (condition.operator === 'actionCount') {
    const periodStr = condition.period?.days ? ` dans les ${condition.period.days} derniers jours` : '';
    const valueStr = String(condition.value).endsWith('+') ? `≥ ${condition.value.slice(0, -1)}` : String(condition.value);
    return `nombre de ${condition.actionType || 'actions'} ${operatorLabel} ${valueStr}${periodStr}`;
  }
  
  // Formatage spécial pour conditions temporelles
  if (condition.operator === 'daysAgo' || condition.operator === 'hoursAgo') {
    const unit = condition.operator === 'daysAgo' ? 'jours' : 'heures';
    const timeUnit = condition.timeUnit || (condition.operator === 'hoursAgo' ? 'hours' : 'days');
    const unitLabel = timeUnit === 'hours' ? 'heures' : timeUnit === 'minutes' ? 'minutes' : 'jours';
    return `${condition.field} il y a ${condition.value} ${unitLabel}`;
  }

  const valueStr = Array.isArray(condition.value) 
    ? `[${condition.value.join(', ')}]`
    : String(condition.value);
  
  return `${condition.field} ${operatorLabel} ${valueStr}`;
}

/**
 * Formate un groupe de conditions en texte lisible
 */
export function formatConditionGroup(group: ConditionGroup, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const operator = group.operator || 'AND';
  
  const parts: string[] = [];
  
  if (group.conditions) {
    parts.push(...group.conditions.map(c => `${indentStr}${formatCondition(c)}`));
  }
  
  if (group.groups) {
    parts.push(...group.groups.map(g => formatConditionGroup(g, indent + 1)));
  }
  
  if (parts.length === 0) {
    return `${indentStr}(aucune condition)`;
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  return `${indentStr}(${operator})\n${parts.join(`\n${operator === 'AND' ? ' ET ' : ' OU '}\n`)}`;
}

/**
 * Valide une condition (vérifie que le champ existe et que l'opérateur est valide)
 * @deprecated Utilisez validateSingleCondition de conditionValidator.ts pour une validation plus complète
 */
export async function validateCondition(condition: Condition, lead: Lead): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Pour les conditions comportementales, on n'a pas besoin de vérifier le champ
  if (['hasAction', 'hasNotAction', 'actionCount'].includes(condition.operator)) {
    if (!condition.actionType) {
      return {
        valid: false,
        error: `Opérateur "${condition.operator}" nécessite un actionType`,
      };
    }
    return { valid: true };
  }
  
  const value = await getFieldValue(lead, condition.field);
  
  if (value === undefined && !['in', 'notIn', 'daysAgo', 'hoursAgo'].includes(condition.operator)) {
    return {
      valid: false,
      error: `Champ "${condition.field}" non trouvé dans le lead`,
    };
  }
  
  // Vérifier que l'opérateur est compatible avec le type de valeur
  const isNumeric = typeof condition.value === 'number' || !isNaN(Number(condition.value));
  if (['>', '<', '>=', '<='].includes(condition.operator) && !isNumeric && !['daysAgo', 'hoursAgo', 'actionCount'].includes(condition.operator)) {
    return {
      valid: false,
      error: `Opérateur "${condition.operator}" nécessite une valeur numérique`,
    };
  }
  
  // Vérifier les opérateurs temporels
  if (['daysAgo', 'hoursAgo'].includes(condition.operator)) {
    if (!value) {
      return {
        valid: false,
        error: `Champ "${condition.field}" doit être une date pour l'opérateur "${condition.operator}"`,
      };
    }
  }
  
  return { valid: true };
}

