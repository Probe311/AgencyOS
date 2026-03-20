import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Target, Calendar, BarChart3, LineChart,
  DollarSign, Users, CheckCircle2, AlertTriangle, RefreshCw, Download,
  Settings, Filter, ArrowUp, ArrowDown, Minus, Plus
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { CustomBarChart } from '../charts/CustomBarChart';

type ForecastType = 'revenue' | 'leads' | 'conversion' | 'sales' | 'customers' | 'tasks';
type PeriodType = 'week' | 'month' | 'quarter' | 'year';
type ForecastMethod = 'linear' | 'exponential' | 'moving_average' | 'seasonal' | 'ai';

interface Forecast {
  id: string;
  forecast_type: ForecastType;
  period_type: PeriodType;
  forecast_method: ForecastMethod;
  start_date: string;
  end_date: string;
  current_value: number;
  forecasted_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  historical_data: Array<{ date: string; value: number }>;
  forecasted_data: Array<{ date: string; value: number; confidence_lower: number; confidence_upper: number }>;
  factors: Record<string, any>;
  accuracy_score?: number;
  created_at: string;
}

interface Projection {
  id: string;
  metric_name: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  projection_date: string;
  growth_rate: number;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  milestones: Array<{
    date: string;
    target: number;
    achieved?: number;
  }>;
  created_at: string;
}

