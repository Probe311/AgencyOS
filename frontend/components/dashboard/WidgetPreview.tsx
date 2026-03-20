import React from 'react';
import { DollarSign, Users, CheckSquare, Target, Calendar, Bell, Activity, Folder, TrendingUp, BarChart, List } from 'lucide-react';
import { DashboardWidgetType } from '../../lib/services/dashboardService';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';

interface WidgetPreviewProps {
  type: DashboardWidgetType;
  size: { w: number; h: number };
  highlighted?: boolean;
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({ type, size, highlighted = false }) => {
  // Données de démo pour la prévisualisation
  const demoChartData = [
    { name: 'Jan', value: 4000 },
    { name: 'Fév', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Avr', value: 4500 },
    { name: 'Mai', value: 6000 },
  ];

  const demoPieData = [
    { name: 'Complété', value: 60, color: '#10b981' },
    { name: 'En cours', value: 30, color: '#6366f1' },
    { name: 'En attente', value: 10, color: '#f59e0b' },
  ];

  const demoBarData = [
    { name: 'Semaine 1', value: 45 },
    { name: 'Semaine 2', value: 52 },
    { name: 'Semaine 3', value: 38 },
    { name: 'Semaine 4', value: 61 },
  ];

  const renderPreview = () => {
    switch (type) {
      case 'welcome_card':
        return (
          <div className="h-full p-4 relative overflow-hidden">
            <div className="relative h-full flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs">
                  JV
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Bonjour, <span className="text-primary-600 dark:text-primary-400">Utilisateur</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                0 nouvelle notification.
              </p>
              <div className="flex gap-1 mb-2">
                <div className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-center">
                  Nouvelle tâche
                </div>
                <div className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-center">
                  Nouveau lead
                </div>
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="text-xs py-1 px-2 rounded bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300">
                  Activité
                </div>
                <div className="text-xs py-1 px-2 rounded text-slate-500 dark:text-slate-400">
                  Système
                </div>
              </div>
            </div>
            <div className="absolute -top-5 -right-5 w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full blur-2xl opacity-60"></div>
          </div>
        );

      case 'kpi_revenue':
        return (
          <div className="h-full flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Revenu total</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
              12,450€
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Calculé depuis Finance</div>
          </div>
        );

      case 'kpi_leads':
        return (
          <div className="h-full flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nouveaux leads</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">24</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">En attente</div>
          </div>
        );

      case 'kpi_tasks':
        return (
          <div className="h-full flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tâches en cours</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">18</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">À terminer</div>
          </div>
        );

      case 'kpi_conversion':
        return (
          <div className="h-full flex flex-col justify-center p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-indigo-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Taux conversion</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">32.5%</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Leads → Clients</div>
          </div>
        );

      case 'chart_revenue':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Performance Financière</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomAreaChart
                data={demoChartData}
                dataKey="value"
                showXAxis={true}
                showYAxis={true}
                showGrid={true}
                showTooltip={true}
                color="#6366f1"
              />
            </div>
          </div>
        );

      case 'chart_leads':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Évolution des Leads</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomBarChart
                data={demoBarData}
                xAxisKey="name"
                bars={[{ key: 'value', color: '#6366f1', name: 'Leads' }]}
                height="100%"
                showGrid={true}
                showLegend={false}
              />
            </div>
          </div>
        );

      case 'task_list':
        return (
          <div className="h-full p-3 overflow-auto">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Tâches récentes</h4>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white">Tâche exemple {i}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Département</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'lead_list':
        return (
          <div className="h-full p-3 overflow-auto">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Leads récents</h4>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white">Lead exemple {i}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Entreprise</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'activity_feed':
        return (
          <div className="h-full p-3 overflow-auto">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Flux d'activité</h4>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Activity size={12} className="text-slate-400 mt-1" />
                  <div>
                    <div className="text-slate-900 dark:text-white">Action {i}</div>
                    <div className="text-slate-500 dark:text-slate-400">Il y a {i}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Calendrier</h4>
            <div className="h-[calc(100%-2rem)] flex items-center justify-center">
              <Calendar size={24} className="text-slate-400" />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="h-full p-3 overflow-auto">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Notifications</h4>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Bell size={12} className="text-slate-400 mt-1" />
                  <div>
                    <div className="text-slate-900 dark:text-white">Notification {i}</div>
                    <div className="text-slate-500 dark:text-slate-400">Il y a {i}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'chart_pie':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Répartition</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomPieChart
                data={demoPieData}
                height="100%"
                innerRadius={30}
                outerRadius={50}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'workload_status':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Charge par statut</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomPieChart
                data={[
                  { name: 'Fermé', value: 60, color: '#10b981' },
                  { name: 'En cours', value: 40, color: '#6366f1' },
                ]}
                height="100%"
                innerRadius={30}
                outerRadius={50}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'sales_by_category':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Ventes par catégorie</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomPieChart
                data={[
                  { name: 'STRIPE', value: 45, color: '#8b5cf6' },
                  { name: 'KAJABI', value: 25, color: '#f59e0b' },
                  { name: 'PAYPAL', value: 25, color: '#6366f1' },
                  { name: 'HONEYBOOK', value: 15, color: '#f43f5e' },
                ]}
                height="100%"
                innerRadius={30}
                outerRadius={50}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'monthly_income':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Revenus mensuels</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomBarChart
                data={demoBarData}
                xAxisKey="name"
                bars={[{ key: 'value', color: '#6366f1', name: 'Revenus' }]}
                height="100%"
                showGrid={true}
                showLegend={false}
              />
            </div>
          </div>
        );

      case 'kpi_total_projects':
        return (
          <div className="h-full p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1 mb-1">
              <Folder size={12} className="text-blue-500" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total projets</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mb-1">24</div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500">En cours</div>
          </div>
        );

      case 'kpi_total_acquisition':
        return (
          <div className="h-full p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={12} className="text-emerald-500" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total acquisition</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mb-1">12</div>
            <div className="text-[9px] text-slate-400 dark:text-slate-500">Leads convertis</div>
          </div>
        );

      case 'chart_projects_data':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Données Projets</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomBarChart
                data={[
                  { name: 'Projets', Pending: 5, Running: 12, Ended: 7 },
                ]}
                xAxisKey="name"
                bars={[
                  { key: 'Pending', color: '#f59e0b', name: 'Pending' },
                  { key: 'Running', color: '#6366f1', name: 'Running' },
                  { key: 'Ended', color: '#10b981', name: 'Ended' },
                ]}
                height="100%"
                showGrid={true}
                showLegend={true}
              />
            </div>
          </div>
        );

      case 'chart_acquisition_data':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Données Acquisition</h4>
            <div className="h-[calc(100%-2rem)]">
              <CustomBarChart
                data={[
                  { name: 'Acquisition', Pending: 8, Running: 15, Ended: 12 },
                ]}
                xAxisKey="name"
                bars={[
                  { key: 'Pending', color: '#f59e0b', name: 'Pending' },
                  { key: 'Running', color: '#6366f1', name: 'Running' },
                  { key: 'Ended', color: '#10b981', name: 'Ended' },
                ]}
                height="100%"
                showGrid={true}
                showLegend={true}
              />
            </div>
          </div>
        );

      case 'project_list':
        return (
          <div className="h-full p-3 overflow-auto">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Liste Projets</h4>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Projet {i}</div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">Client {i} - En cours</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'project_progress':
        return (
          <div className="h-full p-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Progression Projets</h4>
            <div className="h-[calc(100%-2rem)] flex flex-col justify-center">
              <div className="relative w-full h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <div className="absolute left-0 top-0 h-full bg-emerald-500" style={{ width: '40%' }} />
                <div className="absolute left-[40%] top-0 h-full bg-indigo-500" style={{ width: '35%' }} />
                <div className="absolute left-[75%] top-0 h-full bg-amber-500" style={{ width: '25%' }} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">Completed</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">10</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">8</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-slate-600 dark:text-slate-400">Pending</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">6</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
            Aperçu non disponible
          </div>
        );
    }
  };

  // Calculer la largeur et la hauteur en fonction de la taille
  const baseWidth = 60; // pixels par colonne
  const baseHeight = 60; // pixels par unité de hauteur
  const width = size.w * baseWidth;
  const height = size.h * baseHeight;

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden ${
        highlighted
          ? 'bg-gradient-to-br from-primary-600 to-secondary-600 shadow-blue-lg text-white border-transparent'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
      }}
    >
      {renderPreview()}
    </div>
  );
};

