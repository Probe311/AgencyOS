/**
 * Utilitaires d'enrichissement des leads avec données géographiques, métiers, catégories
 */

export interface GeographicData {
  country?: string;
  region?: string;
  department?: string;
  city?: string;
  postal_code?: string;
  timezone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BusinessData {
  category?: string; // Catégorie métier principale
  vertical?: string; // Verticale (B2B SaaS, E-commerce, Services, etc.)
  subcategories?: string[]; // Sous-catégories
  naf_code?: string; // Code NAF/APE
  siret_number?: string;
  legal_form?: string; // SARL, SAS, etc.
  vat_number?: string;
  annual_revenue?: number;
  employee_count_range?: string; // "1-10", "11-50", etc.
  languages?: string[];
}

export interface EnrichmentMetadata {
  sources?: string[];
  last_enriched_at?: string;
  enrichment_score?: number;
  data_freshness?: number; // Jours depuis dernière mise à jour
}

/**
 * Catégories métier principales
 */
export const BUSINESS_CATEGORIES = [
  'Agences Marketing & Communication',
  'Startups Tech / SaaS',
  'E-commerce / Retail',
  'Immobilier',
  'Santé & Bien-être',
  'BTP & Construction',
  'Restauration & Hôtellerie',
  'Services Juridiques',
  'Consulting & Audit',
  'Éducation & Formation',
  'Artisans & Services Locaux',
  'Industrie & Manufacturing',
  'Finance & Assurance',
  'Transport & Logistique',
  'Médias & Édition',
  'Énergie & Environnement',
  'Automobile',
  'Luxe & Mode',
  'Tourisme',
  'Autre',
];

/**
 * Verticales business
 */
export const BUSINESS_VERTICALS = [
  'B2B SaaS',
  'B2C E-commerce',
  'B2B Services',
  'B2C Services',
  'Marketplace',
  'Fintech',
  'Healthtech',
  'Edtech',
  'PropTech',
  'FoodTech',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Agency',
  'Autre',
];

/**
 * Formes juridiques
 */
export const LEGAL_FORMS = [
  'SARL',
  'SAS',
  'SA',
  'EURL',
  'SASU',
  'SNC',
  'SCI',
  'Auto-entrepreneur',
  'Association',
  'Autre',
];

/**
 * Extrait les données géographiques depuis une adresse
 */
export async function extractGeographicData(address: string): Promise<GeographicData | null> {
  if (!address || address.trim() === '') return null;

  try {
    // Utiliser Nominatim pour le géocodage
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AgencyOS CRM',
        },
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      const addressData = result.address || {};

      return {
        country: addressData.country || 'France',
        region: addressData.state || addressData.region,
        department: addressData.state_district || addressData.county,
        city: addressData.city || addressData.town || addressData.village,
        postal_code: addressData.postcode,
        timezone: 'Europe/Paris', // Par défaut pour la France, à améliorer
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
      };
    }
  } catch (error) {
    console.error('Erreur géocodage:', error);
  }

  return null;
}

/**
 * Détecte la catégorie métier depuis la description/activité
 */
