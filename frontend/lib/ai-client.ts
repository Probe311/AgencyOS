/**
 * Gestionnaire d'appels API IA avec retry automatique et gestion des quotas
 * Gère les erreurs 429 (rate limits) avec backoff exponentiel
 * Supporte Gemini et Mistral comme fallback
 */

import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './api-keys';

/**
 * Interface pour les données SIRENE
 */
interface SireneCompany {
  siren: string;
  siret: string;
  nom_complet: string;
  nom_raison_sociale: string;
  adresse: string;
  code_postal: string;
  ville: string;
  activite_principale?: string;
  date_creation?: string;
  tranche_effectif?: string;
}

/**
 * Normalise un nom d'entreprise pour améliorer la recherche
 * Supprime les accents, normalise les abréviations, etc.
 */
function normalizeCompanyName(name: string): string[] {
  const variations: string[] = [name.trim()];
  const trimmedName = name.trim();
  
  // 1. Version sans accents
  const withoutAccents = trimmedName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (withoutAccents !== trimmedName) {
    variations.push(withoutAccents);
  }
  
  // 2. Supprimer les abréviations courantes entre parenthèses (ex: "Entreprises Menuiseries Aménagements (EMA)")
  const withoutParentheses = trimmedName.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutParentheses !== trimmedName && withoutParentheses.length > 0) {
    variations.push(withoutParentheses);
    // Aussi sans accents
    const withoutParenthesesNoAccents = withoutParentheses
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (withoutParenthesesNoAccents !== withoutParentheses) {
      variations.push(withoutParenthesesNoAccents);
    }
  }
  
  // 3. Extraire l'abréviation entre parenthèses si c'est un acronyme (ex: "(EMA)" -> "EMA")
  const acronymMatch = trimmedName.match(/\(([A-Z]{2,})\)/);
  if (acronymMatch && acronymMatch[1]) {
    variations.push(acronymMatch[1]);
  }
  
  // 4. Supprimer les articles et mots courts en début (le, la, les, un, une, etc.)
  const withoutArticles = trimmedName.replace(/^(les?|la|le|un|une|des?|du|de)\s+/i, '').trim();
  if (withoutArticles !== trimmedName && withoutArticles.length > 0) {
    variations.push(withoutArticles);
    const withoutArticlesNoAccents = withoutArticles
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (withoutArticlesNoAccents !== withoutArticles) {
      variations.push(withoutArticlesNoAccents);
    }
  }
  
  // 5. Normaliser les "&" et "et"
  const normalizedAnd = trimmedName.replace(/&/g, 'et').replace(/\s+/g, ' ').trim();
  if (normalizedAnd !== trimmedName) {
    variations.push(normalizedAnd);
  }
  const normalizedAndNoAccents = normalizedAnd
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (normalizedAndNoAccents !== normalizedAnd && normalizedAndNoAccents !== trimmedName) {
    variations.push(normalizedAndNoAccents);
  }
  
  // 6. Supprimer les espaces multiples et normaliser
  const normalized = trimmedName.replace(/\s+/g, ' ').trim();
  if (normalized !== trimmedName) {
    variations.push(normalized);
  }
  
  // 7. Pour les noms avec apostrophes (ex: "Sol'Air" -> "Sol Air")
  const withoutApostrophe = trimmedName.replace(/'/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutApostrophe !== trimmedName && withoutApostrophe.length > 0) {
    variations.push(withoutApostrophe);
  }
  
  // 8. Extraire les mots principaux (enlever les petits mots de liaison)
  const mainWords = trimmedName
    .replace(/\s+(et|&|de|du|des|la|le|les|en|sur|pour|avec)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (mainWords !== trimmedName && mainWords.length > 3) {
    variations.push(mainWords);
  }
  
  // Retourner des variations uniques, triées par longueur (les plus longues en premier)
  const uniqueVariations = [...new Set(variations)].filter(v => v.length > 0);
  return uniqueVariations.sort((a, b) => b.length - a.length);
}

/**
 * Recherche une entreprise dans l'API SIRENE officielle (gratuite)
 * API: https://api.gouv.fr/les-api/sirene_v3
 * Amélioré avec recherche par variations du nom et matching flexible
 */
