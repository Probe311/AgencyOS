import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, Target, BarChart3, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { useLifecycleStages } from '../../lib/supabase/hooks/useLifecycleStages';
import { useLifecycleMetrics } from '../../lib/supabase/hooks/useLifecycleMetrics';
import { useLeadDormantDetection } from '../../lib/supabase/hooks/useLeadDormantDetection';
import { LifecycleStage } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { Modal } from '../ui/Modal';
import { useApp } from '../contexts/AppContext';

const LIFECYCLE_STAGES: { value: LifecycleStage; label: string; color: string }[] = [
  { value: 'Audience', label: 'Audience', color: 'bg-slate-100 text-slate-700' },
  { value: 'Lead', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'MQL', label: 'MQL', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'SQL', label: 'SQL', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Contact', label: 'Contact', color: 'bg-purple-100 text-purple-700' },
  { value: 'Opportunité', label: 'Opportunité', color: 'bg-amber-100 text-amber-700' },
  { value: 'Client', label: 'Client', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Client Actif', label: 'Client Actif', color: 'bg-green-100 text-green-700' },
  { value: 'Ambassadeur', label: 'Ambassadeur', color: 'bg-pink-100 text-pink-700' },
  { value: 'Inactif', label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
  { value: 'Perdu', label: 'Perdu', color: 'bg-rose-100 text-rose-700' },
];

export const LifecycleView: React.FC = () => {
  const { rules, loading: rulesLoading, loadRules } = useLifecycleStages();
  const { metrics, funnelData, loading: metricsLoading, calculateMetrics, loadMetrics } = useLifecycleMetrics();
  const { dormantLeads, loading: dormantLoading, detectDormantLeads, reactivateLead } = useLeadDormantDetection();
  const { showToast } = useApp();

  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    loadRules();
    loadMetrics();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = getStartDate(selectedPeriod);
      loadMetrics(startDate, endDate);
    }
  }, [selectedPeriod]);

  const getStartDate = (period: string): string => {
    const now = new Date();
    const start = new Date();

    if (period === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      start.setDate(now.getDate() - 90);
    } else {
      return '';
    }

    return start.toISOString().split('T')[0];
  };

  const handleDetectDormant = async () => {
    try {
      setIsDetecting(true);
      await detectDormantLeads(30);
      showToast('Détection des leads dormants terminée', 'success');
    } catch (error) {
      showToast('Erreur lors de la détection', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleReactivate = async (leadId: string) => {
    try {
      await reactivateLead(leadId);
      showToast('Lead réactivé avec succès', 'success');
    } catch (error) {
      showToast('Erreur lors de la réactivation', 'error');
    }
  };

  if (rulesLoading || metricsLoading || dormantLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-slate-400">Chargement des données...</div>
      </div>
    );
  }

  const funnelChartData = funnelData.map(f => ({
    name: f.stage,
    value: f.count,
    conversionRate: f.conversionRate,
  }));

  const conversionData = metrics
    .filter(m => m.fromStage && m.toStage)
    .slice(0, 10)
    .map(m => ({
      name: `${m.fromStage} → ${m.toStage}`,
      conversionRate: m.conversionRate,
      abandonmentRate: m.abandonmentRate,
    }));

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cycle de Vie des Leads</h2>
          <p className="text-slate-500 dark:text-slate-400">Suivi et métriques du cycle de vie complet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={handleDetectDormant} isLoading={isDetecting}>
            Détecter Dormants
          </Button>
          <Button variant="outline" icon={BarChart3} onClick={() => calculateMetrics()}>
            Recalculer Métriques
          </Button>
          <Dropdown
            value={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value as any)}
            options={[
              { label: '7 jours', value: '7d' },
              { label: '30 jours', value: '30d' },
              { label: '90 jours', value: '90d' },
              { label: 'Tout', value: 'all' },
            ]}
            containerClassName="w-32"
          />
        </div>
      </div>

      {/* Funnel de conversion */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-8">
        <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Target size={20} /> Funnel de Conversion
        </h3>
        {funnelData.length > 0 ? (
          <div className="space-y-4">
            {funnelData.map((stage, index) => {
              const stageInfo = LIFECYCLE_STAGES.find(s => s.value === stage.stage);
              const previousCount = index > 0 ? funnelData[index - 1].count : stage.count;
              const width = previousCount > 0 ? (stage.count / previousCount) * 100 : 0;
              
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge className={stageInfo?.color || 'bg-slate-100 text-slate-700'}>
                        {stageInfo?.label || stage.stage}
                      </Badge>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {stage.count} leads
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Taux: {stage.conversionRate.toFixed(1)}%</span>
                      <span>Durée moy: {stage.averageDuration.toFixed(1)}j</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${Math.min(width, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
            <p>Aucune donnée disponible</p>
          </div>
        )}
      </div>

      {/* Métriques de conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} /> Taux de Conversion
          </h3>
          {conversionData.length > 0 ? (
            <CustomBarChart
              data={conversionData}
              xAxisKey="name"
              bars={[
                { key: 'conversionRate', name: 'Taux de conversion (%)', color: '#10b981' },
              ]}
              height={300}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock size={20} /> Durée Moyenne par Étape
          </h3>
          {metrics.length > 0 ? (
            <CustomBarChart
              data={metrics.slice(0, 10).map(m => ({
                name: `${m.fromStage || 'Début'} → ${m.toStage}`,
                duration: m.averageDuration,
              }))}
              xAxisKey="name"
              bars={[
                { key: 'duration', name: 'Durée (jours)', color: '#6366f1' },
              ]}
              height={300}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Leads dormants */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" /> Leads Dormants
            </h3>
            <Badge className="bg-amber-100 text-amber-700">
              {dormantLeads.length} détecté{dormantLeads.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <div className="p-6">
          {dormantLeads.length > 0 ? (
            <div className="space-y-3">
              {dormantLeads.slice(0, 10).map((dormant) => (
                <div
                  key={dormant.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">Lead #{dormant.leadId.slice(0, 8)}</span>
                      <Badge
                        className={
                          dormant.dormantCategory === 'very_old'
                            ? 'bg-rose-100 text-rose-700'
                            : dormant.dormantCategory === 'old'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {dormant.daysInactive} jours inactif
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      Dernière activité : {dormant.lastActivityDate ? new Date(dormant.lastActivityDate).toLocaleDateString('fr-FR') : 'Jamais'}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleReactivate(dormant.leadId)}>
                    Réactiver
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucun lead dormant détecté</p>
            </div>
          )}
        </div>
      </div>

      {/* Règles de transition */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter size={20} /> Règles de Transition Actives
          </h3>
        </div>
        <div className="p-6">
          {rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => {
                const fromInfo = LIFECYCLE_STAGES.find(s => s.value === rule.fromStage);
                const toInfo = LIFECYCLE_STAGES.find(s => s.value === rule.toStage);
                return (
                  <div
                    key={rule.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={fromInfo?.color || 'bg-slate-100 text-slate-700'}>
                          {fromInfo?.label || rule.fromStage}
                        </Badge>
                        <span className="text-slate-400">→</span>
                        <Badge className={toInfo?.color || 'bg-slate-100 text-slate-700'}>
                          {toInfo?.label || rule.toStage}
                        </Badge>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {rule.ruleName}
                        </span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{rule.description}</p>
                    )}
                    <div className="text-xs text-slate-400">
                      Priorité: {rule.priority} | Conditions: {JSON.stringify(rule.conditions).substring(0, 100)}...
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Filter size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucune règle de transition configurée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

