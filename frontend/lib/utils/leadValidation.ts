/**
 * Utilitaires de validation et scoring de qualité pour les leads
 */

import { logError } from './logger';
import { isFieldFilled, calculateWeightedScore, detectMissingFields as detectMissingFieldsUtil } from './fieldValidation';

export interface LeadQualityScore {
  overallScore: number; // 0-100
  emailValid: boolean | null;
  phoneValid: boolean | null;
  dataCompleteness: number; // 0-100
  sourceReliability: number; // 0-100
  dataFreshness: number | null; // Nombre de jours depuis dernière mise à jour
  missingFields: string[];
  suspiciousFields: string[];
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Valide le format d'un email (syntaxe)
 */
export function validateEmailSyntax(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, reason: 'Email vide', confidence: 'low' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Format email invalide', confidence: 'low' };
  }

  // Vérifier les emails génériques suspects
  const genericDomains = ['example.com', 'test.com', 'domain.com', 'email.com', 'mail.com', 'yopmail.com', 'guerrillamail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && genericDomains.includes(domain)) {
    return { isValid: false, reason: 'Email générique suspect', confidence: 'medium' };
  }

  // Vérifier les patterns suspects
  const suspiciousPatterns = ['test@', 'noreply@', 'no-reply@', 'donotreply@', 'admin@', 'info@', 'contact@', 'hello@', 'support@'];
  const localPart = email.split('@')[0]?.toLowerCase();
  if (localPart && suspiciousPatterns.some(pattern => localPart.includes(pattern))) {
    return { isValid: true, reason: 'Email générique mais valide', confidence: 'medium' };
  }

  return { isValid: true, confidence: 'high' };
}

/**
 * Valide un numéro de téléphone (format français et international)
 */
export function validatePhoneFormat(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: false, reason: 'Téléphone vide', confidence: 'low' };
  }

  // Nettoyer le numéro (supprimer espaces, tirets, points, parenthèses)
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Format français : 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres
  const frenchRegex = /^(0[1-9]|(\+33|0033)[1-9])\d{8}$/;
  if (frenchRegex.test(cleaned)) {
    return { isValid: true, confidence: 'high' };
  }

  // Format international : + suivi de 7-15 chiffres
  const internationalRegex = /^\+[1-9]\d{6,14}$/;
  if (internationalRegex.test(cleaned)) {
    return { isValid: true, confidence: 'high' };
  }

  // Format avec seulement des chiffres (10-15 chiffres)
  const digitsOnly = /^\d{10,15}$/;
  if (digitsOnly.test(cleaned)) {
    return { isValid: true, reason: 'Format numérique valide mais non standard', confidence: 'medium' };
  }

  return { isValid: false, reason: 'Format téléphone invalide', confidence: 'low' };
}

/**
 * Calcule le score de complétude des données d'un lead
 */
export function calculateDataCompleteness(lead: any): number {
  const requiredFields = ['name', 'company', 'email', 'phone', 'address', 'siret'].map(f => ({ field: f, weight: 3 }));
  const importantFields = ['website', 'linkedin', 'industry', 'company_size'].map(f => ({ field: f, weight: 2 }));
  const optionalFields = ['description', 'ceo', 'techStack', 'google_rating'].map(f => ({ field: f, weight: 1 }));

  return calculateWeightedScore([...requiredFields, ...importantFields, ...optionalFields], lead);
}

/**
 * Calcule la fiabilité des sources
 */
export function calculateSourceReliability(lead: any): number {
  const sources = lead.sources || lead.data_sources || [];
  const webSources = lead.webSources || [];

  if (sources.length === 0 && webSources.length === 0) {
    return 0;
  }

  let reliability = 0;
  let totalSources = sources.length + webSources.length;

  // Sources fiables (poids élevé)
  const highReliabilitySources = ['google.com', 'maps.google.com', 'linkedin.com', 'societe.com', 'sirene.fr'];
  sources.forEach((source: string) => {
    if (highReliabilitySources.some(rel => source.toLowerCase().includes(rel))) {
      reliability += 3;
    } else {
      reliability += 1;
    }
  });

  // WebSources (métadonnées Google Search)
  if (webSources.length > 0) {
    reliability += webSources.length * 2;
  }

  return totalSources > 0 ? Math.min(100, Math.round((reliability / (totalSources * 3)) * 100)) : 0;
}

