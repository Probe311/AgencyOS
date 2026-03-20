/**
 * Service de calcul des métriques de conversion du scraping
 * Track la conversion : scraping → lead → client
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface ConversionMetrics {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  periodStart: string;
  periodEnd: string;
  // Étape 1: Scraping → Leads ajoutés
  scrapingMetrics: {
    totalScrapingSessions: number;
    successfulScrapingSessions: number;
    totalLeadsFound: number;
    totalLeadsAdded: number;
    conversionRateScrapingToLead: number; // Leads ajoutés / Leads trouvés (%)
  };
  // Étape 2: Leads → Contacts (premier contact établi)
  leadToContactMetrics: {
    totalLeads: number;
    leadsContacted: number; // Leads avec au moins une interaction
    conversionRateLeadToContact: number; // Leads contactés / Total leads (%)
    averageTimeToFirstContact: number; // En jours
  };
  // Étape 3: Contacts → Opportunités (devis envoyé)
  contactToOpportunityMetrics: {
    totalContacts: number;
    opportunitiesCreated: number; // Leads avec devis ou statut Opportunité
    conversionRateContactToOpportunity: number; // Opportunités / Contacts (%)
    averageTimeToOpportunity: number; // En jours
  };
  // Étape 4: Opportunités → Clients (deal gagné)
  opportunityToClientMetrics: {
    totalOpportunities: number;
    clientsWon: number; // Deals gagnés
    conversionRateOpportunityToClient: number; // Clients / Opportunités (%)
    averageTimeToClient: number; // En jours
    totalRevenue: number; // CA généré
  };
  // Métriques globales
  globalMetrics: {
    overallConversionRate: number; // Scraping → Client (%)
    totalLeadsGenerated: number;
    totalClientsAcquired: number;
    totalRevenue: number;
    averageRevenuePerClient: number;
    roi: number; // (Revenue - Coûts) / Coûts * 100 (%)
    estimatedCost: number; // Coûts scraping (API, etc.)
  };
  // Métriques par source
  sourceMetrics: Array<{
    source: string;
    sessions: number;
    leadsFound: number;
    leadsAdded: number;
    leadsContacted: number;
    opportunities: number;
    clientsWon: number;
    revenue: number;
    conversionRateScrapingToClient: number;
  }>;
}

/**
 * Calcule les métriques de conversion pour une période donnée
 */
