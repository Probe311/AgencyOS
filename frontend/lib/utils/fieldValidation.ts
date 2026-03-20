/**
 * Utilitaires communs pour la validation de champs
 * Factorise les patterns répétés dans les fonctions de validation
 */

/**
 * Vérifie si un champ est rempli (non vide et non null)
 */
export function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  
  return true;
}

/**
 * Calcule un score pondéré basé sur des champs avec des poids différents
 */
export function calculateWeightedScore(
  fields: Array<{ field: string; weight: number }>,
  data: Record<string, any>
): number {
  let score = 0;
  let totalWeight = 0;

  fields.forEach(({ field, weight }) => {
    totalWeight += weight;
    if (isFieldFilled(data[field])) {
      score += weight;
    }
  });

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Détecte les champs manquants d'une liste de champs requis
 */
export function detectMissingFields(
  data: Record<string, any>,
  requiredFields: Array<{ key: string; label: string }>
): string[] {
  const missing: string[] = [];
  
  requiredFields.forEach(field => {
    if (!isFieldFilled(data[field.key])) {
      missing.push(field.label);
    }
  });
  
  return missing;
}

