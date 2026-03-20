/**
 * Utilitaires de certification des leads
 * Un lead est certifié s'il a toutes les données essentielles : siret, email, phone, name
 */

import { Lead } from '../../types';
import { validateEmailSyntax, validatePhoneFormat } from './leadValidation';

export interface CertificationCriteria {
  hasSiret: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasName: boolean;
  score: number; // Score de certification (0-100)
}

/**
 * Vérifie si un lead peut être certifié
 * Critères minimaux : SIRET, email, téléphone, nom du contact
 * Version améliorée avec validation de confiance pour email/phone
 */
export function checkLeadCertification(lead: Lead | any): CertificationCriteria {
  // Extraire le SIRET depuis les données enrichies si nécessaire
  const siret = lead.siret || 
                (lead.notes && typeof lead.notes === 'string' ? extractSiretFromNotes(lead.notes) : null) ||
                (lead.notes && typeof lead.notes === 'object' ? lead.notes.siret : null);
  
  // Vérifier les critères en utilisant les fonctions de validation centralisées
  const hasSiret = !!siret && siret.trim() !== '' && isValidSiret(siret);
  
  // Validation email avec vérification de confiance (high confidence requis)
  const emailValidation = lead.email ? validateEmailSyntax(lead.email) : { isValid: false, confidence: 'low' as const };
  const hasEmail = !!lead.email && 
                   lead.email.trim() !== '' && 
                   emailValidation.isValid === true && 
                   emailValidation.confidence === 'high';
  
  // Validation téléphone avec vérification de confiance (high ou medium confidence accepté)
  const phoneValidation = lead.phone ? validatePhoneFormat(lead.phone) : { isValid: false, confidence: 'low' as const };
  const hasPhone = !!lead.phone && 
                   lead.phone.trim() !== '' && 
                   phoneValidation.isValid === true && 
                   (phoneValidation.confidence === 'high' || phoneValidation.confidence === 'medium');
  
  // Nom du contact : non vide et non générique
  const hasName = !!lead.name && lead.name.trim() !== '' && !isGenericName(lead.name);
  
  // Calculer le score de certification (pondération améliorée)
  let score = 0;
  if (hasSiret) score += 35; // SIRET est le plus important (augmenté)
  if (hasEmail) score += 25;
  if (hasPhone) score += 25;
  if (hasName) score += 15;
  
  return {
    hasSiret,
    hasEmail,
    hasPhone,
    hasName,
    score
  };
}

/**
 * Détermine si un lead doit être certifié
 * Un lead est certifié s'il a TOUS les critères minimaux
 */
export function shouldCertifyLead(lead: Lead | any): boolean {
  const criteria = checkLeadCertification(lead);
  // Tous les critères doivent être remplis pour certifier
  return criteria.hasSiret && criteria.hasEmail && criteria.hasPhone && criteria.hasName;
}

/**
 * Certifie un lead si les critères sont remplis
 * Retourne le lead avec le statut de certification mis à jour
 */
export function certifyLeadIfEligible(lead: Lead | any): Lead | any {
  const shouldCertify = shouldCertifyLead(lead);
  
  if (shouldCertify && !lead.certified) {
    return {
      ...lead,
      certified: true,
      certifiedAt: new Date().toISOString()
    };
  }
  
  // Si le lead était certifié mais ne remplit plus les critères, le décertifier
  if (lead.certified && !shouldCertify) {
    return {
      ...lead,
      certified: false,
      certifiedAt: undefined
    };
  }
  
  return lead;
}

/**
 * Certifie un lead si son score de complétude dépasse 80%
 * Utilisé après l'enrichissement automatique
 */
export async function certifyLeadIfHighCompleteness(lead: Lead | any): Promise<Lead | any> {
  try {
    // Vérifier d'abord les critères standards (SIRET + email + phone + name)
    if (shouldCertifyLead(lead)) {
      return certifyLeadIfEligible(lead);
    }
    
    // Sinon, calculer le score de complétude global
    const { calculateDataCompleteness } = await import('./leadValidation');
    const completenessScore = calculateDataCompleteness(lead);
    
    // Vérifier aussi si le lead a un SIRET (critère important)
    const hasSiret = !!(lead.siret && lead.siret.trim() !== '');
    
    // Certifier si score > 80% ET au moins SIRET présent
    if (completenessScore >= 80 && hasSiret && !lead.certified) {
      return {
        ...lead,
        certified: true,
        certifiedAt: new Date().toISOString()
      };
    }
    
    return lead;
  } catch (error) {
    console.warn('[Certification] Erreur lors de la certification automatique:', error);
    return lead;
  }
}