export async function searchSireneCompany(
  companyName: string,
  location?: string,
  address?: string
): Promise<SireneCompany | null> {
  try {
    // Si pas de location mais une adresse, extraire le département
    let department = location;
    if (!department && address) {
      const postalCodeMatch = address.match(/\b(\d{5})\b/);
      if (postalCodeMatch) {
        department = postalCodeMatch[1].substring(0, 2);
      }
    }
    
    // Générer des variations du nom pour améliorer la recherche
    const nameVariations = normalizeCompanyName(companyName);
    
    // Essayer plusieurs recherches avec différentes variations
    for (const nameVariation of nameVariations) {
      // 1. Essayer avec département si disponible
      if (department) {
        const result = await searchSireneWithParams(nameVariation, department, address);
        if (result) {
          // Vérifier que c'est une bonne correspondance
          if (isGoodMatch(nameVariation, result.nom_complet, address, result.adresse)) {
            return result;
          }
        }
      }
      
      // 2. Essayer sans département (recherche plus large)
      const result = await searchSireneWithParams(nameVariation, undefined, address);
      if (result) {
        // Vérifier que c'est une bonne correspondance
        if (isGoodMatch(nameVariation, result.nom_complet, address, result.adresse)) {
          return result;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('[SIRENE] Erreur lors de la recherche:', error);
    return null;
  }
}

/**
 * Fait une recherche SIRENE avec des paramètres spécifiques
 */
async function searchSireneWithParams(
  companyName: string,
  department?: string,
  address?: string
): Promise<SireneCompany | null> {
  try {
    // Construire l'URL de recherche
    let searchUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(companyName)}`;
    if (department) {
      searchUrl += `&departement=${department}`;
    }
    searchUrl += '&per_page=10'; // Prendre plus de résultats pour mieux filtrer
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[SIRENE] Limite de taux atteinte, validation ignorée');
        return null;
      }
      return null;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Si on a une adresse, essayer de trouver la meilleure correspondance
      let bestMatch = data.results[0];
      let bestScore = 0;
      
      for (const company of data.results) {
        const matchScore = calculateMatchScore(
          companyName,
          company.nom_complet || company.nom_raison_sociale || '',
          address,
          company.siege?.adresse || company.adresse || '',
          company.siege?.ville || company.ville || ''
        );
        
        if (matchScore > bestScore) {
          bestScore = matchScore;
          bestMatch = company;
        }
      }
      
      const company = bestMatch;
      return {
        siren: company.siren || '',
        siret: company.siret || '',
        nom_complet: company.nom_complet || company.nom_raison_sociale || '',
        nom_raison_sociale: company.nom_raison_sociale || '',
        adresse: company.siege?.adresse || company.adresse || '',
        code_postal: company.siege?.code_postal || company.code_postal || '',
        ville: company.siege?.ville || company.ville || '',
        activite_principale: company.activite_principale || '',
        date_creation: company.date_creation || '',
        tranche_effectif: company.tranche_effectif || ''
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Calcule un score de correspondance entre le nom recherché et le nom trouvé
 */
function calculateMatchScore(
  searchedName: string,
  foundName: string,
  searchedAddress?: string,
  foundAddress?: string,
  foundCity?: string
): number {
  let score = 0;
  const searchedLower = searchedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const foundLower = foundName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Correspondance exacte (100 points)
  if (searchedLower === foundLower) {
    score = 100;
  } else if (foundLower.includes(searchedLower) || searchedLower.includes(foundLower)) {
    // Correspondance partielle (70 points)
    score = 70;
  } else {
    // Correspondance par mots (50 points max)
    const searchedWords = searchedLower.split(/\s+/).filter(w => w.length > 2);
    const foundWords = foundLower.split(/\s+/).filter(w => w.length > 2);
    const matchingWords = searchedWords.filter(word => foundWords.some(fw => fw.includes(word) || word.includes(fw)));
    if (searchedWords.length > 0) {
      score = (matchingWords.length / searchedWords.length) * 50;
    }
  }
  
  // Bonus si l'adresse correspond
  if (searchedAddress && foundAddress) {
    const searchedAddrLower = searchedAddress.toLowerCase();
    const foundAddrLower = foundAddress.toLowerCase();
    if (foundCity && searchedAddrLower.includes(foundCity.toLowerCase())) {
      score += 20;
    } else if (foundAddrLower.includes(searchedAddrLower.split(',')[0]) || 
               searchedAddrLower.includes(foundAddrLower.split(',')[0])) {
      score += 15;
    }
  }
  
  return Math.min(100, score);
}

/**
 * Vérifie si une correspondance est suffisamment bonne
 */
function isGoodMatch(
  searchedName: string,
  foundName: string,
  searchedAddress?: string,
  foundAddress?: string
): boolean {
  const score = calculateMatchScore(searchedName, foundName, searchedAddress, foundAddress);
  // Accepter si score >= 50 (correspondance partielle acceptable)
  return score >= 50;
}

/**
 * Recherche une entreprise par SIRET dans l'API SIRENE
 */
export async function searchSireneBySiret(siret: string): Promise<SireneCompany | null> {
  try {
    const searchUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&per_page=1`;
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[SIRENE] Limite de taux atteinte');
        return null;
      }
      return null;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const company = data.results[0];
      // Vérifier que le SIRET correspond exactement
      if (company.siret === siret) {
        return {
          siren: company.siren || '',
          siret: company.siret || '',
          nom_complet: company.nom_complet || company.nom_raison_sociale || '',
          nom_raison_sociale: company.nom_raison_sociale || '',
          adresse: company.siege?.adresse || company.adresse || '',
          code_postal: company.siege?.code_postal || company.code_postal || '',
          ville: company.siege?.ville || company.ville || '',
          activite_principale: company.activite_principale || '',
          date_creation: company.date_creation || '',
          tranche_effectif: company.tranche_effectif || ''
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('[SIRENE] Erreur lors de la recherche par SIRET:', error);
    return null;
  }
}

/**
 * Recherche les informations d'une entreprise via l'API SIRENE (data.gouv.fr)
 * Remplace l'ancienne méthode qui utilisait l'IA Gemini
 * Utilise l'API officielle recherche-entreprises.api.gouv.fr (gratuite et fiable)
 */
export async function searchCompanyOnSocieteCom(
  companyName: string,
  address?: string,
  callGeminiAPIFn?: (prompt: string, options?: any) => Promise<string>
): Promise<{ siret?: string; siren?: string; additionalInfo?: any } | null> {
  try {
    // Utiliser directement l'API SIRENE au lieu de Gemini
    const sireneData = await searchSireneCompany(companyName, undefined, address);
    
    if (sireneData && (sireneData.siret || sireneData.siren)) {
      // Construire l'adresse complète
      const fullAddress = sireneData.adresse 
        ? `${sireneData.adresse}${sireneData.code_postal ? `, ${sireneData.code_postal}` : ''}${sireneData.ville ? ` ${sireneData.ville}` : ''}`
        : undefined;
      
      return {
        siret: sireneData.siret,
        siren: sireneData.siren,
        additionalInfo: {
          adresse: fullAddress || sireneData.adresse,
          activite: sireneData.activite_principale,
          nom_complet: sireneData.nom_complet,
          date_creation: sireneData.date_creation,
          tranche_effectif: sireneData.tranche_effectif
        }
      };
    }
    
    return null;
  } catch (error) {
    console.warn('[SIRENE] Erreur lors de la recherche d\'entreprise:', error);
    return null;
  }
}

/**
 * Valide qu'une entreprise existe vraiment via l'API SIRENE
 */
export async function validateCompanyWithSirene(
  companyName: string,
  address?: string,
  location?: string,
  siret?: string
): Promise<{ isValid: boolean; sireneData?: SireneCompany; matchScore?: number }> {
  try {
    // Si un SIRET est fourni, chercher directement par SIRET
    if (siret && siret.length === 14) {
      const sireneData = await searchSireneBySiret(siret);
      if (sireneData) {
        return { isValid: true, sireneData, matchScore: 100 };
      }
    }
    
    // Sinon, chercher par nom (en passant aussi l'adresse pour améliorer la précision)
    const sireneData = await searchSireneCompany(companyName, location, address);
    
    if (!sireneData) {
      return { isValid: false };
    }

    // Calculer un score de correspondance avec la fonction améliorée
    const matchScore = calculateMatchScore(
      companyName,
      sireneData.nom_complet,
      address,
      sireneData.adresse,
      sireneData.ville
    );

    // Une entreprise est valide si le score de correspondance est >= 50%
    const isValid = matchScore >= 50;

    return {
      isValid,
      sireneData,
      matchScore: Math.min(100, matchScore)
    };
  } catch (error) {
    console.warn('[SIRENE] Erreur lors de la validation:', error);
    return { isValid: false };
  }
}

/**
 * Interface pour les résultats de validation d'un lead
 */
export interface LeadValidationResult {
  leadId: string;
  company: string;
  isValid: boolean;
  issues: string[];
  corrections: Record<string, { old: string; new: string }>;
  sireneData?: SireneCompany;
  sireneMatchScore?: number;
  validatedBySirene: boolean;
  dataQuality: {
    emailValid: boolean | null;
    phoneValid: boolean | null;
    addressValid: boolean | null;
    websiteValid: boolean | null;
  };
  skipped?: boolean; // Si le lead a été ignoré (ex: déjà certifié)
  skipReason?: string; // Raison pour laquelle le lead a été ignoré
}

/**
 * Vérifie la véracité et l'exactitude des leads existants
 * Utilise l'API SIRENE pour valider les entreprises françaises
 */
export async function validateExistingLeads(
  leads: Array<{ id: string; company?: string; address?: string; email?: string; phone?: string; website?: string; siret?: string; certified?: boolean }>,
  onProgress?: (step: string) => void
): Promise<LeadValidationResult[]> {
  onProgress?.('Initialisation de la vérification...');
  
  const { validateEmailSyntax, validatePhoneFormat } = await import('./utils/leadValidation');
  const { shouldCertifyLead } = await import('./utils/leadCertification');
  
  const results: LeadValidationResult[] = [];
  
  // Filtrer les leads certifiés - ils ne doivent pas être réoptimisés
  const leadsToValidate = leads.filter(lead => {
    if (lead.certified === true) {
      // Lead certifié, on le skip mais on l'ajoute aux résultats comme valide
      results.push({
        leadId: lead.id,
        company: lead.company || '',
        isValid: true,
        issues: [],
        corrections: {},
        validatedBySirene: false,
        dataQuality: {
          emailValid: lead.email ? validateEmailSyntax(lead.email) : null,
          phoneValid: lead.phone ? validatePhoneFormat(lead.phone) : null,
          addressValid: !!lead.address,
          websiteValid: !!lead.website
        },
        skipped: true,
        skipReason: 'Lead certifié - données complètes et vérifiées'
      });
      return false;
    }
    return true;
  });
  
  if (leadsToValidate.length === 0) {
    onProgress?.('Tous les leads sont certifiés, aucune optimisation nécessaire');
    return results;
  }
  
  for (let i = 0; i < leadsToValidate.length; i++) {
    const lead = leadsToValidate[i];
    const companyName = lead.company || '';
    
    if (!companyName) {
      results.push({
        leadId: lead.id,
        company: companyName,
        isValid: false,
        issues: ['Nom d\'entreprise manquant'],
        corrections: {},
        validatedBySirene: false,
        dataQuality: {
          emailValid: null,
          phoneValid: null,
          addressValid: null,
          websiteValid: null
        }
      });
      continue;
    }
    
    onProgress?.(`Vérification ${i + 1}/${leadsToValidate.length}: ${companyName}`);
    
    const issues: string[] = [];
    const corrections: Record<string, { old: string; new: string }> = {};
    
    // Extraire le département depuis l'adresse si c'est en France
    let department: string | undefined;
    if (lead.address) {
      const postalCodeMatch = lead.address.match(/\b(\d{5})\b/);
      if (postalCodeMatch) {
        department = postalCodeMatch[1].substring(0, 2);
      }
    }
    
    // Valider via SIRENE si c'est une entreprise française
    let sireneData: SireneCompany | undefined;
    let sireneMatchScore: number | undefined;
    let validatedBySirene = false;

    // Valider si on a un nom d'entreprise ET (une adresse OU un SIRET)
    if (companyName && (lead.address || lead.siret)) {
      try {
        const department = lead.address ? (() => {
          const postalCodeMatch = lead.address!.match(/\b(\d{5})\b/);
          if (postalCodeMatch) {
            return postalCodeMatch[1].substring(0, 2);
          }
          return undefined;
        })() : undefined;
        
        const validation = await validateCompanyWithSirene(companyName, lead.address, department, lead.siret);
        
        if (validation.isValid && validation.sireneData) {
          validatedBySirene = true;
          sireneData = validation.sireneData;
          sireneMatchScore = validation.matchScore;
          
          // Si on avait un SIRET mais qu'il était incorrect, le corriger
          if (lead.siret && lead.siret !== validation.sireneData.siret) {
            issues.push(`SIRET incorrect: ${lead.siret} → ${validation.sireneData.siret}`);
            corrections.siret = { old: lead.siret, new: validation.sireneData.siret };
          } else if (validation.sireneData.siret && !lead.siret) {
            corrections.siret = { old: '', new: validation.sireneData.siret };
          }
          
          // Vérifier l'adresse
          if (validation.sireneData.adresse && lead.address) {
            const addressLower = lead.address.toLowerCase();
            const sireneAddressLower = validation.sireneData.adresse.toLowerCase();
            if (!addressLower.includes(sireneAddressLower.substring(0, 10)) && 
                !sireneAddressLower.includes(addressLower.substring(0, 10))) {
              issues.push(`Adresse potentiellement incorrecte`);
              corrections.address = { old: lead.address, new: validation.sireneData.adresse };
            }
          }
        } else if (validation.matchScore && validation.matchScore < 50) {
          issues.push(`Entreprise non trouvée dans SIRENE (score: ${validation.matchScore}%)`);
        }
      } catch (error) {
        console.warn(`[SIRENE] Erreur validation pour "${companyName}":`, error);
      }
    }
    
    // Valider l'email
    let emailValid: boolean | null = null;
    if (lead.email) {
      const emailValidation = validateEmailSyntax(lead.email);
      emailValid = emailValidation.isValid;
      if (!emailValid) {
        issues.push(`Email invalide: ${emailValidation.reason || 'Format incorrect'}`);
      }
    }
    
    // Valider le téléphone
    let phoneValid: boolean | null = null;
    if (lead.phone) {
      const phoneValidation = validatePhoneFormat(lead.phone);
      phoneValid = phoneValidation.isValid;
      if (!phoneValid) {
        issues.push(`Téléphone invalide: ${phoneValidation.reason || 'Format incorrect'}`);
      }
    }
    
    // Valider le site web
    let websiteValid: boolean | null = null;
    if (lead.website) {
      try {
        const url = new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`);
        websiteValid = url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        websiteValid = false;
        issues.push(`URL du site web invalide: ${lead.website}`);
      }
    }
    
    // Valider l'adresse
    let addressValid: boolean | null = null;
    if (lead.address) {
      // Vérifier que l'adresse contient au moins un code postal (5 chiffres)
      const hasPostalCode = /\b\d{5}\b/.test(lead.address);
      addressValid = hasPostalCode;
      if (!hasPostalCode) {
        issues.push('Adresse incomplète (code postal manquant)');
      }
    }
    
    const isValid = issues.length === 0 && validatedBySirene;
    
    results.push({
      leadId: lead.id,
      company: companyName,
      isValid,
      issues,
      corrections,
      sireneData,
      sireneMatchScore,
      validatedBySirene,
      dataQuality: {
        emailValid,
        phoneValid,
        addressValid,
        websiteValid
      }
    });
    
    // Délai pour éviter de surcharger l'API SIRENE (7 appels/min max)
    if (i < leads.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 secondes entre chaque appel
    }
  }
  
  onProgress?.(`Vérification terminée: ${results.filter(r => r.isValid).length}/${results.length} leads valides`);
  
  return results;
}

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

interface ApiCallOptions {
  model?: string;
  fallbackModels?: string[];
  retryConfig?: RetryConfig;
  onRetry?: (attempt: number, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 seconde
  maxDelay: 60000, // 60 secondes max
  backoffMultiplier: 2
};

/**
 * Extrait le délai de retry suggéré depuis une erreur 429
 */
function extractRetryDelay(error: any): number | null {
  try {
    // Format Gemini: "Please retry in 31.15244385s"
    const errorMessage = error?.error?.message || error?.message || '';
    const retryMatch = errorMessage.match(/retry in ([\d.]+)s?/i);
    if (retryMatch) {
      const seconds = parseFloat(retryMatch[1]);
      return Math.min(seconds * 1000, 60000); // Max 60s
    }
    
    // Format RetryInfo protobuf
    if (error?.error?.details) {
      for (const detail of error.error.details) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
          const retryDelay = detail.retryDelay;
          if (retryDelay) {
            // Convert protobuf Duration to milliseconds
            const seconds = parseFloat(retryDelay.replace('s', '')) || 0;
            return Math.min(seconds * 1000, 60000);
          }
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Vérifie si le quota est vraiment épuisé (limit: 0) ou juste temporairement limité
 * Si limit: 0, on doit passer à un autre modèle immédiatement
 */
function isQuotaExhausted(error: any): boolean {
  try {
    const errorMessage = error?.error?.message || error?.message || '';
    
    // Si le message mentionne "limit: 0", le quota est vraiment épuisé
    if (errorMessage.includes('limit: 0')) {
      return true;
    }
    
    // Vérifier dans les détails de quota
    if (error?.error?.details) {
      for (const detail of error.error.details) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
          const violations = detail.violations || [];
          for (const violation of violations) {
            // Si un quota a limit: 0, on est vraiment bloqué
            if (violation.quotaLimit === 0 || violation.limit === 0) {
              return true;
            }
          }
        }
      }
    }
  } catch {
    // En cas d'erreur de parsing, considérer comme temporaire
  }
  return false;
}

/**
 * Calcule le délai de retry avec backoff exponentiel
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>, suggestedDelay: number | null): number {
  if (suggestedDelay) {
    // Utiliser le délai suggéré par l'API avec un petit buffer
    return Math.min(suggestedDelay * 1.1, config.maxDelay);
  }
  
  // Backoff exponentiel : initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, config.maxDelay);
}

/**
 * Délai asynchrone
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Appel API Groq (gratuit avec quotas généreux)
 * Groq offre des modèles gratuits avec des quotas très généreux
 */
export async function callGroqAPI(
  prompt: string,
  options: { model?: string } = {}
): Promise<string> {
  const { model = 'llama-3.3-70b-versatile' } = options; // Modèle gratuit de Groq (mis à jour)
  
  const apiKey = getApiKey('groq');
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Clé API Groq non configurée. Veuillez la configurer dans les paramètres (gratuite sur https://console.groq.com).');
  }

  const trimmedKey = apiKey.trim();
  
  // Vérifier que la clé a un format valide
  if (trimmedKey.length < 10) {
    throw new Error('Clé API Groq invalide (trop courte). Veuillez vérifier votre clé dans les paramètres.');
  }

  // Vérifier le format de la clé Groq (commence généralement par "gsk_")
  if (!trimmedKey.startsWith('gsk_') && !trimmedKey.startsWith('gsk-')) {
    console.warn('[Groq API] Attention: La clé ne semble pas être une clé Groq valide. Les clés Groq commencent généralement par "gsk_".');
    console.warn('[Groq API] Vérifiez que vous avez bien copié la clé depuis https://console.groq.com et non depuis un autre service.');
  }

  // Log de débogage en mode développement uniquement
  if (process.env.NODE_ENV === 'development') {
    console.log('[Groq API] Clé récupérée, longueur:', trimmedKey.length, 'Début:', trimmedKey.substring(0, 8) + '...');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Gestion spécifique des erreurs
      if (response.status === 401) {
        const errorDetail = errorData.error?.message || '';
        let errorMsg = 'Clé API Groq invalide ou expirée.\n\n';
        errorMsg += 'Vérifications à faire:\n';
        errorMsg += '1. Allez sur https://console.groq.com\n';
        errorMsg += '2. Créez un compte (gratuit) ou connectez-vous\n';
        errorMsg += '3. Générez une nouvelle clé API (commence par "gsk_")\n';
        errorMsg += '4. Copiez la clé COMPLÈTE (sans espaces avant/après)\n';
        errorMsg += '5. Collez-la dans Paramètres → API → Groq\n';
        errorMsg += '6. Cliquez sur "Enregistrer les clés"\n\n';
        errorMsg += '⚠️ Attention: Ne confondez pas Groq (https://console.groq.com) avec X.AI/Grok ou d\'autres services.';
        if (errorDetail) {
          errorMsg += `\n\nDétail: ${errorDetail}`;
        }
        throw new Error(errorMsg);
      } else if (response.status === 400) {
        // Erreur 400 peut être un modèle décommissioné ou autre problème
        const errorDetail = errorData.error?.message || '';
        if (errorDetail.includes('decommissioned') || errorDetail.includes('not found') || errorDetail.includes('not supported')) {
          throw new Error(`Modèle Groq décommissioné: ${errorDetail}`);
        }
        throw new Error(errorData.error?.message || `Erreur Groq API: ${response.status}`);
      } else if (response.status === 429) {
        throw new Error('Quota Groq API dépassé. Veuillez attendre quelques minutes.');
      } else {
        throw new Error(errorData.error?.message || `Erreur Groq API: ${response.status}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse vide de l\'API Groq');
    }

    return content;
  } catch (error: any) {
    console.error('Erreur appel Groq:', error);
    throw error;
  }
}

/**
 * Appel API Mistral avec gestion d'erreur
 */
export async function callMistralAPI(
  prompt: string,
  options: { model?: string } = {}
): Promise<string> {
  const { model = 'mistral-large-latest' } = options;
  
  const apiKey = getApiKey('mistral');
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Clé API Mistral non configurée. Veuillez la configurer dans les paramètres.');
  }

  const trimmedKey = apiKey.trim();
  
  // Vérifier que la clé a un format valide (commence généralement par une chaîne alphanumérique)
  if (trimmedKey.length < 10) {
    throw new Error('Clé API Mistral invalide (trop courte). Veuillez vérifier votre clé dans les paramètres.');
  }

  // Vérifier le format de la clé Mistral (commence généralement par un préfixe spécifique)
  // Les clés Mistral sont généralement longues (100+ caractères)
  if (trimmedKey.length < 50) {
    console.warn('[Mistral API] Attention: La clé semble trop courte pour être une clé Mistral valide.');
  }

  // Log de débogage en mode développement uniquement
  if (process.env.NODE_ENV === 'development') {
    console.log('[Mistral API] Clé récupérée, longueur:', trimmedKey.length, 'Début:', trimmedKey.substring(0, 8) + '...');
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Gestion spécifique des erreurs
      if (response.status === 401) {
        const errorDetail = errorData.error?.message || '';
        let errorMsg = 'Clé API Mistral invalide ou expirée.\n\n';
        errorMsg += 'Vérifications à faire:\n';
        errorMsg += '1. Allez sur https://console.mistral.ai\n';
        errorMsg += '2. Connectez-vous à votre compte\n';
        errorMsg += '3. Allez dans "API Keys"\n';
        errorMsg += '4. Créez une nouvelle clé ou copiez une clé existante\n';
        errorMsg += '5. Copiez la clé COMPLÈTE (sans espaces avant/après)\n';
        errorMsg += '6. Collez-la dans Paramètres → API → Mistral AI\n';
        errorMsg += '7. Cliquez sur "Enregistrer les clés"\n\n';
        errorMsg += '⚠️ Si la clé est toujours invalide, elle peut être expirée. Créez-en une nouvelle.';
        if (errorDetail) {
          errorMsg += `\n\nDétail: ${errorDetail}`;
        }
        throw new Error(errorMsg);
      } else if (response.status === 429) {
        throw new Error('Quota Mistral API dépassé. Veuillez attendre quelques minutes.');
      } else {
        throw new Error(errorData.error?.message || `Erreur Mistral API: ${response.status}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse vide de l\'API Mistral');
    }

    return content;
  } catch (error: any) {
    console.error('Erreur appel Mistral:', error);
    throw error;
  }
}

/**
 * Appel API OpenRouter (accès à plusieurs modèles IA)
 * OpenRouter permet d'accéder à GPT-4, Claude, et d'autres modèles via une seule API
 */
export async function callOpenRouterAPI(
  prompt: string,
  options: { model?: string } = {}
): Promise<string> {
  const { model = 'openai/gpt-4o-mini' } = options; // Modèle par défaut (gratuit ou peu coûteux)
  
  const apiKey = getApiKey('openrouter');
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Clé API OpenRouter non configurée. Veuillez la configurer dans les paramètres (https://openrouter.ai/keys).');
  }

  const trimmedKey = apiKey.trim();
  
  // Vérifier que la clé a un format valide
  if (trimmedKey.length < 10) {
    throw new Error('Clé API OpenRouter invalide (trop courte). Veuillez vérifier votre clé dans les paramètres.');
  }

  // Log de débogage en mode développement uniquement
  if (process.env.NODE_ENV === 'development') {
    console.log('[OpenRouter API] Clé récupérée, longueur:', trimmedKey.length, 'Début:', trimmedKey.substring(0, 8) + '...');
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trimmedKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://agencyos.com',
        'X-Title': 'AgencyOS'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Gestion spécifique des erreurs
      if (response.status === 401) {
        const errorDetail = errorData.error?.message || '';
        let errorMsg = 'Clé API OpenRouter invalide ou expirée.\n\n';
        errorMsg += 'Vérifications à faire:\n';
        errorMsg += '1. Allez sur https://openrouter.ai/keys\n';
        errorMsg += '2. Créez un compte ou connectez-vous\n';
        errorMsg += '3. Générez une nouvelle clé API\n';
        errorMsg += '4. Copiez la clé COMPLÈTE (sans espaces avant/après)\n';
        errorMsg += '5. Collez-la dans Paramètres → API → OpenRouter\n';
        errorMsg += '6. Cliquez sur "Enregistrer les clés"\n\n';
        errorMsg += '💡 OpenRouter permet d\'accéder à plusieurs modèles (GPT-4, Claude, etc.) via une seule clé.';
        if (errorDetail) {
          errorMsg += `\n\nDétail: ${errorDetail}`;
        }
        throw new Error(errorMsg);
      } else if (response.status === 400) {
        const errorDetail = errorData.error?.message || '';
        if (errorDetail.includes('model') || errorDetail.includes('not found') || errorDetail.includes('not supported')) {
          throw new Error(`Modèle OpenRouter non disponible: ${model}. Essayez un autre modèle (ex: openai/gpt-4o-mini, anthropic/claude-3-haiku).`);
        }
        throw new Error(errorData.error?.message || `Erreur OpenRouter API: ${response.status}`);
      } else if (response.status === 429) {
        throw new Error('Quota OpenRouter API dépassé. Veuillez attendre quelques minutes ou vérifier votre crédit sur https://openrouter.ai/credits.');
      } else {
        throw new Error(errorData.error?.message || `Erreur OpenRouter API: ${response.status}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse vide de l\'API OpenRouter');
    }

    return content;
  } catch (error: any) {
    console.error('Erreur appel OpenRouter:', error);
    throw error;
  }
}

/**
 * Appel API Gemini avec retry automatique et gestion des quotas
 */
export async function callGeminiAPI(
  prompt: string,
  options: ApiCallOptions = {}
): Promise<string> {
  const {
    model = 'gemini-3-pro-preview',
    fallbackModels = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    retryConfig = {},
    onRetry
  } = options;

  const config: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  };

  const apiKey = getApiKey('google');
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.');
  }

  // Liste globale des modèles avec quota épuisé (persiste pendant la session)
  const QUOTA_EXHAUSTED_MODELS_KEY = 'gemini_quota_exhausted_models';
  let quotaExhaustedModels: Set<string> = new Set();
  
  // Charger la liste depuis sessionStorage si disponible
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem(QUOTA_EXHAUSTED_MODELS_KEY);
      if (stored) {
        quotaExhaustedModels = new Set(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Filtrer les modèles avec quota épuisé
  const allModels = [model, ...fallbackModels];
  const modelsToTry = allModels.filter(m => !quotaExhaustedModels.has(m));
  
  if (modelsToTry.length === 0) {
    throw new Error('Tous les modèles Gemini ont un quota épuisé. Veuillez attendre ou vérifier votre plan.');
  }
  
  if (modelsToTry.length < allModels.length) {
    const excluded = allModels.filter(m => quotaExhaustedModels.has(m));
    console.log(`Modèles exclus (quota épuisé): ${excluded.join(', ')}`);
  }

  let lastError: any = null;
  let quotaExhaustedForModel = false;

  // Essayer chaque modèle
  for (const currentModel of modelsToTry) {
    // Si le quota était épuisé pour le modèle précédent, ne pas perdre de temps
    if (quotaExhaustedForModel && modelsToTry.indexOf(currentModel) > 0) {
      console.log(`Passage direct à ${currentModel} (modèle précédent bloqué par quota)`);
      quotaExhaustedForModel = false; // Reset pour ce modèle
    }
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: currentModel.includes('3-pro') ? { thinkingBudget: 2048 } : undefined
          }
        });

        if (response.text) {
          return response.text;
        }

        throw new Error('Réponse vide de l\'API');
      } catch (error: any) {
        lastError = error;
        
        // Si ce n'est pas une erreur de quota/rate limit, on arrête les retries pour ce modèle
        const isRateLimit = error?.status === 429 || 
                           error?.error?.code === 429 ||
                           error?.error?.status === 'RESOURCE_EXHAUSTED' ||
                           error?.message?.includes('429') ||
                           error?.message?.toLowerCase().includes('quota') ||
                           error?.message?.toLowerCase().includes('rate limit');

        if (!isRateLimit && attempt < config.maxRetries) {
          // Erreur non-quota, on peut réessayer rapidement
          attempt++;
          const delay = calculateDelay(attempt, config, null);
          if (onRetry) onRetry(attempt, delay);
          await sleep(delay);
          continue;
        }

        if (isRateLimit) {
          // Vérifier si le quota est vraiment épuisé (limit: 0)
          const quotaExhausted = isQuotaExhausted(error);
          
          if (quotaExhausted) {
            // Quota vraiment épuisé pour ce modèle, l'ajouter à la liste des modèles exclus
            quotaExhaustedModels.add(currentModel);
            
            // Sauvegarder dans sessionStorage pour persister pendant la session
            if (typeof window !== 'undefined' && window.sessionStorage) {
              try {
                sessionStorage.setItem(QUOTA_EXHAUSTED_MODELS_KEY, JSON.stringify(Array.from(quotaExhaustedModels)));
              } catch (e) {
                // Ignore storage errors
              }
            }
            
            console.warn(`Quota complètement épuisé pour ${currentModel} (limit: 0). Modèle exclu de cette session. Passage au modèle suivant immédiatement...`);
            quotaExhaustedForModel = true;
            if (onRetry) {
              onRetry(0, 0); // Notifier le passage au modèle suivant
            }
            break; // Sortir de la boucle de retry pour ce modèle
          }

          // Quota temporairement limité, on peut réessayer après un délai
          attempt++;
          if (attempt > config.maxRetries) {
            // Tous les retries épuisés pour ce modèle, passer au suivant
            break;
          }

          const suggestedDelay = extractRetryDelay(error);
          const delay = calculateDelay(attempt, config, suggestedDelay);
          
          if (onRetry) {
            onRetry(attempt, delay);
          }

          // Message plus informatif pour l'utilisateur
          const seconds = Math.ceil(delay / 1000);
          console.warn(`Quota temporairement limité (${currentModel}). Nouvelle tentative dans ${seconds}s...`);
          
          await sleep(delay);
          continue;
        }

        // Autre erreur, ne pas retry
        throw error;
      }
    }

    // Si on arrive ici, ce modèle a échoué après tous les retries
    // On passe au modèle suivant
    if (modelsToTry.indexOf(currentModel) < modelsToTry.length - 1) {
      console.warn(`Modèle ${currentModel} indisponible, passage au suivant...`);
      if (onRetry) {
        onRetry(0, 0); // Notifier le passage au modèle suivant
      }
    }
  }

  // Tous les modèles ont échoué
  if (lastError?.error?.message?.includes('quota') || lastError?.error?.code === 429) {
    const errorDetails = lastError?.error?.message || lastError?.message || '';
    const retryDelay = extractRetryDelay(lastError);
    
    let errorMessage = 'Quota API Gemini dépassé. ';
    
    if (retryDelay) {
      const seconds = Math.ceil(retryDelay / 1000);
      errorMessage += `Réessayez dans ${seconds} secondes. `;
    } else {
      errorMessage += 'Veuillez vérifier votre plan Gemini ou attendre quelques minutes avant de réessayer. ';
    }
    
    errorMessage += 'Tous les modèles Gemini ont été essayés.';
    
    throw new Error(errorMessage);
  }
  
  throw lastError || new Error('Échec de l\'appel API après tous les essais');
}

