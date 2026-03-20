/**
 * Service de validation avancée des conditions pour détecter les erreurs
 * avant l'activation des workflows
 */

import { Condition, ConditionGroup, ConditionOperator, LogicalOperator } from './conditionEvaluator';
import { Lead } from '../../types';

export interface ValidationError {
  type: 'syntax' | 'logic' | 'field' | 'type' | 'contradiction';
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  location?: {
    field?: string;
    operator?: string;
    value?: any;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Valide la syntaxe d'une condition (opérateurs, valeurs)
 */
function validateConditionSyntax(condition: Condition): ValidationError[] {
  const errors: ValidationError[] = [];

  // Vérifier que l'opérateur est valide
  const validOperators: ConditionOperator[] = [
    '=', '!=', '>', '<', '>=', '<=',
    'contains', 'startsWith', 'endsWith',
    'in', 'notIn',
    'daysAgo', 'hoursAgo',
    'hasAction', 'hasNotAction', 'actionCount',
  ];

  if (!validOperators.includes(condition.operator)) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      message: `Opérateur invalide: "${condition.operator}"`,
      suggestion: `Utilisez un des opérateurs valides: ${validOperators.join(', ')}`,
      location: { operator: condition.operator },
    });
  }

  // Vérifier que les opérateurs comportementaux ont un actionType
  if (['hasAction', 'hasNotAction', 'actionCount'].includes(condition.operator)) {
    if (!condition.actionType) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        message: `Opérateur "${condition.operator}" nécessite un actionType`,
        suggestion: 'Ajoutez un actionType (email_open, email_click, website_visit, etc.)',
        location: { operator: condition.operator },
      });
    }
  }

  // Vérifier que les opérateurs temporels ont une valeur numérique
  if (['daysAgo', 'hoursAgo'].includes(condition.operator)) {
    if (typeof condition.value !== 'number' && isNaN(Number(condition.value))) {
      errors.push({
        type: 'type',
        severity: 'error',
        message: `Opérateur "${condition.operator}" nécessite une valeur numérique`,
        suggestion: `Utilisez un nombre (ex: 7 pour 7 jours)`,
        location: { operator: condition.operator, value: condition.value },
      });
    }
  }

  // Vérifier que les opérateurs numériques ont des valeurs numériques
  if (['>', '<', '>=', '<='].includes(condition.operator)) {
    const isNumeric = typeof condition.value === 'number' || !isNaN(Number(condition.value));
    if (!isNumeric && !['daysAgo', 'hoursAgo'].includes(condition.operator)) {
      errors.push({
        type: 'type',
        severity: 'warning',
        message: `Opérateur "${condition.operator}" devrait avoir une valeur numérique`,
        suggestion: 'Vérifiez que la valeur est bien un nombre',
        location: { operator: condition.operator, value: condition.value },
      });
    }
  }

  // Vérifier que les opérateurs 'in' et 'notIn' ont des tableaux
  if (['in', 'notIn'].includes(condition.operator)) {
    if (!Array.isArray(condition.value)) {
      errors.push({
        type: 'type',
        severity: 'error',
        message: `Opérateur "${condition.operator}" nécessite un tableau de valeurs`,
        suggestion: 'Utilisez un tableau (ex: ["valeur1", "valeur2"])',
        location: { operator: condition.operator, value: condition.value },
      });
    }
  }

  return errors;
}

/**
 * Valide qu'un champ existe dans un lead (exemple)
 */
async function validateFieldExists(field: string, lead?: Lead): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Liste des champs valides (peut être étendue)
  const validFields = [
    'scoring', 'quality_score', 'temperature', 'sector', 'industry',
    'family', 'company_size', 'estimated_value', 'deal_amount',
    'status', 'lifecycle_stage', 'city', 'region',
    'tags', 'created_at', 'updated_at', 'last_activity_at',
    'days_since_last_activity', 'days_since_created',
  ];

  // Vérifier si le champ est dans la liste ou s'il commence par "champ_custom_"
  const isCustomField = field.toLowerCase().startsWith('champ_custom_') || 
                        field.toLowerCase().startsWith('custom_');
  
  if (!validFields.includes(field.toLowerCase()) && !isCustomField) {
    errors.push({
      type: 'field',
      severity: 'warning',
      message: `Champ "${field}" non reconnu`,
      suggestion: `Vérifiez l'orthographe ou utilisez un champ personnalisé (champ_custom_*)`,
      location: { field },
    });
  }

  // Si un lead est fourni, vérifier que le champ existe réellement
  if (lead) {
    const fieldValue = await getFieldValueFromLead(lead, field);
    if (fieldValue === undefined && !['hasAction', 'hasNotAction', 'actionCount'].includes(field)) {
      errors.push({
        type: 'field',
        severity: 'warning',
        message: `Champ "${field}" non trouvé dans le lead`,
        suggestion: 'Le champ peut être vide ou inexistant pour ce lead',
        location: { field },
      });
    }
  }

  return errors;
}

/**
 * Récupère la valeur d'un champ depuis un lead (simplifié)
 */
async function getFieldValueFromLead(lead: Lead, field: string): Promise<any> {
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
  return (lead as any)[mappedField];
}

