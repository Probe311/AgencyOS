/**
 * Service de suivi des coûts API pour l'enrichissement et autres services
 * Permet de tracker l'utilisation et les coûts des API tierces
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface ApiUsageRecord {
  id: string;
  api_provider: 'clearbit' | 'fullcontact' | 'hunter' | 'sirene' | 'gemini' | 'groq' | 'mistral' | 'openrouter';
  service_type: 'enrichment' | 'ai_generation' | 'email_validation' | 'phone_validation' | 'other';
  lead_id?: string | null;
  request_type: string; // 'company_lookup', 'email_finder', 'domain_search', etc.
  cost: number; // Coût en euros
  credits_used?: number | null; // Nombre de crédits utilisés (si applicable)
  success: boolean;
  error_message?: string | null;
  metadata?: Record<string, any> | null; // Détails supplémentaires (taux limite, quota restant, etc.)
  created_by?: string | null;
  created_at: string;
}

export interface ApiCostSummary {
  provider: string;
  totalCost: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  periodStart: string;
  periodEnd: string;
  breakdown?: {
    byServiceType: Record<string, { cost: number; requests: number }>;
    byRequestType: Record<string, { cost: number; requests: number }>;
  };
}

// Coûts par défaut des APIs (en euros par requête)
// Ces valeurs peuvent être ajustées selon les tarifs réels
const DEFAULT_API_COSTS: Record<string, Record<string, number>> = {
  clearbit: {
    company_lookup: 0.01, // $0.01 par lookup
    domain_search: 0.01,
    person_lookup: 0.015,
  },
  fullcontact: {
    person_enrichment: 0.02, // $0.02 par enrichissement
    company_enrichment: 0.015,
  },
  hunter: {
    email_finder: 0.01, // $0.01 par recherche email
    email_verifier: 0.0025, // $0.0025 par vérification
    domain_search: 0.01,
  },
  sirene: {
    company_lookup: 0, // Gratuit (API publique)
  },
  gemini: {
    enrichment: 0.0001, // Très faible coût par token
    generation: 0.0001,
  },
  groq: {
    enrichment: 0.0001,
    generation: 0.0001,
  },
  mistral: {
    enrichment: 0.0001,
    generation: 0.0001,
  },
  openrouter: {
    enrichment: 0.0001,
    generation: 0.0001,
  },
};

/**
 * Enregistre l'utilisation d'une API
 */
export async function recordApiUsage(params: {
  apiProvider: ApiUsageRecord['api_provider'];
  serviceType: ApiUsageRecord['service_type'];
  requestType: string;
  leadId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
  customCost?: number; // Coût personnalisé (si différent du coût par défaut)
  creditsUsed?: number;
}): Promise<ApiUsageRecord> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Calculer le coût (personnalisé ou par défaut)
    const cost = params.customCost ?? 
      (DEFAULT_API_COSTS[params.apiProvider]?.[params.requestType] || 0);

    const { data, error } = await supabase
      .from('api_usage_logs')
      .insert({
        api_provider: params.apiProvider,
        service_type: params.serviceType,
        request_type: params.requestType,
        lead_id: params.leadId,
        cost: cost,
        credits_used: params.creditsUsed,
        success: params.success,
        error_message: params.errorMessage,
        metadata: params.metadata || {},
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    logInfo(`Usage API enregistré: ${params.apiProvider} - ${params.requestType} - ${cost}€`);
    return data as ApiUsageRecord;
  } catch (err) {
    logError(`Erreur enregistrement usage API:`, err);
    throw err;
  }
}

/**
 * Récupère le résumé des coûts API pour une période
 */
