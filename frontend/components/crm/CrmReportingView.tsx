import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Users, Target, Calendar, Clock, DollarSign, Percent, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useCrmMetrics } from '../../lib/supabase/hooks/useCrmMetrics';
import { useSalesGoals } from '../../lib/supabase/hooks/useSalesGoals';
import { useSalesActivities } from '../../lib/supabase/hooks/useSalesActivities';
import { useUsers } from '../../lib/supabase/hooks/useUsers';
import { CrmMetrics, SalesPerformance, SalesGoal } from '../../types';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ExportButton } from '../ui/ExportButton';
import { Loader } from '../ui/Loader';
import { useApp } from '../contexts/AppContext';
import { getUserAvatar } from '../../lib/utils/avatar';

export const CrmReportingView: React.FC = () => {
  const { getCrmMetrics, getSalesPerformance } = useCrmMetrics();
  const { getSalesGoals, createSalesGoal } = useSalesGoals();
  const { getSalesActivities } = useSalesActivities();
  const { users } = useUsers();
  const { showToast } = useApp();
  
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
  const [performance, setPerformance] = useState<SalesPerformance[]>([]);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    userId: '',
    periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    periodStart: '',
    periodEnd: '',
    targetRevenue: 0,
    targetLeads: 0,
    targetConversions: 0,
    targetDeals: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(selectedPeriod);
      const endDate = new Date().toISOString();

      const [metricsData, performanceData, goalsData] = await Promise.all([
        getCrmMetrics(startDate, endDate),
        getSalesPerformance(selectedUser !== 'all' ? selectedUser : undefined, startDate, endDate),
        getSalesGoals(selectedUser !== 'all' ? selectedUser : undefined, selectedPeriod === 'month' ? 'monthly' : selectedPeriod === 'quarter' ? 'quarterly' : 'yearly'),
      ]);

      setMetrics(metricsData);
      setPerformance(performanceData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (period: 'month' | 'quarter' | 'year'): string => {
    const now = new Date();
    const start = new Date();

    if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (period === 'quarter') {
      start.setMonth(now.getMonth() - 3);
    } else {
      start.setFullYear(now.getFullYear() - 1);
    }

    return start.toISOString();
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSalesGoal(newGoal);
      setIsGoalModalOpen(false);
      setNewGoal({
        userId: '',
        periodType: 'monthly',
        periodStart: '',
        periodEnd: '',
        targetRevenue: 0,
        targetLeads: 0,
        targetConversions: 0,
        targetDeals: 0,
      });
      await loadData();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader size={40} />
          <div className="text-slate-400 dark:text-slate-500">Chargement des métriques...</div>
        </div>
      </div>
    );
  }

  const chartData = performance.map(p => ({
    name: p.userName,
    leads: p.totalLeads,
    converted: p.convertedLeads,
    revenue: p.totalRevenue,
  }));

  const conversionBySourceData = metrics ? Object.entries(metrics.conversionBySource).map(([source, count]) => ({
    name: source,
    value: count,
  })) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reporting CRM</h1>
          <p className="text-slate-500 dark:text-slate-400">Performance commerciale, prévisions et objectifs.</p>
        </div>
        <div className="flex gap-3">
          <Dropdown
            value={selectedPeriod}
            onChange={(value) => setSelectedPeriod(value as 'month' | 'quarter' | 'year')}
            options={[
              { label: 'Mois', value: 'month' },
              { label: 'Trimestre', value: 'quarter' },
              { label: 'Année', value: 'year' },
            ]}
            containerClassName="w-40"
          />
          <Dropdown
            value={selectedUser}
            onChange={(value) => setSelectedUser(value)}
            options={[
              { label: 'Commerciaux', value: 'all' },
              ...users.map(u => ({ label: u.name, value: u.id })),
            ]}
            containerClassName="w-48"
          />
          <Button icon={Target} onClick={() => setIsGoalModalOpen(true)}>
            Nouvel objectif
          </Button>
          <ExportButton
            data={performance.map(p => ({
              Commercial: p.userName,
              Leads: p.totalLeads,
              Conversions: p.convertedLeads,
              'Taux conversion': `${p.conversionRate.toFixed(1)}%`,
              'CA (€)': p.totalRevenue,
              'Cycle moyen (j)': p.averageCycleLength,
              Activités: p.activitiesCount,
              'Win Rate': `${p.winRate.toFixed(1)}%`,
            }))}
            filename={`rapport-crm-${selectedPeriod}-${new Date().toISOString().split('T')[0]}`}
            showToast={showToast}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Taux de conversion"
            value={`${metrics?.conversionRate.toFixed(1) || 0}%`}
            icon={Percent}
            trend={metrics?.conversionRate || 0 > 20 ? 'up' : 'down'}
            trendValue="+2.5%"
          />
          <MetricCard
            title="Durée moyenne cycle"
            value={`${metrics?.averageCycleLength || 0} jours`}
            icon={Clock}
            trend={metrics?.averageCycleLength || 0 < 30 ? 'up' : 'down'}
            trendValue="-5 jours"
          />
          <MetricCard
            title="Taux de gain"
            value={`${metrics?.winRate.toFixed(1) || 0}%`}
            icon={TrendingUp}
            trend={metrics?.winRate || 0 > 50 ? 'up' : 'down'}
            trendValue="+3.2%"
          />
          <MetricCard
            title="Temps de réponse"
            value={`${metrics?.leadResponseTime || 0}h`}
            icon={Activity}
            trend={metrics?.leadResponseTime || 0 < 24 ? 'up' : 'down'}
            trendValue="-2h"
          />
        </div>

        {/* Performance by Sales Rep */}
        {performance.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Performance par commercial</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Commercial</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Leads</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Conversions</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Taux</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">CA</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Cycle moyen</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Activités</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-600 dark:text-slate-400">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((perf) => (
                    <tr key={perf.userId} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={perf.userAvatar || getUserAvatar(undefined, perf.userId)}
                            alt={perf.userName}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="font-medium text-slate-900 dark:text-white">{perf.userName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{perf.totalLeads}</td>
                      <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{perf.convertedLeads}</td>
                      <td className="py-4 px-4 text-right">
                        <Badge className={perf.conversionRate >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {perf.conversionRate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {perf.totalRevenue.toLocaleString('fr-FR')}€
                      </td>
                      <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{perf.averageCycleLength}j</td>
                      <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{perf.activitiesCount}</td>
                      <td className="py-4 px-4 text-right">
                        <Badge className={perf.winRate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                          {perf.winRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Performance par commercial</h3>
            {chartData.length > 0 ? (
              <CustomBarChart
                data={chartData}
                xAxisKey="name"
                bars={[
                  { key: 'leads', name: 'Leads', color: '#6366f1' },
                  { key: 'converted', name: 'Conversions', color: '#10b981' },
                ]}
                height={300}
              />
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Conversions par source</h3>
            {conversionBySourceData.length > 0 ? (
              <CustomPieChart
                data={conversionBySourceData}
                colors={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']}
                height={300}
              />
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* Goals & Forecasts */}
        {goals.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Objectifs commerciaux</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {goals.map((goal) => {
                // Calculate progress (simplified - would need actual data)
                const progress = {
                  revenue: 0,
                  leads: 0,
                  conversions: 0,
                  deals: 0,
                };

                return (
                  <div key={goal.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {goal.periodType === 'monthly' ? 'Mensuel' : goal.periodType === 'quarterly' ? 'Trimestriel' : 'Annuel'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(goal.periodStart).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <GoalProgress label="CA" target={goal.targetRevenue} current={progress.revenue} />
                      <GoalProgress label="Leads" target={goal.targetLeads} current={progress.leads} />
                      <GoalProgress label="Conversions" target={goal.targetConversions} current={progress.conversions} />
                      <GoalProgress label="Deals" target={goal.targetDeals} current={progress.deals} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Goal Modal */}
      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Nouvel objectif commercial">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Dropdown
            label="Commercial"
            value={newGoal.userId}
            onChange={(value) => setNewGoal({ ...newGoal, userId: value })}
            options={[
              { label: 'Objectif global', value: '' },
              ...users.map(u => ({ label: u.name, value: u.id })),
            ]}
          />
          <Dropdown
            label="Période"
            value={newGoal.periodType}
            onChange={(value) => setNewGoal({ ...newGoal, periodType: value as 'monthly' | 'quarterly' | 'yearly' })}
            options={[
              { label: 'Mensuel', value: 'monthly' },
              { label: 'Trimestriel', value: 'quarterly' },
              { label: 'Annuel', value: 'yearly' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={newGoal.periodStart}
              onChange={(e) => setNewGoal({ ...newGoal, periodStart: e.target.value })}
              required
            />
            <Input
              label="Date de fin"
              type="date"
              value={newGoal.periodEnd}
              onChange={(e) => setNewGoal({ ...newGoal, periodEnd: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Objectif CA (€)"
              type="number"
              value={newGoal.targetRevenue}
              onChange={(e) => setNewGoal({ ...newGoal, targetRevenue: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
            />
            <Input
              label="Objectif Leads"
              type="number"
              value={newGoal.targetLeads}
              onChange={(e) => setNewGoal({ ...newGoal, targetLeads: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Objectif Conversions"
              type="number"
              value={newGoal.targetConversions}
              onChange={(e) => setNewGoal({ ...newGoal, targetConversions: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <Input
              label="Objectif Deals"
              type="number"
              value={newGoal.targetDeals}
              onChange={(e) => setNewGoal({ ...newGoal, targetDeals: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, trend, trendValue }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: 'up' | 'down';
  trendValue: string;
}) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex items-center justify-between mb-4">
      <Icon size={20} className="text-slate-400" />
      {trend === 'up' ? (
        <ArrowUpRight size={16} className="text-emerald-600" />
      ) : (
        <ArrowDownRight size={16} className="text-rose-600" />
      )}
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{value}</h3>
    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
      trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
    }`}>
      {trendValue}
    </span>
  </div>
);

const GoalProgress = ({ label, target, current }: { label: string; target: number; current: number }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-bold text-slate-900 dark:text-white">
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            percentage >= 100 ? 'bg-emerald-500' : percentage >= 75 ? 'bg-indigo-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

