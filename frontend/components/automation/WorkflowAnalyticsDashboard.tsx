/**
 * Dashboard d'analytics pour les workflows automatisés
 * Affiche les métriques de performance, taux d'exécution, conversion, engagement
 */

import { useState, useEffect } from 'react';
import { 
  calculateWorkflowMetrics, 
  calculateConversionRate,
  calculateEngagementMetrics,
  calculateAverageTimePerStage,
  calculateAutomationROI,
  getAutomationHistory,
  WorkflowMetrics,
  EngagementMetrics,
} from '../../lib/services/workflowAnalytics';
import { ActionExecution } from '../../lib/supabase/hooks/useAutomatedActions';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface WorkflowAnalyticsDashboardProps {
  workflowId?: string;
  workflowName?: string;
  scenarioType?: string;
  period?: {
    start: Date;
    end: Date;
  };
  showAllWorkflows?: boolean; // Si true, affiche tous les workflows
}

export const WorkflowAnalyticsDashboard = ({ 
  workflowId, 
  workflowName = 'Workflow',
  scenarioType,
  period,
  showAllWorkflows = false,
}: WorkflowAnalyticsDashboardProps) => {
  // Note: useAutomatedActions pourrait ne pas retourner directement les actions
  // On devra peut-être adapter selon la structure réelle
  const [automatedActions, setAutomatedActions] = useState<AutomatedAction[]>([]);
  
  useEffect(() => {
    // Charger la liste des workflows/actions automatisées
    // TODO: Adapter selon la structure réelle de useAutomatedActions
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      // Récupérer depuis Supabase directement
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('automated_actions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomatedActions((data || []) as AutomatedAction[]);
    } catch (error) {
      console.error('Erreur chargement workflows:', error);
    }
  };
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [roi, setRoi] = useState<Awaited<ReturnType<typeof calculateAutomationROI>> | null>(null);
  const [stageTimes, setStageTimes] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<ActionExecution[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(period || {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
    end: new Date(),
  });
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(workflowId);
  const [allWorkflowsMetrics, setAllWorkflowsMetrics] = useState<WorkflowMetrics[]>([]);

  useEffect(() => {
    if (showAllWorkflows && automatedActions) {
      loadAllWorkflowsMetrics();
    } else if (selectedWorkflowId || workflowId) {
      loadMetrics();
    }
  }, [selectedWorkflowId, workflowId, selectedPeriod, showAllWorkflows, automatedActions]);

  const loadAllWorkflowsMetrics = async () => {
    if (!automatedActions || automatedActions.length === 0) return;

    try {
      setLoading(true);
      const metricsPromises = automatedActions
        .filter(action => action.isActive)
        .map(action => calculateWorkflowMetrics(action.id, action.name, selectedPeriod));
      
      const allMetrics = await Promise.all(metricsPromises);
      setAllWorkflowsMetrics(allMetrics);
    } catch (error) {
      console.error('Erreur chargement métriques tous workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    const idToUse = selectedWorkflowId || workflowId;
    if (!idToUse) return;

    try {
      setLoading(true);

      // Charger toutes les métriques en parallèle
      const [metricsData, engagementData, roiData, stageTimesData, historyData] = await Promise.all([
        calculateWorkflowMetrics(idToUse, workflowName, selectedPeriod),
        calculateEngagementMetrics(idToUse, selectedPeriod),
        calculateAutomationROI(idToUse, selectedPeriod),
        calculateAverageTimePerStage(scenarioType || '', selectedPeriod),
        getAutomationHistory({ workflowId: idToUse, period: selectedPeriod, limit: 100 }),
      ]);

      setMetrics(metricsData);
      setEngagement(engagementData);
      setRoi(roiData);
      setStageTimes(stageTimesData);
      setHistory(historyData.slice(0, 50)); // Limiter à 50 pour l'affichage
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }).format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const getStatusColor = (rate: number, threshold: number = 90) => {
    if (rate >= threshold) return 'text-green-600';
    if (rate >= threshold - 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement des métriques...</div>
      </div>
    );
  }

  const handleExportCSV = async () => {
    try {
      const csv = await exportAutomationHistoryCSV({
        workflowId: selectedWorkflowId || workflowId,
        period: selectedPeriod,
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `workflow-history-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur export CSV:', error);
    }
  };

  // Vue liste de tous les workflows
  if (showAllWorkflows) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Vue d'ensemble des workflows</h2>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border rounded-lg"
              value={selectedPeriod.start.toISOString().split('T')[0]}
              onChange={(e) => setSelectedPeriod({
                ...selectedPeriod,
                start: new Date(e.target.value),
              })}
            />
            <select
              className="px-3 py-2 border rounded-lg"
              value={selectedPeriod.end.toISOString().split('T')[0]}
              onChange={(e) => setSelectedPeriod({
                ...selectedPeriod,
                end: new Date(e.target.value),
              })}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Chargement...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allWorkflowsMetrics.map((workflowMetrics) => (
              <Card key={workflowMetrics.workflowId} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedWorkflowId(workflowMetrics.workflowId)}>
                <h3 className="font-semibold mb-3">{workflowMetrics.workflowName}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taux exécution:</span>
                    <span className={`font-semibold ${getStatusColor(workflowMetrics.executionRate)}`}>
                      {formatNumber(workflowMetrics.executionRate)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taux erreur:</span>
                    <span className={`font-semibold ${getStatusColor(100 - workflowMetrics.errorRate, 5)}`}>
                      {formatNumber(workflowMetrics.errorRate)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leads:</span>
                    <span className="font-semibold">{workflowMetrics.leadsTriggered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actions:</span>
                    <span className="font-semibold">{workflowMetrics.actionsExecuted}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Aucune métrique disponible</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Période sélectionnée */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Workflow: {workflowName}</h2>
        <div className="flex gap-2">
          {automatedActions && automatedActions.length > 0 && (
            <select
              className="px-3 py-2 border rounded-lg"
              value={selectedWorkflowId || workflowId || ''}
              onChange={(e) => setSelectedWorkflowId(e.target.value || undefined)}
            >
              <option value="">Tous les workflows</option>
              {automatedActions
                .filter(action => action.isActive)
                .map(action => (
                  <option key={action.id} value={action.id}>
                    {action.name}
                  </option>
                ))}
            </select>
          )}
          <input
            type="date"
            className="px-3 py-2 border rounded-lg"
            value={selectedPeriod.start.toISOString().split('T')[0]}
            onChange={(e) => setSelectedPeriod({
              ...selectedPeriod,
              start: new Date(e.target.value),
            })}
          />
          <input
            type="date"
            className="px-3 py-2 border rounded-lg"
            value={selectedPeriod.end.toISOString().split('T')[0]}
            onChange={(e) => setSelectedPeriod({
              ...selectedPeriod,
              end: new Date(e.target.value),
            })}
          />
          <Button onClick={handleExportCSV} variant="outline">
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Taux d'exécution</div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.executionRate)}`}>
            {formatNumber(metrics.executionRate)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.completedExecutions} / {metrics.scheduledExecutions} exécutions
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Taux d'erreur</div>
          <div className={`text-2xl font-bold ${getStatusColor(100 - metrics.errorRate, 5)}`}>
            {formatNumber(metrics.errorRate)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.failedExecutions} erreurs sur {metrics.totalExecutions} total
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Leads déclenchés</div>
          <div className="text-2xl font-bold text-blue-600">
            {metrics.leadsTriggered}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatNumber(metrics.averageActionsPerLead)} actions/lead
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Actions exécutées</div>
          <div className="text-2xl font-bold text-purple-600">
            {metrics.actionsExecuted}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Temps moyen: {formatNumber(metrics.averageExecutionTime / 1000)}s
          </div>
        </Card>
      </div>

      {/* Métriques d'engagement */}
      {engagement && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Métriques d'engagement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Ouverture emails</div>
              <div className={`text-xl font-bold ${getStatusColor(engagement.emailOpenRate, 20)}`}>
                {formatNumber(engagement.emailOpenRate)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Clic emails</div>
              <div className={`text-xl font-bold ${getStatusColor(engagement.emailClickRate, 3)}`}>
                {formatNumber(engagement.emailClickRate)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Réponse emails</div>
              <div className={`text-xl font-bold ${getStatusColor(engagement.emailReplyRate, 2)}`}>
                {formatNumber(engagement.emailReplyRate)}%
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600 mb-1">Engagement global</div>
            <div className={`text-2xl font-bold ${getStatusColor(engagement.overallEngagementRate, 15)}`}>
              {formatNumber(engagement.overallEngagementRate)}%
            </div>
          </div>
        </Card>
      )}

      {/* ROI */}
      {roi && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ROI des automations</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Temps économisé</div>
              <div className="text-xl font-bold text-green-600">
                {formatNumber(roi.timeSaved)}h
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Conversions générées</div>
              <div className="text-xl font-bold text-blue-600">
                {roi.conversionsGenerated}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Coût</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(roi.cost)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ROI</div>
              <div className={`text-xl font-bold ${getStatusColor(roi.roi, 300)}`}>
                {formatNumber(roi.roi)}%
              </div>
            </div>
          </div>
          {roi.revenueGenerated && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-1">Revenu généré</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(roi.revenueGenerated)}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Temps moyen par étape */}
      {Object.keys(stageTimes).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Temps moyen par étape</h3>
          <div className="space-y-2">
            {Object.entries(stageTimes).map(([stage, days]) => (
              <div key={stage} className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-700">{stage}</span>
                <span className={`font-semibold ${days > 30 ? 'text-red-600' : days > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {formatNumber(days)} jours
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historique récent */}
      {history.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Historique récent</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lead</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((execution) => (
                  <tr key={execution.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {new Date(execution.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 truncate max-w-xs">
                      {execution.leadId}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        execution.executionStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        execution.executionStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        execution.executionStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {execution.executionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {execution.triggerType || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600 truncate max-w-xs">
                      {execution.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