export function detectBusinessCategory(
  description: string,
  industry?: string,
  activity?: string
): string | null {
  const text = `${description || ''} ${industry || ''} ${activity || ''}`.toLowerCase();

  const categoryMap: Record<string, string> = {
    'marketing': 'Agences Marketing & Communication',
    'communication': 'Agences Marketing & Communication',
    'agence': 'Agences Marketing & Communication',
    'saas': 'Startups Tech / SaaS',
    'tech': 'Startups Tech / SaaS',
    'startup': 'Startups Tech / SaaS',
    'e-commerce': 'E-commerce / Retail',
    'retail': 'E-commerce / Retail',
    'commerce': 'E-commerce / Retail',
    'immobilier': 'Immobilier',
    'santé': 'Santé & Bien-être',
    'bien-être': 'Santé & Bien-être',
    'btp': 'BTP & Construction',
    'construction': 'BTP & Construction',
    'restauration': 'Restauration & Hôtellerie',
    'hôtellerie': 'Restauration & Hôtellerie',
    'juridique': 'Services Juridiques',
    'avocat': 'Services Juridiques',
    'consulting': 'Consulting & Audit',
    'audit': 'Consulting & Audit',
    'éducation': 'Éducation & Formation',
    'formation': 'Éducation & Formation',
    'artisan': 'Artisans & Services Locaux',
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (text.includes(keyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Détecte la verticale business
 */
export function detectBusinessVertical(
  description: string,
  category?: string,
  companySize?: string
): string | null {
  const text = `${description || ''} ${category || ''}`.toLowerCase();

  if (text.includes('saas') || text.includes('software')) return 'B2B SaaS';
  if (text.includes('e-commerce') || text.includes('ecommerce')) return 'B2C E-commerce';
  if (text.includes('marketplace')) return 'Marketplace';
  if (text.includes('fintech') || text.includes('finance')) return 'Fintech';
  if (text.includes('health') || text.includes('santé')) return 'Healthtech';
  if (text.includes('education') || text.includes('éducation')) return 'Edtech';
  if (text.includes('immobilier') || text.includes('real estate')) return 'PropTech';
  if (text.includes('food') || text.includes('restaurant')) return 'FoodTech';
  if (text.includes('retail') || text.includes('commerce')) return 'Retail';
  if (text.includes('manufacturing') || text.includes('industrie')) return 'Manufacturing';
  if (text.includes('consulting') || text.includes('conseil')) return 'Consulting';
  if (text.includes('agence') || text.includes('agency')) return 'Agency';

  // Détection par taille d'entreprise
  if (companySize && (companySize.includes('1-10') || companySize.includes('11-50'))) {
    if (text.includes('b2b') || text.includes('entreprise')) return 'B2B Services';
    return 'B2C Services';
  }

  return null;
}

/**
 * Extrait le code NAF depuis le SIRET ou la description
 */
export function extractNAFCode(siret?: string, description?: string): string | null {
  // Si SIRET fourni, extraire le code APE (positions 10-13)
  if (siret && siret.length >= 14) {
    return siret.substring(9, 13);
  }

  // Sinon, essayer de détecter depuis la description
  // Cette fonction pourrait être améliorée avec une base de données de codes NAF
  return null;
}

/**
 * Enrichit un lead avec toutes les données disponibles
 * Note: Si le lead est certifié, l'enrichissement est ignoré (retourne un objet vide)
 */
export async function enrichLeadData(lead: any): Promise<{
  geographic_data?: GeographicData;
  business_category?: string;
  business_vertical?: string;
  business_subcategories?: string[];
  naf_code?: string;
  enrichment_metadata?: EnrichmentMetadata;
}> {
  // Vérifier si le lead est certifié - si oui, ne pas l'enrichir
  if (lead) {
    try {
      const { isLeadCertifiedForEnrichment } = await import('./leadCertification');
      if (isLeadCertifiedForEnrichment(lead)) {
        // Lead certifié, retourner un objet vide
        return {
          enrichment_metadata: {
            sources: [],
            last_enriched_at: new Date().toISOString(),
            enrichment_score: 100, // Score max car déjà certifié
          }
        };
      }
    } catch (error) {
      // Si l'import échoue, continuer l'enrichissement
      console.warn('Erreur lors de la vérification de certification:', error);
    }
  }

  const enrichment: any = {};

  // Données géographiques
  if (lead.address) {
    const geoData = await extractGeographicData(lead.address);
    if (geoData) {
      enrichment.geographic_data = geoData;
    }
  }

  // Code NAF - utiliser celui fourni directement ou l'extraire du SIRET
  if (lead.activite_principale) {
    // Si l'activité principale (code NAF) est déjà fournie (depuis SIRENE), l'utiliser
    enrichment.naf_code = lead.activite_principale;
  } else if (lead.siret) {
    const nafCode = extractNAFCode(lead.siret, lead.description);
    if (nafCode) {
      enrichment.naf_code = nafCode;
    }
  }

  // Catégorie métier - utiliser l'industrie si disponible (plus fiable que la détection)
  const category = detectBusinessCategory(
    lead.description || '',
    lead.industry,
    lead.activity || lead.activite_principale
  );
  if (category) {
    enrichment.business_category = category;
  }

  // Verticale
  const vertical = detectBusinessVertical(
    lead.description || '',
    category || lead.industry,
    lead.company_size
  );
  if (vertical) {
    enrichment.business_vertical = vertical;
  }

  // Métadonnées d'enrichissement
  enrichment.enrichment_metadata = {
    sources: lead.sources || lead.data_sources || [],
    last_enriched_at: new Date().toISOString(),
    enrichment_score: calculateEnrichmentScore(lead, enrichment),
  };

  return enrichment;
}

/**
 * Calcule le score d'enrichissement (0-100)
 */
function calculateEnrichmentScore(lead: any, enrichment: any): number {
  let score = 0;
  let maxScore = 0;

  // Données géographiques (20 points)
  maxScore += 20;
  if (enrichment.geographic_data) {
    if (enrichment.geographic_data.city) score += 5;
    if (enrichment.geographic_data.department) score += 5;
    if (enrichment.geographic_data.region) score += 5;
    if (enrichment.geographic_data.coordinates) score += 5;
  }

  // Catégorie métier (15 points)
  maxScore += 15;
  if (enrichment.business_category) score += 15;

  // Verticale (15 points)
  maxScore += 15;
  if (enrichment.business_vertical) score += 15;

  // Code NAF (10 points)
  maxScore += 10;
  if (enrichment.naf_code) score += 10;

  // Données entreprise existantes (40 points)
  maxScore += 40;
  if (lead.company) score += 5;
  if (lead.email) score += 5;
  if (lead.phone) score += 5;
  if (lead.website) score += 5;
  if (lead.address) score += 5;
  if (lead.industry) score += 5;
  if (lead.company_size) score += 5;
  if (lead.description) score += 5;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Sauvegarde les données d'enrichissement dans Supabase
 */
export async function saveLeadEnrichment(leadId: string, enrichment: any) {
  const { supabase } = await import('../supabase');
  
  const { error } = await supabase
    .from('leads')
    .update({
      geographic_data: enrichment.geographic_data || null,
      business_category: enrichment.business_category || null,
      business_vertical: enrichment.business_vertical || null,
      business_subcategories: enrichment.business_subcategories || null,
      naf_code: enrichment.naf_code || null,
      enrichment_metadata: enrichment.enrichment_metadata || {},
      last_enriched_at: enrichment.enrichment_metadata?.last_enriched_at || new Date().toISOString(),
      enrichment_score: enrichment.enrichment_metadata?.enrichment_score || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) {
    console.error('Erreur sauvegarde enrichissement:', error);
    throw error;
  }
}

