/**
 * Dashboard de visualisation des métriques de scraping
 * Affiche les graphiques de performance temporelle et l'analyse comparative des sources
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, Clock, DollarSign, Users, Target, AlertCircle } from 'lucide-react';
import { CustomLineChart } from '../charts/CustomLineChart';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Loader } from '../ui/Loader';
import { Badge } from '../ui/Badge';
import { calculateScrapingPerformance, ScrapingPerformanceStats } from '../../lib/services/scrapingPerformanceService';
import { calculateConversionMetrics, ConversionMetrics } from '../../lib/services/scrapingConversionMetricsService';
import { useApp } from '../contexts/AppContext';

type Period = 'day' | 'week' | 'month' | 'all';

export const ScrapingAnalyticsDashboard: React.FC = () => {
  const { showToast } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState<ScrapingPerformanceStats | null>(null);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null);
  const [temporalData, setTemporalData] = useState<any[]>([]);
  const [sourceComparisonData, setSourceComparisonData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les statistiques de performance
      const perfStats = await calculateScrapingPerformance(period);
      setPerformanceStats(perfStats);

      // Charger les métriques de conversion
      const convMetrics = await calculateConversionMetrics(period);
      setConversionMetrics(convMetrics);

      // Préparer les données temporelles pour les graphiques
      await prepareTemporalData(perfStats);
      
      // Préparer les données de comparaison des sources
      prepareSourceComparisonData(perfStats, convMetrics);
    } catch (error: any) {
      console.error('Erreur chargement données analytics scraping:', error);
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const prepareTemporalData = async (stats: ScrapingPerformanceStats) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Récupérer les sessions par jour pour la période
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      const { data: sessions } = await supabase
        .from('scraping_sessions')
        .select('started_at, leads_found, leads_added, status, source')
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (!sessions) {
        setTemporalData([]);
        return;
      }

      // Grouper par jour
      const dailyData: Record<string, {
        date: string;
        sessions: number;
        successfulSessions: number;
        leadsFound: number;
        leadsAdded: number;
        successRate: number;
      }> = {};

      sessions.forEach(session => {
        const date = new Date(session.started_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            sessions: 0,
            successfulSessions: 0,
            leadsFound: 0,
            leadsAdded: 0,
            successRate: 0,
          };
        }

        dailyData[date].sessions++;
        if (session.status === 'completed') {
          dailyData[date].successfulSessions++;
        }
        dailyData[date].leadsFound += session.leads_found || 0;
        dailyData[date].leadsAdded += session.leads_added || 0;
      });

      // Calculer les taux de succès
      const temporalDataArray = Object.values(dailyData).map(day => ({
        ...day,
        successRate: day.sessions > 0 ? (day.successfulSessions / day.sessions) * 100 : 0,
      }));

      setTemporalData(temporalDataArray);
    } catch (error) {
      console.error('Erreur préparation données temporelles:', error);
      setTemporalData([]);
    }
  };

  const prepareSourceComparisonData = (perfStats: ScrapingPerformanceStats, convMetrics: ConversionMetrics) => {
    const comparisonData = perfStats.sourcesStats.map(sourceStats => {
      const sourceConvMetrics = convMetrics.sourceMetrics.find(m => m.source === sourceStats.source);
      
      return {
        source: sourceStats.source,
        sessions: sourceStats.totalSessions,
        successRate: sourceStats.successRate,
        leadsFound: sourceStats.totalLeadsFound,
        leadsAdded: sourceStats.totalLeadsAdded,
        averageLeadsPerSession: sourceStats.averageLeadsPerSession,
        averageDuration: sourceStats.averageDuration,
        totalCost: sourceStats.totalCost,
        conversionRate: sourceConvMetrics?.conversionRateScrapingToClient || 0,
        clientsWon: sourceConvMetrics?.clientsWon || 0,
        revenue: sourceConvMetrics?.revenue || 0,
      };
    });

    setSourceComparisonData(comparisonData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des métriques...</p>
        </div>
      </div>
    );
  }

  if (!performanceStats || !conversionMetrics) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <AlertCircle size={64} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium mb-2">Aucune donnée disponible</p>
        <p className="text-sm">Aucune session de scraping trouvée pour cette période</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-4">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Scraping</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Performance temporelle et analyse comparative des sources</p>
        </div>
        <Dropdown
          value={period}
          onChange={(value) => setPeriod(value as Period)}
          options={[
            { label: 'Aujourd\'hui', value: 'day' },
            { label: '7 derniers jours', value: 'week' },
            { label: 'Ce mois', value: 'month' },
            { label: 'Tout', value: 'all' },
          ]}
          containerClassName="w-48"
        />
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-slate-400" />
            <Badge className="bg-blue-100 text-blue-700">Taux</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taux de succès</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {performanceStats.successRate.toFixed(1)}%
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Users size={20} className="text-slate-400" />
            <Badge className="bg-emerald-100 text-emerald-700">Leads</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Leads ajoutés</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {performanceStats.totalLeadsAdded}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <Target size={20} className="text-slate-400" />
            <Badge className="bg-purple-100 text-purple-700">Conversion</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Taux conversion global</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {conversionMetrics.globalMetrics.overallConversionRate.toFixed(1)}%
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={20} className="text-slate-400" />
            <Badge className="bg-amber-100 text-amber-700">ROI</Badge>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ROI</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {conversionMetrics.globalMetrics.roi.toFixed(0)}%
          </h3>
        </div>
      </div>

      {/* Graphiques de performance temporelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du nombre de leads trouvés/ajoutés */}
        <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Évolution des leads (dans le temps)
          </h3>
          {temporalData.length > 0 ? (
            <CustomLineChart
              data={temporalData}
              xAxisKey="date"
              lines={[
                { key: 'leadsFound', name: 'Leads trouvés', color: '#3b82f6' },
                { key: 'leadsAdded', name: 'Leads ajoutés', color: '#10b981' },
              ]}
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Évolution du taux de succès */}
        <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Évolution du taux de succès
          </h3>
          {temporalData.length > 0 ? (
            <CustomAreaChart
              data={temporalData}
              xAxisKey="date"
              dataKey="successRate"
              color="#8b5cf6"
              height={300}
              showXAxis={true}
              showYAxis={true}
              showGrid={true}
              showTooltip={true}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Analyse comparative des sources */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Comparaison des sources
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Graphique en barres : Leads par source */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Leads trouvés par source
            </h4>
            {sourceComparisonData.length > 0 ? (
              <CustomBarChart
                data={sourceComparisonData}
                xAxisKey="source"
                bars={[
                  { key: 'leadsFound', name: 'Leads trouvés', color: '#3b82f6' },
                  { key: 'leadsAdded', name: 'Leads ajoutés', color: '#10b981' },
                ]}
                height={250}
              />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                Aucune donnée disponible
              </div>
            )}
          </div>

          {/* Graphique en barres : Taux de succès par source */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Taux de succès par source
            </h4>
            {sourceComparisonData.length > 0 ? (
              <CustomBarChart
                data={sourceComparisonData}
                xAxisKey="source"
                bars={[
                  { key: 'successRate', name: 'Taux de succès (%)', color: '#8b5cf6' },
                ]}
                height={250}
              />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>

        {/* Graphique en camembert : Répartition des sessions par source */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Répartition des sessions par source
          </h4>
          {sourceComparisonData.length > 0 ? (
            <div className="flex justify-center">
              <CustomPieChart
                data={sourceComparisonData.map(s => ({
                  name: s.source,
                  value: s.sessions,
                }))}
                height={300}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Graphique en barres : Conversion par source */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Taux de conversion scraping → client par source
          </h4>
          {sourceComparisonData.length > 0 ? (
            <CustomBarChart
              data={sourceComparisonData}
              xAxisKey="source"
              bars={[
                { key: 'conversionRate', name: 'Taux de conversion (%)', color: '#f59e0b' },
              ]}
              height={250}
            />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Tableau de comparaison détaillée */}
        <div className="mt-6 overflow-x-auto">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
            Comparaison détaillée des sources
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Source</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Sessions</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Taux succès</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Leads trouvés</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Leads ajoutés</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Moy. leads/session</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Durée moy. (s)</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Taux conversion</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Clients</th>
                <th className="text-right py-3 px-4 font-bold text-slate-700 dark:text-slate-300">CA (€)</th>
              </tr>
            </thead>
            <tbody>
              {sourceComparisonData.map((source, index) => (
                <tr
                  key={source.source}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    index % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {source.source}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.sessions}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge
                      className={
                        source.successRate >= 90
                          ? 'bg-green-100 text-green-700'
                          : source.successRate >= 70
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {source.successRate.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.leadsFound}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.leadsAdded}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.averageLeadsPerSession.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.averageDuration.toFixed(0)}s
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge
                      className={
                        source.conversionRate >= 5
                          ? 'bg-green-100 text-green-700'
                          : source.conversionRate >= 2
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {source.conversionRate.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {source.clientsWon}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                    {source.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

