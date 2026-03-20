/**
 * Service d'analyse de sentiment sur les avis Google
 * Analyse les avis Google pour déterminer le sentiment global et les tendances
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../api-keys';

export interface GoogleReview {
  id?: string;
  author: string;
  rating: number; // 1-5 étoiles
  text: string;
  date: string;
  helpfulCount?: number;
  language?: string;
}

export interface SentimentAnalysisResult {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -100 à +100 (-100 = très négatif, +100 = très positif, 0 = neutre)
  confidence: number; // 0-100
  aspects: {
    service?: number; // Score sentiment pour le service
    quality?: number; // Score sentiment pour la qualité
    price?: number; // Score sentiment pour le prix
    support?: number; // Score sentiment pour le support
    [key: string]: number | undefined;
  };
  keywords: {
    positive: string[];
    negative: string[];
  };
  summary: string; // Résumé de l'analyse
  reviewCount: number;
  averageRating: number;
  lastAnalyzedAt: string;
}

export interface LeadGoogleReviews {
  leadId: string;
  reviews: GoogleReview[];
  sentimentAnalysis?: SentimentAnalysisResult;
  lastSyncedAt?: string;
}

/**
 * Analyse le sentiment d'une liste d'avis Google
 */
export async function analyzeGoogleReviewsSentiment(
  reviews: GoogleReview[],
  options?: {
    useAI?: boolean;
    language?: string;
  }
): Promise<SentimentAnalysisResult> {
  try {
    if (!reviews || reviews.length === 0) {
      return {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        confidence: 0,
        aspects: {},
        keywords: { positive: [], negative: [] },
        summary: 'Aucun avis disponible',
        reviewCount: 0,
        averageRating: 0,
        lastAnalyzedAt: new Date().toISOString(),
      };
    }

    const useAI = options?.useAI !== false; // Par défaut, utiliser l'IA si disponible

    if (useAI) {
      try {
        return await analyzeSentimentWithAI(reviews, options?.language);
      } catch (aiError) {
        logWarn('Analyse IA échouée, utilisation de la méthode basique:', aiError);
        return analyzeSentimentBasic(reviews);
      }
    } else {
      return analyzeSentimentBasic(reviews);
    }
  } catch (err) {
    logError('Erreur analyse sentiment avis Google:', err);
    throw err;
  }
}

/**
 * Analyse le sentiment avec IA (Gemini)
 */
