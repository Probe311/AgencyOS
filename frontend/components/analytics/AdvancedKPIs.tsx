import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, AlertCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { AdvancedKPIsService, KPI } from '../../lib/services/advancedKPIsService';
import { useApp } from '../contexts/AppContext';

export const AdvancedKPIs: React.FC = () => {
  const { showToast, user } = useApp();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crm' | 'marketing' | 'social' | 'reputation'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');

  useEffect(() => {
    loadKPIs();
  }, [selectedCategory, dateRange]);

  const loadKPIs = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const dateFrom = getDateFromRange(dateRange);
      const dateTo = new Date().toISOString();

      let kpisData: KPI[];
      if (selectedCategory === 'all') {
        kpisData = await AdvancedKPIsService.getAllKPIs(user.id, dateFrom, dateTo);
      } else {
        kpisData = await AdvancedKPIsService.getKPIsByCategory(selectedCategory, user.id, dateFrom, dateTo);
      }

      setKpis(kpisData);
    } catch (error: any) {
      showToast('Erreur lors du chargement des KPIs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDateFromRange = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getStatusIcon = (status: KPI['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'good':
        return <CheckCircle size={20} className="text-blue-600" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-600" />;
      case 'critical':
        return <XCircle size={20} className="text-red-600" />;
    }
  };

  const getStatusColor = (status: KPI['status']) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'good':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  const getTrendIcon = (trend: KPI['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'down':
        return <TrendingDown size={16} className="text-red-600" />;
      case 'stable':
        return <Minus size={16} className="text-slate-400" />;
    }
  };

  const getCategoryLabel = (category: KPI['category']) => {
    switch (category) {
      case 'crm':
        return 'CRM';
      case 'marketing':
        return 'Marketing';
      case 'social':
        return 'Social Media';
      case 'reputation':
        return 'Réputation';
    }
  };

  const filteredKPIs = selectedCategory === 'all' 
    ? kpis 
    : kpis.filter(kpi => kpi.category === selectedCategory);

  const groupedKPIs = filteredKPIs.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, KPI[]>);

  if (loading) {
    return (
      <PageLayout
        header={{
          title: "KPIs Avancés",
          description: "Indicateurs clés de performance détaillés",
        }}
      >
        <div className="text-center py-8">Chargement...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={{
        title: "KPIs Avancés",
        description: "Indicateurs clés de performance détaillés par catégorie",
        rightActions: [
          {
            label: "Actualiser",
            onClick: loadKPIs,
            variant: 'outline',
          },
        ],
      }}
    >
      <div className="space-y-6">
        {/* Filtres */}
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Dropdown
            label="Catégorie"
            value={selectedCategory}
            onChange={(value) => setSelectedCategory(value as any)}
            options={[
              { value: 'all', label: 'Toutes' },
              { value: 'crm', label: 'CRM' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'social', label: 'Social Media' },
              { value: 'reputation', label: 'Réputation' },
            ]}
          />
          <Dropdown
            label="Période"
            value={dateRange}
            onChange={(value) => setDateRange(value as any)}
            options={[
              { value: '7d', label: '7 derniers jours' },
              { value: '30d', label: '30 derniers jours' },
              { value: '90d', label: '90 derniers jours' },
            ]}
          />
        </div>

        {/* KPIs par catégorie */}
        {Object.entries(groupedKPIs).map(([category, categoryKPIs]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {getCategoryLabel(category as KPI['category'])}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryKPIs.map((kpi) => (
                <div
                  key={kpi.id}
                  className={`p-6 rounded-lg border-2 ${getStatusColor(kpi.status)} transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                        {kpi.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {kpi.description}
                      </p>
                    </div>
                    {getStatusIcon(kpi.status)}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {kpi.value.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {kpi.unit}
                      </span>
                    </div>

                    {kpi.previousValue !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        {getTrendIcon(kpi.trend)}
                        <span className={kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-slate-400'}>
                          {kpi.trendPercentage > 0 ? '+' : ''}{kpi.trendPercentage}%
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          vs période précédente ({kpi.previousValue.toLocaleString()} {kpi.unit})
                        </span>
                      </div>
                    )}
                  </div>

                  {kpi.target !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target size={14} className="text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">
                        Objectif: {kpi.target.toLocaleString()} {kpi.unit}
                      </span>
                      <Badge
                        variant={kpi.value >= kpi.target ? 'success' : 'warning'}
                      >
                        {Math.round((kpi.value / kpi.target) * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* Barre de progression vers l'objectif */}
                  {kpi.target !== undefined && (
                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          kpi.value >= kpi.target
                            ? 'bg-green-600'
                            : kpi.value >= kpi.target * 0.8
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{
                          width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredKPIs.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Aucun KPI disponible</p>
            <p className="text-sm">Les données seront disponibles une fois que vous aurez des activités.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