export async function getApiCostSummary(options?: {
  provider?: string;
  serviceType?: string;
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}): Promise<ApiCostSummary[]> {
  try {
    const period = options?.period || 'month';
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    // Calculer les dates selon la période
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Depuis le début
        break;
    }

    // Utiliser les dates personnalisées si fournies
    if (options?.startDate) {
      startDate = new Date(options.startDate);
    }
    if (options?.endDate) {
      endDate = new Date(options.endDate);
    }

    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (options?.provider) {
      query = query.eq('api_provider', options.provider);
    }

    if (options?.serviceType) {
      query = query.eq('service_type', options.serviceType);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Grouper par provider
    const groupedByProvider: Record<string, ApiUsageRecord[]> = {};
    (data || []).forEach((record: ApiUsageRecord) => {
      if (!groupedByProvider[record.api_provider]) {
        groupedByProvider[record.api_provider] = [];
      }
      groupedByProvider[record.api_provider].push(record);
    });

    // Calculer les résumés
    const summaries: ApiCostSummary[] = Object.entries(groupedByProvider).map(([provider, records]) => {
      const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      const totalRequests = records.length;
      const successfulRequests = records.filter(r => r.success).length;
      const failedRequests = totalRequests - successfulRequests;

      // Breakdown par type de service
      const byServiceType: Record<string, { cost: number; requests: number }> = {};
      records.forEach(r => {
        if (!byServiceType[r.service_type]) {
          byServiceType[r.service_type] = { cost: 0, requests: 0 };
        }
        byServiceType[r.service_type].cost += r.cost || 0;
        byServiceType[r.service_type].requests += 1;
      });

      // Breakdown par type de requête
      const byRequestType: Record<string, { cost: number; requests: number }> = {};
      records.forEach(r => {
        if (!byRequestType[r.request_type]) {
          byRequestType[r.request_type] = { cost: 0, requests: 0 };
        }
        byRequestType[r.request_type].cost += r.cost || 0;
        byRequestType[r.request_type].requests += 1;
      });

      return {
        provider,
        totalCost,
        totalRequests,
        successfulRequests,
        failedRequests,
        period,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        breakdown: {
          byServiceType,
          byRequestType,
        },
      };
    });

    return summaries;
  } catch (err) {
    logError(`Erreur récupération résumé coûts API:`, err);
    return [];
  }
}

/**
 * Récupère l'historique d'utilisation d'une API
 */
export async function getApiUsageHistory(options?: {
  provider?: string;
  serviceType?: string;
  leadId?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiUsageRecord[]> {
  try {
    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.provider) {
      query = query.eq('api_provider', options.provider);
    }

    if (options?.serviceType) {
      query = query.eq('service_type', options.serviceType);
    }

    if (options?.leadId) {
      query = query.eq('lead_id', options.leadId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as ApiUsageRecord[];
  } catch (err) {
    logError(`Erreur récupération historique usage API:`, err);
    return [];
  }
}

/**
 * Calcule le coût total pour un lead (tous les enrichissements)
 */
export async function getLeadEnrichmentCost(leadId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('cost')
      .eq('lead_id', leadId)
      .eq('service_type', 'enrichment');

    if (error) throw error;

    const totalCost = (data || []).reduce((sum, record) => sum + (record.cost || 0), 0);
    return totalCost;
  } catch (err) {
    logError(`Erreur calcul coût enrichissement lead ${leadId}:`, err);
    return 0;
  }
}

/**
 * Obtient les statistiques d'utilisation d'une API
 */
export async function getApiUsageStats(provider: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<{
  totalCost: number;
  totalRequests: number;
  avgCostPerRequest: number;
  successRate: number;
  totalCreditsUsed?: number;
}> {
  try {
    const summaries = await getApiCostSummary({ provider, period });
    const summary = summaries.find(s => s.provider === provider);

    if (!summary) {
      return {
        totalCost: 0,
        totalRequests: 0,
        avgCostPerRequest: 0,
        successRate: 0,
      };
    }

    return {
      totalCost: summary.totalCost,
      totalRequests: summary.totalRequests,
      avgCostPerRequest: summary.totalRequests > 0 ? summary.totalCost / summary.totalRequests : 0,
      successRate: summary.totalRequests > 0 ? (summary.successfulRequests / summary.totalRequests) * 100 : 0,
    };
  } catch (err) {
    logError(`Erreur récupération stats usage API ${provider}:`, err);
    return {
      totalCost: 0,
      totalRequests: 0,
      avgCostPerRequest: 0,
      successRate: 0,
    };
  }
}

/**
 * Exporte les données d'utilisation au format CSV
 */
export async function exportApiUsageCSV(options?: {
  provider?: string;
  period?: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}): Promise<string> {
  try {
    const records = await getApiUsageHistory({
      provider: options?.provider,
      limit: 10000, // Limite pour éviter les exports trop volumineux
    });

    // En-têtes CSV
    const headers = [
      'Date',
      'Provider',
      'Service Type',
      'Request Type',
      'Lead ID',
      'Cost (€)',
      'Credits Used',
      'Success',
      'Error Message',
    ];

    // Lignes CSV
    const rows = records.map(record => [
      new Date(record.created_at).toISOString(),
      record.api_provider,
      record.service_type,
      record.request_type,
      record.lead_id || '',
      record.cost.toString(),
      (record.credits_used || 0).toString(),
      record.success ? 'Yes' : 'No',
      record.error_message || '',
    ]);

    // Générer le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  } catch (err) {
    logError(`Erreur export CSV usage API:`, err);
    throw err;
  }
}