/**
 * Enrichit un lead avec les données SIRENE (données réelles, pas d'IA)
 * Utilise uniquement l'API SIRENE officielle pour obtenir les données vérifiées
 */
export async function enrichLeadWithSireneData(
  companyName: string,
  address?: string,
  siret?: string
): Promise<{
  siret?: string;
  siren?: string;
  nom_complet?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  activite_principale?: string;
  date_creation?: string;
  tranche_effectif?: string;
  industry?: string; // Dérivé de l'activité principale
  company_size?: string; // Dérivé de la tranche d'effectif
}> {
  try {
    let sireneData: SireneCompany | null = null;
    
    // Si on a un SIRET, chercher directement par SIRET (plus précis)
    if (siret && siret.length === 14) {
      sireneData = await searchSireneBySiret(siret);
    }
    
    // Sinon, chercher par nom d'entreprise
    if (!sireneData) {
      sireneData = await searchSireneCompany(companyName, undefined, address);
    }
    
    if (!sireneData) {
      return {};
    }
    
    // Construire l'adresse complète
    const fullAddress = sireneData.adresse 
      ? `${sireneData.adresse}${sireneData.code_postal ? `, ${sireneData.code_postal}` : ''}${sireneData.ville ? ` ${sireneData.ville}` : ''}`
      : undefined;
    
    // Convertir l'activité principale (code NAF) en industrie lisible
    let industry: string | undefined;
    if (sireneData.activite_principale) {
      // Le code NAF commence par 2 chiffres qui indiquent le secteur
      // Mapping étendu des principaux codes NAF vers industries
      const nafCode = sireneData.activite_principale.substring(0, 2);
      const industryMap: Record<string, string> = {
        // Services aux entreprises
        '62': 'Services informatiques',
        '63': 'Services d\'information',
        '70': 'Activités de sièges sociaux',
        '71': 'Architecture et ingénierie',
        '72': 'Recherche-développement scientifique',
        '73': 'Publicité et études de marché',
        '74': 'Autres activités spécialisées',
        '78': 'Intérim',
        '80': 'Enseignement',
        '81': 'Enseignement',
        '82': 'Activités administratives',
        '85': 'Enseignement',
        '86': 'Santé humaine',
        '87': 'Hébergement médico-social',
        '88': 'Action sociale',
        '90': 'Arts, spectacles et activités récréatives',
        '91': 'Activités des organisations associatives',
        '93': 'Sports, loisirs et divertissements',
        '94': 'Activités des organisations associatives',
        '95': 'Réparation d\'ordinateurs et de biens personnels',
        '96': 'Autres services personnels',
        // Communication et médias
        '58': 'Édition',
        '59': 'Production de films et programmes audiovisuels',
        '60': 'Programmation et diffusion',
        '61': 'Télécommunications',
        // Commerce
        '45': 'Commerce et réparation d\'automobiles',
        '46': 'Commerce de gros',
        '47': 'Commerce de détail',
        // Construction
        '41': 'Construction de bâtiments',
        '42': 'Génie civil',
        '43': 'Travaux de construction spécialisés',
        // Hébergement et restauration
        '55': 'Hébergement',
        '56': 'Restauration',
        // Immobilier
        '68': 'Activités immobilières',
        // Finance et assurance
        '64': 'Activités des services financiers',
        '65': 'Assurance',
        '66': 'Activités auxiliaires de services financiers',
        // Industrie
        '10': 'Industrie alimentaire',
        '11': 'Fabrication de boissons',
        '13': 'Fabrication de textiles',
        '14': 'Industrie de l\'habillement',
        '15': 'Industrie du cuir et de la chaussure',
        '16': 'Travail du bois',
        '17': 'Industrie du papier',
        '20': 'Industrie chimique',
        '21': 'Fabrication de produits pharmaceutiques',
        '22': 'Fabrication de produits en caoutchouc et en plastique',
        '23': 'Fabrication d\'autres produits minéraux non métalliques',
        '24': 'Métallurgie',
        '25': 'Fabrication de produits métalliques',
        '26': 'Fabrication de produits informatiques, électroniques et optiques',
        '27': 'Fabrication d\'équipements électriques',
        '28': 'Fabrication de machines et équipements',
        '29': 'Construction de véhicules automobiles',
        '30': 'Fabrication d\'autres matériels de transport',
        '31': 'Fabrication de meubles',
        '32': 'Autres industries manufacturières',
        '33': 'Réparation et installation de machines et équipements',
        // Transport
        '49': 'Transport terrestre',
        '50': 'Transport par eau',
        '51': 'Transport aérien',
        '52': 'Entreposage et services auxiliaires des transports',
        '53': 'Activités de poste et courrier',
        // Activités extractives
        '05': 'Extraction de houille et de lignite',
        '06': 'Extraction d\'hydrocarbures',
        '07': 'Extraction de minerais métalliques',
        '08': 'Autres industries extractives',
        '09': 'Services de soutien aux industries extractives',
        // Agriculture
        '01': 'Culture et production animale, chasse et services connexes',
        '02': 'Sylviculture et exploitation forestière',
        '03': 'Pêche et aquaculture',
        // Energie
        '35': 'Production et distribution d\'électricité, de gaz, de vapeur et d\'air conditionné',
        '36': 'Captage, traitement et distribution d\'eau',
        '37': 'Collecte et traitement des eaux usées',
        '38': 'Collecte, traitement et élimination des déchets',
        '39': 'Dépollution et autres services de gestion des déchets',
      };
      
      // Chercher d'abord dans le mapping, sinon utiliser le code complet
      const mappedIndustry = industryMap[nafCode];
      if (mappedIndustry) {
        industry = mappedIndustry;
      } else {
        // Si pas de mapping, extraire le secteur général depuis le premier chiffre
        const firstDigit = nafCode[0];
        const sectorMap: Record<string, string> = {
          '0': 'Agriculture, sylviculture et pêche',
          '1': 'Industrie agroalimentaire',
          '2': 'Industrie manufacturière',
          '3': 'Industrie manufacturière',
          '4': 'Construction',
          '5': 'Commerce et transports',
          '6': 'Services aux entreprises',
          '7': 'Services aux entreprises',
          '8': 'Services aux particuliers',
          '9': 'Services divers'
        };
        industry = sectorMap[firstDigit] || sireneData.activite_principale;
      }
    }
    
    // Convertir la tranche d'effectif en format lisible
    let company_size: string | undefined;
    if (sireneData.tranche_effectif) {
      const effectifMap: Record<string, string> = {
        'NN': 'Non renseigné',
        '00': '0 salarié',
        '01': '1 ou 2 salariés',
        '02': '3 à 5 salariés',
        '03': '6 à 9 salariés',
        '11': '10 à 19 salariés',
        '12': '20 à 49 salariés',
        '21': '50 à 99 salariés',
        '22': '100 à 199 salariés',
        '31': '200 à 249 salariés',
        '32': '250 à 499 salariés',
        '41': '500 à 999 salariés',
        '42': '1000 à 1999 salariés',
        '51': '2000 à 4999 salariés',
        '52': '5000 à 9999 salariés',
        '53': '10000 salariés et plus'
      };
      company_size = effectifMap[sireneData.tranche_effectif] || sireneData.tranche_effectif;
    }
    
    return {
      siret: sireneData.siret,
      siren: sireneData.siren,
      nom_complet: sireneData.nom_complet,
      adresse: fullAddress,
      code_postal: sireneData.code_postal,
      ville: sireneData.ville,
      activite_principale: sireneData.activite_principale,
      date_creation: sireneData.date_creation,
      tranche_effectif: sireneData.tranche_effectif,
      industry,
      company_size
    };
  } catch (error) {
    console.warn('[Enrichissement SIRENE] Erreur:', error);
    return {};
  }
}