/**
 * Détecte les conditions contradictoires dans un groupe
 */
function detectContradictions(group: ConditionGroup): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!group.conditions || group.conditions.length < 2) {
    return errors;
  }

  // Détecter les conditions qui s'excluent mutuellement sur le même champ
  const conditionsByField: Record<string, Condition[]> = {};
  
  for (const condition of group.conditions) {
    if (condition.field) {
      if (!conditionsByField[condition.field]) {
        conditionsByField[condition.field] = [];
      }
      conditionsByField[condition.field].push(condition);
    }
  }

  // Vérifier les contradictions pour chaque champ
  for (const [field, conditions] of Object.entries(conditionsByField)) {
    if (conditions.length < 2) continue;

    // Détecter scoring > 75 ET scoring < 50 (impossible)
    const greaterThan = conditions.find(c => ['>', '>='].includes(c.operator));
    const lessThan = conditions.find(c => ['<', '<='].includes(c.operator));

    if (greaterThan && lessThan) {
      const gtValue = Number(greaterThan.value);
      const ltValue = Number(lessThan.value);

      if (!isNaN(gtValue) && !isNaN(ltValue) && gtValue >= ltValue) {
        errors.push({
          type: 'contradiction',
          severity: 'error',
          message: `Conditions contradictoires sur "${field}": ${greaterThan.operator} ${greaterThan.value} ET ${lessThan.operator} ${lessThan.value}`,
          suggestion: `Vérifiez la logique: un champ ne peut pas être à la fois ${greaterThan.operator} ${greaterThan.value} et ${lessThan.operator} ${lessThan.value}`,
          location: { field },
        });
      }
    }

    // Détecter field = "A" ET field = "B" (impossible)
    const equals = conditions.filter(c => c.operator === '=');
    if (equals.length > 1) {
      const values = equals.map(c => String(c.value));
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length > 1) {
        errors.push({
          type: 'contradiction',
          severity: 'error',
          message: `Conditions contradictoires sur "${field}": ne peut pas être égal à plusieurs valeurs différentes`,
          suggestion: `Utilisez l'opérateur "in" pour plusieurs valeurs: ${values.join(', ')}`,
          location: { field },
        });
      }
    }

    // Détecter field = "A" ET field != "A" (impossible)
    const equalsValue = equals[0]?.value;
    const notEquals = conditions.find(c => c.operator === '!=' && String(c.value) === String(equalsValue));
    if (equalsValue && notEquals) {
      errors.push({
        type: 'contradiction',
        severity: 'error',
        message: `Conditions contradictoires sur "${field}": ne peut pas être égal ET différent de "${equalsValue}"`,
        suggestion: 'Supprimez une des deux conditions contradictoires',
        location: { field },
      });
    }
  }

  return errors;
}

/**
 * Valide un groupe de conditions complet
 */
export async function validateConditionGroup(
  group: ConditionGroup,
  lead?: Lead
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Valider l'opérateur logique
  if (group.operator && !['AND', 'OR', 'NOT'].includes(group.operator)) {
    errors.push({
      type: 'syntax',
      severity: 'error',
      message: `Opérateur logique invalide: "${group.operator}"`,
      suggestion: 'Utilisez AND, OR ou NOT',
    });
  }

  // Valider les conditions simples
  if (group.conditions) {
    for (const condition of group.conditions) {
      // Validation syntaxe
      const syntaxErrors = validateConditionSyntax(condition);
      errors.push(...syntaxErrors.filter(e => e.severity === 'error'));
      warnings.push(...syntaxErrors.filter(e => e.severity === 'warning'));

      // Validation existence champ
      if (condition.field) {
        const fieldErrors = await validateFieldExists(condition.field, lead);
        warnings.push(...fieldErrors);
      }
    }

    // Détecter contradictions
    const contradictionErrors = detectContradictions(group);
    errors.push(...contradictionErrors);
  }

  // Valider les groupes imbriqués
  if (group.groups) {
    for (const nestedGroup of group.groups) {
      const nestedResult = await validateConditionGroup(nestedGroup, lead);
      errors.push(...nestedResult.errors);
      warnings.push(...nestedResult.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valide une condition unique
 */
export async function validateSingleCondition(
  condition: Condition,
  lead?: Lead
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validation syntaxe
  const syntaxErrors = validateConditionSyntax(condition);
  errors.push(...syntaxErrors.filter(e => e.severity === 'error'));
  warnings.push(...syntaxErrors.filter(e => e.severity === 'warning'));

  // Validation existence champ
  if (condition.field) {
    const fieldErrors = await validateFieldExists(condition.field, lead);
    warnings.push(...fieldErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formate les erreurs de validation pour affichage
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('❌ Erreurs:');
    result.errors.forEach((error, index) => {
      lines.push(`  ${index + 1}. ${error.message}`);
      if (error.suggestion) {
        lines.push(`     💡 ${error.suggestion}`);
      }
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\n⚠️ Avertissements:');
    result.warnings.forEach((warning, index) => {
      lines.push(`  ${index + 1}. ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`     💡 ${warning.suggestion}`);
      }
    });
  }

  if (lines.length === 0) {
    lines.push('✅ Aucune erreur détectée');
  }

  return lines.join('\n');
}