export async function calculateConversionMetrics(
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<ConversionMetrics> {
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
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        periodStart = new Date(0);
        break;
    }

    // 1. Métriques scraping
    const { data: scrapingSessions } = await supabase
      .from('scraping_sessions')
      .select('*')
      .gte('started_at', periodStart.toISOString());

    const sessions = scrapingSessions || [];
    const successfulSessions = sessions.filter(s => s.status === 'completed');
    const totalLeadsFound = sessions.reduce((sum, s) => sum + (s.leads_found || 0), 0);
    const totalLeadsAdded = sessions.reduce((sum, s) => sum + (s.leads_added || 0), 0);
    const conversionRateScrapingToLead = totalLeadsFound > 0 
      ? (totalLeadsAdded / totalLeadsFound) * 100 
      : 0;

    // 2. Métriques leads → contacts
    // Récupérer les leads créés dans la période
    const { data: leads } = await supabase
      .from('leads')
      .select('id, created_at, lifecycle_stage, assigned_to')
      .gte('created_at', periodStart.toISOString())
      .or('source.ilike.%Robot Prospection%,source.ilike.%scraping%,source.ilike.%Prospection%');

    const totalLeads = leads?.length || 0;
    
    // Leads avec au moins une interaction (sales_activities)
    const { data: leadsWithInteractions } = await supabase
      .from('sales_activities')
      .select('lead_id')
      .in('lead_id', leads?.map(l => l.id) || [])
      .in('activity_type', ['email_sent', 'call_made', 'meeting', 'note']);

    const uniqueLeadsContacted = new Set(leadsWithInteractions?.map(a => a.lead_id) || []);
    const leadsContacted = uniqueLeadsContacted.size;

    // Temps moyen jusqu'au premier contact
    let totalTimeToFirstContact = 0;
    let contactsWithTime = 0;

    for (const leadId of uniqueLeadsContacted) {
      const lead = leads?.find(l => l.id === leadId);
      if (!lead) continue;

      const { data: firstActivity } = await supabase
        .from('sales_activities')
        .select('created_at')
        .eq('lead_id', leadId)
        .in('activity_type', ['email_sent', 'call_made', 'meeting'])
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstActivity?.created_at) {
        const leadCreated = new Date(lead.created_at);
        const firstContact = new Date(firstActivity.created_at);
        const daysDiff = (firstContact.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24);
        totalTimeToFirstContact += daysDiff;
        contactsWithTime++;
      }
    }

    const averageTimeToFirstContact = contactsWithTime > 0 
      ? totalTimeToFirstContact / contactsWithTime 
      : 0;

    const conversionRateLeadToContact = totalLeads > 0 
      ? (leadsContacted / totalLeads) * 100 
      : 0;

    // 3. Métriques contacts → opportunités
    // Leads avec statut Opportunité ou avec devis
    const { data: opportunitiesLeads } = await supabase
      .from('leads')
      .select('id, created_at, lifecycle_stage')
      .in('id', Array.from(uniqueLeadsContacted))
      .or('lifecycle_stage.eq.Opportunité,stage.ilike.%Proposition%,stage.ilike.%Négociation%');

    // Ou leads avec devis
    const { data: quotes } = await supabase
      .from('quotes')
      .select('lead_id, created_at')
      .in('lead_id', Array.from(uniqueLeadsContacted))
      .gte('created_at', periodStart.toISOString());

    const uniqueOpportunities = new Set([
      ...(opportunitiesLeads?.map(l => l.id) || []),
      ...(quotes?.map(q => q.lead_id) || []),
    ]);
    const opportunitiesCreated = uniqueOpportunities.size;

    // Temps moyen jusqu'à l'opportunité
    let totalTimeToOpportunity = 0;
    let opportunitiesWithTime = 0;

    for (const leadId of uniqueOpportunities) {
      const lead = leads?.find(l => l.id === leadId);
      if (!lead) continue;

      const firstQuote = quotes?.find(q => q.lead_id === leadId);
      if (firstQuote) {
        const leadCreated = new Date(lead.created_at);
        const opportunityDate = new Date(firstQuote.created_at);
        const daysDiff = (opportunityDate.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24);
        totalTimeToOpportunity += daysDiff;
        opportunitiesWithTime++;
      }
    }

    const averageTimeToOpportunity = opportunitiesWithTime > 0 
      ? totalTimeToOpportunity / opportunitiesWithTime 
      : 0;

    const conversionRateContactToOpportunity = leadsContacted > 0 
      ? (opportunitiesCreated / leadsContacted) * 100 
      : 0;

    // 4. Métriques opportunités → clients
    // Leads avec statut Client ou devis accepté
    const { data: clientsLeads } = await supabase
      .from('leads')
      .select('id, created_at, lifecycle_stage')
      .in('id', Array.from(uniqueOpportunities))
      .or('lifecycle_stage.eq.Client,lifecycle_stage.eq.Client Actif,stage.ilike.%Gagné%');

    // Ou devis acceptés
    const { data: acceptedQuotes } = await supabase
      .from('quotes')
      .select('lead_id, created_at, total_amount, status')
      .in('lead_id', Array.from(uniqueOpportunities))
      .eq('status', 'accepted');

    const uniqueClients = new Set([
      ...(clientsLeads?.map(l => l.id) || []),
      ...(acceptedQuotes?.map(q => q.lead_id) || []),
    ]);
    const clientsWon = uniqueClients.size;

    // Calculer le CA
    const totalRevenue = acceptedQuotes?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

    // Temps moyen jusqu'au client
    let totalTimeToClient = 0;
    let clientsWithTime = 0;

    for (const leadId of uniqueClients) {
      const lead = leads?.find(l => l.id === leadId);
      if (!lead) continue;

      const acceptedQuote = acceptedQuotes?.find(q => q.lead_id === leadId);
      if (acceptedQuote) {
        const leadCreated = new Date(lead.created_at);
        const clientDate = new Date(acceptedQuote.created_at);
        const daysDiff = (clientDate.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24);
        totalTimeToClient += daysDiff;
        clientsWithTime++;
      }
    }

    const averageTimeToClient = clientsWithTime > 0 
      ? totalTimeToClient / clientsWithTime 
      : 0;

    const conversionRateOpportunityToClient = opportunitiesCreated > 0 
      ? (clientsWon / opportunitiesCreated) * 100 
      : 0;

    // 5. Métriques globales
    const overallConversionRate = totalLeadsAdded > 0 
      ? (clientsWon / totalLeadsAdded) * 100 
      : 0;

    const averageRevenuePerClient = clientsWon > 0 
      ? totalRevenue / clientsWon 
      : 0;

    // Estimer les coûts (API, temps, etc.)
    // Approximatif : coûts API depuis api_usage_logs pour scraping
    const { data: apiLogs } = await supabase
      .from('api_usage_logs')
      .select('cost')
      .gte('created_at', periodStart.toISOString())
      .in('request_type', ['scraping', 'enrichment', 'prospecting']);

    const estimatedCost = apiLogs?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;

    const roi = estimatedCost > 0 
      ? ((totalRevenue - estimatedCost) / estimatedCost) * 100 
      : 0;

    // 6. Métriques par source
    const sourceMap: Record<string, {
      sessions: number;
      leadsFound: number;
      leadsAdded: number;
      leadsContacted: Set<string>;
      opportunities: Set<string>;
      clientsWon: Set<string>;
      revenue: number;
    }> = {};

    sessions.forEach(session => {
      const source = session.source || 'unknown';
      if (!sourceMap[source]) {
        sourceMap[source] = {
          sessions: 0,
          leadsFound: 0,
          leadsAdded: 0,
          leadsContacted: new Set(),
          opportunities: new Set(),
          clientsWon: new Set(),
          revenue: 0,
        };
      }
      sourceMap[source].sessions++;
      sourceMap[source].leadsFound += session.leads_found || 0;
      sourceMap[source].leadsAdded += session.leads_added || 0;
    });

    // Enrichir avec les métriques de conversion par source
    // Pour chaque lead, trouver sa source depuis scraping_sessions
    for (const lead of leads || []) {
      // Trouver la session qui a créé ce lead (approximation par date)
      const matchingSession = sessions.find(s => {
        const sessionDate = new Date(s.started_at);
        const leadDate = new Date(lead.created_at);
        const diffHours = Math.abs(sessionDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60);
        return diffHours < 24; // Lead créé dans les 24h de la session
      });

      if (matchingSession) {
        const source = matchingSession.source || 'unknown';
        if (!sourceMap[source]) continue;

        if (uniqueLeadsContacted.has(lead.id)) {
          sourceMap[source].leadsContacted.add(lead.id);
        }
        if (uniqueOpportunities.has(lead.id)) {
          sourceMap[source].opportunities.add(lead.id);
        }
        if (uniqueClients.has(lead.id)) {
          sourceMap[source].clientsWon.add(lead.id);
          // Trouver le revenu pour ce lead
          const quote = acceptedQuotes?.find(q => q.lead_id === lead.id);
          if (quote) {
            sourceMap[source].revenue += quote.total_amount || 0;
          }
        }
      }
    }

    const sourceMetrics = Object.entries(sourceMap).map(([source, data]) => ({
      source,
      sessions: data.sessions,
      leadsFound: data.leadsFound,
      leadsAdded: data.leadsAdded,
      leadsContacted: data.leadsContacted.size,
      opportunities: data.opportunities.size,
      clientsWon: data.clientsWon.size,
      revenue: data.revenue,
      conversionRateScrapingToClient: data.leadsAdded > 0 
        ? (data.clientsWon.size / data.leadsAdded) * 100 
        : 0,
    }));

    return {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      scrapingMetrics: {
        totalScrapingSessions: sessions.length,
        successfulScrapingSessions: successfulSessions.length,
        totalLeadsFound,
        totalLeadsAdded,
        conversionRateScrapingToLead: Math.round(conversionRateScrapingToLead * 100) / 100,
      },
      leadToContactMetrics: {
        totalLeads,
        leadsContacted,
        conversionRateLeadToContact: Math.round(conversionRateLeadToContact * 100) / 100,
        averageTimeToFirstContact: Math.round(averageTimeToFirstContact * 100) / 100,
      },
      contactToOpportunityMetrics: {
        totalContacts: leadsContacted,
        opportunitiesCreated,
        conversionRateContactToOpportunity: Math.round(conversionRateContactToOpportunity * 100) / 100,
        averageTimeToOpportunity: Math.round(averageTimeToOpportunity * 100) / 100,
      },
      opportunityToClientMetrics: {
        totalOpportunities: opportunitiesCreated,
        clientsWon,
        conversionRateOpportunityToClient: Math.round(conversionRateOpportunityToClient * 100) / 100,
        averageTimeToClient: Math.round(averageTimeToClient * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      globalMetrics: {
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
        totalLeadsGenerated: totalLeadsAdded,
        totalClientsAcquired: clientsWon,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageRevenuePerClient: Math.round(averageRevenuePerClient * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
      },
      sourceMetrics,
    };
  } catch (err) {
    logError('Erreur calcul métriques conversion scraping:', err);
    throw err;
  }
}

/**
 * Génère un rapport d'activité du robot avec toutes les métriques
 */
export async function generateScrapingActivityReport(
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<{
  conversionMetrics: ConversionMetrics;
  performanceStats: any; // Depuis scrapingPerformanceService
  history: any; // Depuis scrapingPerformanceService
}> {
  try {
    const { calculateScrapingPerformance } = await import('./scrapingPerformanceService');
    const { getScrapingHistory } = await import('./scrapingPerformanceService');

    const [conversionMetrics, performanceStats, history] = await Promise.all([
      calculateConversionMetrics(period),
      calculateScrapingPerformance(period),
      getScrapingHistory({ limit: 100 }),
    ]);

    return {
      conversionMetrics,
      performanceStats,
      history,
    };
  } catch (err) {
    logError('Erreur génération rapport activité scraping:', err);
    throw err;
  }
}

/**
 * Exporte les métriques de conversion au format CSV
 */
export async function exportConversionMetricsCSV(
  metrics: ConversionMetrics
): Promise<string> {
  const rows: string[] = [];

  // En-têtes
  rows.push('Métrique, Valeur, Unité');

  // Métriques scraping
  rows.push(`Sessions scraping totales, ${metrics.scrapingMetrics.totalScrapingSessions}, sessions`);
  rows.push(`Sessions réussies, ${metrics.scrapingMetrics.successfulScrapingSessions}, sessions`);
  rows.push(`Leads trouvés, ${metrics.scrapingMetrics.totalLeadsFound}, leads`);
  rows.push(`Leads ajoutés, ${metrics.scrapingMetrics.totalLeadsAdded}, leads`);
  rows.push(`Taux conversion Scraping→Lead, ${metrics.scrapingMetrics.conversionRateScrapingToLead.toFixed(2)}, %`);

  // Métriques leads → contacts
  rows.push(`Leads total, ${metrics.leadToContactMetrics.totalLeads}, leads`);
  rows.push(`Leads contactés, ${metrics.leadToContactMetrics.leadsContacted}, leads`);
  rows.push(`Taux conversion Lead→Contact, ${metrics.leadToContactMetrics.conversionRateLeadToContact.toFixed(2)}, %`);
  rows.push(`Temps moyen premier contact, ${metrics.leadToContactMetrics.averageTimeToFirstContact.toFixed(2)}, jours`);

  // Métriques contacts → opportunités
  rows.push(`Opportunités créées, ${metrics.contactToOpportunityMetrics.opportunitiesCreated}, opportunités`);
  rows.push(`Taux conversion Contact→Opportunité, ${metrics.contactToOpportunityMetrics.conversionRateContactToOpportunity.toFixed(2)}, %`);
  rows.push(`Temps moyen opportunité, ${metrics.contactToOpportunityMetrics.averageTimeToOpportunity.toFixed(2)}, jours`);

  // Métriques opportunités → clients
  rows.push(`Clients acquis, ${metrics.opportunityToClientMetrics.clientsWon}, clients`);
  rows.push(`Taux conversion Opportunité→Client, ${metrics.opportunityToClientMetrics.conversionRateOpportunityToClient.toFixed(2)}, %`);
  rows.push(`Temps moyen client, ${metrics.opportunityToClientMetrics.averageTimeToClient.toFixed(2)}, jours`);
  rows.push(`CA total, ${metrics.opportunityToClientMetrics.totalRevenue.toFixed(2)}, €`);

  // Métriques globales
  rows.push(`Taux conversion global, ${metrics.globalMetrics.overallConversionRate.toFixed(2)}, %`);
  rows.push(`CA moyen par client, ${metrics.globalMetrics.averageRevenuePerClient.toFixed(2)}, €`);
  rows.push(`ROI, ${metrics.globalMetrics.roi.toFixed(2)}, %`);
  rows.push(`Coûts estimés, ${metrics.globalMetrics.estimatedCost.toFixed(2)}, €`);

  // Métriques par source
  rows.push('');
  rows.push('Source, Sessions, Leads Trouvés, Leads Ajoutés, Leads Contactés, Opportunités, Clients, CA, Taux Conversion');
  metrics.sourceMetrics.forEach(source => {
    rows.push(`${source.source}, ${source.sessions}, ${source.leadsFound}, ${source.leadsAdded}, ${source.leadsContacted}, ${source.opportunities}, ${source.clientsWon}, ${source.revenue.toFixed(2)}€, ${source.conversionRateScrapingToClient.toFixed(2)}%`);
  });

  return rows.join('\n');
}

