/**
 * Service de détection automatique d'événements déclencheurs
 * Surveille les leads pour détecter automatiquement les événements importants
 * (recrutement, levée de fonds, expansion, déménagement, etc.)
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../api-keys';

export type TriggerEventType = 
  | 'recruitment' 
  | 'fundraising' 
  | 'expansion' 
  | 'relocation' 
  | 'tech_change' 
  | 'media_event' 
  | 'leadership_change' 
  | 'other';

export type TriggerEventSource = 'scraping' | 'monitoring' | 'ai' | 'manual';

export interface EventDetectionConfig {
  enabled: boolean;
  checkInterval: number; // En heures (24 = quotidien)
  sources: {
    webMonitoring: boolean;      // Monitoring web (Google News, actualités)
    scraping: boolean;            // Scraping périodique des sites
    aiAnalysis: boolean;          // Analyse IA des données
    socialMedia: boolean;         // Surveillance réseaux sociaux
  };
  eventTypes: TriggerEventType[]; // Types d'événements à détecter
  leadFilters?: {
    lifecycleStages?: string[];   // Limiter aux leads à certaines étapes
    minScore?: number;            // Score minimum
    tags?: string[];              // Tags requis
  };
}

export interface DetectedEvent {
  leadId: string;
  eventType: TriggerEventType;
  title: string;
  description?: string;
  date?: string;
  source: TriggerEventSource;
  sourceUrl?: string;
  confidenceScore: number;
  isPositive: boolean;
  rawData: Record<string, any>; // Données brutes de la détection
}

const DEFAULT_CONFIG: EventDetectionConfig = {
  enabled: true,
  checkInterval: 24, // Quotidien
  sources: {
    webMonitoring: true,
    scraping: false,
    aiAnalysis: true,
    socialMedia: false, // Nécessite intégration APIs Social
  },
  eventTypes: [
    'recruitment',
    'fundraising',
    'expansion',
    'relocation',
    'tech_change',
    'media_event',
    'leadership_change',
  ],
};

/**
 * Détecte automatiquement les événements déclencheurs pour un lead
 */