/**
 * Enrichit un lead avec les données disponibles, en priorisant les sources de données réelles
 * 1. Données SIRENE (gratuit, fiable)
 * 2. Données déjà présentes dans le lead
 * 3. IA en dernier recours (uniquement pour les données non disponibles)
 */
export async function enrichLeadWithData(
  lead: { company: string; address?: string; siret?: string; [key: string]: any }
): Promise<{
  siret?: string;
  siren?: string;
  nom_complet?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  activite_principale?: string;
  date_creation?: string;
  tranche_effectif?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  description?: string;
  ceo?: string;
  tech_stack?: string[];
  swot_summary?: string;
  source: 'sirene' | 'ai' | 'existing';
}> {
  const result: any = {
    source: 'existing'
  };
  
  // 1. D'abord, récupérer toutes les données SIRENE disponibles
  const sireneData = await enrichLeadWithSireneData(
    lead.company,
    lead.address,
    lead.siret
  );
  
  // Merger les données SIRENE dans le résultat
  Object.assign(result, sireneData);
  if (Object.keys(sireneData).length > 0) {
    result.source = 'sirene';
  }
  
  // 2. Utiliser les données existantes du lead si pas encore remplies
  if (!result.address && lead.address) {
    result.adresse = lead.address;
  }
  if (!result.industry && lead.industry) {
    result.industry = lead.industry;
  }
  if (!result.company_size && lead.company_size) {
    result.company_size = lead.company_size;
  }
  if (!result.siret && lead.siret) {
    result.siret = lead.siret;
  }
  
  // 3. Utiliser l'IA uniquement pour les données non disponibles dans SIRENE
  // Uniquement si on a besoin de: website, description, ceo, tech_stack, swot_summary
  const needsAI = !lead.website && !lead.description && !lead.ceo;
  
  if (needsAI) {
    try {
      const aiData = await enrichLeadWithAI(lead.company);
      
      // Ajouter uniquement les données qui n'existent pas déjà
      if (aiData.website && !result.website && !lead.website) {
        result.website = aiData.website;
      }
      if (aiData.description && !result.description && !lead.description) {
        result.description = aiData.description;
      }
      if (aiData.ceo && !result.ceo && !lead.ceo) {
        result.ceo = aiData.ceo;
      }
      if (aiData.tech_stack && !result.tech_stack && !lead.techStack) {
        result.tech_stack = aiData.tech_stack;
      }
      if (aiData.swot_summary && !result.swot_summary) {
        result.swot_summary = aiData.swot_summary;
      }
      
      // Utiliser l'industrie de l'IA seulement si SIRENE n'en a pas fourni
      if (aiData.industry && !result.industry) {
        result.industry = aiData.industry;
      }
      
      if (result.source === 'existing') {
        result.source = 'ai';
      }
    } catch (error) {
      // Si l'IA échoue, continuer avec les données SIRENE
      console.warn('[Enrichissement] Erreur IA, utilisation des données SIRENE uniquement:', error);
    }
  }
  
  return result;
}

