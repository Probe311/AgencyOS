/**
 * Service de configuration du scraping
 * Gère les paramètres de scraping : sources, limites, qualité, filtres
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface ScrapingSourceConfig {
  enabled: boolean;
  priority: number; // Ordre d'utilisation (1 = prioritaire)
  maxResults?: number; // Limite de résultats par source
  enabledFields?: string[]; // Champs à extraire spécifiquement pour cette source
  customParams?: Record<string, any>; // Paramètres spécifiques à la source
}

export interface ScrapingConfig {
  id?: string;
  userId?: string;
  
  // Configuration des sources
  sources: {
    google_maps: ScrapingSourceConfig;
    linkedin: ScrapingSourceConfig;
    sirene: ScrapingSourceConfig;
    website: ScrapingSourceConfig;
    pages_jaunes: ScrapingSourceConfig;
    chambres_commerce: ScrapingSourceConfig;
    social_media: ScrapingSourceConfig;
    news: ScrapingSourceConfig;
  };
  
  // Limites globales
  limits: {
    maxTotalResults: number; // Limite totale de résultats par recherche
    maxResultsPerSource: number; // Limite par défaut par source
    maxExecutionTime: number; // Temps maximum d'exécution en secondes
    maxConcurrentRequests: number; // Nombre de requêtes concurrentes max
  };
  
  // Paramètres de qualité
  quality: {
    minQualityScore: number; // Score minimum requis (0-100)
    minReliabilityScore: number; // Score de fiabilité minimum (0-100)
    requiredFields: string[]; // Champs obligatoires (email, téléphone, etc.)
    preferredFields: string[]; // Champs préférés (améliorent le score)
    enableQualityFiltering: boolean; // Filtrer automatiquement les leads de faible qualité
  };
  
  // Filtres par défaut
  defaultFilters: {
    sectors?: string[]; // Secteurs par défaut
    zones?: string[]; // Zones géographiques par défaut
    minCompanySize?: number; // Taille minimum d'entreprise
    maxCompanySize?: number; // Taille maximum d'entreprise
    countries?: string[]; // Pays par défaut
    excludeKeywords?: string[]; // Mots-clés à exclure
  };
  
  // Personnalisation des champs à extraire
  fieldsToExtract: {
    contact: string[]; // nom, email, téléphone, fonction, etc.
    company: string[]; // nom, secteur, taille, adresse, etc.
    business: string[]; // CA, effectifs, site web, etc.
    social: string[]; // LinkedIn, réseaux sociaux, etc.
    metadata: string[]; // SIRET, SIREN, etc.
  };
  
  // Options avancées
  advanced: {
    enableDuplicateDetection: boolean; // Détection automatique de doublons
    enableAutoEnrichment: boolean; // Enrichissement automatique après scraping
    enableAutoQualification: boolean; // Qualification automatique
    enableAutoAssignment: boolean; // Affectation automatique
    enableAutoProspectingEmail: boolean; // Envoi automatique d'email de prospection
    prospectingEmailTemplateId?: string; // ID du template d'email à utiliser (optionnel)
    prospectingEmailDelay?: number; // Délai avant envoi en minutes (défaut: 0 = immédiat)
    crossSourceValidation: boolean; // Validation croisée entre sources
    minSourcesPerLead: number; // Nombre minimum de sources pour valider un lead
  };
  
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_SCRAPING_CONFIG: ScrapingConfig = {
  sources: {
    google_maps: {
      enabled: true,
      priority: 1,
      maxResults: 50,
      enabledFields: ['name', 'company', 'address', 'phone', 'website', 'rating', 'reviews'],
    },
    linkedin: {
      enabled: true,
      priority: 2,
      maxResults: 30,
      enabledFields: ['name', 'company', 'position', 'linkedin', 'email'],
    },
    sirene: {
      enabled: true,
      priority: 3,
      maxResults: 100,
      enabledFields: ['company', 'siret', 'siren', 'address', 'employees', 'revenue'],
    },
    website: {
      enabled: true,
      priority: 4,
      maxResults: 20,
      enabledFields: ['company', 'website', 'description', 'email', 'phone'],
    },
    pages_jaunes: {
      enabled: true,
      priority: 5,
      maxResults: 50,
      enabledFields: ['company', 'address', 'phone', 'website'],
    },
    chambres_commerce: {
      enabled: false,
      priority: 6,
      maxResults: 100,
      enabledFields: ['company', 'siret', 'siren', 'address', 'sector'],
    },
    social_media: {
      enabled: true,
      priority: 7,
      maxResults: 20,
      enabledFields: ['company', 'social_networks', 'followers'],
    },
    news: {
      enabled: true,
      priority: 8,
      maxResults: 10,
      enabledFields: ['company', 'news', 'events'],
    },
  },
  limits: {
    maxTotalResults: 200,
    maxResultsPerSource: 50,
    maxExecutionTime: 300, // 5 minutes
    maxConcurrentRequests: 5,
  },
  quality: {
    minQualityScore: 50, // Score minimum acceptable
    minReliabilityScore: 60, // Fiabilité minimum
    requiredFields: ['company'], // Au minimum le nom de l'entreprise
    preferredFields: ['email', 'phone', 'address'], // Améliorent le score
    enableQualityFiltering: true,
  },
  defaultFilters: {
    sectors: [],
    zones: [],
    countries: ['FR'], // Par défaut France
    excludeKeywords: [],
  },
  fieldsToExtract: {
    contact: ['name', 'email', 'phone', 'function', 'linkedin'],
    company: ['company', 'sector', 'industry', 'size', 'address', 'website'],
    business: ['revenue', 'employees', 'founded_year', 'description'],
    social: ['linkedin', 'twitter', 'facebook', 'instagram'],
    metadata: ['siret', 'siren', 'naf_code', 'legal_form'],
  },
  advanced: {
    enableDuplicateDetection: true,
    enableAutoEnrichment: true,
    enableAutoQualification: true,
    enableAutoAssignment: true,
    enableAutoProspectingEmail: false, // Désactivé par défaut (nécessite configuration)
    prospectingEmailTemplateId: undefined, // Template à configurer
    prospectingEmailDelay: 0, // Envoi immédiat par défaut
    crossSourceValidation: true,
    minSourcesPerLead: 2, // Au moins 2 sources pour valider
  },
};

/**
 * Récupère la configuration de scraping pour un utilisateur
 */
