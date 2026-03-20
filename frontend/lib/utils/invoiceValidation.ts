/**
 * Validation des champs obligatoires pour la facturation électronique française
 * Conforme aux exigences de l'administration fiscale
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valide le format d'un numéro SIREN (9 chiffres)
 */
export const validateSIREN = (siren: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!siren) {
    return { isValid: false, errors: ['Le SIREN est obligatoire pour les entreprises'] };
  }

  // Supprimer les espaces et caractères non numériques
  const cleanSiren = siren.replace(/\s/g, '');

  // Vérifier que c'est composé uniquement de chiffres
  if (!/^\d+$/.test(cleanSiren)) {
    errors.push('Le SIREN doit contenir uniquement des chiffres');
  }

  // Vérifier la longueur (9 chiffres)
  if (cleanSiren.length !== 9) {
    errors.push('Le SIREN doit contenir exactement 9 chiffres');
  }

  // Vérification de la clé de contrôle (algorithme de Luhn)
  if (cleanSiren.length === 9 && /^\d+$/.test(cleanSiren)) {
    const digits = cleanSiren.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }
    
    if (sum % 10 !== 0) {
      errors.push('Le SIREN n\'est pas valide (clé de contrôle incorrecte)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valide le format d'un numéro SIRET (14 chiffres)
 */
export const validateSIRET = (siret: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!siret) {
    return { isValid: false, errors: ['Le SIRET est obligatoire pour les entreprises'] };
  }

  // Supprimer les espaces et caractères non numériques
  const cleanSiret = siret.replace(/\s/g, '');

  // Vérifier que c'est composé uniquement de chiffres
  if (!/^\d+$/.test(cleanSiret)) {
    errors.push('Le SIRET doit contenir uniquement des chiffres');
  }

  // Vérifier la longueur (14 chiffres)
  if (cleanSiret.length !== 14) {
    errors.push('Le SIRET doit contenir exactement 14 chiffres');
  }

  // Vérification de la clé de contrôle (algorithme de Luhn)
  if (cleanSiret.length === 14 && /^\d+$/.test(cleanSiret)) {
    const digits = cleanSiret.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 14; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }
    
    if (sum % 10 !== 0) {
      errors.push('Le SIRET n\'est pas valide (clé de contrôle incorrecte)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valide le format d'un numéro de TVA intracommunautaire
 * Format français : FR + 2 chiffres de clé + 9 chiffres du SIREN
 * Exemple : FR12345678901
 */
export const validateVATNumber = (vatNumber: string, country: string = 'France'): ValidationResult => {
  const errors: string[] = [];
  
  if (!vatNumber) {
    return { isValid: true, errors: [] }; // Optionnel selon le contexte
  }

  const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase();

  // Validation pour la France
  if (country === 'France' || cleanVat.startsWith('FR')) {
    // Format : FR + 2 chiffres + 9 chiffres SIREN
    if (!/^FR\d{11}$/.test(cleanVat)) {
      errors.push('Le numéro de TVA intracommunautaire français doit être au format FR + 11 chiffres (ex: FR12345678901)');
    } else {
      // Extraire le SIREN (9 derniers chiffres)
      const siren = cleanVat.substring(2);
      const sirenValidation = validateSIREN(siren);
      if (!sirenValidation.isValid) {
        errors.push(...sirenValidation.errors.map(e => `TVA : ${e}`));
      }
    }
  } else {
    // Pour les autres pays de l'UE, format général : 2 lettres (code pays) + jusqu'à 12 caractères
    if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(cleanVat)) {
      errors.push('Le numéro de TVA intracommunautaire doit commencer par 2 lettres (code pays) suivi de 2 à 12 caractères alphanumériques');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valide une adresse complète
 */
export const validateAddress = (addressLine1: string, postalCode: string, city: string): ValidationResult => {
  const errors: string[] = [];

  if (!addressLine1 || addressLine1.trim().length === 0) {
    errors.push('L\'adresse (ligne 1) est obligatoire');
  }

  if (!postalCode || postalCode.trim().length === 0) {
    errors.push('Le code postal est obligatoire');
  } else {
    // Validation code postal français (5 chiffres)
    const cleanPostalCode = postalCode.replace(/\s/g, '');
    if (!/^\d{5}$/.test(cleanPostalCode)) {
      errors.push('Le code postal français doit contenir 5 chiffres');
    }
  }

  if (!city || city.trim().length === 0) {
    errors.push('La ville est obligatoire');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valide les informations obligatoires d'une facture/devis pour la facturation électronique
 */
export const validateInvoiceForEInvoicing = (data: {
  clientName: string;
  clientAddressLine1?: string;
  clientPostalCode?: string;
  clientCity?: string;
  clientSiret?: string;
  clientSiren?: string;
  clientVatNumber?: string;
  clientCountry?: string;
  isCompany?: boolean; // Si c'est une entreprise, SIRET/SIREN sont obligatoires
}): ValidationResult => {
  const errors: string[] = [];

  // Nom du client obligatoire
  if (!data.clientName || data.clientName.trim().length === 0) {
    errors.push('Le nom du client est obligatoire');
  }

  // Adresse complète obligatoire
  const addressValidation = validateAddress(
    data.clientAddressLine1 || '',
    data.clientPostalCode || '',
    data.clientCity || ''
  );
  if (!addressValidation.isValid) {
    errors.push(...addressValidation.errors);
  }

  // Si c'est une entreprise, SIRET/SIREN sont obligatoires
  if (data.isCompany) {
    if (!data.clientSiret && !data.clientSiren) {
      errors.push('Le SIRET ou le SIREN est obligatoire pour les entreprises');
    }

    if (data.clientSiret) {
      const siretValidation = validateSIRET(data.clientSiret);
      if (!siretValidation.isValid) {
        errors.push(...siretValidation.errors);
      }
    }

    if (data.clientSiren) {
      const sirenValidation = validateSIREN(data.clientSiren);
      if (!sirenValidation.isValid) {
        errors.push(...sirenValidation.errors);
      }
    }

    // Si TVA intracommunautaire est fourni, le valider
    if (data.clientVatNumber) {
      const vatValidation = validateVATNumber(data.clientVatNumber, data.clientCountry || 'France');
      if (!vatValidation.isValid) {
        errors.push(...vatValidation.errors);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Valide les informations de l'entreprise émettrice
 */
export const validateCompanySettings = (settings: Partial<CompanySettings>): ValidationResult => {
  const errors: string[] = [];

  if (!settings.legalName || settings.legalName.trim().length === 0) {
    errors.push('La raison sociale est obligatoire');
  }

  const addressValidation = validateAddress(
    settings.addressLine1 || '',
    settings.postalCode || '',
    settings.city || ''
  );
  if (!addressValidation.isValid) {
    errors.push(...addressValidation.errors);
  }

  // SIRET/SIREN recommandés mais pas toujours obligatoires selon le contexte
  if (settings.siret) {
    const siretValidation = validateSIRET(settings.siret);
    if (!siretValidation.isValid) {
      errors.push(...siretValidation.errors);
    }
  }

  if (settings.siren) {
    const sirenValidation = validateSIREN(settings.siren);
    if (!sirenValidation.isValid) {
      errors.push(...sirenValidation.errors);
    }
  }

  // Si TVA intracommunautaire est fourni, le valider
  if (settings.vatNumber) {
    const vatValidation = validateVATNumber(settings.vatNumber, settings.country || 'France');
    if (!vatValidation.isValid) {
      errors.push(...vatValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Import du type CompanySettings
import { CompanySettings } from '../../types';