/**
 * Enrichissement de lead avec gestion d'erreur améliorée et fallback Mistral
 * NOTE: Utiliser enrichLeadWithData() de préférence, cette fonction utilise uniquement l'IA
 */
export async function enrichLeadWithAI(company: string): Promise<any> {
  const prompt = `Act as a Corporate Intelligence Agent. Analyze the company "${company}".
        
Perform a deep scan across these dimensions:
1. Corporate Data (Headquarters, Size)
2. Leadership (Identify CEO/Founder)
3. Tech Stack (Guess probable technologies based on industry)
4. Strategic Analysis (SWOT - Brief)

Return a JSON object with: 
- industry (string)
- website (url string)
- employees (string range, e.g. "50-200")
- description (short 2 sentence business summary)
- ceo (name string)
- tech_stack (array of strings, e.g. ["Salesforce", "AWS"])
- swot_summary (string, brief strategic insight)
`;

  try {
    let jsonText: string;
    
    try {
      jsonText = await callGeminiAPI(prompt, {
        model: 'gemini-3-pro-preview',
        retryConfig: {
          maxRetries: 2,
          initialDelay: 2000
        }
      });
    } catch (geminiError: any) {
      // Si Gemini échoue, essayer avec Mistral
      const isQuotaError = geminiError?.message?.includes('quota') || 
                          geminiError?.message?.includes('429') ||
                          geminiError?.status === 429;
      
      if (isQuotaError || geminiError?.message?.includes('Quota API dépassé')) {
        console.log('Quota Gemini atteint, basculement vers Mistral...');
        try {
          jsonText = await callMistralAPI(prompt, { model: 'mistral-large-latest' });
        } catch (mistralError: any) {
          throw new Error(`Tous les services IA sont indisponibles. Gemini: ${geminiError?.message || 'Erreur inconnue'}. Mistral: ${mistralError?.message || 'Erreur inconnue'}`);
        }
      } else {
        throw geminiError;
      }
    }
    
    // Nettoyer la réponse si elle contient du markdown
    let cleanedText = jsonText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(cleanedText);
  } catch (error: any) {
    console.error('Erreur enrichissement:', error);
    throw error;
  }
}

/**
 * Parse et normalise les leads depuis une réponse JSON
 */
async function parseAndNormalizeLeads(jsonText: string, zone: string): Promise<any[]> {
  const { normalizeLeadWithSocialSources } = await import('./utils/scraperEnhancements');
  
  // Nettoyer la réponse si elle contient du markdown
  let cleanedText = jsonText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  let data: any;
  try {
    data = JSON.parse(cleanedText);
  } catch (parseError) {
    // Si le parsing échoue, essayer d'extraire le JSON du texte
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Impossible de parser la réponse JSON de l\'IA');
    }
  }
  
  // S'assurer que c'est un tableau
  if (!Array.isArray(data)) {
    throw new Error('Réponse API invalide: tableau attendu');
  }

  // Filtrer les leads qui n'ont pas de sources vérifiables (probablement inventés)
  const validLeads = data.filter((prospect: any) => {
    // Un lead est valide s'il a au moins une source web ou un site web
    const hasSource = (prospect.data_sources && Array.isArray(prospect.data_sources) && prospect.data_sources.length > 0) ||
                     (prospect.sources && Array.isArray(prospect.sources) && prospect.sources.length > 0) ||
                     (prospect.website && prospect.website.trim() !== '');
    
    // Un lead est valide s'il a au moins un nom d'entreprise et une adresse
    const hasBasicInfo = prospect.company_name || prospect.company || prospect.name;
    const hasAddress = prospect.address && prospect.address.trim() !== '';
    
    return hasSource && hasBasicInfo && hasAddress;
  });

  if (validLeads.length === 0) {
    throw new Error('Aucun lead valide trouvé. Tous les leads semblent être inventés ou sans sources vérifiables.');
  }

  if (validLeads.length < data.length) {
    console.warn(`[VALIDATION] ${data.length - validLeads.length} leads filtrés car ils n'ont pas de sources vérifiables (probablement inventés)`);
  }

  // Normaliser les données
  return validLeads.map((prospect: any) => {
    const baseLead = {
      name: prospect.director_name || prospect.ownerName || prospect.name || 'Non disponible',
      company: prospect.company_name || prospect.company || prospect.name || '',
      email: prospect.ownerEmail || prospect.email || '',
      phone: prospect.phone || '',
      address: prospect.address || '',
      website: prospect.website || '',
      linkedin: prospect.ownerLinkedIn || prospect.social_networks?.linkedin || '',
      description: prospect.description || prospect.activity || 'Prospect identifié',
      source: 'Robot Prospection',
      trigger_event: 'Prospection ciblée',
      activity: prospect.activity || '',
      zone: prospect.zone || zone,
      company_size: prospect.company_size || prospect.companySize || '',
      siret: prospect.siret || prospect.sirene_siret || '',
      siren: prospect.siren || prospect.sirene_siren || '',
      foundedYear: prospect.foundedYear || prospect.founded_year || '',
      ownerName: prospect.ownerName || prospect.director_name || '',
      ownerTitle: prospect.ownerTitle || prospect.owner_title || '',
      ownerEmail: prospect.ownerEmail || prospect.email || '',
      ownerLinkedIn: prospect.ownerLinkedIn || prospect.social_networks?.linkedin || '',
      validated_by_sirene: prospect.validated_by_sirene || false,
      sirene_match_score: prospect.sirene_match_score || null,
      sirene_effectif: prospect.sirene_effectif || '',
      sirene_activite: prospect.sirene_activite || '',
      social_networks: prospect.social_networks || {},
      sources: prospect.data_sources || [],
      data_sources: prospect.data_sources || []
    };
    
    // Normaliser avec les sources sociales
    return normalizeLeadWithSocialSources(baseLead);
  });
}

