import React, { useState, useMemo } from 'react';
import { TrendingUp, Users, Heart, MessageCircle, Share2, Download, Calendar, BarChart3, PieChart, LineChart } from 'lucide-react';
import { SocialPost } from '../../types';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { CustomLineChart } from '../charts/CustomLineChart';
import { CustomBarChart } from '../charts/CustomBarChart';
import { CustomPieChart } from '../charts/CustomPieChart';
import { useApp } from '../contexts/AppContext';
import jsPDF from 'jspdf';

interface SocialAnalyticsDashboardProps {
  posts: SocialPost[];
  dateRange?: { start: Date; end: Date };
}

type Platform = 'linkedin' | 'instagram' | 'twitter' | 'facebook' | 'all';
type MetricType = 'engagement' | 'reach' | 'likes' | 'comments' | 'shares';

export const SocialAnalyticsDashboard: React.FC<SocialAnalyticsDashboardProps> = ({
  posts,
  dateRange,
}) => {
  const { showToast } = useApp();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('engagement');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Filtrer les posts selon la plateforme et la période
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(p => p.platform === selectedPlatform);
    }

    if (dateRange) {
      filtered = filtered.filter(p => {
        const postDate = new Date(p.date);
        return postDate >= dateRange.start && postDate <= dateRange.end;
      });
    } else {
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : Infinity;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysAgo);
      filtered = filtered.filter(p => new Date(p.date) >= startDate);
    }

    return filtered;
  }, [posts, selectedPlatform, dateRange, timeRange]);

  // Calculer les métriques globales
  const metrics = useMemo(() => {
    const totalLikes = filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalShares = filteredPosts.reduce((sum, p) => sum + (p.shares || 0), 0);
    const totalReach = filteredPosts.reduce((sum, p) => sum + (p.reach || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = filteredPosts.length > 0 ? totalEngagement / filteredPosts.length : 0;

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalReach,
      totalEngagement,
      avgEngagement,
      postCount: filteredPosts.length,
    };
  }, [filteredPosts]);

  // Données pour graphiques temporels
  const timeSeriesData = useMemo(() => {
    const data: Record<string, { date: string; likes: number; comments: number; shares: number; engagement: number }> = {};

    filteredPosts.forEach(post => {
      const date = new Date(post.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (!data[date]) {
        data[date] = { date, likes: 0, comments: 0, shares: 0, engagement: 0 };
      }
      data[date].likes += post.likes || 0;
      data[date].comments += post.comments || 0;
      data[date].shares += post.shares || 0;
      data[date].engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    });

    return Object.values(data).sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  }, [filteredPosts]);

  // Données par plateforme
  const platformData = useMemo(() => {
    const platforms: Record<string, { name: string; posts: number; likes: number; comments: number; shares: number; engagement: number }> = {};

    filteredPosts.forEach(post => {
      if (!platforms[post.platform]) {
        platforms[post.platform] = {
          name: post.platform,
          posts: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagement: 0,
        };
      }
      platforms[post.platform].posts += 1;
      platforms[post.platform].likes += post.likes || 0;
      platforms[post.platform].comments += post.comments || 0;
      platforms[post.platform].shares += post.shares || 0;
      platforms[post.platform].engagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    });

    return Object.values(platforms);
  }, [filteredPosts]);

  // Top posts
  const topPosts = useMemo(() => {
    return [...filteredPosts]
      .sort((a, b) => {
        const engagementA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
        const engagementB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
        return engagementB - engagementA;
      })
      .slice(0, 5);
  }, [filteredPosts]);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Titre
      doc.setFontSize(20);
      doc.text('Rapport Analytics Social Media', 20, yPos);
      yPos += 15;

      // Période
      doc.setFontSize(12);
      doc.text(`Période: ${timeRange === 'all' ? 'Toutes' : `${timeRange}`}`, 20, yPos);
      yPos += 10;

      // Métriques globales
      doc.setFontSize(16);
      doc.text('Métriques Globales', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Total Posts: ${metrics.postCount}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Engagement: ${metrics.totalEngagement.toLocaleString()}`, 20, yPos);
      yPos += 7;
      doc.text(`Engagement Moyen: ${metrics.avgEngagement.toFixed(1)}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Likes: ${metrics.totalLikes.toLocaleString()}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Commentaires: ${metrics.totalComments.toLocaleString()}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Partages: ${metrics.totalShares.toLocaleString()}`, 20, yPos);
      yPos += 15;

      // Top posts
      doc.setFontSize(16);
      doc.text('Top 5 Posts', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      topPosts.forEach((post, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        doc.text(`${index + 1}. ${post.platform} - ${engagement} engagements`, 20, yPos);
        yPos += 7;
      });

      doc.save(`social-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Rapport PDF exporté avec succès', 'success');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      showToast('Erreur lors de l\'export PDF', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex gap-4 items-center">
        <Dropdown
          value={selectedPlatform}
          onChange={(value) => setSelectedPlatform(value as Platform)}
          options={[
            { label: 'Plateformes', value: 'all' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Twitter/X', value: 'twitter' },
            { label: 'Facebook', value: 'facebook' },
          ]}
          containerClassName="w-48"
        />
        <Dropdown
          value={timeRange}
          onChange={(value) => setTimeRange(value as any)}
          options={[
            { label: '7 derniers jours', value: '7d' },
            { label: '30 derniers jours', value: '30d' },
            { label: '90 derniers jours', value: '90d' },
            { label: 'Tout', value: 'all' },
          ]}
          containerClassName="w-48"
        />
        <Button icon={Download} onClick={handleExportPDF}>
          Exporter PDF
        </Button>
      </div>

      {/* Métriques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Engagement"
          value={metrics.totalEngagement.toLocaleString()}
          icon={TrendingUp}
          color="indigo"
          subtitle={`${metrics.avgEngagement.toFixed(1)} en moyenne`}
        />
        <MetricCard
          title="Total Likes"
          value={metrics.totalLikes.toLocaleString()}
          icon={Heart}
          color="rose"
        />
        <MetricCard
          title="Total Commentaires"
          value={metrics.totalComments.toLocaleString()}
          icon={MessageCircle}
          color="blue"
        />
        <MetricCard
          title="Total Partages"
          value={metrics.totalShares.toLocaleString()}
          icon={Share2}
          color="emerald"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique temporel */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <LineChart size={18} className="text-indigo-600 dark:text-indigo-400" />
            Évolution temporelle
          </h3>
          <CustomLineChart
            data={timeSeriesData}
            dataKey={selectedMetric}
            xKey="date"
            height={300}
            color="#6366f1"
          />
        </div>

        {/* Répartition par plateforme */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-indigo-600 dark:text-indigo-400" />
            Répartition par plateforme
          </h3>
          <CustomPieChart
            data={platformData.map(p => ({ name: p.name, value: p.engagement }))}
            height={300}
          />
        </div>
      </div>

      {/* Comparaison par plateforme */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
          Comparaison par plateforme
        </h3>
        <CustomBarChart
          data={platformData}
          dataKey="engagement"
          xKey="name"
          height={300}
          color="#6366f1"
        />
      </div>

      {/* Top posts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top 5 Posts</h3>
        <div className="space-y-3">
          {topPosts.map((post, index) => {
            const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
            return (
              <div
                key={post.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-3">
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {post.content.substring(0, 60)}...
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {post.platform}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{post.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">
                    <Heart size={14} className="inline mr-1" />
                    {post.likes || 0}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <MessageCircle size={14} className="inline mr-1" />
                    {post.comments || 0}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {engagement} engagements
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'indigo' | 'rose' | 'blue' | 'emerald' | 'emerald';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h4>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