/**
 * Valide le format d'un SIRET (14 chiffres)
 * Version améliorée avec meilleure gestion des formats avec espaces
 */
function isValidSiret(siret: string): boolean {
  if (!siret || typeof siret !== 'string') {
    return false;
  }
  
  // Nettoyer le SIRET (supprimer espaces, tirets, points)
  const cleaned = siret.replace(/[\s\-\.]/g, '');
  
  // SIRET doit contenir exactement 14 chiffres
  if (!/^\d{14}$/.test(cleaned)) {
    return false;
  }
  
  // Vérification de la clé de contrôle (algorithme de Luhn modifié pour SIRET)
  // Pour le SIRET, on multiplie les chiffres en position paire (index 0, 2, 4...)
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i]);
    // Les positions impaires (index 1, 3, 5...) sont multipliées par 2
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}


/**
 * Vérifie si un nom est générique (ex: "Responsable", "Gérant", etc.)
 * Version améliorée avec plus de patterns et détection des noms complets
 */
function isGenericName(name: string): boolean {
  const genericNames = [
    'responsable',
    'gerant',
    'gérant',
    'directeur',
    'directrice',
    'manager',
    'chef',
    'contact',
    'accueil',
    'secretariat',
    'secretaire',
    'standard',
    'info',
    'information',
    'commercial',
    'commerciale',
    'service',
    'bureau',
    'administration',
    'admin',
    'reception',
    'receptionniste',
    'standardiste'
  ];
  
  const nameLower = name.toLowerCase().trim();
  
  // Si le nom est exactement un nom générique, c'est générique
  if (genericNames.includes(nameLower)) {
    return true;
  }
  
  // Si le nom commence par un nom générique suivi d'un espace ou d'une préposition
  const startsWithGeneric = genericNames.some(generic => 
    nameLower.startsWith(generic + ' ') ||
    nameLower.startsWith(generic + ' de') ||
    nameLower.startsWith(generic + ' du') ||
    nameLower.startsWith(generic + ' des') ||
    nameLower.startsWith(generic + ' de la') ||
    nameLower.startsWith(generic + ' de l\'')
  );
  
  if (startsWithGeneric) {
    return true;
  }
  
  // Si le nom fait moins de 3 caractères, c'est probablement générique
  if (nameLower.length < 3) {
    return true;
  }
  
  // Vérifier si le nom contient un prénom ET un nom (format "Prénom Nom" ou "Nom Prénom")
  // Si c'est le cas, c'est probablement un vrai nom
  const nameParts = nameLower.split(/\s+/).filter(part => part.length > 0);
  if (nameParts.length >= 2) {
    // Probablement un nom complet, pas générique
    return false;
  }
  
  // Si le nom ne contient qu'un seul mot et fait plus de 2 caractères, considérer comme valide
  // (pour éviter de rejeter des noms courts mais valides)
  return false;
}

/**
 * Extrait le SIRET depuis le champ notes (peut être du JSON)
 */
function extractSiretFromNotes(notes: string): string | null {
  try {
    // Essayer de parser comme JSON
    const parsed = JSON.parse(notes);
    if (parsed.siret) return parsed.siret;
    if (parsed.sireneData?.siret) return parsed.sireneData.siret;
  } catch {
    // Si ce n'est pas du JSON, chercher un SIRET dans le texte
    const siretMatch = notes.match(/\b\d{14}\b/);
    if (siretMatch) {
      return siretMatch[0];
    }
  }
  return null;
}

/**
 * Obtient le message de certification pour un lead
 */
export function getCertificationMessage(lead: Lead | any): string {
  const criteria = checkLeadCertification(lead);
  const missing: string[] = [];
  
  if (!criteria.hasSiret) missing.push('SIRET');
  if (!criteria.hasEmail) missing.push('Email');
  if (!criteria.hasPhone) missing.push('Téléphone');
  if (!criteria.hasName) missing.push('Nom du contact');
  
  if (missing.length === 0) {
    return 'Lead certifié ✓';
  }
  
  return `Manque : ${missing.join(', ')} (${criteria.score}%)`;
}

/**
 * Vérifie si un lead est certifié et ne doit pas être enrichi
 * Retourne true si le lead est certifié (doit être ignoré par l'enrichissement)
 */
export function isLeadCertifiedForEnrichment(lead: Lead | any): boolean {
  // Si le lead a explicitement le flag certified à true, il est certifié
  if (lead.certified === true) {
    return true;
  }
  
  // Vérifier si le lead remplit tous les critères de certification
  return shouldCertifyLead(lead);
}