/**
 * Détecte les champs manquants
 */
export function detectMissingFields(lead: any): string[] {
  const requiredFields = [
    { key: 'name', label: 'Nom du contact' },
    { key: 'company', label: 'Nom de l\'entreprise' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'address', label: 'Adresse' },
  ];

  return detectMissingFieldsUtil(lead, requiredFields);
}

/**
 * Détecte les champs suspects
 */
export function detectSuspiciousFields(lead: any): string[] {
  const suspicious: string[] = [];

  // Email suspect
  if (lead.email) {
    const emailValidation = validateEmailSyntax(lead.email);
    if (!emailValidation.isValid || emailValidation.confidence === 'medium') {
      suspicious.push(`Email: ${emailValidation.reason || 'suspect'}`);
    }
  }

  // Téléphone suspect
  if (lead.phone) {
    const phoneValidation = validatePhoneFormat(lead.phone);
    if (!phoneValidation.isValid || phoneValidation.confidence === 'medium') {
      suspicious.push(`Téléphone: ${phoneValidation.reason || 'format suspect'}`);
    }
  }

  // Entreprise avec nom générique
  if (lead.company) {
    const genericNames = ['test', 'example', 'demo', 'sample', 'company', 'entreprise'];
    if (genericNames.some(name => lead.company.toLowerCase().includes(name))) {
      suspicious.push('Nom d\'entreprise générique');
    }
  }

  return suspicious;
}

/**
 * Calcule le score de qualité global d'un lead
 */
export function calculateLeadQualityScore(lead: any, dataFreshness?: number | null): LeadQualityScore {
  const emailValidation = lead.email ? validateEmailSyntax(lead.email) : { isValid: null, confidence: 'low' as const };
  const phoneValidation = lead.phone ? validatePhoneFormat(lead.phone) : { isValid: null, confidence: 'low' as const };
  const dataCompleteness = calculateDataCompleteness(lead);
  const sourceReliability = calculateSourceReliability(lead);
  const missingFields = detectMissingFields(lead);
  const suspiciousFields = detectSuspiciousFields(lead);

  // Calcul du score global (pondération)
  let overallScore = 0;
  let totalWeight = 0;

  // Email valide (poids 25%)
  if (emailValidation.isValid !== null) {
    totalWeight += 25;
    overallScore += emailValidation.isValid ? 25 : 0;
  }

  // Téléphone valide (poids 25%)
  if (phoneValidation.isValid !== null) {
    totalWeight += 25;
    overallScore += phoneValidation.isValid ? 25 : 0;
  }

  // Complétude des données (poids 30%)
  totalWeight += 30;
  overallScore += (dataCompleteness * 30) / 100;

  // Fiabilité des sources (poids 20%)
  totalWeight += 20;
  overallScore += (sourceReliability * 20) / 100;

  // Pénalité pour champs suspects (-5% par champ suspect)
  const suspiciousPenalty = suspiciousFields.length * 5;
  overallScore = Math.max(0, overallScore - suspiciousPenalty);

  // Ajustement final
  if (totalWeight > 0) {
    overallScore = Math.round((overallScore / totalWeight) * 100);
  }

  return {
    overallScore,
    emailValid: emailValidation.isValid,
    phoneValid: phoneValidation.isValid,
    dataCompleteness,
    sourceReliability,
    dataFreshness: dataFreshness || null,
    missingFields,
    suspiciousFields,
  };
}

/**
 * Sauvegarde le score de qualité dans Supabase
 */
export async function saveLeadQualityScore(leadId: string, score: LeadQualityScore) {
  const { supabase } = await import('../supabase');
  
  const { error } = await supabase
    .from('lead_quality_scores')
    .upsert({
      lead_id: leadId,
      overall_score: score.overallScore,
      email_valid: score.emailValid,
      phone_valid: score.phoneValid,
      data_completeness: score.dataCompleteness,
      source_reliability: score.sourceReliability,
      data_freshness: score.dataFreshness,
      missing_fields: score.missingFields,
      suspicious_fields: score.suspiciousFields,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'lead_id'
    });

  if (error) {
    logError('Erreur sauvegarde score qualité:', error);
    throw error;
  }
}
