import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Mail, MousePointerClick, Eye, DollarSign, Download, FileText, Calendar, Filter } from 'lucide-react';
import { useMarketingAnalytics } from '../../lib/supabase/hooks/useMarketingAnalytics';
import { EmailCampaign, EmailHeatmapData } from '../../types';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomAreaChart } from '../charts/CustomAreaChart';
import { Modal } from '../ui/Modal';
import { Loader } from '../ui/Loader';
import { ExportButton } from '../ui/ExportButton';
import { useApp } from '../contexts/AppContext';

interface MarketingAnalyticsViewProps {
  campaign?: EmailCampaign;
  campaignId?: string;
}

export const MarketingAnalyticsView: React.FC<MarketingAnalyticsViewProps> = ({ campaign, campaignId }) => {
  const {
    getCampaignMetrics,
    getCampaignROI,
    calculateCampaignROI,
    getEmailHeatmap,
    getCampaignPerformance,
  } = useMarketingAnalytics();

  const [metrics, setMetrics] = useState<any[]>([]);
  const [roi, setRoi] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<EmailHeatmapData[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);

  const id = campaignId || campaign?.id;

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, selectedPeriod]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = getStartDate(selectedPeriod);

      const [metricsData, roiData, heatmapData, performanceData] = await Promise.all([
        getCampaignMetrics(id, startDate, endDate),
        getCampaignROI(id, startDate, endDate),
        getEmailHeatmap(id),
        getCampaignPerformance(id),
      ]);

      setMetrics(metricsData);
      setHeatmap(heatmapData);
      setPerformance(performanceData);

      if (roiData) {
        setRoi(roiData);
      } else if (startDate && endDate) {
        // Calculate ROI if it doesn't exist
        const calculatedROI = await calculateCampaignROI(id, startDate, endDate);
        setRoi(calculatedROI);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

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
      return ''; // All time
    }

    return start.toISOString().split('T')[0];
  };

  const { showToast } = useApp();

  const exportData = (campaign || id) ? {
    title: `Rapport Analytics - ${campaign?.name || 'Campagne'}`,
    period: selectedPeriod,
    performance,
    roi,
    metrics: metrics.slice(0, 30), // Last 30 days
  } : null;

  const exportTableData = metrics.map(m => ({
    Date: m.metricDate,
    'Ouvertures': m.opens,
    'Ouvertures uniques': m.uniqueOpens,
    'Clics': m.clicks,
    'Clics uniques': m.uniqueClicks,
    'Rebonds': m.bounces,
    'Désabonnements': m.unsubscribes,
    'Conversions': m.conversions,
    'Revenus (€)': m.revenue,
    'Coût (€)': m.cost,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-slate-400 dark:text-slate-500">
          <BarChart2 size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-2">Aucune donnée disponible</p>
          <p className="text-sm">Les analytics apparaîtront après l'envoi de campagnes</p>
        </div>
      </div>
    );
  }

  const chartData = metrics.slice(0, 30).reverse().map(m => ({
    name: new Date(m.metricDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    opens: m.opens,
    clicks: m.clicks,
    revenue: m.revenue,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Marketing</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {campaign?.name || 'Performance des campagnes'}
          </p>
        </div>
        <div className="flex gap-3">
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
          {exportData && (
            <ExportButton
              data={exportData}
              filename={`rapport-analytics-${id || campaign?.id || 'campagne'}-${new Date().toISOString().split('T')[0]}`}
              showToast={showToast}
            />
          )}
          {exportTableData.length > 0 && (
            <ExportButton
              data={exportTableData}
              filename={`metriques-campagne-${id || campaign?.id || 'campagne'}-${new Date().toISOString().split('T')[0]}`}
              label="Exporter données"
              variant="ghost"
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Taux d'ouverture"
          value={`${performance.openRate.toFixed(1)}%`}
          icon={Eye}
          color="bg-blue-500"
        />
        <MetricCard
          title="Taux de clic"
          value={`${performance.clickRate.toFixed(1)}%`}
          icon={MousePointerClick}
          color="bg-indigo-500"
        />
        <MetricCard
          title="ROI"
          value={`${performance.roi.toFixed(1)}%`}
          icon={TrendingUp}
          color={performance.roi >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}
        />
        <MetricCard
          title="Revenus générés"
          value={`${performance.totalRevenue.toLocaleString('fr-FR')}€`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Performance quotidienne</h3>
          {chartData.length > 0 ? (
            <CustomBarChart
              data={chartData}
              xAxisKey="name"
              bars={[
                { key: 'opens', name: 'Ouvertures', color: '#3b82f6' },
                { key: 'clicks', name: 'Clics', color: '#6366f1' },
              ]}
              height={300}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Revenus générés</h3>
          {chartData.length > 0 ? (
            <CustomAreaChart
              data={chartData}
              dataKey="revenue"
              showXAxis={true}
              showYAxis={true}
              showGrid={true}
              showTooltip={true}
              color="#10b981"
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* ROI & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roi && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">ROI de la campagne</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Coût total</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {roi.totalCost.toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Revenus générés</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {roi.totalRevenue.toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Conversions</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {roi.totalConversions}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">ROI</span>
                  <Badge
                    className={
                      roi.roiPercentage >= 0
                        ? 'bg-emerald-100 text-emerald-700 text-lg px-4 py-2'
                        : 'bg-rose-100 text-rose-700 text-lg px-4 py-2'
                    }
                  >
                    {roi.roiPercentage >= 0 ? '+' : ''}
                    {roi.roiPercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Heatmap Email</h3>
            <Button size="sm" variant="outline" onClick={() => setIsHeatmapModalOpen(true)}>
              Voir en grand
            </Button>
          </div>
          {heatmap.length > 0 ? (
            <EmailHeatmapPreview data={heatmap} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Aucun clic enregistré
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
        <div className="p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Métriques détaillées</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Ouvertures</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Clics</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Rebonds</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Conversions</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 30).map((metric) => (
                  <tr key={metric.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                      {new Date(metric.metricDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{metric.opens}</td>
                    <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{metric.clicks}</td>
                    <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{metric.bounces}</td>
                    <td className="py-4 px-4 text-right text-slate-700 dark:text-slate-300">{metric.conversions}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {metric.revenue.toLocaleString('fr-FR')}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Heatmap Modal */}
      <Modal
        isOpen={isHeatmapModalOpen}
        onClose={() => setIsHeatmapModalOpen(false)}
        title="Heatmap Email - Zones de clics"
        className="max-w-4xl"
      >
        <div className="h-96">
          <EmailHeatmapPreview data={heatmap} fullSize />
        </div>
      </Modal>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex items-center justify-between mb-4">
      <Icon size={20} className="text-slate-400" />
      <div className={`${color} p-2 rounded-lg`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
  </div>
);

const EmailHeatmapPreview = ({ data, fullSize = false }: { data: EmailHeatmapData[]; fullSize?: boolean }) => {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        Aucun clic enregistré
      </div>
    );
  }

  // Create a grid representation
  const maxX = Math.max(...data.map(d => d.x));
  const maxY = Math.max(...data.map(d => d.y));
  const gridSize = fullSize ? 20 : 10;

  return (
    <div className="relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div
        className="relative"
        style={{
          width: '100%',
          height: fullSize ? '400px' : '200px',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 21px)',
        }}
      >
        {data.map((point, index) => (
          <div
            key={index}
            className="absolute rounded-full border-2 border-white dark:border-slate-800 transition-all duration-500"
            style={{
              left: `${(point.x / maxX) * 100}%`,
              top: `${(point.y / maxY) * 100}%`,
              width: `${Math.max(10, point.intensity * 40)}px`,
              height: `${Math.max(10, point.intensity * 40)}px`,
              backgroundColor: `rgba(99, 102, 241, ${Math.max(0.3, point.intensity)})`,
              transform: 'translate(-50%, -50%)',
            }}
            title={`${point.count} clic(s) à (${point.x}, ${point.y})`}
          />
        ))}
      </div>
      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-30"></div>
            <span>Faible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-60"></div>
            <span>Moyen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>Élevé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

