/**
 * Service de suivi des performances du scraping
 * Track les statistiques de scraping : taux de succès, sources, coûts, qualité
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface ScrapingSession {
  id?: string;
  userId?: string;
  startedAt: string;
  completedAt?: string;
  source: string; // 'google_maps' | 'linkedin' | 'sirene' | 'website' | 'pages_jaunes'
  query?: string;
  zone?: string;
  activity?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  leadsFound: number;
  leadsAdded: number;
  errors?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface ScrapingSourceStats {
  source: string;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  successRate: number; // %
  totalLeadsFound: number;
  totalLeadsAdded: number;
  averageLeadsPerSession: number;
  averageDuration: number; // en secondes
  totalCost: number; // en euros
  lastRun?: string;
}

export interface ScrapingPerformanceStats {
  period: 'day' | 'week' | 'month' | 'all';
  periodStart: string;
  periodEnd: string;
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  successRate: number;
  totalLeadsFound: number;
  totalLeadsAdded: number;
  averageLeadsPerSession: number;
  averageDuration: number;
  totalCost: number;
  sourcesStats: ScrapingSourceStats[];
  qualityStats: {
    averageQualityScore: number;
    leadsWithHighQuality: number; // Score >= 70
    leadsWithMediumQuality: number; // Score 50-69
    leadsWithLowQuality: number; // Score < 50
  };
  errorStats: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    mostCommonErrors: Array<{ error: string; count: number }>;
  };
}

/**
 * Enregistre une session de scraping
 */
export async function recordScrapingSession(session: Omit<ScrapingSession, 'id' | 'createdAt'>): Promise<ScrapingSession> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('scraping_sessions')
      .insert({
        user_id: userId,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        source: session.source,
        query: session.query,
        zone: session.zone,
        activity: session.activity,
        status: session.status,
        leads_found: session.leadsFound,
        leads_added: session.leadsAdded,
        errors: session.errors || [],
        metadata: session.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      source: data.source,
      query: data.query,
      zone: data.zone,
      activity: data.activity,
      status: data.status,
      leadsFound: data.leads_found,
      leadsAdded: data.leads_added,
      errors: data.errors,
      metadata: data.metadata,
      createdAt: data.created_at,
    };
  } catch (err) {
    logError('Erreur enregistrement session scraping:', err);
    throw err;
  }
}

/**
 * Met à jour une session de scraping
 */
export async function updateScrapingSession(
  sessionId: string,
  updates: Partial<Omit<ScrapingSession, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  try {
    const updateData: Record<string, any> = {};
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.leadsFound !== undefined) updateData.leads_found = updates.leadsFound;
    if (updates.leadsAdded !== undefined) updateData.leads_added = updates.leadsAdded;
    if (updates.errors !== undefined) updateData.errors = updates.errors;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { error } = await supabase
      .from('scraping_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
  } catch (err) {
    logError(`Erreur mise à jour session scraping ${sessionId}:`, err);
    throw err;
  }
}

/**
 * Calcule les statistiques de performance du scraping
 */