export async function getScrapingConfig(userId?: string): Promise<ScrapingConfig> {
  try {
    let query = supabase
      .from('scraping_configs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // Récupérer la config de l'utilisateur actuel
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        query = query.eq('user_id', userData.user.id);
      }
    }

    const { data, error } = await query;

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    if (data && data.length > 0) {
      const config = data[0];
      return {
        id: config.id,
        userId: config.user_id,
        sources: config.sources || DEFAULT_SCRAPING_CONFIG.sources,
        limits: config.limits || DEFAULT_SCRAPING_CONFIG.limits,
        quality: config.quality || DEFAULT_SCRAPING_CONFIG.quality,
        defaultFilters: config.default_filters || DEFAULT_SCRAPING_CONFIG.defaultFilters,
        fieldsToExtract: config.fields_to_extract || DEFAULT_SCRAPING_CONFIG.fieldsToExtract,
        advanced: config.advanced || DEFAULT_SCRAPING_CONFIG.advanced,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };
    }

    // Retourner la configuration par défaut si aucune config trouvée
    return DEFAULT_SCRAPING_CONFIG;
  } catch (err) {
    logError('Erreur récupération config scraping:', err);
    // Retourner la config par défaut en cas d'erreur
    return DEFAULT_SCRAPING_CONFIG;
  }
}

/**
 * Sauvegarde la configuration de scraping
 */
