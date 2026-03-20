import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Brain, Target, AlertTriangle, BarChart3, RefreshCw,
  ArrowUp, ArrowDown, CheckCircle2, Clock, DollarSign, Users
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';
import {
  PredictiveAnalysis as PredictiveAnalysisType,
  PredictionType,
  predictLeadConversion,
  predictChurnRisk,
  predictCampaignPerformance,
  predictOptimalContactTime,
  getPredictiveAnalyses,
  generateGlobalPredictiveAnalysis
} from '../../lib/services/predictiveAnalysisService';
import { CustomAreaChart } from '../charts/CustomAreaChart';

export const PredictiveAnalysis: React.FC = () => {
  const { showToast, user, leads } = useApp();
  const [analyses, setAnalyses] = useState<PredictiveAnalysisType[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PredictiveAnalysisType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterType, setFilterType] = useState<PredictionType | ''>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadAnalyses();
    }
  }, [user, filterType]);

  const loadAnalyses = async () => {
    try {
      const data = await getPredictiveAnalyses(user?.id || '', {
        prediction_type: filterType || undefined
      });
      setAnalyses(data);
    } catch (error: any) {
      showToast('Erreur lors du chargement des analyses', 'error');
    }
  };

  const handlePredictLeadConversion = async () => {
    if (!selectedLeadId) {
      showToast('Veuillez sélectionner un lead', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const analysis = await predictLeadConversion(selectedLeadId);
      setAnalyses([analysis, ...analyses]);
      showToast('Analyse de conversion générée', 'success');
      setSelectedLeadId('');
    } catch (error: any) {
      showToast('Erreur lors de la prédiction', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePredictChurnRisk = async () => {
    if (!selectedLeadId) {
      showToast('Veuillez sélectionner un lead', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const analysis = await predictChurnRisk(selectedLeadId);
      setAnalyses([analysis, ...analyses]);
      showToast('Analyse de risque de churn générée', 'success');
      setSelectedLeadId('');
    } catch (error: any) {
      showToast('Erreur lors de la prédiction', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateGlobalAnalysis = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const globalAnalyses = await generateGlobalPredictiveAnalysis(user.id);
      setAnalyses([...globalAnalyses, ...analyses]);
      showToast('Analyse globale générée', 'success');
    } catch (error: any) {
      showToast('Erreur lors de la génération', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPredictionTypeLabel = (type: PredictionType) => {
    const labels = {
      lead_conversion: 'Conversion de lead',
      revenue_forecast: 'Prévision de revenus',
      churn_risk: 'Risque de churn',
      task_completion: 'Achèvement de tâche',
      campaign_performance: 'Performance de campagne',
      workflow_success: 'Succès de workflow',
      customer_lifetime_value: 'Valeur vie client',
      optimal_contact_time: 'Heure optimale de contact'
    };
    return labels[type] || type;
  };

  const getPredictionTypeIcon = (type: PredictionType) => {
    const icons = {
      lead_conversion: Target,
      revenue_forecast: DollarSign,
      churn_risk: AlertTriangle,
      task_completion: CheckCircle2,
      campaign_performance: BarChart3,
      workflow_success: TrendingUp,
      customer_lifetime_value: Users,
      optimal_contact_time: Clock
    };
    return icons[type] || Brain;
  };

  const formatValue = (value: number, type: PredictionType) => {
    if (type === 'revenue_forecast' || type === 'customer_lifetime_value') {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
    }
    if (type === 'optimal_contact_time') {
      return `${Math.round(value)}h`;
    }
    return `${value.toFixed(1)}%`;
  };

  const conversionAnalyses = analyses.filter(a => a.prediction_type === 'lead_conversion');
  const churnAnalyses = analyses.filter(a => a.prediction_type === 'churn_risk');
  const revenueAnalyses = analyses.filter(a => a.prediction_type === 'revenue_forecast');

  return (
    <PageLayout
      header={{
        icon: Brain,
        title: "Analyse prédictive",
        description: "Prédictions IA pour optimiser vos performances",
        rightActions: [
          {
            label: isGenerating ? 'Génération...' : 'Analyse globale',
            icon: RefreshCw,
            onClick: handleGenerateGlobalAnalysis,
            variant: 'outline',
            disabled: isGenerating
          }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Actions rapides */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Prédictions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sélectionner un lead</label>
              <Dropdown
                value={selectedLeadId}
                onChange={(value) => setSelectedLeadId(value)}
                options={[
                  { value: '', label: 'Sélectionner un lead...' },
                  ...leads.slice(0, 20).map(lead => ({
                    value: lead.id,
                    label: `${lead.name || 'Lead'} - Scoring: ${lead.scoring || 0}`
                  }))
                ]}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="primary"
                onClick={handlePredictLeadConversion}
                disabled={!selectedLeadId || isGenerating}
                icon={Target}
              >
                Prédire conversion
              </Button>
              <Button
                variant="outline"
                onClick={handlePredictChurnRisk}
                disabled={!selectedLeadId || isGenerating}
                icon={AlertTriangle}
              >
                Prédire churn
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-4">
          <Dropdown
            label="Type de prédiction"
            value={filterType}
            onChange={(value) => setFilterType(value as PredictionType || '')}
            options={[
              { value: '', label: 'Tous les types' },
              { value: 'lead_conversion', label: 'Conversion de lead' },
              { value: 'revenue_forecast', label: 'Prévision de revenus' },
              { value: 'churn_risk', label: 'Risque de churn' },
              { value: 'campaign_performance', label: 'Performance de campagne' },
              { value: 'optimal_contact_time', label: 'Heure optimale de contact' }
            ]}
          />
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Analyses de conversion</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{conversionAnalyses.length}</div>
            {conversionAnalyses.length > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Moyenne: {formatValue(
                conversionAnalyses.reduce((sum, a) => sum + a.predicted_value, 0) / conversionAnalyses.length,
                'lead_conversion'
              )}
            </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Risques de churn</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{churnAnalyses.length}</div>
            {churnAnalyses.length > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Moyenne: {formatValue(
                  churnAnalyses.reduce((sum, a) => sum + a.predicted_value, 0) / churnAnalyses.length,
                  'churn_risk'
                )}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Prévisions de revenus</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{revenueAnalyses.length}</div>
            {revenueAnalyses.length > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total: {formatValue(
                  revenueAnalyses.reduce((sum, a) => sum + a.predicted_value, 0),
                  'revenue_forecast'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Liste des analyses */}
        {analyses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <Brain size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">Aucune analyse prédictive disponible</p>
            <Button variant="primary" onClick={handleGenerateGlobalAnalysis} disabled={isGenerating}>
              {isGenerating ? 'Génération...' : 'Générer une analyse globale'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => {
              const Icon = getPredictionTypeIcon(analysis.prediction_type);
              const change = analysis.predicted_value - analysis.current_value;
              const changePercent = analysis.current_value > 0
                ? ((change / analysis.current_value) * 100).toFixed(1)
                : '0.0';

              return (
                <div
                  key={analysis.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedAnalysis(analysis);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                        <Icon className="text-indigo-600 dark:text-indigo-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {getPredictionTypeLabel(analysis.prediction_type)}
                          </h3>
                          <Badge variant={analysis.confidence_level >= 80 ? 'green' : analysis.confidence_level >= 60 ? 'orange' : 'red'}>
                            {analysis.confidence_level.toFixed(0)}% confiance
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {analysis.metric_name}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Valeur actuelle</div>
                            <div className="text-lg font-semibold text-slate-900 dark:text-white">
                              {formatValue(analysis.current_value, analysis.prediction_type)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Prédiction</div>
                            <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                              {formatValue(analysis.predicted_value, analysis.prediction_type)}
                            </div>
                          </div>
                          {analysis.current_value > 0 && (
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Évolution</div>
                              <div className={`text-lg font-semibold flex items-center gap-1 ${
                                change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {change >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                {changePercent}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal détail analyse */}
      {selectedAnalysis && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={getPredictionTypeLabel(selectedAnalysis.prediction_type)}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Valeur actuelle</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatValue(selectedAnalysis.current_value, selectedAnalysis.prediction_type)}
                </div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Prédiction</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatValue(selectedAnalysis.predicted_value, selectedAnalysis.prediction_type)}
                </div>
              </div>
            </div>

            {selectedAnalysis.factors.positive.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Facteurs positifs</h4>
                <div className="space-y-2">
                  {selectedAnalysis.factors.positive.map((factor, index) => (
                    <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{factor.factor}</span>
                      <Badge variant="green">+{factor.impact}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAnalysis.factors.negative.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Facteurs négatifs</h4>
                <div className="space-y-2">
                  {selectedAnalysis.factors.negative.map((factor, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{factor.factor}</span>
                      <Badge variant="red">{factor.impact}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAnalysis.recommendations && selectedAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Recommandations</h4>
                <div className="space-y-2">
                  {selectedAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{rec.action}</span>
                        <Badge variant={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'slate'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Impact estimé: {rec.expected_impact}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Niveau de confiance</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedAnalysis.confidence_level.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Horizon de prédiction: {selectedAnalysis.prediction_horizon} jours
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
};