export async function calculateScrapingPerformance(
  period: 'day' | 'week' | 'month' | 'all' = 'month'
): Promise<ScrapingPerformanceStats> {
  try {
    // Calculer les dates de la période
    const now = new Date();
    let periodStart: Date;
    
    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
        periodStart = new Date(0); // Toutes les données
        break;
    }

    // Récupérer les sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('scraping_sessions')
      .select('*')
      .gte('started_at', periodStart.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    const sessionsData = sessions || [];

    // Calculer les statistiques globales
    const totalSessions = sessionsData.length;
    const successfulSessions = sessionsData.filter(s => s.status === 'completed').length;
    const failedSessions = sessionsData.filter(s => s.status === 'failed').length;
    const successRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0;

    const totalLeadsFound = sessionsData.reduce((sum, s) => sum + (s.leads_found || 0), 0);
    const totalLeadsAdded = sessionsData.reduce((sum, s) => sum + (s.leads_added || 0), 0);
    const averageLeadsPerSession = successfulSessions > 0 ? totalLeadsFound / successfulSessions : 0;

    // Calculer la durée moyenne
    const completedSessions = sessionsData.filter(s => s.status === 'completed' && s.completed_at && s.started_at);
    const totalDuration = completedSessions.reduce((sum, s) => {
      const duration = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
      return sum + (duration / 1000); // En secondes
    }, 0);
    const averageDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

    // Calculer les statistiques par source
    const sourcesMap: Record<string, ScrapingSourceStats> = {};
    
    sessionsData.forEach(session => {
      const source = session.source || 'unknown';
      if (!sourcesMap[source]) {
        sourcesMap[source] = {
          source,
          totalSessions: 0,
          successfulSessions: 0,
          failedSessions: 0,
          successRate: 0,
          totalLeadsFound: 0,
          totalLeadsAdded: 0,
          averageLeadsPerSession: 0,
          averageDuration: 0,
          totalCost: 0,
        };
      }

      const stats = sourcesMap[source];
      stats.totalSessions++;
      if (session.status === 'completed') stats.successfulSessions++;
      if (session.status === 'failed') stats.failedSessions++;
      stats.totalLeadsFound += session.leads_found || 0;
      stats.totalLeadsAdded += session.leads_added || 0;

      // Durée pour cette session
      if (session.status === 'completed' && session.completed_at && session.started_at) {
        const duration = (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000;
        stats.averageDuration = (stats.averageDuration * (stats.successfulSessions - 1) + duration) / stats.successfulSessions;
      }

      // Dernière exécution
      if (!stats.lastRun || session.started_at > stats.lastRun) {
        stats.lastRun = session.started_at;
      }
    });

    // Calculer les taux de succès et moyennes par source
    const sourcesStats = Object.values(sourcesMap).map(stats => ({
      ...stats,
      successRate: stats.totalSessions > 0 ? (stats.successfulSessions / stats.totalSessions) * 100 : 0,
      averageLeadsPerSession: stats.successfulSessions > 0 ? stats.totalLeadsFound / stats.successfulSessions : 0,
    }));

    // Récupérer les coûts API pour la période
    let totalCost = 0;
    try {
      // Calculer les coûts depuis api_usage_logs
      const { data: apiLogs } = await supabase
        .from('api_usage_logs')
        .select('cost')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', now.toISOString());

      if (apiLogs) {
        totalCost = apiLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
      }

      // Répartir les coûts par source (approximation basée sur les sessions)
      // Cela nécessiterait de tracker les coûts par session, pour l'instant on fait une répartition égale
      const costPerSource = sourcesStats.length > 0 ? totalCost / sourcesStats.length : 0;
      sourcesStats.forEach(stats => {
        stats.totalCost = costPerSource;
      });
    } catch (costError) {
      logWarn('Erreur calcul coûts API:', costError);
    }

    // Calculer les statistiques de qualité (basées sur les leads ajoutés)
    const { data: leadsData } = await supabase
      .from('leads')
      .select('quality_score')
      .gte('created_at', periodStart.toISOString())
      .not('quality_score', 'is', null);

    const leads = leadsData || [];
    const qualityScores = leads.map(l => (l as any).quality_score || 0).filter(s => s > 0);
    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
      : 0;

    const leadsWithHighQuality = qualityScores.filter(s => s >= 70).length;
    const leadsWithMediumQuality = qualityScores.filter(s => s >= 50 && s < 70).length;
    const leadsWithLowQuality = qualityScores.filter(s => s < 50).length;

    // Calculer les statistiques d'erreurs
    const allErrors: string[] = [];
    sessionsData.forEach(s => {
      if (s.errors && Array.isArray(s.errors)) {
        allErrors.push(...s.errors);
      }
    });

    const errorsByType: Record<string, number> = {};
    allErrors.forEach(error => {
      // Catégoriser l'erreur (simplifié)
      let category = 'Autre';
      const errorLower = error.toLowerCase();
      if (errorLower.includes('timeout') || errorLower.includes('time')) category = 'Timeout';
      else if (errorLower.includes('quota') || errorLower.includes('limit')) category = 'Quota API';
      else if (errorLower.includes('network') || errorLower.includes('connection')) category = 'Réseau';
      else if (errorLower.includes('parse') || errorLower.includes('format')) category = 'Parsing';
      else if (errorLower.includes('auth') || errorLower.includes('api key')) category = 'Authentification';
      
      errorsByType[category] = (errorsByType[category] || 0) + 1;
    });

    const mostCommonErrors = Object.entries(errorsByType)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totalSessions,
      successfulSessions,
      failedSessions,
      successRate: Math.round(successRate * 100) / 100,
      totalLeadsFound,
      totalLeadsAdded,
      averageLeadsPerSession: Math.round(averageLeadsPerSession * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      sourcesStats,
      qualityStats: {
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
        leadsWithHighQuality,
        leadsWithMediumQuality,
        leadsWithLowQuality,
      },
      errorStats: {
        totalErrors: allErrors.length,
        errorsByType,
        mostCommonErrors,
      },
    };
  } catch (err) {
    logError('Erreur calcul performances scraping:', err);
    throw err;
  }
}

/**
 * Récupère l'historique des sessions de scraping
 */
export async function getScrapingHistory(
  filters?: {
    source?: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ScrapingSession[]> {
  try {
    let query = supabase
      .from('scraping_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      userId: s.user_id,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      source: s.source,
      query: s.query,
      zone: s.zone,
      activity: s.activity,
      status: s.status,
      leadsFound: s.leads_found,
      leadsAdded: s.leads_added,
      errors: s.errors,
      metadata: s.metadata,
      createdAt: s.created_at,
    }));
  } catch (err) {
    logError('Erreur récupération historique scraping:', err);
    throw err;
  }
}

