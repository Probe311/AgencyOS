
import React, { useState } from 'react';
import { Download, Calendar, BarChart2, Clock, BarChart3, Layout, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { CTA } from '../ui/CTA';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TimeReports } from '../time/TimeReports';
import { CrmReportingView } from '../crm/CrmReportingView';
import { AutomatedReportsManager } from '../reporting/AutomatedReportsManager';
import { ForecastsProjections } from '../analytics/ForecastsProjections';
import { ReportBuilder } from '../reporting/ReportBuilder';
import { AdvancedKPIs } from '../analytics/AdvancedKPIs';
import { PageLayout } from '../ui/PageLayout';
import { exportToPDF } from '../../lib/utils/export';

export const ReportingView: React.FC = () => {
  const { financeStats, leads, tasks, showToast } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'crm' | 'automated' | 'forecasts' | 'builder' | 'kpis'>('overview');

  // Aggregate Data for Reporting (Derived from Context)
  const totalRevenue = financeStats.reduce((acc, curr) => acc + curr.revenue, 0);
  const newLeads = leads.length;
  const activeTasks = tasks.filter(t => t.status === 'En cours').length;
  const finishedTasks = tasks.filter(t => t.status === 'Terminé').length;
  const conversionRate = leads.length > 0 ? (leads.filter(l => l.stage === 'Gagné').length / leads.length * 100).toFixed(1) : 0;

  // Chart Data Mapper
  const chartData = financeStats.length > 0 ? financeStats.map(s => ({
     name: s.month,
     value: s.revenue,
     profit: s.profit
  })) : [];

  const handleExportPDF = async () => {
    try {
      const exportData = {
        title: `Rapport Global - ${new Date().toLocaleDateString('fr-FR')}`,
        performance: {
          openRate: 0, // À remplir si disponible
          clickRate: 0, // À remplir si disponible
          roi: conversionRate ? parseFloat(conversionRate) : 0,
          totalRevenue: totalRevenue,
        },
        metrics: financeStats.map(stat => ({
          metricDate: stat.month,
          opens: 0,
          clicks: 0,
          bounces: 0,
          conversions: leads.filter(l => l.stage === 'Gagné').length,
          revenue: stat.revenue,
        })),
        summary: {
          totalRevenue,
          newLeads,
          conversionRate,
          activeTasks,
          finishedTasks,
        },
      };

      const filename = `rapport_global_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportToPDF(exportData, filename);
      showToast('Rapport PDF généré avec succès', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Erreur lors de l\'export PDF', 'error');
    }
  };

  return (
    <PageLayout
      header={{
        icon: BarChart3,
        iconBgColor: "bg-green-100 dark:bg-green-900/20",
        iconColor: "text-green-600 dark:text-green-400",
        title: "Reporting Global",
        description: "KPIs consolidés de tous les pôles.",
        rightActions: [
          {
            label: "Ce Mois",
            icon: Calendar,
            onClick: () => {},
            variant: 'outline'
          },
          {
            label: "Exporter PDF",
            icon: Download,
            onClick: handleExportPDF,
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="h-full flex flex-col space-y-6">
      {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('time')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'time'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={14} />
          Rapports temps
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'crm'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <BarChart2 size={14} />
          Reporting CRM
        </button>
        <button
          onClick={() => setActiveTab('automated')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'automated'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Calendar size={14} />
          Rapports automatisés
        </button>
        <button
          onClick={() => setActiveTab('forecasts')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'forecasts'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp size={14} />
          Prévisions
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'builder'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Layout size={14} />
          Builder
        </button>
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-2 text-sm font-bold transition-all duration-500 border-b-2 flex items-center gap-2 ${
            activeTab === 'kpis'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 size={14} />
          KPIs Avancés
        </button>
      </div>

      {activeTab === 'time' ? (
        <div className="flex-1 overflow-auto">
          <TimeReports />
        </div>
      ) : activeTab === 'crm' ? (
        <div className="flex-1 overflow-auto">
          <CrmReportingView />
        </div>
      ) : activeTab === 'automated' ? (
        <div className="flex-1 overflow-auto">
          <AutomatedReportsManager />
        </div>
      ) : activeTab === 'forecasts' ? (
        <div className="flex-1 overflow-auto">
          <ForecastsProjections />
        </div>
      ) : activeTab === 'builder' ? (
        <div className="flex-1 overflow-hidden">
          <ReportBuilder />
        </div>
      ) : activeTab === 'kpis' ? (
        <div className="flex-1 overflow-auto">
          <AdvancedKPIs />
        </div>
      ) : (
        <>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <ReportCard title="Chiffre d'Affaires" value={`${totalRevenue.toLocaleString()}€`} />
         <ReportCard title="Nouveaux Leads" value={newLeads.toString()} />
         <ReportCard title="Taux Conversion" value={`${conversionRate}%`} />
         <ReportCard title="Tâches Livrées" value={finishedTasks.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Performance Financière</h3>
            <div className="h-80">
               {financeStats.length > 0 ? (
                  <CustomAreaChart
                     data={chartData}
                     dataKey="value"
                     showXAxis={true}
                     showYAxis={true}
                     showGrid={true}
                     showTooltip={true}
                     color="#6366f1"
                  />
               ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 flex-col">
                     <BarChart2 size={48} className="mb-2 opacity-20" />
                     <p>En attente de données financières...</p>
                  </div>
               )}
            </div>
         </div>

         <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Répartition par Pôle</h3>
            <div className="flex-1 flex items-center justify-center">
               <div className="space-y-6 w-full">
                  {[
                     { label: 'R&D & Tech', val: tasks.filter(t => t.department === 'R&D & Tech').length },
                     { label: 'Marketing', val: tasks.filter(t => t.department === 'Marketing & RP').length },
                     { label: 'Design', val: tasks.filter(t => t.department === 'Design & Costumes').length },
                  ].map((dept, i) => {
                     const total = tasks.length || 1;
                     const pct = Math.round((dept.val / total) * 100);
                     return (
                        <div key={dept.label}>
                           <div className="flex justify-between text-sm mb-2 font-bold text-slate-700 dark:text-slate-300">
                              <span>{dept.label}</span>
                              <span>{pct}%</span>
                           </div>
                           <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                           </div>
                        </div>
                     );
                  })}
                  {tasks.length === 0 && <p className="text-center text-slate-400 text-sm">Aucune donnée de tâche.</p>}
               </div>
            </div>
         </div>
      </div>
        </>
      )}
    </div>
    </PageLayout>
  );
};

const ReportCard = ({ title, value }: { title: string, value: string }) => (
   <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{value}</h3>
   </div>
);
