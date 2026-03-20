/**
 * Service pour l'enrichissement automatique des leads
 * Supporte l'enrichissement IA et les API tierces (Clearbit, FullContact, Hunter.io, SIRENE)
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { logError, logInfo, logWarn } from '../utils/logger';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../api-keys';
import { enrichLeadData, saveLeadEnrichment } from '../utils/leadEnrichment';

export interface EnrichLeadParams {
  leadId: string;
  enrichmentTypes?: ('ai' | 'clearbit' | 'fullcontact' | 'hunter' | 'sirene' | 'web_scraping')[];
  forceRefresh?: boolean; // Forcer l'enrichissement même si déjà enrichi récemment
  recordActivity?: boolean; // Enregistrer dans timeline
}

export interface EnrichmentResult {
  success: boolean;
  enrichedFields: string[];
  aiInsights?: {
    description?: string;
    swot?: {
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      threats?: string[];
    };
    techStack?: string[];
    industry?: string;
    digitalMaturity?: string;
  };
  apiData?: {
    clearbit?: Record<string, any>;
    fullcontact?: Record<string, any>;
    hunter?: Record<string, any>;
    sirene?: Record<string, any>;
  };
  errors: string[];
}

/**
 * Enrichit un lead automatiquement selon les types spécifiés
 */