export async function saveScrapingConfig(config: Partial<ScrapingConfig>): Promise<ScrapingConfig> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier si une config existe déjà
    const existingConfig = await getScrapingConfig(userId);

    const configData: Record<string, any> = {
      user_id: userId,
      sources: config.sources || existingConfig.sources,
      limits: config.limits || existingConfig.limits,
      quality: config.quality || existingConfig.quality,
      default_filters: config.defaultFilters || existingConfig.defaultFilters,
      fields_to_extract: config.fieldsToExtract || existingConfig.fieldsToExtract,
      advanced: config.advanced || existingConfig.advanced,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existingConfig.id) {
      // Mettre à jour la config existante
      const { data, error } = await supabase
        .from('scraping_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Créer une nouvelle config
      configData.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('scraping_configs')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return {
      id: result.id,
      userId: result.user_id,
      sources: result.sources,
      limits: result.limits,
      quality: result.quality,
      defaultFilters: result.default_filters,
      fieldsToExtract: result.fields_to_extract,
      advanced: result.advanced,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  } catch (err) {
    logError('Erreur sauvegarde config scraping:', err);
    throw err;
  }
}

/**
 * Réinitialise la configuration aux valeurs par défaut
 */
export async function resetScrapingConfigToDefault(userId?: string): Promise<ScrapingConfig> {
  try {
    return await saveScrapingConfig(DEFAULT_SCRAPING_CONFIG);
  } catch (err) {
    logError('Erreur réinitialisation config scraping:', err);
    throw err;
  }
}

/**
 * Récupère les sources activées triées par priorité
 */
export async function getEnabledSources(): Promise<Array<{ source: string; config: ScrapingSourceConfig }>> {
  try {
    const config = await getScrapingConfig();
    const sources = Object.entries(config.sources)
      .filter(([_, sourceConfig]) => sourceConfig.enabled)
      .map(([source, sourceConfig]) => ({
        source,
        config: sourceConfig,
      }))
      .sort((a, b) => (a.config.priority || 0) - (b.config.priority || 0));

    return sources;
  } catch (err) {
    logError('Erreur récupération sources activées:', err);
    return [];
  }
}

/**
 * Vérifie si une source est activée
 */
export async function isSourceEnabled(source: string): Promise<boolean> {
  try {
    const config = await getScrapingConfig();
    const sourceConfig = (config.sources as any)[source];
    return sourceConfig?.enabled || false;
  } catch (err) {
    logError(`Erreur vérification source ${source}:`, err);
    return false;
  }
}

/**
 * Applique les filtres par défaut à une recherche
 */
export async function applyDefaultFilters(filters: Record<string, any>): Promise<Record<string, any>> {
  try {
    const config = await getScrapingConfig();
    const defaultFilters = config.defaultFilters || {};

    return {
      ...filters,
      sectors: filters.sectors || defaultFilters.sectors || [],
      zones: filters.zones || defaultFilters.zones || [],
      countries: filters.countries || defaultFilters.countries || ['FR'],
      excludeKeywords: filters.excludeKeywords || defaultFilters.excludeKeywords || [],
      minCompanySize: filters.minCompanySize ?? defaultFilters.minCompanySize,
      maxCompanySize: filters.maxCompanySize ?? defaultFilters.maxCompanySize,
    };
  } catch (err) {
    logError('Erreur application filtres par défaut:', err);
    return filters;
  }
}

/**
 * Valide un lead selon les critères de qualité configurés
 */
export async function validateLeadQuality(lead: any): Promise<{
  isValid: boolean;
  qualityScore: number;
  missingFields: string[];
  reasons: string[];
}> {
  try {
    const config = await getScrapingConfig();
    const qualityConfig = config.quality || {};

    const missingFields: string[] = [];
    const reasons: string[] = [];

    // Vérifier les champs requis
    const requiredFields = qualityConfig.requiredFields || [];
    requiredFields.forEach(field => {
      if (!lead[field] || lead[field] === '') {
        missingFields.push(field);
      }
    });

    // Calculer le score de qualité (basique)
    let qualityScore = 100;
    
    // Pénaliser les champs manquants
    const preferredFields = qualityConfig.preferredFields || [];
    preferredFields.forEach(field => {
      if (!lead[field] || lead[field] === '') {
        qualityScore -= 10;
      }
    });

    // Utiliser le score existant si disponible
    if (lead.qualityScore !== undefined) {
      qualityScore = lead.qualityScore;
    }

    const isValid = 
      missingFields.length === 0 &&
      qualityScore >= (qualityConfig.minQualityScore || 0);

    if (!isValid) {
      if (missingFields.length > 0) {
        reasons.push(`Champs requis manquants: ${missingFields.join(', ')}`);
      }
      if (qualityScore < (qualityConfig.minQualityScore || 0)) {
        reasons.push(`Score de qualité insuffisant (${qualityScore} < ${qualityConfig.minQualityScore})`);
      }
    }

    return {
      isValid,
      qualityScore,
      missingFields,
      reasons,
    };
  } catch (err) {
    logError('Erreur validation qualité lead:', err);
    // En cas d'erreur, accepter le lead
    return {
      isValid: true,
      qualityScore: 50,
      missingFields: [],
      reasons: [],
    };
  }
}