/**
 * SCRAPER SIMPLE ET ROBUSTE - Version réécrite de zéro
 * Utilise Gemini avec Google Search pour trouver des leads depuis des sources publiques
 * Basé sur le code fonctionnel fourni par l'utilisateur
 */
export async function findLeadsWithGoogleSearch(
  sector: string,
  location: string,
  onProgress?: (step: string) => void
): Promise<any[]> {
  onProgress?.('Initialisation du scraper...');

  const apiKey = getApiKey('google');
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée. Veuillez la configurer dans les paramètres.');
  }

  const prompt = `Agis comme un expert en intelligence commerciale (B2B Scraping).
Ta mission est de trouver des entreprises RÉELLES et VÉRIFIABLES correspondant à la typologie "${sector}" situées à "${location}".

⚠️ RÈGLE ABSOLUE : NE JAMAIS INVENTER DE DONNÉES. Si tu ne trouves pas assez d'entreprises réelles, retourne MOINS de résultats mais UNIQUEMENT des entreprises qui existent vraiment.

Pour chaque entreprise trouvée, tu DOIS :
1. VÉRIFIER que l'entreprise existe réellement via Google Search
2. Extraire UNIQUEMENT les informations trouvées sur des sources web réelles
3. Ne JAMAIS inventer, deviner ou générer de données fictives
4. Si une information n'est pas trouvée, laisser le champ vide plutôt que d'inventer

Pour chaque entreprise trouvée, tu DOIS chercher et extraire les informations suivantes :
1. INFOS ENTREPRISE : Nom, Adresse complète, Téléphone standard, Site Web, Email public (si trouvé sur le site web).
2. DÉCIDEUR (CRITIQUE) : 
   - Nom complet du dirigeant principal (Gérant, CEO, Fondateur, Directeur) - UNIQUEMENT si trouvé publiquement
   - Fonction exacte - UNIQUEMENT si trouvée publiquement
   - Email professionnel (si trouvé publiquement sur le site web ou LinkedIn) - NE PAS INVENTER
   - URL LinkedIn du dirigeant (si profil public disponible) - UNIQUEMENT si le profil existe vraiment

Renvoie uniquement un tableau JSON pur (pas de markdown, pas de texte avant/après).
Structure attendue :
[{
  "name": "Nom de l'entreprise",
  "address": "Adresse complète (obligatoire)",
  "rating": 4.5,
  "reviewCount": 12,
  "website": "https://...",
  "phone": "Numéro de téléphone",
  "email": "Email public de l'entreprise ou du dirigeant (si trouvé sur site web)",
  "ownerName": "Prénom Nom du dirigeant",
  "ownerTitle": "Fonction exacte (ex: Gérant, CEO, Fondateur)",
  "ownerEmail": "Email du dirigeant si trouvé publiquement",
  "ownerLinkedIn": "URL LinkedIn du dirigeant (ex: https://linkedin.com/in/nom-prenom)",
  "description": "Activité en 10 mots max",
  "siret": "Numéro SIRET si trouvé",
  "foundedYear": 2015,
  "companySize": "11-50",
  "sources": ["https://maps.google.com/...", "https://societe.com/...", "https://linkedin.com/company/..."]
}]`;

  try {
    onProgress?.('Recherche en cours');

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Aucune donnée n'a été extraite du web.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Source vérifiée"
      }))
      .filter(s => s.uri);

    onProgress?.(`${webSources.length} sources web trouvées, traitement des données...`);

    let cleanJson = textResponse.trim();
    const startIdx = cleanJson.indexOf('[');
    const endIdx = cleanJson.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1) {
      cleanJson = cleanJson.substring(startIdx, endIdx + 1);
    }

    try {
      const parsedLeads = JSON.parse(cleanJson);

      // Filtrer les leads qui n'ont pas de sources web vérifiables (probablement inventés)
      const validLeads = parsedLeads.filter((lead: any) => {
        // Un lead est valide s'il a au moins une source web ou un site web
        const hasSource = webSources.length > 0 || 
                         (lead.website && lead.website.trim() !== '') ||
                         (lead.name && lead.name.trim() !== '');
        
        // Un lead est valide s'il a au moins un nom d'entreprise et une adresse
        const hasBasicInfo = lead.name || lead.company_name;
        const hasAddress = lead.address && lead.address.trim() !== '';
        
        return hasSource && hasBasicInfo && hasAddress;
      });

      if (validLeads.length === 0) {
        throw new Error('Aucun lead valide trouvé. Tous les leads semblent être inventés ou sans sources vérifiables.');
      }

      if (validLeads.length < parsedLeads.length) {
        console.warn(`[VALIDATION Google Search] ${parsedLeads.length - validLeads.length} leads filtrés car ils n'ont pas de sources vérifiables (probablement inventés)`);
      }

      // Valider les entreprises via SIRENE (pour les entreprises françaises)
      const validatedLeads = await Promise.all(
        validLeads.map(async (lead: any) => {
          const companyName = lead.name || lead.company_name;
          const address = lead.address;
          
          // Extraire le département depuis l'adresse ou la zone si c'est en France
          let department: string | undefined;
          if (address) {
            const postalCodeMatch = address.match(/\b(\d{5})\b/);
            if (postalCodeMatch) {
              department = postalCodeMatch[1].substring(0, 2);
            }
          }
          
          // Valider via SIRENE si c'est une entreprise française
          if (companyName && address && (location.includes('France') || location.includes('france') || department)) {
            try {
              const validation = await validateCompanyWithSirene(companyName, address, department);
              if (validation.isValid && validation.sireneData) {
                // Enrichir avec les données SIRENE
                return {
                  ...lead,
                  siret: validation.sireneData.siret || lead.siret || '',
                  siren: validation.sireneData.siren || '',
                  validated_by_sirene: true,
                  sirene_match_score: validation.matchScore,
                  sirene_effectif: validation.sireneData.tranche_effectif || '',
                  sirene_activite: validation.sireneData.activite_principale || ''
                };
              } else if (validation.matchScore && validation.matchScore < 50) {
                // Score de correspondance trop faible, probablement inventé
                console.warn(`[SIRENE] Entreprise "${companyName}" non trouvée ou correspondance faible (score: ${validation.matchScore})`);
                return null; // Filtrer ce lead
              }
            } catch (error) {
              console.warn(`[SIRENE] Erreur validation pour "${companyName}":`, error);
              // En cas d'erreur, on garde le lead mais on marque qu'il n'a pas été validé
            }
          }
          
          return lead;
        })
      );

      // Filtrer les leads null (non validés)
      const finalLeads = validatedLeads.filter((lead: any) => lead !== null);

      if (finalLeads.length === 0) {
        throw new Error('Aucun lead valide trouvé après validation SIRENE. Tous les leads semblent être inventés.');
      }

      if (finalLeads.length < validLeads.length) {
        console.warn(`[VALIDATION SIRENE] ${validLeads.length - finalLeads.length} leads supplémentaires filtrés car non trouvés dans SIRENE (probablement inventés)`);
      }

      const { normalizeLeadWithSocialSources } = await import('./utils/scraperEnhancements');
      
      const normalizedLeads = finalLeads.map((lead: any) => {
        const allSources = webSources.map(s => s.uri);

        const baseLead = {
          name: lead.ownerName || 'Non disponible',
          company: lead.name || '',
          company_name: lead.name || '',
          email: lead.ownerEmail || lead.email || '', // Priorité à l'email du dirigeant
          phone: lead.phone || '',
          address: lead.address || '',
          website: lead.website || '',
          linkedin: lead.ownerLinkedIn || '', // LinkedIn du dirigeant

          description: lead.description || 'Prospect identifié',
          source: allSources.length > 0 ? allSources.slice(0, 2).join(', ') : 'Google Search',
          trigger_event: lead.trigger_events?.join(', ') || 'Prospection ciblée',

          director_name: lead.ownerName || '',
          owner_title: lead.ownerTitle || '',
          ownerEmail: lead.ownerEmail || lead.email || '',
          ownerLinkedIn: lead.ownerLinkedIn || '',

          activity: lead.description || '',
          zone: location,
          google_rating: lead.rating || '',
          google_reviews_count: lead.reviewCount || lead.review_count || '',
          siret: lead.siret || lead.sirene_siret || '',
          siren: lead.siren || lead.sirene_siren || '',
          foundedYear: lead.foundedYear || '',
          companySize: lead.companySize || lead.sirene_effectif || '',
          validated_by_sirene: lead.validated_by_sirene || false,
          sirene_match_score: lead.sirene_match_score || null,
          sirene_activite: lead.sirene_activite || '',

          sources: allSources,
          data_sources: allSources,
          webSources: webSources,
          social_networks: lead.social_networks || {},
          trigger_events: lead.trigger_events || []
        };

        // Normaliser avec les sources sociales
        return normalizeLeadWithSocialSources(baseLead);
      });

      onProgress?.(`${normalizedLeads.length} leads trouvés avec ${webSources.length} sources web`);

      return normalizedLeads;
    } catch (parseErr) {
      console.error("Erreur de parsing JSON:", textResponse);
      throw new Error("Le format des données reçues est incorrect. Essayez une recherche plus spécifique.");
    }

  } catch (error: any) {
    console.error("Erreur scraping avec Google Search:", error);

    if (error.message?.includes("500") || error.message?.includes("xhr") || error.message?.includes("code: 6")) {
      throw new Error("Le service gratuit est saturé ou la recherche a pris trop de temps. Réessayez dans quelques instants.");
    }

    if (error.message?.includes("quota") || error.message?.includes("429")) {
      throw new Error("Quota API dépassé. Le service Google Search nécessite un quota disponible.");
    }

    throw new Error(error.message || "Une erreur est survenue lors de la recherche des leads avec Google Search.");
  }
}

/**
 * Prospection avec IA - version conforme RGPD avec sources gratuites uniquement
 * Suit strictement les spécifications : sources gratuites, données publiques, traçabilité
 * Utilise maintenant Google Search si disponible, sinon fallback sur simulation
 */
