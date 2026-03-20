import React, { useState } from 'react';
import { X, Settings, GripVertical, TrendingUp, TrendingDown, DollarSign, Users, CheckSquare, Target, Calendar, Bell, Activity, Plus, Folder, FolderOpen, BarChart, List } from 'lucide-react';
import { DashboardWidgetConfig, DashboardWidgetType } from '../../lib/services/dashboardService';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Loader } from '../ui/Loader';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardWidgetProps {
  widget: DashboardWidgetConfig;
  onUpdate: (widgetId: string, updates: Partial<DashboardWidgetConfig>) => void;
  onDelete: (widgetId: string) => void;
  onDragStart: (e: React.DragEvent, widgetId: string) => void;
  isSelected?: boolean;
  onSelect?: (widgetId: string) => void;
  gridCols?: number; // Nombre de colonnes dans la grille (défaut: 12)
  isEditMode?: boolean; // Mode édition pour activer le drag and drop
  onResizeStart?: (e: React.MouseEvent, widgetId: string, direction: 'se' | 'sw' | 'ne' | 'nw') => void;
  onEdit?: (widgetId: string) => void; // Fonction pour ouvrir la modale d'édition
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  onDragStart,
  isSelected = false,
  onSelect,
  gridCols = 12,
  isEditMode = false,
  onResizeStart,
  onEdit,
}) => {
  const { users, navigate, showToast, tasks, productionProjects, leads } = useApp();
  // Données vides pour éviter les données simulées
  const financeStats: any[] = [];
  const notifications: any[] = [];
  const { user } = useAuth();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Get current user info
  const currentUser = user && users.length > 0 
    ? users.find(u => u.id === user.id) || users[0]
    : users.length > 0 
    ? users[0] 
    : null;
  
  // Get user initials
  const getUserInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const userInitials = getUserInitials(currentUser?.name);
  const userName = currentUser?.name || user?.email?.split('@')[0] || 'Utilisateur';

  // Calculer les classes CSS en fonction de la taille du widget pour la flexibilité
  const getSizeClasses = () => {
    const { w, h } = widget;
    const area = w * h;
    
    // Très petits widgets (1x1 = 1)
    if (area === 1) {
      return {
        padding: 'p-4',
        titleSize: 'text-xs',
        valueSize: 'text-base',
        iconSize: 12,
        gap: 'gap-0.5',
        mb: 'mb-0.5',
      };
    }
    // Petits widgets (2x1, 1x2, 2x2 = 2-4)
    if (area <= 4) {
      return {
        padding: 'p-2',
        titleSize: 'text-xs',
        valueSize: 'text-xl',
        iconSize: 16,
        gap: 'gap-1',
        mb: 'mb-1',
      };
    }
    // Widgets moyens (4-8)
    if (area <= 8) {
      return {
        padding: 'p-3',
        titleSize: 'text-xs',
        valueSize: 'text-2xl',
        iconSize: 18,
        gap: 'gap-2',
        mb: 'mb-2',
      };
    }
    // Grands widgets (16+)
    if (area >= 16) {
      return {
        padding: 'p-4',
        titleSize: 'text-sm',
        valueSize: 'text-3xl',
        iconSize: 20,
        gap: 'gap-2',
        mb: 'mb-2',
      };
    }
    // Widgets très grands (24+)
    return {
      padding: 'p-6',
      titleSize: 'text-base',
      valueSize: 'text-4xl',
      iconSize: 24,
      gap: 'gap-3',
      mb: 'mb-3',
    };
  };

  const sizeClasses = getSizeClasses();

  // Fonction helper pour les classes de texte selon le statut highlighted
  const getTextClasses = (type: 'title' | 'value' | 'subtitle' | 'icon') => {
    if (!widget.highlighted) {
      switch (type) {
        case 'title':
          return 'text-slate-500 dark:text-slate-400';
        case 'value':
          return 'text-slate-900 dark:text-white';
        case 'subtitle':
          return 'text-slate-400 dark:text-slate-500';
        case 'icon':
          return '';
        default:
          return '';
      }
    } else {
      switch (type) {
        case 'title':
          return 'text-white/90';
        case 'value':
          return 'text-white';
        case 'subtitle':
          return 'text-white/80';
        case 'icon':
          return 'text-white';
        default:
          return '';
      }
    }
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'welcome_card':
        return (
          <div className="h-full p-6 relative overflow-hidden group">
            <div className="relative h-full flex flex-col">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg shadow-inner border border-primary-100 dark:border-primary-500/30">
                  {userInitials}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                Bonjour, <span className="text-primary-600 dark:text-primary-400">{userName}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium text-sm">
                {notifications.filter(n => !n.read).length} nouvelle{notifications.filter(n => !n.read).length > 1 ? 's' : ''} notification{notifications.filter(n => !n.read).length > 1 ? 's' : ''}.
              </p>

              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={() => navigate(ViewState.PROJECTS)} 
                  variant="secondary"
                  className="flex-1 py-2.5 rounded-2xl shadow-slate-200 dark:shadow-none text-sm"
                  icon={Plus}
                >
                  Nouvelle tâche
                </Button>
                <Button 
                  onClick={() => navigate(ViewState.CRM)} 
                  variant="outline"
                  className="flex-1 py-2.5 rounded-2xl bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                  icon={Plus}
                >
                  Nouveau lead
                </Button>
              </div>

              <div className="space-y-1 flex-1">
                <Button 
                  onClick={() => showToast('Flux d\'activité mis à jour')}
                  variant="ghost"
                  className="w-full !justify-start px-3 py-2 rounded-2xl text-xs font-bold bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-100 dark:border-primary-500/30"
                >
                  Activité
                </Button>
                <Button 
                  onClick={() => navigate(ViewState.SETTINGS)}
                  variant="ghost"
                  className="w-full !justify-start px-3 py-2 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-transparent"
                >
                  Système
                </Button>
                <Button 
                  onClick={() => navigate(ViewState.PRODUCTION)}
                  variant="ghost"
                  className="w-full !justify-start px-3 py-2 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-transparent"
                >
                  Performance
                </Button>
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-50 dark:bg-primary-900/20 rounded-full blur-3xl opacity-60 group-hover:scale-110 transition-all duration-500"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-secondary-50 dark:bg-secondary-900/20 rounded-full blur-2xl opacity-60"></div>
          </div>
        );

      case 'kpi_revenue':
        const totalRevenue = financeStats.reduce((acc, curr) => acc + curr.revenue, 0);
        const isTiny = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTiny ? 'mb-0.5' : sizeClasses.mb}`}>
              <DollarSign size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-emerald-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTiny ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Revenu total</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTiny ? 'my-0.5' : sizeClasses.mb} leading-none`}>
              {isTiny ? `${(totalRevenue / 1000).toFixed(0)}k€` : `${totalRevenue.toLocaleString()}€`}
            </div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTiny ? 'leading-tight truncate' : ''}`}>
              {isTiny ? 'Finance' : 'Calculé depuis Finance'}
            </div>
          </div>
        );

      case 'kpi_leads':
        const newLeads = leads.filter(l => l.stage === 'Nouveau').length;
        const isTinyLeads = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTinyLeads ? 'mb-0.5' : sizeClasses.mb}`}>
              <Users size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-blue-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTinyLeads ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Nouveaux leads</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTinyLeads ? 'my-0.5' : sizeClasses.mb} leading-none`}>{newLeads}</div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTinyLeads ? 'leading-tight truncate' : ''}`}>En attente</div>
          </div>
        );

      case 'kpi_tasks':
        const pendingTasks = tasks.filter(t => t.status !== 'Terminé').length;
        const isTinyTasks = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTinyTasks ? 'mb-0.5' : sizeClasses.mb}`}>
              <CheckSquare size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-rose-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTinyTasks ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Tâches en cours</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTinyTasks ? 'my-0.5' : sizeClasses.mb} leading-none`}>{pendingTasks}</div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTinyTasks ? 'leading-tight truncate' : ''}`}>À terminer</div>
          </div>
        );

      case 'kpi_conversion':
        const conversionRate = leads.length > 0 
          ? ((leads.filter(l => l.stage === 'Gagné').length / leads.length) * 100).toFixed(1)
          : '0';
        const isTinyConversion = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTinyConversion ? 'mb-0.5' : sizeClasses.mb}`}>
              <Target size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-indigo-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTinyConversion ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Taux conversion</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTinyConversion ? 'my-0.5' : sizeClasses.mb} leading-none`}>{conversionRate}%</div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTinyConversion ? 'leading-tight truncate' : ''}`}>
              {isTinyConversion ? 'Leads→Clients' : 'Leads → Clients'}
            </div>
          </div>
        );

      case 'kpi_total_projects':
        const totalProjects = productionProjects.length;
        const isTinyProjects = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTinyProjects ? 'mb-0.5' : sizeClasses.mb}`}>
              <Folder size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-blue-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTinyProjects ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Total projets</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTinyProjects ? 'my-0.5' : sizeClasses.mb} leading-none`}>{totalProjects}</div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTinyProjects ? 'leading-tight truncate' : ''}`}>En cours</div>
          </div>
        );

      case 'kpi_total_acquisition':
        // Acquisition = leads convertis (Gagné)
        const totalAcquisition = leads.filter(l => l.stage === 'Gagné').length;
        const isTinyAcquisition = widget.w === 1 && widget.h === 1;
        return (
          <div className={`h-full flex flex-col justify-center ${sizeClasses.padding}`}>
            <div className={`flex items-center ${sizeClasses.gap} ${isTinyAcquisition ? 'mb-0.5' : sizeClasses.mb}`}>
              <TrendingUp size={sizeClasses.iconSize} className={`${widget.highlighted ? 'text-white' : 'text-emerald-500'} flex-shrink-0`} />
              <span className={`${sizeClasses.titleSize} font-bold ${getTextClasses('title')} ${isTinyAcquisition ? 'uppercase leading-tight' : 'uppercase'} truncate`}>Total acquisition</span>
            </div>
            <div className={`${sizeClasses.valueSize} font-extrabold ${getTextClasses('value')} ${isTinyAcquisition ? 'my-0.5' : sizeClasses.mb} leading-none`}>{totalAcquisition}</div>
            <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} ${isTinyAcquisition ? 'leading-tight truncate' : ''}`}>Leads convertis</div>
          </div>
        );

      case 'chart_revenue':
        const chartData = financeStats.map(stat => ({
          name: stat.month,
          value: stat.revenue,
        }));
        const chartPadding = widget.h >= 4 ? 'p-4' : 'p-2';
        const chartTitleSize = widget.h >= 4 ? 'text-sm' : 'text-xs';
        return (
          <div className={`h-full ${chartPadding}`}>
            <h4 className={`${chartTitleSize} font-bold ${getTextClasses('value')} ${sizeClasses.mb}`}>Performance Financière</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomAreaChart
                data={chartData.length > 0 ? chartData : []}
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

      case 'task_list':
        const taskListPadding = widget.h >= 4 ? 'p-4' : 'p-2';
        const taskListTitleSize = widget.h >= 4 ? 'text-sm' : 'text-xs';
        const maxTasks = widget.h >= 4 ? 5 : widget.h >= 2 ? 3 : 2;
        return (
          <div className={`h-full ${taskListPadding} overflow-auto`}>
            <h4 className={`${taskListTitleSize} font-bold ${getTextClasses('value')} ${sizeClasses.mb}`}>Tâches récentes</h4>
            <div className={widget.h >= 4 ? 'space-y-2' : 'space-y-1'}>
              {tasks.slice(0, maxTasks).map((task) => (
                <div
                  key={task.id}
                  className={`${widget.h >= 4 ? 'p-3' : 'p-2'} rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`}
                >
                  <div className={`font-bold ${sizeClasses.titleSize} text-slate-900 dark:text-white`}>{task.title}</div>
                  <div className={`${sizeClasses.titleSize} text-slate-500 dark:text-slate-400 mt-1`}>{task.department}</div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className={`text-center py-4 text-slate-400 dark:text-slate-500 ${sizeClasses.titleSize}`}>
                  Aucune tâche
                </div>
              )}
            </div>
          </div>
        );

      case 'lead_list':
        const leadListPadding = widget.h >= 2 ? 'p-4' : 'p-2';
        const leadListTitleSize = widget.h >= 2 ? 'text-sm' : 'text-xs';
        const maxLeads = widget.h >= 4 ? 5 : widget.h >= 2 ? 3 : 2;
        return (
          <div className={`h-full ${leadListPadding} overflow-auto`}>
            <h4 className={`${leadListTitleSize} font-bold ${getTextClasses('value')} ${sizeClasses.mb}`}>Leads récents</h4>
            <div className={widget.h >= 2 ? 'space-y-2' : 'space-y-1'}>
              {leads.slice(0, maxLeads).map((lead) => (
                <div
                  key={lead.id}
                  className={`${widget.h >= 2 ? 'p-3' : 'p-2'} rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`}
                >
                  <div className={`font-bold ${sizeClasses.titleSize} ${getTextClasses('value')}`}>{lead.name}</div>
                  <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} mt-1`}>{lead.company}</div>
                </div>
              ))}
              {leads.length === 0 && (
                <div className={`text-center py-4 ${getTextClasses('subtitle')} ${sizeClasses.titleSize}`}>
                  Aucun lead
                </div>
              )}
            </div>
          </div>
        );

      case 'chart_leads':
        const leadsChartData: any[] = [];
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Évolution des Leads</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomBarChart
                data={leadsChartData.length > 0 ? leadsChartData : []}
                xAxisKey="name"
                bars={[{ key: 'value', color: '#6366f1', name: 'Leads' }]}
                height="100%"
                showGrid={true}
                showLegend={false}
              />
            </div>
          </div>
        );

      case 'chart_pie':
        // Calculer la répartition des tâches par statut
        const statusCounts: Record<string, number> = {};
        tasks.forEach(task => {
          const status = task.status || 'Non défini';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Définir les couleurs pour chaque statut
        const statusColors: Record<string, string> = {
          'Terminé': '#10b981',
          'En cours': '#6366f1',
          'À faire': '#64748b',
          'En attente': '#f59e0b',
          'En révision': '#f59e0b',
          'Non défini': '#94a3b8',
        };

        // Créer les données pour le graphique
        const pieData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count,
          color: statusColors[status] || '#94a3b8',
        }));

        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Répartition</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomPieChart
                data={pieData.length > 0 ? pieData : []}
                height="100%"
                innerRadius={40}
                outerRadius={80}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'workload_status':
        const workloadData: any[] = [];
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Charge par statut</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomPieChart
                data={workloadData.length > 0 ? workloadData : []}
                height="100%"
                innerRadius={40}
                outerRadius={80}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'sales_by_category':
        const salesData: any[] = [];
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Ventes par catégorie</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomPieChart
                data={salesData.length > 0 ? salesData : []}
                height="100%"
                innerRadius={40}
                outerRadius={80}
                showTooltip={true}
              />
            </div>
          </div>
        );

      case 'monthly_income':
        const monthlyData = financeStats.map(stat => ({
          name: stat.month.substring(0, 3),
          value: stat.revenue,
        }));
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Revenus mensuels</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomBarChart
                data={monthlyData.length > 0 ? monthlyData : []}
                xAxisKey="name"
                bars={[{ key: 'value', color: '#6366f1', name: 'Revenus' }]}
                height="100%"
                showGrid={true}
                showLegend={false}
              />
            </div>
          </div>
        );

      case 'activity_feed':
        return (
          <div className="h-full p-4 overflow-auto">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Flux d'activité</h4>
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-start gap-2 text-sm">
                  <Activity size={16} className={`${getTextClasses('subtitle')} mt-1`} />
                  <div>
                    <div className={getTextClasses('value')}>{task.title}</div>
                    <div className={`text-xs ${getTextClasses('subtitle')}`}>Il y a 2h</div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className={`text-center py-4 ${getTextClasses('subtitle')} text-sm`}>
                  Aucune activité
                </div>
              )}
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Calendrier</h4>
            <div className="h-[calc(100%-3rem)] flex items-center justify-center">
              <Calendar size={48} className={getTextClasses('subtitle')} />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="h-full p-4 overflow-auto">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Notifications</h4>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className="flex items-start gap-2 text-sm">
                  <Bell size={16} className={`${getTextClasses('subtitle')} mt-1`} />
                  <div>
                    <div className={getTextClasses('value')}>{notif.title}</div>
                    <div className={`text-xs ${getTextClasses('subtitle')}`}>Il y a 1h</div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className={`text-center py-4 ${getTextClasses('subtitle')} text-sm`}>
                  Aucune notification
                </div>
              )}
            </div>
          </div>
        );

      case 'chart_projects_data':
        // Mapper les statuts des projets : 'Sur les rails' = running, 'À risque' = pending, 'Budget dépassé' = ended
        const projectsPending = productionProjects.filter(p => p.status === 'À risque').length;
        const projectsRunning = productionProjects.filter(p => p.status === 'Sur les rails').length;
        const projectsEnded = productionProjects.filter(p => p.status === 'Budget dépassé').length;
        const projectsData = [
          { name: 'Projets', Pending: projectsPending, Running: projectsRunning, Ended: projectsEnded },
        ];
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Données Projets</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomBarChart
                data={projectsData}
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
        // Acquisition : leads par statut (Nouveau = pending, En négociation = running, Gagné = ended)
        const acquisitionPending = leads.filter(l => l.stage === 'Nouveau').length;
        const acquisitionRunning = leads.filter(l => l.stage === 'En négociation' || l.stage === 'Contact').length;
        const acquisitionEnded = leads.filter(l => l.stage === 'Gagné').length;
        const acquisitionData = [
          { name: 'Acquisition', Pending: acquisitionPending, Running: acquisitionRunning, Ended: acquisitionEnded },
        ];
        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Données Acquisition</h4>
            <div className="h-[calc(100%-3rem)]">
              <CustomBarChart
                data={acquisitionData}
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
        const projectListPadding = widget.h >= 4 ? 'p-4' : 'p-2';
        const projectListTitleSize = widget.h >= 4 ? 'text-sm' : 'text-xs';
        const maxProjects = widget.h >= 4 ? 5 : widget.h >= 2 ? 3 : 2;
        return (
          <div className={`h-full ${projectListPadding} overflow-auto`}>
            <h4 className={`${projectListTitleSize} font-bold ${getTextClasses('value')} ${sizeClasses.mb}`}>Liste Projets</h4>
            <div className={widget.h >= 4 ? 'space-y-2' : 'space-y-1'}>
              {productionProjects.slice(0, maxProjects).map((project) => (
                <div
                  key={project.id}
                  className={`${widget.h >= 4 ? 'p-3' : 'p-2'} rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`}
                >
                  <div className={`font-bold ${sizeClasses.titleSize} ${getTextClasses('value')}`}>{project.name}</div>
                  <div className={`${sizeClasses.titleSize} ${getTextClasses('subtitle')} mt-1`}>{project.client} - {project.status}</div>
                </div>
              ))}
              {productionProjects.length === 0 && (
                <div className={`text-center py-4 ${getTextClasses('subtitle')} ${sizeClasses.titleSize}`}>
                  Aucun projet
                </div>
              )}
            </div>
          </div>
        );

      case 'project_progress':
        // Pie chart en demi-cercle supérieur avec gaps et coins arrondis
        // Statuts alignés sur le Kanban "tous les projets" : À faire, En cours, En révision, Terminé
        const totalProj = productionProjects.length;
        const aFaireProj = productionProjects.filter(p => p.status === 'À faire' || p.status === 'TODO').length;
        const enCoursProj = productionProjects.filter(p => p.status === 'En cours' || p.status === 'IN_PROGRESS').length;
        const enRevisionProj = productionProjects.filter(p => p.status === 'En révision' || p.status === 'En revue' || p.status === 'REVIEW').length;
        const termineProj = productionProjects.filter(p => p.status === 'Terminé' || p.status === 'DONE').length;
        
        // Pourcentage de projets terminés
        const endedPercent = totalProj > 0 ? (termineProj / totalProj) * 100 : 0;

        // État de chargement (si productionProjects est undefined ou en cours de chargement)
        const isLoading = productionProjects === undefined;

        // Couleurs selon le design system
        // Terminé = Success (emerald-600)
        // En révision = Warning (amber-500)
        // En cours = Info (sky-500)
        // À faire = Neutral (slate-400)
        const termineColor = '#059669'; // emerald-600
        const enRevisionColor = '#f59e0b'; // amber-500
        const enCoursColor = '#0ea5e9'; // sky-500
        const aFaireColor = '#94a3b8'; // slate-400

        // Préparer les données pour le pie chart (ordre : À faire, En cours, En révision, Terminé)
        const projectProgressPieData = [
          { name: 'À faire', value: aFaireProj, fill: aFaireColor },
          { name: 'En cours', value: enCoursProj, fill: enCoursColor },
          { name: 'En révision', value: enRevisionProj, fill: enRevisionColor },
          { name: 'Terminé', value: termineProj, fill: termineColor },
        ].filter(item => item.value > 0); // Filtrer les valeurs à 0

        return (
          <div className="h-full p-4">
            <h4 className={`text-sm font-bold ${getTextClasses('value')} mb-4`}>Project Progress</h4>
            <div className="h-[calc(100%-3rem)] flex flex-col justify-center gap-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader size={48} />
                </div>
              ) : (
                <>
                  {/* Pie chart en demi-cercle supérieur avec Recharts */}
                  <div className="relative w-full max-w-[200px] mx-auto mb-4" style={{ height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectProgressPieData.length > 0 ? projectProgressPieData : [{ name: 'Empty', value: 100, fill: '#e2e8f0' }]}
                          cx={100}
                          cy={100}
                          innerRadius={50}
                          outerRadius={80}
                          startAngle={180}
                          endAngle={0}
                          paddingAngle={4}
                          cornerRadius={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {projectProgressPieData.length > 0 ? (
                            projectProgressPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))
                          ) : (
                            <Cell fill="#e2e8f0" />
                          )}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Texte au centre - positionné dans le demi-cercle */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '100%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                      <div className={`text-4xl font-bold ${getTextClasses('value')} leading-tight`}>
                        {endedPercent.toFixed(0)}%
                      </div>
                      <div className={`text-sm ${getTextClasses('subtitle')} mt-1 text-center`}>
                        projets terminés
                      </div>
                    </div>
                  </div>

                  {/* Légende - Statuts du Kanban "tous les projets" */}
                  <div className="space-y-2 w-full">
                    {termineProj > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: termineColor }}></div>
                          <span className={getTextClasses('subtitle')}>Terminé</span>
                        </div>
                      </div>
                    )}
                    {enRevisionProj > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: enRevisionColor }}></div>
                          <span className={getTextClasses('subtitle')}>En révision</span>
                        </div>
                      </div>
                    )}
                    {enCoursProj > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: enCoursColor }}></div>
                          <span className={getTextClasses('subtitle')}>En cours</span>
                        </div>
                      </div>
                    )}
                    {aFaireProj > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: aFaireColor }}></div>
                          <span className={getTextClasses('subtitle')}>À faire</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
            <p className="text-sm">Widget non configuré</p>
          </div>
        );
    }
  };

  return (
    <div
      className={`relative rounded-[30px] border-2 transition-all duration-200 h-full w-full ${
        widget.highlighted
          ? 'bg-gradient-to-br from-primary-600 to-secondary-600 shadow-blue-lg text-white border-transparent'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
      } ${
        isSelected
          ? 'border-indigo-500 dark:border-indigo-400'
          : widget.highlighted
          ? 'hover:shadow-blue-xl'
          : 'hover:border-slate-300 dark:hover:border-slate-600'
      } group`}
      onClick={() => onSelect?.(widget.id)}
      draggable={isEditMode}
      onDragStart={(e) => {
        if (isEditMode) {
          onDragStart(e, widget.id);
        } else {
          e.preventDefault();
        }
      }}
    >
      {/* Header avec contrôles - visible uniquement en mode édition */}
      {isEditMode && (
      <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 rounded-t-[30px] flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-0">
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-slate-400 cursor-move" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{widget.type}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) {
                onEdit(widget.id);
              } else {
                setIsConfigOpen(true);
              }
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
          >
            <Settings size={12} className="text-slate-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(widget.id);
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
          >
            <X size={12} className="text-red-500" />
          </button>
        </div>
      </div>
      )}

      {/* Contenu du widget */}
      <div className={`h-full w-full ${isEditMode && widget.type !== 'welcome_card' ? 'pt-8' : ''}`}>{renderWidgetContent()}</div>

      {/* Handles de redimensionnement - visible uniquement en mode édition */}
      {isEditMode && isSelected && (
        <>
          {/* Coin Sud-Est (SE) */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 cursor-se-resize rounded-tl-lg z-0 hover:bg-indigo-600 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.(e, widget.id, 'se');
            }}
          />
          {/* Coin Sud-Ouest (SW) */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 bg-indigo-500 cursor-sw-resize rounded-tr-lg z-0 hover:bg-indigo-600 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.(e, widget.id, 'sw');
            }}
          />
          {/* Coin Nord-Est (NE) */}
          <div
            className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 cursor-ne-resize rounded-bl-lg z-0 hover:bg-indigo-600 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.(e, widget.id, 'ne');
            }}
          />
          {/* Coin Nord-Ouest (NW) */}
          <div
            className="absolute top-0 left-0 w-4 h-4 bg-indigo-500 cursor-nw-resize rounded-br-lg z-0 hover:bg-indigo-600 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart?.(e, widget.id, 'nw');
            }}
          />
        </>
      )}

      {/* Modal de configuration du widget */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Configurer le widget"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mise en avant
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Affiche le widget avec un fond coloré pour le mettre en évidence
              </p>
            </div>
            <button
              onClick={() => {
                onUpdate(widget.id, { highlighted: !widget.highlighted });
                setIsConfigOpen(false);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                widget.highlighted
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  widget.highlighted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