export const ForecastsProjections: React.FC = () => {
  const { showToast, user } = useApp();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [activeTab, setActiveTab] = useState<'forecasts' | 'projections'>('forecasts');
  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
  const [isProjectionModalOpen, setIsProjectionModalOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [selectedProjection, setSelectedProjection] = useState<Projection | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [forecastFormData, setForecastFormData] = useState({
    forecast_type: 'revenue' as ForecastType,
    period_type: 'month' as PeriodType,
    forecast_method: 'linear' as ForecastMethod,
    start_date: '',
    end_date: ''
  });

  const [projectionFormData, setProjectionFormData] = useState({
    metric_name: '',
    baseline_value: 0,
    target_value: 0,
    projection_date: '',
    growth_rate: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadForecasts();
      loadProjections();
    }
  }, [user?.id]);

  const loadForecasts = async () => {
    if (!user?.id) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('analytics_predictions')
        .select('*')
        .eq('user_id', user.id)
        .in('prediction_type', ['revenue', 'growth', 'conversion'])
        .order('target_date', { ascending: true });

      if (error) throw error;

      // Transformer les prédictions en forecasts
      const transformedForecasts: Forecast[] = (data || []).map((pred: any) => ({
        id: pred.id,
        forecast_type: pred.prediction_type === 'revenue' ? 'revenue' : 
                      pred.prediction_type === 'growth' ? 'leads' : 'conversion',
        period_type: 'month',
        forecast_method: 'ai',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: pred.target_date,
        current_value: pred.current_value,
        forecasted_value: pred.predicted_value,
        confidence_interval: {
          lower: pred.predicted_value * 0.85,
          upper: pred.predicted_value * 1.15
        },
        historical_data: [],
        forecasted_data: [],
        factors: pred.factors || {},
        accuracy_score: pred.confidence_level,
        created_at: pred.created_at
      }));

      setForecasts(transformedForecasts);
    } catch (error: any) {
      showToast('Erreur lors du chargement des prévisions', 'error');
    }
  };

  const loadProjections = async () => {
    try {
      // Pour l'instant, créer des projections depuis les données existantes
      // Dans un vrai projet, cela viendrait d'une table dédiée
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, created_at, lifecycle_stage')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data: quotesData } = await supabase
        .from('quotes')
        .select('id, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (leadsData && quotesData) {
        const currentLeads = leadsData.length;
        const currentRevenue = quotesData
          .filter(q => q.status === 'accepted')
          .reduce((sum, q) => sum + (parseFloat(q.total?.toString() || '0') || 0), 0);

        const projections: Projection[] = [
          {
            id: 'proj-1',
            metric_name: 'Nombre de leads',
            baseline_value: currentLeads,
            target_value: currentLeads * 1.5,
            current_value: currentLeads,
            projection_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            growth_rate: 1.5,
            scenarios: {
              optimistic: currentLeads * 2,
              realistic: currentLeads * 1.5,
              pessimistic: currentLeads * 1.2
            },
            milestones: [
              {
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentLeads * 1.15
              },
              {
                date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentLeads * 1.3
              },
              {
                date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentLeads * 1.5
              }
            ],
            created_at: new Date().toISOString()
          },
          {
            id: 'proj-2',
            metric_name: 'Revenus',
            baseline_value: currentRevenue,
            target_value: currentRevenue * 1.8,
            current_value: currentRevenue,
            projection_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            growth_rate: 1.8,
            scenarios: {
              optimistic: currentRevenue * 2.5,
              realistic: currentRevenue * 1.8,
              pessimistic: currentRevenue * 1.3
            },
            milestones: [
              {
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentRevenue * 1.25
              },
              {
                date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentRevenue * 1.5
              },
              {
                date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                target: currentRevenue * 1.8
              }
            ],
            created_at: new Date().toISOString()
          }
        ];

        setProjections(projections);
      }
    } catch (error: any) {
      showToast('Erreur lors du chargement des projections', 'error');
    }
  };

  const generateForecast = async () => {
    setIsGenerating(true);
    try {
      // Calculer les données historiques
      const { data: historicalData } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', forecastFormData.start_date)
        .lte('created_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      // Calculer les prévisions selon la méthode choisie
      let forecastedValue = 0;
      const historicalValues: Array<{ date: string; value: number }> = [];
      const forecastedValues: Array<{ date: string; value: number; confidence_lower: number; confidence_upper: number }> = [];

      if (historicalData) {
        // Grouper par période
        const grouped = historicalData.reduce((acc: any, item: any) => {
          const date = new Date(item.created_at);
          const key = forecastFormData.period_type === 'week' 
            ? `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 0).getDate()) / 7)}`
            : forecastFormData.period_type === 'month'
            ? `${date.getFullYear()}-${date.getMonth() + 1}`
            : `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
          
          if (!acc[key]) acc[key] = 0;
          acc[key]++;
          return acc;
        }, {});

        // Convertir en tableau
        Object.entries(grouped).forEach(([date, value]) => {
          historicalValues.push({ date, value: value as number });
        });

        // Calculer la prévision selon la méthode
        const values = historicalValues.map(v => v.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;

        switch (forecastFormData.forecast_method) {
          case 'linear':
            forecastedValue = avg + (trend * 3);
            break;
          case 'exponential':
            const growthRate = values.length > 1 ? values[values.length - 1] / values[0] : 1;
            forecastedValue = values[values.length - 1] * Math.pow(growthRate, 3);
            break;
          case 'moving_average':
            const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
            forecastedValue = recentAvg * 3;
            break;
          default:
            forecastedValue = avg * 3;
        }

        // Générer les données prévues
        const endDate = new Date(forecastFormData.end_date);
        const startDate = new Date();
        const periods = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * (forecastFormData.period_type === 'week' ? 7 : forecastFormData.period_type === 'month' ? 30 : 90)));

        for (let i = 1; i <= periods; i++) {
          const periodValue = forecastedValue / periods;
          forecastedValues.push({
            date: new Date(startDate.getTime() + i * (forecastFormData.period_type === 'week' ? 7 : forecastFormData.period_type === 'month' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString(),
            value: periodValue,
            confidence_lower: periodValue * 0.85,
            confidence_upper: periodValue * 1.15
          });
        }
      }

      const newForecast: Forecast = {
        id: `forecast-${Date.now()}`,
        ...forecastFormData,
        start_date: forecastFormData.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: forecastFormData.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        current_value: historicalValues[historicalValues.length - 1]?.value || 0,
        forecasted_value: forecastedValue,
        confidence_interval: {
          lower: forecastedValue * 0.85,
          upper: forecastedValue * 1.15
        },
        historical_data: historicalValues,
        forecasted_data: forecastedValues,
        factors: {},
        created_at: new Date().toISOString()
      };

      setForecasts([...forecasts, newForecast]);
      setIsForecastModalOpen(false);
      showToast('Prévision générée avec succès', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la génération', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const createProjection = async () => {
    try {
      const newProjection: Projection = {
        id: `proj-${Date.now()}`,
        ...projectionFormData,
        current_value: projectionFormData.baseline_value,
        scenarios: {
          optimistic: projectionFormData.target_value * 1.3,
          realistic: projectionFormData.target_value,
          pessimistic: projectionFormData.target_value * 0.7
        },
        milestones: [
          {
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            target: projectionFormData.baseline_value + (projectionFormData.target_value - projectionFormData.baseline_value) * 0.33
          },
          {
            date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            target: projectionFormData.baseline_value + (projectionFormData.target_value - projectionFormData.baseline_value) * 0.66
          },
          {
            date: projectionFormData.projection_date,
            target: projectionFormData.target_value
          }
        ],
        created_at: new Date().toISOString()
      };

      setProjections([...projections, newProjection]);
      setIsProjectionModalOpen(false);
      showToast('Projection créée avec succès', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la création', 'error');
    }
  };

  const getForecastTypeLabel = (type: ForecastType) => {
    const labels = {
      revenue: 'Revenus',
      leads: 'Leads',
      conversion: 'Taux de conversion',
      sales: 'Ventes',
      customers: 'Clients',
      tasks: 'Tâches'
    };
    return labels[type];
  };

  const getForecastMethodLabel = (method: ForecastMethod) => {
    const labels = {
      linear: 'Linéaire',
      exponential: 'Exponentiel',
      moving_average: 'Moyenne mobile',
      seasonal: 'Saisonnier',
      ai: 'IA'
    };
    return labels[method];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  return (
    <PageLayout
      header={{
        icon: TrendingUp,
        title: "Prévisions et projections",
        description: "Analysez les tendances et projetez vos performances futures",
        rightActions: [
          {
            label: activeTab === 'forecasts' ? "Nouvelle prévision" : "Nouvelle projection",
            icon: Plus,
            onClick: () => activeTab === 'forecasts' ? setIsForecastModalOpen(true) : setIsProjectionModalOpen(true),
            variant: 'primary'
          }
        ],
        viewToggle: {
          value: activeTab,
          onChange: (value) => setActiveTab(value as 'forecasts' | 'projections'),
          options: [
            { value: 'forecasts', icon: LineChart, title: 'Prévisions' },
            { value: 'projections', icon: Target, title: 'Projections' }
          ]
        }
      }}
    >
      <div className="space-y-6">
        {activeTab === 'forecasts' ? (
          <>
            {/* Liste des prévisions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecasts.map((forecast) => (
                <div
                  key={forecast.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedForecast(forecast)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {getForecastTypeLabel(forecast.forecast_type)}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {getForecastMethodLabel(forecast.forecast_method)}
                      </p>
                    </div>
                    <Badge variant={forecast.forecasted_value > forecast.current_value ? 'green' : 'red'}>
                      {forecast.forecasted_value > forecast.current_value ? (
                        <ArrowUp size={12} className="mr-1" />
                      ) : (
                        <ArrowDown size={12} className="mr-1" />
                      )}
                      {((forecast.forecasted_value / forecast.current_value - 1) * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Valeur actuelle</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {forecast.forecast_type === 'revenue' ? formatCurrency(forecast.current_value) : formatNumber(forecast.current_value)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Prévision</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {forecast.forecast_type === 'revenue' ? formatCurrency(forecast.forecasted_value) : formatNumber(forecast.forecasted_value)}
                      </span>
                    </div>
                    {forecast.accuracy_score && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Confiance</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {(forecast.accuracy_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {forecasts.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <LineChart size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="text-slate-500 dark:text-slate-400">Aucune prévision disponible</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => setIsForecastModalOpen(true)}
                >
                  Créer une prévision
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Liste des projections */}
            <div className="space-y-4">
              {projections.map((projection) => {
                const progress = ((projection.current_value - projection.baseline_value) / (projection.target_value - projection.baseline_value)) * 100;
                const isOnTrack = projection.current_value >= projection.baseline_value + (projection.target_value - projection.baseline_value) * 0.5;

                return (
                  <div
                    key={projection.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                          {projection.metric_name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Objectif: {new Date(projection.projection_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge variant={isOnTrack ? 'green' : 'amber'}>
                        {isOnTrack ? 'Sur la bonne voie' : 'Attention requise'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Baseline</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.baseline_value) : formatNumber(projection.baseline_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actuel</p>
                        <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.current_value) : formatNumber(projection.current_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Objectif</p>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.target_value) : formatNumber(projection.target_value)}
                        </p>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>Progression</span>
                        <span>{Math.max(0, Math.min(100, progress)).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Scénarios */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <p className="text-red-600 dark:text-red-400 font-semibold">Pessimiste</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.scenarios.pessimistic) : formatNumber(projection.scenarios.pessimistic)}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <p className="text-amber-600 dark:text-amber-400 font-semibold">Réaliste</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.scenarios.realistic) : formatNumber(projection.scenarios.realistic)}
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <p className="text-green-600 dark:text-green-400 font-semibold">Optimiste</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {projection.metric_name.toLowerCase().includes('revenu') ? formatCurrency(projection.scenarios.optimistic) : formatNumber(projection.scenarios.optimistic)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {projections.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Target size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="text-slate-500 dark:text-slate-400">Aucune projection disponible</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => setIsProjectionModalOpen(true)}
                >
                  Créer une projection
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal création prévision */}
      <Modal
        isOpen={isForecastModalOpen}
        onClose={() => setIsForecastModalOpen(false)}
        title="Nouvelle prévision"
        size="lg"
      >
        <div className="space-y-4">
          <Dropdown
            label="Type de prévision"
            value={forecastFormData.forecast_type}
            onChange={(value) => setForecastFormData({ ...forecastFormData, forecast_type: value as ForecastType })}
            options={[
              { value: 'revenue', label: 'Revenus' },
              { value: 'leads', label: 'Leads' },
              { value: 'conversion', label: 'Taux de conversion' },
              { value: 'sales', label: 'Ventes' },
              { value: 'customers', label: 'Clients' },
              { value: 'tasks', label: 'Tâches' }
            ]}
          />
          <Dropdown
            label="Période"
            value={forecastFormData.period_type}
            onChange={(value) => setForecastFormData({ ...forecastFormData, period_type: value as PeriodType })}
            options={[
              { value: 'week', label: 'Hebdomadaire' },
              { value: 'month', label: 'Mensuel' },
              { value: 'quarter', label: 'Trimestriel' },
              { value: 'year', label: 'Annuel' }
            ]}
          />
          <Dropdown
            label="Méthode"
            value={forecastFormData.forecast_method}
            onChange={(value) => setForecastFormData({ ...forecastFormData, forecast_method: value as ForecastMethod })}
            options={[
              { value: 'linear', label: 'Linéaire' },
              { value: 'exponential', label: 'Exponentiel' },
              { value: 'moving_average', label: 'Moyenne mobile' },
              { value: 'seasonal', label: 'Saisonnier' },
              { value: 'ai', label: 'IA (recommandé)' }
            ]}
          />
          <Input
            label="Date de début"
            type="date"
            value={forecastFormData.start_date}
            onChange={(e) => setForecastFormData({ ...forecastFormData, start_date: e.target.value })}
          />
          <Input
            label="Date de fin"
            type="date"
            value={forecastFormData.end_date}
            onChange={(e) => setForecastFormData({ ...forecastFormData, end_date: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsForecastModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={generateForecast} disabled={isGenerating}>
              {isGenerating ? 'Génération...' : 'Générer la prévision'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal création projection */}
      <Modal
        isOpen={isProjectionModalOpen}
        onClose={() => setIsProjectionModalOpen(false)}
        title="Nouvelle projection"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la métrique"
            value={projectionFormData.metric_name}
            onChange={(e) => setProjectionFormData({ ...projectionFormData, metric_name: e.target.value })}
            placeholder="Ex: Revenus mensuels, Nombre de leads..."
          />
          <Input
            label="Valeur de base"
            type="number"
            value={projectionFormData.baseline_value}
            onChange={(e) => setProjectionFormData({ ...projectionFormData, baseline_value: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Valeur cible"
            type="number"
            value={projectionFormData.target_value}
            onChange={(e) => setProjectionFormData({ ...projectionFormData, target_value: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Date de projection"
            type="date"
            value={projectionFormData.projection_date}
            onChange={(e) => setProjectionFormData({ ...projectionFormData, projection_date: e.target.value })}
          />
          <Input
            label="Taux de croissance (%)"
            type="number"
            value={projectionFormData.growth_rate}
            onChange={(e) => setProjectionFormData({ ...projectionFormData, growth_rate: parseFloat(e.target.value) || 0 })}
            placeholder="Ex: 50 pour +50%"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsProjectionModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={createProjection}>
              Créer la projection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal détail prévision */}
      {selectedForecast && (
        <Modal
          isOpen={!!selectedForecast}
          onClose={() => setSelectedForecast(null)}
          title={`Détail: ${getForecastTypeLabel(selectedForecast.forecast_type)}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Valeur actuelle</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedForecast.forecast_type === 'revenue' ? formatCurrency(selectedForecast.current_value) : formatNumber(selectedForecast.current_value)}
                </p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Prévision</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedForecast.forecast_type === 'revenue' ? formatCurrency(selectedForecast.forecasted_value) : formatNumber(selectedForecast.forecasted_value)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Évolution</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {((selectedForecast.forecasted_value / selectedForecast.current_value - 1) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {selectedForecast.historical_data.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Données historiques et prévisions</h4>
                <div className="h-64">
                  <CustomAreaChart
                    data={[
                      ...selectedForecast.historical_data.map(d => ({ name: d.date, value: d.value })),
                      ...selectedForecast.forecasted_data.map(d => ({ name: d.date, value: d.value }))
                    ]}
                    dataKey="value"
                    name={getForecastTypeLabel(selectedForecast.forecast_type)}
                  />
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Intervalle de confiance</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>Minimum: {selectedForecast.forecast_type === 'revenue' ? formatCurrency(selectedForecast.confidence_interval.lower) : formatNumber(selectedForecast.confidence_interval.lower)}</p>
                <p>Maximum: {selectedForecast.forecast_type === 'revenue' ? formatCurrency(selectedForecast.confidence_interval.upper) : formatNumber(selectedForecast.confidence_interval.upper)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};