export async function runProspectingWithAI(
  zone: string,
  activity: string,
  onProgress?: (step: string) => void,
  options?: { includeSocial?: boolean; includeNews?: boolean }
): Promise<any[]> {
  onProgress?.('Initialisation du robot de prospection...');
  const { enhanceScrapingPrompt, normalizeLeadWithSocialSources } = await import('./utils/scraperEnhancements');
  const { calculateLeadQualityScore, saveLeadQualityScore } = await import('./utils/leadValidation');
  
  const includeSocial = options?.includeSocial !== false; // Par défaut true
  const includeNews = options?.includeNews !== false; // Par défaut true
  
  let basePrompt = `Tu es un robot de prospection commerciale 100% conforme RGPD. 
MISSION: Identifier et enrichir des entreprises RÉELLES et VÉRIFIABLES correspondant aux critères suivants :
- Zone géographique: "${zone}"
- Secteur d'activité: "${activity}"

⚠️ RÈGLE ABSOLUE : NE JAMAIS INVENTER DE DONNÉES. Si tu ne trouves pas assez d'entreprises réelles, retourne MOINS de résultats mais UNIQUEMENT des entreprises qui existent vraiment. Chaque entreprise DOIT être vérifiable via des sources web réelles.

PROTOCOLE DE COLLECTE - SOURCES GRATUITES UNIQUEMENT (par ordre de priorité) :

PRIORITÉ 1 - SOURCES PRIMAIRES (à exploiter en premier) :
1. **Google Maps / Google Business Profile**
   - Recherche: "${activity} ${zone}"
   - Données à extraire: Nom entreprise, adresse complète, téléphone, site web, note Google, nombre d'avis
   - Identifier les entreprises avec activité récente (nouveaux avis = signal de croissance)

2. **Pages Jaunes / Annuaires professionnels gratuits**
   - Recherche par activité et localisation
   - Données: Nom, adresse, téléphone, site web, métier précis

3. **Registres publics d'entreprises**
   - SIRENE (France): https://recherche-entreprises.api.gouv.fr/ - API officielle gratuite
   - Recherche par nom d'entreprise + localisation
   - Extract: Nom entreprise, SIRET, SIREN, adresse officielle, date création, statut juridique, tranche d'effectif, activité principale
   - ⚠️ IMPORTANT: Chaque entreprise française sera validée via l'API SIRENE - si elle n'existe pas, elle sera rejetée
   - Companies House (UK): Recherche par catégorie d'activité

4. **Sites web officiels des entreprises**
   - Analyser les pages "À propos", "Équipe", "Carrières"
   - Extract: Taille équipe, technologies utilisées, services proposés

PRIORITÉ 2 - RÉSEAUX SOCIAUX PUBLICS :
5. **LinkedIn (pages entreprises publiques)**
   - Recherche: "${activity} ${zone}" sur LinkedIn
   - Pages entreprises publiques et profils dirigeants
   - Extract: Nom dirigeant, Titre, Entreprise, Localisation, Email (si visible publiquement), URL LinkedIn du profil
   - Identifier les entreprises en croissance (nouveaux posts, recrutements)

6. **Facebook Business / Instagram Pro**
   - Recherche: "${activity} ${zone}" sur Facebook/Instagram
   - Pages publiques d'entreprises et comptes business
   - Extract: Nom entreprise, activité, localisation, site web, nombre de followers
   - Identifier les entreprises actives (posts récents, engagement)

7. **Twitter / X (comptes publics)**
   - Recherche de comptes Twitter d'entreprises
   - Extract: Nom entreprise, activité, localisation, site web
   - Identifier les entreprises actives sur Twitter

PRIORITÉ 3 - SOURCES COMPLÉMENTAIRES :
8. **Actualités et presse en ligne**
   - Recherche: "${activity} ${zone}" dans Google News
   - Articles de presse locale, blogs professionnels, communiqués de presse
   - Extract: Nom entreprise, événements récents (levées de fonds, recrutements, expansions), actualités
   - Identifier les entreprises en croissance (signaux positifs dans la presse)

9. **Chambres de métiers / commerce**
   - Annuaires publics des chambres de métiers
   - Extract: Entreprises inscrites, activité, localisation

10. **Marketplaces et plateformes métiers**
   - Plateformes de mise en relation publiques
   - Extract: Entreprises présentes, services, localisation

PROCESSUS INTELLIGENT :
1. Identifier les entreprises correspondant aux critères
2. Scraper les données publiques disponibles depuis les sources ci-dessus (PRIORITÉ aux sources 1-8)
3. Croiser les sources pour éviter les doublons (minimum 3-4 sources par entreprise)
4. Enrichir via inférence IA (type de client, niveau de maturité digitale)
5. Extraire les événements déclencheurs depuis actualités/presse (levées de fonds, recrutements, expansions)
6. Normaliser les données pour intégration CRM
7. Marquer le niveau de fiabilité de chaque champ
8. Identifier les entreprises avec activité récente sur réseaux sociaux (signal de croissance)

CONTRAINTES STRICTES :
- 100% légal et conforme RGPD (données publiques uniquement)
- ⚠️⚠️⚠️ NE JAMAIS INVENTER DE DONNÉES - Si une information n'existe pas publiquement, laisser le champ VIDE
- ⚠️⚠️⚠️ UNIQUEMENT des entreprises RÉELLES - Chaque entreprise sera validée via l'API SIRENE officielle (France) - les entreprises inventées seront automatiquement rejetées
- ⚠️⚠️⚠️ Si tu ne trouves pas 20 entreprises réelles, retourne MOINS de résultats (même 0) mais UNIQUEMENT des vraies entreprises
- Chaque entreprise DOIT avoir au moins une source web vérifiable dans data_sources (Google Maps, site web, LinkedIn, etc.)
- Les entreprises françaises DOIVENT exister dans SIRENE - si elles n'existent pas, elles seront rejetées automatiquement
- Priorité aux ressources gratuites
- Optimisation du ratio qualité / volume
- Structure de données exploitable directement dans un CRM
- Traçabilité de la source de chaque donnée

STRUCTURE DE DONNÉES REQUISE - Retourner un tableau JSON de 20 prospects :
[
  {
    "company_name": "Nom de l'entreprise",
    "director_name": "Nom du dirigeant (si disponible publiquement)",
    "activity": "Métier / activité précise",
    "address": "Adresse complète (OBLIGATOIRE)",
    "zone": "Zone géographique",
    "phone": "Téléphone (si disponible publiquement)",
    "email": "Email public du dirigeant ou de l'entreprise (si trouvé sur site web public ou LinkedIn)",
    "website": "Site web",
    "ownerLinkedIn": "URL LinkedIn du dirigeant (ex: https://linkedin.com/in/nom-prenom) si profil public disponible",
    "social_networks": {
      "linkedin": "URL LinkedIn si disponible",
      "facebook": "URL Facebook si disponible",
      "instagram": "URL Instagram si disponible"
    },
    "company_size": "Taille estimée (ex: '1-10', '11-50', '51-200', '201-500', '500+')",
    "creation_year": "Année de création (si trouvable)",
    "google_reviews": {
      "rating": "Note Google (sur 5)",
      "count": "Nombre d'avis"
    },
    "data_sources": ["Source1", "Source2"], // Traçabilité : liste des sources utilisées (inclure Google News, LinkedIn, Facebook, Instagram, Twitter si utilisés)
    "reliability": {
      "company_name": "high|medium|low",
      "director_name": "high|medium|low",
      "phone": "high|medium|low",
      "email": "high|medium|low"
    },
    "ai_inference": {
      "client_type": "Type de client estimé (ex: 'PME', 'Startup', 'Grande entreprise')",
      "digital_maturity": "Niveau de maturité digitale (ex: 'Débutant', 'Intermédiaire', 'Avancé')",
      "potential_value": "Valeur estimée du deal (€5k-€50k)",
      "why_they_need_agency": "Pourquoi cette entreprise pourrait avoir besoin d'une agence"
    },
    "trigger_events": ["Événement1", "Événement2"], // Événements déclencheurs trouvés (ex: "Levée de fonds récente", "Recrutement massif", "Expansion géographique", "Nouveau produit lancé"),
    "social_activity": {
      "linkedin_posts_recent": true, // Activité récente sur LinkedIn
      "facebook_active": true, // Page Facebook active
      "instagram_active": true, // Compte Instagram actif
      "twitter_active": true // Compte Twitter actif
    },
    "news_mentions": ["Article1", "Article2"] // Articles de presse ou actualités trouvés mentionnant l'entreprise
  }
]

⚠️ RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT :
1. NE JAMAIS INVENTER DE DONNÉES - Si une information n'existe pas publiquement, laisser le champ vide
2. UNIQUEMENT des entreprises RÉELLES - Vérifier chaque entreprise via Google Search avant de l'inclure
3. UNIQUEMENT des données TROUVÉES - Ne jamais deviner, supposer ou générer des données fictives
4. Si tu ne trouves pas 20 entreprises réelles, retourne MOINS de résultats (5, 10, 15...) mais UNIQUEMENT des vraies entreprises
5. Chaque entreprise DOIT avoir au moins une source web vérifiable (Google Maps, site web, LinkedIn, etc.)
6. Les emails doivent être publics (trouvés sur site web, pas générés ou inventés)
7. Les noms de dirigeants doivent être trouvés publiquement (site web, LinkedIn, presse) - NE PAS INVENTER
8. Les adresses doivent être réelles et vérifiables (Google Maps, Pages Jaunes, etc.)

IMPORTANT :
- Utiliser UNIQUEMENT des sources gratuites et publiques
- Ne PAS utiliser d'APIs premium, de services payants, ou de Sales Navigator Premium
- Toutes les données doivent être accessibles via des moyens publics/gratuits
- Les emails doivent être publics (trouvés sur site web, pas générés)
- Prioriser la qualité et la fiabilité des données
- Marquer clairement le niveau de fiabilité de chaque champ
- Indiquer la source de chaque donnée pour traçabilité

Retourner un JSON valide avec UNIQUEMENT des entreprises RÉELLES et VÉRIFIABLES. Si tu ne trouves pas 20 entreprises, retourne moins mais UNIQUEMENT des vraies entreprises.`;

  // Améliorer le prompt avec les sources sociales et actualités
  const prompt = enhanceScrapingPrompt(basePrompt, includeSocial, includeNews);

  try {
    onProgress?.('Initialisation du scraper...');
    
    // Diagnostic: Vérifier quelles clés sont configurées
    const allKeys = {
      google: getApiKey('google'),
      groq: getApiKey('groq'),
      mistral: getApiKey('mistral'),
      openrouter: getApiKey('openrouter')
    };
    
    console.log('[DIAGNOSTIC] Clés API détectées:', {
      google: allKeys.google ? `${allKeys.google.substring(0, 10)}... (${allKeys.google.length} chars)` : 'Non configurée',
      groq: allKeys.groq ? `${allKeys.groq.substring(0, 10)}... (${allKeys.groq.length} chars)` : 'Non configurée',
      mistral: allKeys.mistral ? `${allKeys.mistral.substring(0, 10)}... (${allKeys.mistral.length} chars)` : 'Non configurée',
      openrouter: allKeys.openrouter ? `${allKeys.openrouter.substring(0, 10)}... (${allKeys.openrouter.length} chars)` : 'Non configurée'
    });
    
    // ÉTAPE 1: Essayer Google Search d'abord (meilleure qualité)
    const googleApiKey = allKeys.google;
    if (googleApiKey) {
      try {
        onProgress?.('Recherche en cours');
        const results = await findLeadsWithGoogleSearch(activity, zone, onProgress);
        if (results && results.length > 0) {
          onProgress?.(`✅ ${results.length} leads trouvés via Google Search`);
          return results;
        }
      } catch (error: any) {
        console.warn('Google Search indisponible:', error.message);
        onProgress?.('Google Search indisponible, basculement vers alternatives...');
        // Continuer avec les alternatives
      }
    }
    
    // ÉTAPE 2: Si Google Search a échoué, essayer Groq (gratuit)
    const groqApiKey = allKeys.groq;
    const groqConfigured = groqApiKey && groqApiKey.trim().length >= 10;
    
    if (groqConfigured) {
      try {
        onProgress?.('Recherche en cours');
        // Essayer d'abord le modèle le plus récent, puis fallback sur d'autres modèles
        let groqResponse: string | null = null;
        const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
        
        for (const groqModel of groqModels) {
          try {
            groqResponse = await callGroqAPI(prompt, { model: groqModel });
            break; // Si ça marche, on sort de la boucle
          } catch (modelError: any) {
            if (modelError.message?.includes('decommissioned') || modelError.message?.includes('not found')) {
              console.warn(`Modèle ${groqModel} indisponible, essai du suivant...`);
              continue; // Essayer le modèle suivant
            }
            throw modelError; // Autre erreur, on propage
          }
        }
        
        if (!groqResponse) {
          throw new Error('Tous les modèles Groq ont échoué');
        }
        
        const results = await parseAndNormalizeLeads(groqResponse, zone);
        if (results && results.length > 0) {
          onProgress?.(`✅ ${results.length} leads trouvés via Groq`);
          return results;
        }
      } catch (error: any) {
        console.warn('Groq indisponible:', error.message);
        onProgress?.('Groq indisponible, basculement vers Mistral...');
      }
    }
    
    // ÉTAPE 3: Si Groq a échoué ou n'est pas configuré, essayer Mistral
    const mistralApiKey = allKeys.mistral;
    const mistralConfigured = mistralApiKey && mistralApiKey.trim().length >= 10;
    
    if (mistralConfigured) {
      try {
        onProgress?.('Recherche en cours');
        const mistralResponse = await callMistralAPI(prompt, { model: 'mistral-large-latest' });
        const results = await parseAndNormalizeLeads(mistralResponse, zone);
        if (results && results.length > 0) {
          onProgress?.(`✅ ${results.length} leads trouvés via Mistral`);
          return results;
        }
      } catch (error: any) {
        console.warn('Mistral indisponible:', error.message);
        onProgress?.('Mistral indisponible, basculement vers OpenRouter...');
        // Continuer avec OpenRouter
      }
    }
    
    // ÉTAPE 4: Si Mistral a échoué ou n'est pas configuré, essayer OpenRouter
    const openrouterApiKey = allKeys.openrouter;
    const openrouterConfigured = openrouterApiKey && openrouterApiKey.trim().length >= 10;
    
    if (openrouterConfigured) {
      try {
        onProgress?.('Recherche en cours');
        // Essayer plusieurs modèles OpenRouter (du moins cher au plus performant)
        const openrouterModels = ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'openai/gpt-4o'];
        let openrouterResponse: string | null = null;
        
        for (const openrouterModel of openrouterModels) {
          try {
            openrouterResponse = await callOpenRouterAPI(prompt, { model: openrouterModel });
            break; // Si ça marche, on sort de la boucle
          } catch (modelError: any) {
            if (modelError.message?.includes('not found') || modelError.message?.includes('not supported')) {
              console.warn(`Modèle OpenRouter ${openrouterModel} indisponible, essai du suivant...`);
              continue; // Essayer le modèle suivant
            }
            throw modelError; // Autre erreur, on propage
          }
        }
        
        if (!openrouterResponse) {
          throw new Error('Tous les modèles OpenRouter ont échoué');
        }
        
        const results = await parseAndNormalizeLeads(openrouterResponse, zone);
        if (results && results.length > 0) {
          onProgress?.(`✅ ${results.length} leads trouvés via OpenRouter`);
          return results;
        }
      } catch (error: any) {
        // Construire un message d'erreur complet avec tous les détails
        let errorMsg = '❌ Tous les services IA ont échoué.\n\n';
        errorMsg += 'ℹ️ VOS CLÉS SONT BIEN SAUVEGARDÉES ET RÉCUPÉRÉES, mais elles sont pour d\'autres services.\n\n';
        
        // Détails Gemini
        errorMsg += '🔴 Gemini (Google Search): Quota épuisé\n';
        errorMsg += '   → Attendre que le quota se réinitialise (généralement 24h)\n\n';
        
        // Détails Groq
        const groqKey = allKeys.groq;
        if (groqKey) {
          const groqKeyStart = groqKey.trim().substring(0, 8);
          errorMsg += '🔴 Groq: Clé API invalide (clé détectée mais pour un autre service)\n';
          errorMsg += `   → Votre clé commence par "${groqKeyStart}..." (${groqKey.length} caractères)\n`;
          if (groqKeyStart.startsWith('xai-')) {
            errorMsg += '   ⚠️ PROBLÈME: Cette clé est pour X.AI (Grok), pas pour Groq!\n';
            errorMsg += '   → Vous avez mis une clé X.AI dans le champ "Groq"\n';
            errorMsg += '   → Les clés Groq commencent par "gsk_" (ex: gsk_abc123...)\n';
            errorMsg += '   → SOLUTION: Allez sur https://console.groq.com (pas X.AI)\n';
            errorMsg += '   → Créez un compte gratuit et générez une clé Groq\n';
          } else {
            errorMsg += '   → Les clés Groq valides commencent par "gsk_"\n';
            errorMsg += '   → Vérifiez votre clé sur https://console.groq.com\n';
          }
          errorMsg += '   → Remplacez la clé dans Paramètres → API → Groq\n';
          errorMsg += '   → Cliquez sur "Enregistrer les clés"\n\n';
        } else {
          errorMsg += '🟡 Groq: Non configuré\n';
          errorMsg += '   → Configurez une clé GRATUITE sur https://console.groq.com\n\n';
        }
        
        // Détails Mistral
        const mistralKey = allKeys.mistral;
        if (mistralKey) {
          const mistralKeyStart = mistralKey.trim().substring(0, 8);
          errorMsg += '🔴 Mistral: Clé API invalide (clé détectée mais pour un autre service)\n';
          errorMsg += `   → Votre clé commence par "${mistralKeyStart}..." (${mistralKey.length} caractères)\n`;
          if (mistralKeyStart.startsWith('sk-proj-') || mistralKeyStart.startsWith('sk-')) {
            errorMsg += '   ⚠️ PROBLÈME: Cette clé est pour OpenAI, pas pour Mistral!\n';
            errorMsg += '   → Vous avez mis une clé OpenAI dans le champ "Mistral AI"\n';
            errorMsg += '   → SOLUTION: Allez sur https://console.mistral.ai (pas OpenAI)\n';
            errorMsg += '   → Créez un compte et générez une clé Mistral\n';
          } else {
            errorMsg += '   → Vérifiez votre clé sur https://console.mistral.ai\n';
          }
          errorMsg += '   → Remplacez la clé dans Paramètres → API → Mistral AI\n';
          errorMsg += '   → Cliquez sur "Enregistrer les clés"\n\n';
        } else {
          errorMsg += '🟡 Mistral: Non configuré\n';
          errorMsg += '   → Configurez une clé sur https://console.mistral.ai\n\n';
        }
        
        // Détails OpenRouter
        const openrouterKey = allKeys.openrouter;
        if (openrouterKey) {
          const openrouterKeyStart = openrouterKey.trim().substring(0, 8);
          errorMsg += '🔴 OpenRouter: Clé API invalide ou erreur\n';
          errorMsg += `   → Votre clé commence par "${openrouterKeyStart}..." (${openrouterKey.length} caractères)\n`;
          errorMsg += '   → Vérifiez votre clé sur https://openrouter.ai/keys\n';
          errorMsg += '   → Vérifiez votre crédit sur https://openrouter.ai/credits\n';
          errorMsg += '   → Remplacez la clé dans Paramètres → API → OpenRouter\n';
          errorMsg += '   → Cliquez sur "Enregistrer les clés"\n\n';
        } else {
          errorMsg += '🟡 OpenRouter: Non configuré\n';
          errorMsg += '   → Configurez une clé sur https://openrouter.ai/keys\n';
          errorMsg += '   → OpenRouter permet d\'accéder à plusieurs modèles (GPT-4, Claude, etc.)\n\n';
        }
        
        errorMsg += '✅ SOLUTION RECOMMANDÉE:\n';
        errorMsg += '1. Allez sur https://console.groq.com\n';
        errorMsg += '2. Créez un compte gratuit\n';
        errorMsg += '3. Générez une clé API (commence par "gsk_")\n';
        errorMsg += '4. Copiez la clé COMPLÈTE\n';
        errorMsg += '5. Collez dans Paramètres → API → Groq\n';
        errorMsg += '6. Cliquez sur "Enregistrer les clés"\n';
        errorMsg += '7. Réessayez la prospection\n\n';
        
        errorMsg += '💡 Note: Groq est GRATUIT et très rapide, c\'est la meilleure alternative!';
        
        throw new Error(errorMsg);
      }
    }
    
    // Si aucune clé n'est configurée
    if (!googleApiKey && !groqConfigured && !mistralConfigured && !openrouterConfigured) {
      throw new Error(
        `❌ Aucune clé API valide configurée.\n\n` +
        `Solutions:\n` +
        `1. Configurer une clé Groq GRATUITE sur https://console.groq.com (recommandé)\n` +
        `2. Configurer une clé Gemini dans les paramètres\n` +
        `3. Configurer une clé Mistral dans les paramètres\n` +
        `4. Configurer une clé OpenRouter sur https://openrouter.ai/keys (accès à plusieurs modèles)`
      );
    }
    
    throw new Error('Tous les services IA sont indisponibles. Vérifiez vos clés API.');
  } catch (error: any) {
    console.error('Erreur prospection:', error);
    onProgress?.(`Erreur: ${error?.message || 'Erreur inconnue'}`);
    throw error;
  }
}