export async function detectTriggerEventsForLead(
  leadId: string,
  config: Partial<EventDetectionConfig> = {}
): Promise<DetectedEvent[]> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead ${leadId} introuvable`);
    }

    const detectedEvents: DetectedEvent[] = [];

    // 1. Vérifier les filtres
    if (finalConfig.leadFilters) {
      const filters = finalConfig.leadFilters;
      if (filters.lifecycleStages && !filters.lifecycleStages.includes((lead as any).lifecycle_stage)) {
        return []; // Lead non éligible
      }
      if (filters.minScore && ((lead as any).quality_score || 0) < filters.minScore) {
        return []; // Score trop faible
      }
      if (filters.tags && filters.tags.length > 0) {
        const leadTags = (lead as any).tags || [];
        if (!filters.tags.some(tag => leadTags.includes(tag))) {
          return []; // Tags requis non présents
        }
      }
    }

    // 2. Détection via monitoring web (Google News, actualités)
    if (finalConfig.sources.webMonitoring) {
      const webEvents = await detectEventsFromWebMonitoring(lead);
      detectedEvents.push(...webEvents);
    }

    // 3. Détection via scraping périodique (si configuré)
    if (finalConfig.sources.scraping) {
      const scrapingEvents = await detectEventsFromScraping(lead);
      detectedEvents.push(...scrapingEvents);
    }

    // 4. Détection via analyse IA
    if (finalConfig.sources.aiAnalysis) {
      const aiEvents = await detectEventsFromAIAnalysis(lead);
      detectedEvents.push(...aiEvents);
    }

    // 5. Détection via réseaux sociaux (si configuré)
    if (finalConfig.sources.socialMedia) {
      const socialEvents = await detectEventsFromSocialMedia(lead);
      detectedEvents.push(...socialEvents);
    }

    // Filtrer par types d'événements demandés
    const filteredEvents = detectedEvents.filter(event =>
      finalConfig.eventTypes.includes(event.eventType)
    );

    logInfo(`Détection événements pour lead ${leadId}: ${filteredEvents.length} événement(s) détecté(s)`);
    return filteredEvents;
  } catch (err) {
    logError(`Erreur détection événements pour lead ${leadId}:`, err);
    throw err;
  }
}

/**
 * Détecte les événements via monitoring web (Google News, actualités)
 */
async function detectEventsFromWebMonitoring(lead: any): Promise<DetectedEvent[]> {
  try {
    const events: DetectedEvent[] = [];
    const companyName = lead.company || lead.name;

    if (!companyName) {
      return events;
    }

    // Recherche Google News (via API Google Search ou scraping)
    // Pour l'instant, on utilise une recherche basée sur les mots-clés dans les sources existantes
    const metadata = lead.metadata || {};
    const sources = lead.sources || lead.data_sources || metadata.webSources || [];
    const description = lead.description || '';

    // Analyser les sources et descriptions pour détecter des événements
    const allText = [
      ...sources.map((s: string) => String(s)),
      description,
      metadata.aiDescription || '',
      metadata.swotAnalysis || '',
    ].join(' ').toLowerCase();

    // Détecter recrutement
    const recruitmentKeywords = ['recrutement', 'embauche', 'recrute', 'poste ouvert', 'job opening', 'carrière', 'emploi', 'hiring'];
    if (recruitmentKeywords.some(kw => allText.includes(kw))) {
      events.push({
        leadId: lead.id,
        eventType: 'recruitment',
        title: 'Recrutement détecté',
        description: `Indicateurs de recrutement détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 70,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: recruitmentKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    // Détecter levée de fonds
    const fundraisingKeywords = ['levée de fonds', 'funding', 'investissement', 'financement', 'série a', 'série b', 'round', 'capital'];
    if (fundraisingKeywords.some(kw => allText.includes(kw))) {
      events.push({
        leadId: lead.id,
        eventType: 'fundraising',
        title: 'Levée de fonds détectée',
        description: `Indicateurs de levée de fonds détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 75,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: fundraisingKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    // Détecter expansion
    const expansionKeywords = ['expansion', 'ouverture', 'nouveau bureau', 'nouvelle région', 'international', 'nouveau site', 'croissance'];
    if (expansionKeywords.some(kw => allText.includes(kw))) {
      events.push({
        leadId: lead.id,
        eventType: 'expansion',
        title: 'Expansion détectée',
        description: `Indicateurs d'expansion détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 70,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: expansionKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    // Détecter déménagement
    const relocationKeywords = ['déménagement', 'nouvelle adresse', 'nouveau siège', 'relocation', 'nouvelle localisation'];
    if (relocationKeywords.some(kw => allText.includes(kw))) {
      events.push({
        leadId: lead.id,
        eventType: 'relocation',
        title: 'Déménagement détecté',
        description: `Indicateurs de déménagement détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 65,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: relocationKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    // Détecter changement technologique
    const techChangeKeywords = ['migration', 'nouvelle technologie', 'upgrade', 'nouveau système', 'transformation digitale'];
    if (techChangeKeywords.some(kw => allText.includes(kw))) {
      events.push({
        leadId: lead.id,
        eventType: 'tech_change',
        title: 'Changement technologique détecté',
        description: `Indicateurs de changement technologique détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 60,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: techChangeKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    // Détecter événement médiatique
    const mediaKeywords = ['award', 'prix', 'récompense', 'reconnaissance', 'article', 'presse', 'média', 'publication'];
    if (mediaKeywords.some(kw => allText.includes(kw)) && (allText.includes('news') || allText.includes('article'))) {
      events.push({
        leadId: lead.id,
        eventType: 'media_event',
        title: 'Événement médiatique détecté',
        description: `Indicateurs d'événement médiatique détectés pour ${companyName}`,
        source: 'monitoring',
        confidenceScore: 65,
        isPositive: true,
        rawData: { text: allText.substring(0, 500), detectedKeywords: mediaKeywords.filter(kw => allText.includes(kw)) },
      });
    }

    return events;
  } catch (err) {
    logError('Erreur détection événements via monitoring web:', err);
    return [];
  }
}

/**
 * Détecte les événements via scraping périodique
 */
async function detectEventsFromScraping(lead: any): Promise<DetectedEvent[]> {
  // TODO: Implémenter le scraping périodique des sites web
  // Pour l'instant, retourner un tableau vide
  return [];
}

/**
 * Détecte les événements via analyse IA (Gemini)
 */
async function detectEventsFromAIAnalysis(lead: any): Promise<DetectedEvent[]> {
  try {
    const apiKey = getApiKey('google');
    if (!apiKey) {
      logWarn('Clé API Gemini non configurée pour la détection d\'événements IA');
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    const companyName = lead.company || lead.name;
    const description = lead.description || lead.metadata?.aiDescription || '';
    const sources = lead.sources || lead.data_sources || lead.metadata?.webSources || [];

    if (!companyName || (!description && sources.length === 0)) {
      return [];
    }

    const prompt = `Analyse les informations suivantes sur l'entreprise "${companyName}" et détecte si des événements déclencheurs ont eu lieu récemment :

Description: ${description}

Sources: ${sources.join(', ')}

Détecte les événements suivants :
- Recrutement (nouveaux postes, embauches, croissance équipe)
- Levée de fonds (financement, investissement, série A/B/C)
- Expansion (nouveau bureau, nouvelle région, international)
- Déménagement (changement d'adresse, nouveau siège)
- Changement technologique (nouvelle stack, migration, upgrade)
- Événement médiatique (article presse, award, reconnaissance)
- Changement direction (nouveau dirigeant, restructuration)

Génère un JSON avec :
{
  "events": [
    {
      "type": "recruitment" | "fundraising" | "expansion" | "relocation" | "tech_change" | "media_event" | "leadership_change",
      "title": "Titre de l'événement",
      "description": "Description détaillée",
      "confidence": 0-100,
      "isPositive": true/false
    }
  ]
}

Si aucun événement n'est détecté, retourne {"events": []}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    let aiResult: { events?: any[] } = {};
    if (response.text) {
      try {
        aiResult = JSON.parse(response.text);
      } catch (e) {
        logError('Erreur parsing réponse IA détection événements:', e);
        return [];
      }
    }

    const events: DetectedEvent[] = (aiResult.events || []).map((event: any) => ({
      leadId: lead.id,
      eventType: event.type || 'other',
      title: event.title || 'Événement détecté',
      description: event.description,
      source: 'ai',
      confidenceScore: event.confidence || 50,
      isPositive: event.isPositive !== false,
      rawData: { aiAnalysis: event },
    }));

    // Enregistrer l'utilisation de l'API
    try {
      const { recordApiUsage } = await import('./apiCostTrackingService');
      await recordApiUsage({
        apiProvider: 'gemini',
        serviceType: 'ai_generation',
        requestType: 'event_detection',
        leadId: lead.id,
        customCost: 0.0001,
        success: true,
        metadata: { eventCount: events.length },
      });
    } catch (trackingError) {
      logWarn('Erreur enregistrement coût API détection événements:', trackingError);
    }

    return events;
  } catch (err) {
    logError('Erreur détection événements via IA:', err);
    return [];
  }
}

/**
 * Détecte les événements via réseaux sociaux
 */
async function detectEventsFromSocialMedia(lead: any): Promise<DetectedEvent[]> {
  // TODO: Implémenter la détection via APIs Social Media (Facebook, LinkedIn, Twitter)
  // Nécessite intégration avec les APIs Social Media
  return [];
}

/**
 * Traite les événements détectés (création dans trigger_events via useTriggerEvents)
 */
export async function processDetectedEvents(
  detectedEvents: DetectedEvent[]
): Promise<void> {
  try {
    // Utiliser le hook useTriggerEvents pour créer les événements
    // Note: Les hooks React ne peuvent pas être utilisés directement dans les services
    // On doit créer les événements directement via Supabase

    for (const event of detectedEvents) {
      // Vérifier si l'événement existe déjà (pour éviter les doublons)
      const { data: existingEvent } = await supabase
        .from('trigger_events')
        .select('id')
        .eq('lead_id', event.leadId)
        .eq('event_type', event.eventType)
        .eq('source', event.source)
        .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 derniers jours
        .single();

      if (existingEvent) {
        logInfo(`Événement déjà existant pour lead ${event.leadId}, type ${event.eventType}`);
        continue;
      }

      // Récupérer les données actuelles du lead pour dataBefore
      const { data: lead } = await supabase
        .from('leads')
        .select('lifecycle_stage, quality_score, temperature, tags')
        .eq('id', event.leadId)
        .single();

      const dataBefore = {
        lifecycleStage: lead?.lifecycle_stage,
        qualityScore: lead?.quality_score,
        temperature: lead?.temperature,
        tags: lead?.tags || [],
      };

      // Créer l'événement dans trigger_events
      const { error: insertError } = await supabase
        .from('trigger_events')
        .insert({
          lead_id: event.leadId,
          event_type: event.eventType,
          event_title: event.title,
          event_description: event.description,
          event_date: event.date || new Date().toISOString(),
          source: event.source,
          source_url: event.sourceUrl,
          confidence_score: event.confidenceScore,
          is_positive: event.isPositive,
          data_before: dataBefore,
          data_after: {},
          processed: false,
          metadata: event.rawData,
        });

      if (insertError) {
        logError(`Erreur création événement déclencheur pour lead ${event.leadId}:`, insertError);
      } else {
        logInfo(`Événement déclencheur créé pour lead ${event.leadId}: ${event.eventType}`);
      }
    }
  } catch (err) {
    logError('Erreur traitement événements détectés:', err);
    throw err;
  }
}

/**
 * Détecte automatiquement les événements pour tous les leads éligibles
 */
export async function detectTriggerEventsForAllLeads(
  config: Partial<EventDetectionConfig> = {},
  batchSize: number = 50
): Promise<{ processed: number; eventsDetected: number; errors: number }> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    if (!finalConfig.enabled) {
      logInfo('Détection automatique d\'événements désactivée');
      return { processed: 0, eventsDetected: 0, errors: 0 };
    }

    let processed = 0;
    let eventsDetected = 0;
    let errors = 0;
    let offset = 0;

    while (true) {
      // Construire la requête avec filtres
      let query = supabase
        .from('leads')
        .select('*')
        .not('lifecycle_stage', 'eq', 'Client')
        .not('lifecycle_stage', 'eq', 'Perdu');

      if (finalConfig.leadFilters?.minScore) {
        query = query.gte('quality_score', finalConfig.leadFilters.minScore);
      }

      const { data: leads, error: fetchError } = await query
        .range(offset, offset + batchSize - 1);

      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) break;

      // Détecter les événements pour chaque lead
      for (const lead of leads) {
        try {
          const events = await detectTriggerEventsForLead(lead.id, finalConfig);
          if (events.length > 0) {
            await processDetectedEvents(events);
            eventsDetected += events.length;
          }
          processed++;
        } catch (err) {
          logWarn(`Erreur détection événements pour lead ${lead.id}:`, err);
          errors++;
        }
      }

      offset += batchSize;

      // Limiter à 500 leads pour éviter les traitements trop longs
      if (offset >= 500) break;
    }

    logInfo(`Détection automatique terminée : ${processed} leads traités, ${eventsDetected} événements détectés, ${errors} erreurs`);
    return { processed, eventsDetected, errors };
  } catch (err) {
    logError('Erreur détection automatique événements pour tous les leads:', err);
    throw err;
  }
}

/**
 * Vérifie si la détection automatique doit être exécutée (selon l'intervalle)
 */
export async function shouldRunAutoDetection(
  config: Partial<EventDetectionConfig> = {}
): Promise<boolean> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    if (!finalConfig.enabled) {
      return false;
    }

    // Vérifier la dernière exécution dans les métadonnées
    const { data: settings } = await supabase
      .from('settings')
      .select('metadata')
      .eq('key', 'trigger_event_auto_detection')
      .single();

    const lastRun = settings?.metadata?.lastRun;
    if (!lastRun) {
      return true; // Première exécution
    }

    const hoursSinceLastRun = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= finalConfig.checkInterval;
  } catch (err) {
    logError('Erreur vérification exécution auto-détection:', err);
    return false;
  }
}

/**
 * Planifie la détection automatique (à appeler périodiquement)
 */
export async function scheduleAutoDetection(
  config: Partial<EventDetectionConfig> = {}
): Promise<void> {
  try {
    const shouldRun = await shouldRunAutoDetection(config);
    if (!shouldRun) {
      logInfo('Détection automatique : pas encore le moment');
      return;
    }

    logInfo('Démarrage détection automatique d\'événements déclencheurs...');
    const result = await detectTriggerEventsForAllLeads(config);

    // Enregistrer la dernière exécution
    await supabase
      .from('settings')
      .upsert({
        key: 'trigger_event_auto_detection',
        value: JSON.stringify({ enabled: true }),
        metadata: {
          lastRun: new Date().toISOString(),
          lastResult: result,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    logInfo(`Détection automatique terminée : ${result.processed} leads traités, ${result.eventsDetected} événements détectés`);
  } catch (err) {
    logError('Erreur planification détection automatique:', err);
    throw err;
  }
}

