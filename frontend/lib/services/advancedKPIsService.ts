import { supabase } from '../supabase';

export interface KPICategory {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'marketing' | 'social' | 'reputation';
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'marketing' | 'social' | 'reputation';
  value: number;
  previousValue?: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  calculatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Service de calcul des KPIs avancés
 */
export class AdvancedKPIsService {
  /**
   * Calcule tous les KPIs CRM
   */
  static async calculateCRMKPIs(userId: string, dateFrom?: string, dateTo?: string): Promise<KPI[]> {
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo || new Date().toISOString();
    const previousFrom = new Date(new Date(from).getTime() - (new Date(to).getTime() - new Date(from).getTime())).toISOString();

    const kpis: KPI[] = [];

    // 1. Taux de conversion leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', from)
      .lte('created_at', to);

    const { count: convertedLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', from)
      .lte('created_at', to)
      .in('stage', ['Qualifié', 'Proposition', 'Gagné']);

    const conversionRate = totalLeads && totalLeads > 0 ? (convertedLeads || 0) / totalLeads * 100 : 0;

    // Taux de conversion période précédente
    const { count: prevTotalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousFrom)
      .lt('created_at', from);

    const { count: prevConvertedLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousFrom)
      .lt('created_at', from)
      .in('stage', ['Qualifié', 'Proposition', 'Gagné']);

    const prevConversionRate = prevTotalLeads && prevTotalLeads > 0 ? (prevConvertedLeads || 0) / prevTotalLeads * 100 : 0;
    const conversionTrend = conversionRate - prevConversionRate;

    kpis.push({
      id: 'crm_conversion_rate',
      name: 'Taux de conversion',
      description: 'Pourcentage de leads convertis',
      category: 'crm',
      value: Math.round(conversionRate * 100) / 100,
      previousValue: Math.round(prevConversionRate * 100) / 100,
      target: 25,
      unit: '%',
      trend: conversionTrend > 0 ? 'up' : conversionTrend < 0 ? 'down' : 'stable',
      trendPercentage: prevConversionRate > 0 ? Math.round((conversionTrend / prevConversionRate) * 100) : 0,
      status: conversionRate >= 25 ? 'excellent' : conversionRate >= 15 ? 'good' : conversionRate >= 10 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 2. Temps moyen de cycle de vente
    const { data: wonLeads } = await supabase
      .from('leads')
      .select('created_at, updated_at')
      .eq('stage', 'Gagné')
      .gte('created_at', from)
      .lte('created_at', to);

    const cycleTimes = wonLeads?.map(lead => {
      const created = new Date(lead.created_at).getTime();
      const updated = new Date(lead.updated_at).getTime();
      return (updated - created) / (1000 * 60 * 60 * 24); // Jours
    }) || [];

    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

    // Période précédente
    const { data: prevWonLeads } = await supabase
      .from('leads')
      .select('created_at, updated_at')
      .eq('stage', 'Gagné')
      .gte('created_at', previousFrom)
      .lt('created_at', from);

    const prevCycleTimes = prevWonLeads?.map(lead => {
      const created = new Date(lead.created_at).getTime();
      const updated = new Date(lead.updated_at).getTime();
      return (updated - created) / (1000 * 60 * 60 * 24);
    }) || [];

    const prevAvgCycleTime = prevCycleTimes.length > 0
      ? prevCycleTimes.reduce((a, b) => a + b, 0) / prevCycleTimes.length
      : 0;

    const cycleTimeTrend = avgCycleTime - prevAvgCycleTime;

    kpis.push({
      id: 'crm_avg_cycle_time',
      name: 'Temps moyen de cycle',
      description: 'Durée moyenne de conversion d\'un lead',
      category: 'crm',
      value: Math.round(avgCycleTime * 10) / 10,
      previousValue: Math.round(prevAvgCycleTime * 10) / 10,
      target: 30,
      unit: 'jours',
      trend: cycleTimeTrend < 0 ? 'up' : cycleTimeTrend > 0 ? 'down' : 'stable',
      trendPercentage: prevAvgCycleTime > 0 ? Math.round((Math.abs(cycleTimeTrend) / prevAvgCycleTime) * 100) : 0,
      status: avgCycleTime <= 30 ? 'excellent' : avgCycleTime <= 45 ? 'good' : avgCycleTime <= 60 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 3. Taux de rétention clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    const { count: activeClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Actif');

    const retentionRate = totalClients && totalClients > 0 ? (activeClients || 0) / totalClients * 100 : 0;

    kpis.push({
      id: 'crm_retention_rate',
      name: 'Taux de rétention',
      description: 'Pourcentage de clients actifs',
      category: 'crm',
      value: Math.round(retentionRate * 100) / 100,
      target: 85,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: retentionRate >= 85 ? 'excellent' : retentionRate >= 75 ? 'good' : retentionRate >= 65 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 4. Valeur moyenne d'une transaction
    const { data: projects } = await supabase
      .from('projects')
      .select('budget')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('budget', 'is', null);

    const avgTransactionValue = projects && projects.length > 0
      ? projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length
      : 0;

    kpis.push({
      id: 'crm_avg_transaction_value',
      name: 'Valeur moyenne transaction',
      description: 'Montant moyen par projet',
      category: 'crm',
      value: Math.round(avgTransactionValue),
      target: 10000,
      unit: '€',
      trend: 'stable',
      trendPercentage: 0,
      status: avgTransactionValue >= 10000 ? 'excellent' : avgTransactionValue >= 5000 ? 'good' : avgTransactionValue >= 2000 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    return kpis;
  }

  /**
   * Calcule tous les KPIs Marketing
   */
  static async calculateMarketingKPIs(userId: string, dateFrom?: string, dateTo?: string): Promise<KPI[]> {
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo || new Date().toISOString();

    const kpis: KPI[] = [];

    // 1. Taux d'ouverture emails
    const { data: emailCampaigns } = await supabase
      .from('email_campaigns')
      .select('sent_count, open_count')
      .gte('created_at', from)
      .lte('created_at', to);

    const totalSent = emailCampaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
    const totalOpened = emailCampaigns?.reduce((sum, c) => sum + (c.open_count || 0), 0) || 0;
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    kpis.push({
      id: 'marketing_email_open_rate',
      name: 'Taux d\'ouverture emails',
      description: 'Pourcentage d\'emails ouverts',
      category: 'marketing',
      value: Math.round(openRate * 100) / 100,
      target: 25,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: openRate >= 25 ? 'excellent' : openRate >= 20 ? 'good' : openRate >= 15 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 2. Taux de clic emails
    const totalClicked = emailCampaigns?.reduce((sum, c) => sum + (c.click_count || 0), 0) || 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    kpis.push({
      id: 'marketing_email_click_rate',
      name: 'Taux de clic emails',
      description: 'Pourcentage de clics sur les emails',
      category: 'marketing',
      value: Math.round(clickRate * 100) / 100,
      target: 3,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: clickRate >= 3 ? 'excellent' : clickRate >= 2 ? 'good' : clickRate >= 1 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 3. Taux de conversion landing pages
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('visits, conversions')
      .gte('created_at', from)
      .lte('created_at', to);

    const totalVisits = landingPages?.reduce((sum, lp) => sum + (lp.visits || 0), 0) || 0;
    const totalConversions = landingPages?.reduce((sum, lp) => sum + (lp.conversions || 0), 0) || 0;
    const conversionRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;

    kpis.push({
      id: 'marketing_landing_page_conversion',
      name: 'Taux de conversion landing pages',
      description: 'Pourcentage de conversions sur les landing pages',
      category: 'marketing',
      value: Math.round(conversionRate * 100) / 100,
      target: 5,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: conversionRate >= 5 ? 'excellent' : conversionRate >= 3 ? 'good' : conversionRate >= 2 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 4. Coût par acquisition (CPA)
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('budget, conversions')
      .gte('created_at', from)
      .lte('created_at', to);

    const totalBudget = campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;
    const totalCampaignConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
    const cpa = totalCampaignConversions > 0 ? totalBudget / totalCampaignConversions : 0;

    kpis.push({
      id: 'marketing_cpa',
      name: 'Coût par acquisition',
      description: 'Coût moyen pour acquérir un client',
      category: 'marketing',
      value: Math.round(cpa),
      target: 50,
      unit: '€',
      trend: 'stable',
      trendPercentage: 0,
      status: cpa <= 50 ? 'excellent' : cpa <= 100 ? 'good' : cpa <= 200 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    return kpis;
  }

  /**
   * Calcule tous les KPIs Social Media
   */
  static async calculateSocialMediaKPIs(userId: string, dateFrom?: string, dateTo?: string): Promise<KPI[]> {
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo || new Date().toISOString();
    const previousFrom = new Date(new Date(from).getTime() - (new Date(to).getTime() - new Date(from).getTime())).toISOString();

    const kpis: KPI[] = [];

    // 1. Taux d'engagement moyen
    const { data: posts } = await supabase
      .from('social_posts')
      .select('likes_count, comments_count, shares_count, reach')
      .gte('published_at', from)
      .lte('published_at', to)
      .not('published_at', 'is', null);

    const totalEngagement = posts?.reduce((sum, p) => {
      return sum + (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0);
    }, 0) || 0;

    const totalReach = posts?.reduce((sum, p) => sum + (p.reach || 0), 0) || 0;
    const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Période précédente
    const { data: prevPosts } = await supabase
      .from('social_posts')
      .select('likes_count, comments_count, shares_count, reach')
      .gte('published_at', previousFrom)
      .lt('published_at', from)
      .not('published_at', 'is', null);

    const prevTotalEngagement = prevPosts?.reduce((sum, p) => {
      return sum + (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0);
    }, 0) || 0;

    const prevTotalReach = prevPosts?.reduce((sum, p) => sum + (p.reach || 0), 0) || 0;
    const prevEngagementRate = prevTotalReach > 0 ? (prevTotalEngagement / prevTotalReach) * 100 : 0;
    const engagementTrend = engagementRate - prevEngagementRate;

    kpis.push({
      id: 'social_engagement_rate',
      name: 'Taux d\'engagement',
      description: 'Pourcentage d\'engagement sur les posts',
      category: 'social',
      value: Math.round(engagementRate * 100) / 100,
      previousValue: Math.round(prevEngagementRate * 100) / 100,
      target: 5,
      unit: '%',
      trend: engagementTrend > 0 ? 'up' : engagementTrend < 0 ? 'down' : 'stable',
      trendPercentage: prevEngagementRate > 0 ? Math.round((engagementTrend / prevEngagementRate) * 100) : 0,
      status: engagementRate >= 5 ? 'excellent' : engagementRate >= 3 ? 'good' : engagementRate >= 2 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 2. Croissance des abonnés
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('follower_count, created_at')
      .eq('user_id', userId);

    // Estimation basée sur les posts (à améliorer avec historique)
    const avgFollowers = accounts && accounts.length > 0
      ? accounts.reduce((sum, a) => sum + (a.follower_count || 0), 0) / accounts.length
      : 0;

    kpis.push({
      id: 'social_follower_growth',
      name: 'Abonnés moyens',
      description: 'Nombre moyen d\'abonnés par compte',
      category: 'social',
      value: Math.round(avgFollowers),
      target: 10000,
      unit: 'abonnés',
      trend: 'stable',
      trendPercentage: 0,
      status: avgFollowers >= 10000 ? 'excellent' : avgFollowers >= 5000 ? 'good' : avgFollowers >= 1000 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 3. Temps de réponse moyen
    const { data: messages } = await supabase
      .from('social_messages')
      .select('created_at, first_response_at')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('first_response_at', 'is', null);

    const responseTimes = messages?.map(msg => {
      const created = new Date(msg.created_at).getTime();
      const responded = new Date(msg.first_response_at).getTime();
      return (responded - created) / (1000 * 60); // Minutes
    }) || [];

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    kpis.push({
      id: 'social_avg_response_time',
      name: 'Temps de réponse moyen',
      description: 'Temps moyen de réponse aux messages',
      category: 'social',
      value: Math.round(avgResponseTime),
      target: 60,
      unit: 'minutes',
      trend: 'stable',
      trendPercentage: 0,
      status: avgResponseTime <= 60 ? 'excellent' : avgResponseTime <= 120 ? 'good' : avgResponseTime <= 240 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    return kpis;
  }

  /**
   * Calcule tous les KPIs Réputation
   */
  static async calculateReputationKPIs(userId: string, dateFrom?: string, dateTo?: string): Promise<KPI[]> {
    const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo || new Date().toISOString();

    const kpis: KPI[] = [];

    // 1. Score de sentiment moyen
    const { data: mentions } = await supabase
      .from('social_mentions')
      .select('sentiment, sentiment_score')
      .gte('published_at', from)
      .lte('published_at', to);

    const sentimentScores = mentions?.map(m => {
      if (m.sentiment === 'positive') return 1;
      if (m.sentiment === 'negative') return -1;
      return 0;
    }) || [];

    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;

    const sentimentPercentage = ((avgSentiment + 1) / 2) * 100; // Convertir -1 à 1 en 0 à 100

    kpis.push({
      id: 'reputation_sentiment_score',
      name: 'Score de sentiment',
      description: 'Sentiment moyen des mentions',
      category: 'reputation',
      value: Math.round(sentimentPercentage * 100) / 100,
      target: 70,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: sentimentPercentage >= 70 ? 'excellent' : sentimentPercentage >= 60 ? 'good' : sentimentPercentage >= 50 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 2. Volume de mentions
    const { count: mentionCount } = await supabase
      .from('social_mentions')
      .select('*', { count: 'exact', head: true })
      .gte('published_at', from)
      .lte('published_at', to);

    kpis.push({
      id: 'reputation_mention_volume',
      name: 'Volume de mentions',
      description: 'Nombre total de mentions',
      category: 'reputation',
      value: mentionCount || 0,
      target: 100,
      unit: 'mentions',
      trend: 'stable',
      trendPercentage: 0,
      status: (mentionCount || 0) >= 100 ? 'excellent' : (mentionCount || 0) >= 50 ? 'good' : (mentionCount || 0) >= 20 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    // 3. Taux de mentions critiques
    const { count: crisisMentions } = await supabase
      .from('social_mentions')
      .select('*', { count: 'exact', head: true })
      .gte('published_at', from)
      .lte('published_at', to)
      .eq('is_crisis', true);

    const crisisRate = mentionCount && mentionCount > 0 ? ((crisisMentions || 0) / mentionCount) * 100 : 0;

    kpis.push({
      id: 'reputation_crisis_rate',
      name: 'Taux de mentions critiques',
      description: 'Pourcentage de mentions identifiées comme crise',
      category: 'reputation',
      value: Math.round(crisisRate * 100) / 100,
      target: 0,
      unit: '%',
      trend: 'stable',
      trendPercentage: 0,
      status: crisisRate === 0 ? 'excellent' : crisisRate <= 2 ? 'good' : crisisRate <= 5 ? 'warning' : 'critical',
      calculatedAt: new Date().toISOString(),
    });

    return kpis;
  }

  /**
   * Récupère tous les KPIs pour une catégorie
   */
  static async getKPIsByCategory(
    category: 'crm' | 'marketing' | 'social' | 'reputation',
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<KPI[]> {
    switch (category) {
      case 'crm':
        return this.calculateCRMKPIs(userId, dateFrom, dateTo);
      case 'marketing':
        return this.calculateMarketingKPIs(userId, dateFrom, dateTo);
      case 'social':
        return this.calculateSocialMediaKPIs(userId, dateFrom, dateTo);
      case 'reputation':
        return this.calculateReputationKPIs(userId, dateFrom, dateTo);
      default:
        return [];
    }
  }

  /**
   * Récupère tous les KPIs
   */
  static async getAllKPIs(userId: string, dateFrom?: string, dateTo?: string): Promise<KPI[]> {
    const [crm, marketing, social, reputation] = await Promise.all([
      this.calculateCRMKPIs(userId, dateFrom, dateTo),
      this.calculateMarketingKPIs(userId, dateFrom, dateTo),
      this.calculateSocialMediaKPIs(userId, dateFrom, dateTo),
      this.calculateReputationKPIs(userId, dateFrom, dateTo),
    ]);

    return [...crm, ...marketing, ...social, ...reputation];
  }
}