async function analyzeSentimentWithAI(
  reviews: GoogleReview[],
  language?: string
): Promise<SentimentAnalysisResult> {
  const apiKey = getApiKey('google');
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée pour l\'analyse de sentiment');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Préparer le texte des avis pour l'analyse
  const reviewsText = reviews.map((r, i) => 
    `Avis ${i + 1} (${r.rating}/5): ${r.text}`
  ).join('\n\n');

  const prompt = `Analyse le sentiment de ces avis Google pour une entreprise et génère un JSON structuré :

${reviewsText}

Génère un JSON avec :
- overallSentiment: "positive" | "neutral" | "negative"
- sentimentScore: nombre de -100 à +100 (-100 = très négatif, 100 = très positif, 0 = neutre)
- confidence: nombre de 0 à 100 (confiance dans l'analyse)
- aspects: {
    service: score -100 à +100 (sentiment sur le service),
    quality: score -100 à +100 (sentiment sur la qualité),
    price: score -100 à +100 (sentiment sur le prix),
    support: score -100 à +100 (sentiment sur le support client)
  }
- keywords: {
    positive: ["mot1", "mot2", ...] (mots-clés positifs),
    negative: ["mot1", "mot2", ...] (mots-clés négatifs)
  }
- summary: "Résumé de 2-3 phrases de l'analyse globale du sentiment"

Analyse en français si les avis sont en français, sinon dans la langue des avis.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  let aiResult: Partial<SentimentAnalysisResult> = {};
  if (response.text) {
    try {
      aiResult = JSON.parse(response.text);
    } catch (e) {
      logError('Erreur parsing réponse IA sentiment:', e);
    }
  }

  // Calculer la note moyenne
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Enregistrer l'utilisation de l'API
  try {
    const { recordApiUsage } = await import('./apiCostTrackingService');
    await recordApiUsage({
      apiProvider: 'gemini',
      serviceType: 'ai_generation',
      requestType: 'sentiment_analysis',
      customCost: 0.0001 * reviews.length, // Coût proportionnel au nombre d'avis
      success: true,
      metadata: { reviewCount: reviews.length, language: language || 'fr' },
    });
  } catch (trackingError) {
    logWarn('Erreur enregistrement coût API sentiment:', trackingError);
  }

  return {
    overallSentiment: aiResult.overallSentiment || calculateBasicSentiment(averageRating),
    sentimentScore: aiResult.sentimentScore !== undefined 
      ? aiResult.sentimentScore 
      : calculateSentimentScoreFromRating(averageRating),
    confidence: aiResult.confidence || 80,
    aspects: aiResult.aspects || {},
    keywords: aiResult.keywords || { positive: [], negative: [] },
    summary: aiResult.summary || `Analyse de ${reviews.length} avis avec note moyenne de ${averageRating.toFixed(1)}/5`,
    reviewCount: reviews.length,
    averageRating,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Analyse basique du sentiment (sans IA)
 */
function analyzeSentimentBasic(reviews: GoogleReview[]): SentimentAnalysisResult {
  // Calculer la note moyenne
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Analyser le sentiment basé sur la note moyenne
  const overallSentiment = calculateBasicSentiment(averageRating);
  const sentimentScore = calculateSentimentScoreFromRating(averageRating);

  // Extraire les mots-clés basiques (mots fréquents dans les avis positifs/négatifs)
  const positiveKeywords: string[] = [];
  const negativeKeywords: string[] = [];

  reviews.forEach(review => {
    const words = review.text.toLowerCase().split(/\s+/);
    if (review.rating >= 4) {
      words.forEach(word => {
        if (word.length > 3 && !positiveKeywords.includes(word)) {
          positiveKeywords.push(word);
        }
      });
    } else if (review.rating <= 2) {
      words.forEach(word => {
        if (word.length > 3 && !negativeKeywords.includes(word)) {
          negativeKeywords.push(word);
        }
      });
    }
  });

  // Limiter à 10 mots-clés par catégorie
  const topPositive = positiveKeywords.slice(0, 10);
  const topNegative = negativeKeywords.slice(0, 10);

  return {
    overallSentiment,
    sentimentScore,
    confidence: 60, // Confiance plus faible sans IA
    aspects: {
      service: sentimentScore,
      quality: sentimentScore,
      price: sentimentScore * 0.8, // Estimation
      support: sentimentScore * 0.9,
    },
    keywords: {
      positive: topPositive,
      negative: topNegative,
    },
    summary: `Analyse basique de ${reviews.length} avis avec note moyenne de ${averageRating.toFixed(1)}/5. ${overallSentiment === 'positive' ? 'Sentiment globalement positif.' : overallSentiment === 'negative' ? 'Sentiment globalement négatif.' : 'Sentiment neutre.'}`,
    reviewCount: reviews.length,
    averageRating,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Calcule le sentiment basique depuis la note moyenne
 */
function calculateBasicSentiment(averageRating: number): 'positive' | 'neutral' | 'negative' {
  if (averageRating >= 4.0) return 'positive';
  if (averageRating >= 3.0) return 'neutral';
  return 'negative';
}

/**
 * Calcule le score de sentiment (-100 à +100) depuis la note moyenne
 */
function calculateSentimentScoreFromRating(averageRating: number): number {
  // Conversion : 1 étoile = -100, 3 étoiles = 0, 5 étoiles = +100
  return Math.round((averageRating - 3) * 50);
}

/**
 * Analyse et met à jour le sentiment des avis Google pour un lead
 */
export async function analyzeAndUpdateGoogleReviewsSentiment(
  leadId: string,
  reviews?: GoogleReview[],
  options?: {
    useAI?: boolean;
    language?: string;
  }
): Promise<SentimentAnalysisResult> {
  try {
    // Récupérer les avis depuis le lead si non fournis
    let reviewsToAnalyze = reviews;
    
    if (!reviewsToAnalyze) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('metadata, google_rating, google_reviews_count')
        .eq('id', leadId)
        .single();

      if (leadData) {
        const metadata = leadData.metadata || {};
        
        // Vérifier si les avis sont stockés dans metadata
        if (metadata.googleReviews && Array.isArray(metadata.googleReviews)) {
          reviewsToAnalyze = metadata.googleReviews;
        } else {
          // Si pas d'avis détaillés, créer un avis synthétique depuis la note moyenne
          if (leadData.google_rating && leadData.google_reviews_count) {
            reviewsToAnalyze = [{
              author: 'Synthétique',
              rating: parseFloat(leadData.google_rating.toString()),
              text: `Note moyenne basée sur ${leadData.google_reviews_count} avis`,
              date: new Date().toISOString(),
            }];
          }
        }
      }
    }

    if (!reviewsToAnalyze || reviewsToAnalyze.length === 0) {
      logWarn(`Aucun avis Google disponible pour le lead ${leadId}`);
      return {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        confidence: 0,
        aspects: {},
        keywords: { positive: [], negative: [] },
        summary: 'Aucun avis disponible',
        reviewCount: 0,
        averageRating: 0,
        lastAnalyzedAt: new Date().toISOString(),
      };
    }

    // Analyser le sentiment
    const analysis = await analyzeGoogleReviewsSentiment(reviewsToAnalyze, options);

    // Mettre à jour le lead avec l'analyse
    const { data: currentLead } = await supabase
      .from('leads')
      .select('metadata')
      .eq('id', leadId)
      .single();

    const metadata = currentLead?.metadata || {};
    metadata.googleReviewsSentiment = analysis;
    metadata.googleReviews = reviewsToAnalyze;
    metadata.googleReviewsLastAnalyzed = analysis.lastAnalyzedAt;

    await supabase
      .from('leads')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'data_updated',
        subject: 'Analyse de sentiment des avis Google',
        description: `Analyse de ${analysis.reviewCount} avis : Sentiment ${analysis.overallSentiment} (${analysis.sentimentScore >= 0 ? '+' : ''}${analysis.sentimentScore}), Note moyenne ${analysis.averageRating.toFixed(1)}/5`,
        activity_date: new Date().toISOString(),
        metadata: {
          sentimentAnalysis: analysis,
          reviewCount: analysis.reviewCount,
          averageRating: analysis.averageRating,
        },
      });

    logInfo(`Analyse sentiment effectuée pour lead ${leadId}: ${analysis.overallSentiment} (${analysis.sentimentScore})`);
    return analysis;
  } catch (err) {
    logError(`Erreur analyse sentiment avis Google pour lead ${leadId}:`, err);
    throw err;
  }
}

/**
 * Récupère l'analyse de sentiment pour un lead
 */
export async function getGoogleReviewsSentiment(leadId: string): Promise<SentimentAnalysisResult | null> {
  try {
    const { data: leadData } = await supabase
      .from('leads')
      .select('metadata')
      .eq('id', leadId)
      .single();

    if (!leadData) return null;

    const metadata = leadData.metadata || {};
    return metadata.googleReviewsSentiment || null;
  } catch (err) {
    logError(`Erreur récupération sentiment pour lead ${leadId}:`, err);
    return null;
  }
}

/**
 * Analyse le sentiment pour tous les leads avec des avis Google
 */
export async function analyzeSentimentForAllLeadsWithReviews(
  batchSize: number = 50
): Promise<{ processed: number; errors: number }> {
  try {
    let processed = 0;
    let errors = 0;
    let offset = 0;

    while (true) {
      // Récupérer un batch de leads avec des avis Google
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, metadata, google_rating, google_reviews_count')
        .not('google_rating', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (fetchError) throw fetchError;
      if (!leads || leads.length === 0) break;

      // Analyser chaque lead
      for (const lead of leads) {
        try {
          // Vérifier si l'analyse est à jour (pas d'analyse ou analyse de plus de 30 jours)
          const metadata = lead.metadata || {};
          const lastAnalyzed = metadata.googleReviewsLastAnalyzed;
          const needsUpdate = !lastAnalyzed || 
            (Date.now() - new Date(lastAnalyzed).getTime()) > (30 * 24 * 60 * 60 * 1000); // 30 jours

          if (needsUpdate) {
            await analyzeAndUpdateGoogleReviewsSentiment(lead.id);
            processed++;
          }
        } catch (err) {
          logWarn(`Erreur analyse sentiment pour lead ${lead.id}:`, err);
          errors++;
        }
      }

      offset += batchSize;

      // Limiter à 500 leads pour éviter les traitements trop longs
      if (offset >= 500) break;
    }

    logInfo(`Analyse sentiment terminée : ${processed} leads traités, ${errors} erreurs`);
    return { processed, errors };
  } catch (err) {
    logError('Erreur analyse sentiment pour tous les leads:', err);
    throw err;
  }
}