export async function enrichLeadAutomated(params: EnrichLeadParams): Promise<EnrichmentResult> {
  try {
    // Récupérer le lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;
    const lead = leadData as Lead;

    // Vérifier si enrichissement récent (sauf si forceRefresh)
    if (!params.forceRefresh && lead.last_enriched_at) {
      const lastEnriched = new Date(lead.last_enriched_at);
      const daysSinceEnrichment = (Date.now() - lastEnriched.getTime()) / (1000 * 60 * 60 * 24);
      
      // Si enrichi il y a moins de 6 mois, ne pas réenrichir
      if (daysSinceEnrichment < 180) {
        logInfo(`Lead ${params.leadId} déjà enrichi récemment (${Math.round(daysSinceEnrichment)} jours)`);
        return {
          success: true,
          enrichedFields: [],
          errors: ['Enrichissement récent, ignoré'],
        };
      }
    }

    const enrichmentTypes = params.enrichmentTypes || ['ai', 'web_scraping'];
    const result: EnrichmentResult = {
      success: true,
      enrichedFields: [],
      errors: [],
    };

    const leadUpdates: Record<string, any> = {};
    
    // Estimer la valeur potentielle du deal si elle n'existe pas
    if (!(lead as any).estimated_value || (lead as any).estimated_value === 0) {
      try {
        const { estimateDealValue } = await import('./dealValueEstimationService');
        const estimatedValue = await estimateDealValue(lead);
        leadUpdates.estimated_value = estimatedValue;
        result.enrichedFields.push('estimated_value');
        logInfo(`Valeur potentielle estimée pour lead ${params.leadId}: ${estimatedValue}€`);
      } catch (err) {
        logWarn(`Erreur estimation valeur deal pour lead ${params.leadId}:`, err);
        result.errors.push('Erreur estimation valeur deal');
      }
    }

    // Calculer le score de propension à acheter
    try {
      const { calculateAndUpdatePropensityScore } = await import('./propensityToBuyScoringService');
      await calculateAndUpdatePropensityScore(params.leadId);
      result.enrichedFields.push('propensity_score');
      logInfo(`Score de propension calculé pour lead ${params.leadId}`);
    } catch (err) {
      logWarn(`Erreur calcul propension pour lead ${params.leadId}:`, err);
      // Ne pas faire échouer l'enrichissement si le calcul de propension échoue
    }

    // Analyser le sentiment des avis Google si disponibles
    try {
      const { analyzeAndUpdateGoogleReviewsSentiment } = await import('./googleReviewsSentimentAnalysisService');
      const metadata = (lead as any).metadata || {};
      if (metadata.googleReviews && Array.isArray(metadata.googleReviews) && metadata.googleReviews.length > 0) {
        await analyzeAndUpdateGoogleReviewsSentiment(params.leadId, metadata.googleReviews);
        result.enrichedFields.push('google_reviews_sentiment');
        logInfo(`Analyse sentiment avis Google effectuée pour lead ${params.leadId}`);
      } else if ((lead as any).google_rating && (lead as any).google_reviews_count) {
        // Analyser même avec juste la note moyenne
        await analyzeAndUpdateGoogleReviewsSentiment(params.leadId);
        result.enrichedFields.push('google_reviews_sentiment');
      }
    } catch (err) {
      logWarn(`Erreur analyse sentiment avis Google pour lead ${params.leadId}:`, err);
      // Ne pas faire échouer l'enrichissement si l'analyse de sentiment échoue
    }

    // 1. Enrichissement IA (toujours disponible)
    if (enrichmentTypes.includes('ai')) {
      try {
        // Déterminer le provider IA utilisé
        const { getApiKey } = await import('../api-keys');
        let aiProvider: 'gemini' | 'groq' | 'mistral' | 'openrouter' = 'gemini';
        if (getApiKey('google')) aiProvider = 'gemini';
        else if (getApiKey('groq')) aiProvider = 'groq';
        else if (getApiKey('mistral')) aiProvider = 'mistral';
        else if (getApiKey('openrouter')) aiProvider = 'openrouter';

        const aiResult = await enrichWithAI(lead);
        if (aiResult.aiInsights) {
          result.aiInsights = aiResult.aiInsights;
          
          if (aiResult.aiInsights.description && !lead.description) {
            leadUpdates.description = aiResult.aiInsights.description;
            result.enrichedFields.push('description');
          }
          
          if (aiResult.aiInsights.industry && !lead.sector) {
            leadUpdates.sector = aiResult.aiInsights.industry;
            result.enrichedFields.push('sector');
          }
        }

        // Enregistrer l'utilisation de l'API IA
        try {
          const { recordApiUsage } = await import('./apiCostTrackingService');
          await recordApiUsage({
            apiProvider: aiProvider,
            serviceType: 'enrichment',
            requestType: 'enrichment',
            leadId: params.leadId,
            success: true,
          });
        } catch (trackingError) {
          logWarn('Erreur enregistrement coût API IA:', trackingError);
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement IA: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logError(errorMsg, error);

        // Enregistrer l'échec dans le suivi des coûts
        try {
          const { recordApiUsage } = await import('./apiCostTrackingService');
          await recordApiUsage({
            apiProvider: aiProvider,
            serviceType: 'enrichment',
            requestType: 'enrichment',
            leadId: params.leadId,
            success: false,
            errorMessage: errorMsg,
          });
        } catch (trackingError) {
          // Ignorer les erreurs de tracking
        }
      }
    }

    // 2. Enrichissement géographique et métier (toujours disponible)
    if (enrichmentTypes.includes('web_scraping')) {
      try {
        const geoEnrichment = await enrichLeadData(lead);
        
        if (geoEnrichment.geographic_data) {
          leadUpdates.geographic_data = geoEnrichment.geographic_data;
          if (geoEnrichment.geographic_data.coordinates) {
            leadUpdates.latitude = geoEnrichment.geographic_data.coordinates.lat;
            leadUpdates.longitude = geoEnrichment.geographic_data.coordinates.lng;
            result.enrichedFields.push('latitude', 'longitude');
          }
        }
        
        if (geoEnrichment.business_category) {
          leadUpdates.business_category = geoEnrichment.business_category;
          result.enrichedFields.push('business_category');
        }
        
        if (geoEnrichment.business_vertical) {
          leadUpdates.business_vertical = geoEnrichment.business_vertical;
          result.enrichedFields.push('business_vertical');
        }
        
        if (geoEnrichment.naf_code) {
          leadUpdates.naf_code = geoEnrichment.naf_code;
          result.enrichedFields.push('naf_code');
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement géographique: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logWarn(errorMsg);
      }
    }

    // 3. API tierces (si clés API configurées)
    if (enrichmentTypes.includes('clearbit')) {
      try {
        const clearbitData = await enrichWithClearbit(lead);
        if (clearbitData) {
          result.apiData = { ...result.apiData, clearbit: clearbitData };
          
          // Mettre à jour les champs manquants
          if (clearbitData.employeeCount && !lead.company_size) {
            leadUpdates.company_size = clearbitData.employeeCount;
            result.enrichedFields.push('company_size');
          }
          if (clearbitData.annualRevenue && !lead.annual_revenue) {
            leadUpdates.annual_revenue = clearbitData.annualRevenue;
            result.enrichedFields.push('annual_revenue');
          }
          if (clearbitData.website && !lead.website) {
            leadUpdates.website = clearbitData.website;
            result.enrichedFields.push('website');
          }
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement Clearbit: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logWarn(errorMsg);
      }
    }

    if (enrichmentTypes.includes('fullcontact')) {
      try {
        const fullcontactData = await enrichWithFullContact(lead);
        if (fullcontactData) {
          result.apiData = { ...result.apiData, fullcontact: fullcontactData };
          
          // Mettre à jour les champs selon données FullContact
          if (fullcontactData.email && !lead.email) {
            leadUpdates.email = fullcontactData.email;
            result.enrichedFields.push('email');
          }
          if (fullcontactData.phone && !lead.phone) {
            leadUpdates.phone = fullcontactData.phone;
            result.enrichedFields.push('phone');
          }
          if (fullcontactData.linkedin && !lead.linkedin) {
            leadUpdates.linkedin = fullcontactData.linkedin;
            result.enrichedFields.push('linkedin');
          }
          if (fullcontactData.company && !lead.company) {
            leadUpdates.company = fullcontactData.company;
            result.enrichedFields.push('company');
          }
          if (fullcontactData.website && !lead.website) {
            leadUpdates.website = fullcontactData.website;
            result.enrichedFields.push('website');
          }
          if (fullcontactData.industry && !lead.sector) {
            leadUpdates.sector = fullcontactData.industry;
            result.enrichedFields.push('sector');
          }
          if (fullcontactData.employeeCount && !lead.company_size) {
            leadUpdates.company_size = fullcontactData.employeeCount;
            result.enrichedFields.push('company_size');
          }
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement FullContact: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logWarn(errorMsg);
      }
    }

    if (enrichmentTypes.includes('hunter')) {
      try {
        const hunterData = await enrichWithHunter(lead);
        if (hunterData) {
          result.apiData = { ...result.apiData, hunter: hunterData };
          
          // Vérifier/valider l'email
          if (hunterData.email && !lead.email) {
            leadUpdates.email = hunterData.email;
            result.enrichedFields.push('email');
          }
          if (hunterData.phone && !lead.phone) {
            leadUpdates.phone = hunterData.phone;
            result.enrichedFields.push('phone');
          }
          if (hunterData.linkedin && !lead.linkedin) {
            leadUpdates.linkedin = hunterData.linkedin;
            result.enrichedFields.push('linkedin');
          }
          if (hunterData.position && !(lead as any).position) {
            leadUpdates.position = hunterData.position;
            result.enrichedFields.push('position');
          }
          // Enregistrer la validité de l'email dans metadata
          if (hunterData.emailValid !== undefined) {
            if (!leadUpdates.metadata) {
              leadUpdates.metadata = (lead as any).metadata || {};
            }
            leadUpdates.metadata.emailValid = hunterData.emailValid;
            leadUpdates.metadata.emailScore = hunterData.emailScore || 0;
          }
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement Hunter: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logWarn(errorMsg);
      }
    }

    if (enrichmentTypes.includes('sirene')) {
      try {
        const sireneData = await enrichWithSIRENE(lead);
        if (sireneData) {
          result.apiData = { ...result.apiData, sirene: sireneData };
          
          if (sireneData.siret && !lead.siret) {
            leadUpdates.siret = sireneData.siret;
            result.enrichedFields.push('siret');
          }
          if (sireneData.activite_principale && !lead.activite_principale) {
            leadUpdates.activite_principale = sireneData.activite_principale;
            result.enrichedFields.push('activite_principale');
          }
          if (sireneData.employee_count && !lead.company_size) {
            leadUpdates.company_size = sireneData.employee_count;
            result.enrichedFields.push('company_size');
          }
        }
      } catch (error) {
        const errorMsg = `Erreur enrichissement SIRENE: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logWarn(errorMsg);
      }
    }

    // Mettre à jour le lead avec toutes les données enrichies
    if (Object.keys(leadUpdates).length > 0) {
      leadUpdates.last_enriched_at = new Date().toISOString();
      leadUpdates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('leads')
        .update(leadUpdates)
        .eq('id', params.leadId);

      if (updateError) throw updateError;

      logInfo(`Lead ${params.leadId} enrichi avec ${result.enrichedFields.length} champs: ${result.enrichedFields.join(', ')}`);
    }

    // Enregistrer dans l'historique
    if (params.recordActivity !== false) {
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: params.leadId,
          activity_type: 'enrichment',
          subject: 'Enrichissement automatique',
          description: `Lead enrichi automatiquement${result.enrichedFields.length > 0 ? `: ${result.enrichedFields.join(', ')}` : ''}${result.errors.length > 0 ? ` (${result.errors.length} erreurs)` : ''}`,
          activity_date: new Date().toISOString(),
          metadata: {
            enrichmentTypes: enrichmentTypes,
            enrichedFields: result.enrichedFields,
            errors: result.errors,
            aiInsights: result.aiInsights,
          },
        });
    }

    result.success = result.errors.length === 0 || result.enrichedFields.length > 0;
    return result;
  } catch (error) {
    logError('Erreur enrichissement lead automatisé:', error);
    throw error;
  }
}

/**
 * Enrichissement avec IA (Gemini)
 */
async function enrichWithAI(lead: Lead): Promise<{ aiInsights?: EnrichmentResult['aiInsights'] }> {
  try {
    const apiKey = getApiKey('google');
    if (!apiKey) {
      throw new Error('Clé API Gemini non configurée');
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyse cette entreprise et génère un enrichissement JSON :
Nom: ${lead.name || 'N/A'}
Entreprise: ${lead.company || 'N/A'}
Email: ${lead.email || 'N/A'}
Site web: ${lead.website || 'N/A'}
Secteur: ${lead.sector || 'N/A'}
Famille: ${lead.family || 'N/A'}
Description: ${lead.description || 'N/A'}

Génère un JSON avec :
- description: Description de l'entreprise (2-3 phrases)
- swot: {strengths: [], weaknesses: [], opportunities: [], threats: []}
- techStack: [] (technologies utilisées si détectées)
- industry: Secteur d'activité
- digitalMaturity: Niveau de maturité digitale (Débutant, Intermédiaire, Avancé, Expert)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    let aiInsights: EnrichmentResult['aiInsights'] = {};
    if (response.text) {
      try {
        aiInsights = JSON.parse(response.text);
      } catch (e) {
        logError('Erreur parsing réponse IA:', e);
      }
    }

    return { aiInsights };
  } catch (error) {
    logError('Erreur enrichissement IA:', error);
    throw error;
  }
}

/**
 * Enrichissement avec Clearbit
 * Documentation: https://dashboard.clearbit.com/docs
 */
async function enrichWithClearbit(lead: Lead): Promise<Record<string, any> | null> {
  const apiKey = getApiKey('clearbit');
  if (!apiKey) {
    logWarn('Clé API Clearbit non configurée');
    return null;
  }

  try {
    // Utiliser le domaine de l'email ou le site web pour l'enrichissement
    const domain = lead.website 
      ? lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : lead.email 
        ? lead.email.split('@')[1]
        : null;

    if (!domain) {
      logWarn('Impossible d\'enrichir avec Clearbit: pas de domaine disponible');
      return null;
    }

    // Appel API Clearbit Company Enrichment
    const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        logWarn(`Clearbit: Aucune donnée trouvée pour le domaine ${domain}`);
        return null;
      }
      if (response.status === 429) {
        logWarn('Clearbit: Quota dépassé');
        throw new Error('Quota Clearbit dépassé');
      }
      throw new Error(`Clearbit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Enregistrer l'utilisation de l'API
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'clearbit',
        serviceType: 'enrichment',
        requestType: 'company_lookup',
        leadId: (lead as any).id,
        success: true,
        customCost: 0.01, // $0.01 par lookup
        metadata: { domain },
      });
    } catch (trackingError) {
      logWarn('Erreur enregistrement coût Clearbit:', trackingError);
    }

    // Extraire les données pertinentes
    return {
      employeeCount: data.employees || data.employeeCount,
      annualRevenue: data.metrics?.annualRevenue,
      website: data.domain || lead.website,
      description: data.description,
      industry: data.category?.industry || data.industry,
      sector: data.category?.sector || data.sector,
      tags: data.tags || [],
      linkedin: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : null,
      twitter: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : null,
      facebook: data.facebook?.handle ? `https://facebook.com/${data.facebook.handle}` : null,
      location: data.geo?.city ? `${data.geo.city}, ${data.geo.state || data.geo.country}` : null,
      foundedYear: data.foundedYear,
      phone: data.phone,
      tech: data.tech || [],
      clearbitData: data, // Données complètes pour référence
    };
  } catch (error) {
    logError('Erreur enrichissement Clearbit:', error);
    
    // Enregistrer l'échec
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'clearbit',
        serviceType: 'enrichment',
        requestType: 'company_lookup',
        leadId: (lead as any).id,
        success: false,
        errorMessage: (error as Error).message,
      });
    } catch (trackingError) {
      // Ignorer les erreurs de tracking
    }
    
    throw error;
  }
}

/**
 * Enrichissement avec FullContact
 * Documentation: https://docs.fullcontact.com/
 */
async function enrichWithFullContact(lead: Lead): Promise<Record<string, any> | null> {
  const apiKey = getApiKey('fullcontact');
  if (!apiKey) {
    logWarn('Clé API FullContact non configurée');
    return null;
  }

  try {
    // FullContact peut enrichir par email ou par nom/entreprise
    let endpoint = '';
    let body: any = {};

    if (lead.email) {
      // Person Enrichment par email
      endpoint = 'https://api.fullcontact.com/v3/person.enrich';
      body = { email: lead.email };
    } else if (lead.company) {
      // Company Enrichment par nom d'entreprise
      endpoint = 'https://api.fullcontact.com/v3/company.enrich';
      body = { name: lead.company };
    } else {
      logWarn('Impossible d\'enrichir avec FullContact: pas d\'email ou d\'entreprise');
      return null;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 404) {
        logWarn('FullContact: Aucune donnée trouvée');
        return null;
      }
      if (response.status === 429) {
        logWarn('FullContact: Quota dépassé');
        throw new Error('Quota FullContact dépassé');
      }
      throw new Error(`FullContact API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Enregistrer l'utilisation de l'API
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'fullcontact',
        serviceType: 'enrichment',
        requestType: lead.email ? 'person_enrichment' : 'company_enrichment',
        leadId: (lead as any).id,
        success: true,
        customCost: lead.email ? 0.02 : 0.015, // $0.02 pour person, $0.015 pour company
      });
    } catch (trackingError) {
      logWarn('Erreur enregistrement coût FullContact:', trackingError);
    }

    // Extraire les données pertinentes
    if (lead.email) {
      // Person enrichment
      return {
        email: data.emails?.[0]?.address || lead.email,
        phone: data.phones?.[0]?.number || lead.phone,
        linkedin: data.socialProfiles?.find((p: any) => p.type === 'linkedin')?.url,
        twitter: data.socialProfiles?.find((p: any) => p.type === 'twitter')?.url,
        facebook: data.socialProfiles?.find((p: any) => p.type === 'facebook')?.url,
        location: data.location || null,
        fullContactData: data,
      };
    } else {
      // Company enrichment
      return {
        company: data.name || lead.company,
        website: data.website || lead.website,
        description: data.description,
        industry: data.category || lead.sector,
        employeeCount: data.employeeCount,
        location: data.location || null,
        linkedin: data.socialProfiles?.find((p: any) => p.type === 'linkedin')?.url,
        twitter: data.socialProfiles?.find((p: any) => p.type === 'twitter')?.url,
        fullContactData: data,
      };
    }
  } catch (error) {
    logError('Erreur enrichissement FullContact:', error);
    
    // Enregistrer l'échec
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'fullcontact',
        serviceType: 'enrichment',
        requestType: lead.email ? 'person_enrichment' : 'company_enrichment',
        leadId: (lead as any).id,
        success: false,
        errorMessage: (error as Error).message,
      });
    } catch (trackingError) {
      // Ignorer les erreurs de tracking
    }
    
    throw error;
  }
}

/**
 * Enrichissement avec Hunter.io
 * Documentation: https://hunter.io/api-documentation
 */
async function enrichWithHunter(lead: Lead): Promise<Record<string, any> | null> {
  const apiKey = getApiKey('hunter');
  if (!apiKey) {
    logWarn('Clé API Hunter.io non configurée');
    return null;
  }

  try {
    let email = lead.email;
    let domain = lead.website 
      ? lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      : lead.email 
        ? lead.email.split('@')[1]
        : null;

    // Si on a un email, on peut le vérifier
    if (email) {
      // Email Verifier
      const verifyResponse = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        
        // Enregistrer l'utilisation de l'API
        try {
          const { recordApiUsage } = await import('./apiCostTrackingService');
          await recordApiUsage({
            apiProvider: 'hunter',
            serviceType: 'email_validation',
            requestType: 'email_verifier',
            leadId: (lead as any).id,
            success: true,
            customCost: 0.0025, // $0.0025 par vérification
            metadata: { 
              result: verifyData.data?.result,
              score: verifyData.data?.score,
            },
          });
        } catch (trackingError) {
          logWarn('Erreur enregistrement coût Hunter (verifier):', trackingError);
        }

        // Si l'email n'est pas valide, ne pas continuer
        if (verifyData.data?.result === 'invalid' || verifyData.data?.result === 'disposable') {
          logWarn(`Hunter.io: Email ${email} invalide ou jetable`);
          return {
            email: email,
            emailValid: false,
            emailScore: verifyData.data?.score || 0,
            emailResult: verifyData.data?.result,
          };
        }
      }
    }

    // Si on a un domaine mais pas d'email, chercher des emails
    if (domain && !email) {
      // Domain Search
      const domainResponse = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (domainResponse.ok) {
        const domainData = await domainResponse.json();
        
        // Enregistrer l'utilisation de l'API
        try {
          const { recordApiUsage } = await import('./apiCostTrackingService');
          await recordApiUsage({
            apiProvider: 'hunter',
            serviceType: 'enrichment',
            requestType: 'domain_search',
            leadId: (lead as any).id,
            success: true,
            customCost: 0.01, // $0.01 par recherche
            metadata: { 
              emailsFound: domainData.data?.emails?.length || 0,
            },
          });
        } catch (trackingError) {
          logWarn('Erreur enregistrement coût Hunter (domain):', trackingError);
        }

        // Prendre le premier email trouvé (généralement le plus pertinent)
        if (domainData.data?.emails && domainData.data.emails.length > 0) {
          const bestEmail = domainData.data.emails[0];
          email = bestEmail.value;
          
          return {
            email: email,
            emailValid: bestEmail.verification?.result === 'valid',
            emailScore: bestEmail.verification?.score || 0,
            emailSources: bestEmail.sources || [],
            firstName: bestEmail.first_name,
            lastName: bestEmail.last_name,
            position: bestEmail.position,
            company: bestEmail.company || lead.company,
            linkedin: bestEmail.linkedin,
            twitter: bestEmail.twitter,
            phone: bestEmail.phone_number || lead.phone,
            hunterData: domainData.data,
          };
        }
      }
    }

    // Si on a un nom et une entreprise, chercher l'email
    if (lead.name && lead.company && !email) {
      const nameParts = lead.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      if (firstName && lastName && domain) {
        // Email Finder
        const findResponse = await fetch(
          `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (findResponse.ok) {
          const findData = await findResponse.json();
          
          // Enregistrer l'utilisation de l'API
          try {
            const { recordApiUsage } = await import('./apiCostTrackingService');
            await recordApiUsage({
              apiProvider: 'hunter',
              serviceType: 'enrichment',
              requestType: 'email_finder',
              leadId: (lead as any).id,
              success: true,
              customCost: 0.01, // $0.01 par recherche
              metadata: { 
                confidence: findData.data?.confidence || 0,
              },
            });
          } catch (trackingError) {
            logWarn('Erreur enregistrement coût Hunter (finder):', trackingError);
          }

          if (findData.data?.email) {
            return {
              email: findData.data.email,
              emailValid: findData.data.verification?.result === 'valid',
              emailScore: findData.data.verification?.score || 0,
              emailConfidence: findData.data.confidence || 0,
              emailSources: findData.data.sources || [],
              linkedin: findData.data.linkedin,
              twitter: findData.data.twitter,
              phone: findData.data.phone_number || lead.phone,
              position: findData.data.position,
              company: findData.data.company || lead.company,
              hunterData: findData.data,
            };
          }
        }
      }
    }

    // Si on a juste un email valide, retourner les infos de vérification
    if (email) {
      return {
        email: email,
        emailValid: true,
      };
    }

    return null;
  } catch (error) {
    logError('Erreur enrichissement Hunter.io:', error);
    
    // Enregistrer l'échec
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'hunter',
        serviceType: 'enrichment',
        requestType: 'email_finder',
        leadId: (lead as any).id,
        success: false,
        errorMessage: (error as Error).message,
      });
    } catch (trackingError) {
      // Ignorer les erreurs de tracking
    }
    
    throw error;
  }
}

/**
 * Enrichissement avec SIRENE (placeholder - nécessite clé API)
 */
async function enrichWithSIRENE(lead: Lead): Promise<Record<string, any> | null> {
  // TODO: Implémenter avec l'API SIRENE
  logWarn('Enrichissement SIRENE non implémenté (nécessite clé API)');
  return null;
}

