import React, { useState, useEffect } from 'react';
import {
  Radio, Search, AlertTriangle, TrendingUp, Users, BarChart3,
  Plus, Edit3, Trash2, Bell, BellOff, Filter, Download, Globe,
  MessageSquare, Star, Target, Zap, Eye, EyeOff, Settings, X
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';

type Platform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'web' | 'news' | 'blog' | 'forum' | 'reddit';
type AlertType = 'crisis' | 'volume_spike' | 'sentiment_shift' | 'influencer_mention' | 'competitor_mention' | 'keyword_match' | 'custom';
type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

interface ListeningQuery {
  id: string;
  name: string;
  description?: string;
  query_type: 'keyword' | 'boolean' | 'hashtag' | 'mention' | 'url';
  query_string: string;
  platforms: Platform[];
  languages: string[];
  countries: string[];
  is_active: boolean;
  created_at: string;
}

interface Mention {
  id: string;
  listening_query_id?: string;
  platform: Platform;
  author_name: string;
  author_username?: string;
  author_followers_count: number;
  author_influence_score: number;
  content: string;
  url: string;
  sentiment?: Sentiment;
  sentiment_score?: number;
  is_crisis: boolean;
  crisis_severity?: 'low' | 'medium' | 'high' | 'critical';
  is_influencer: boolean;
  engagement_metrics: Record<string, any>;
  published_at: string;
  discovered_at: string;
}

interface Alert {
  id: string;
  listening_query_id?: string;
  alert_type: AlertType;
  alert_name: string;
  trigger_conditions: Record<string, any>;
  is_active: boolean;
  notification_channels: string[];
  last_triggered_at?: string;
  trigger_count: number;
}

interface Influencer {
  id: string;
  platform: Platform;
  username: string;
  name?: string;
  followers_count: number;
  influence_score: number;
  engagement_rate?: number;
  category?: string;
  verified: boolean;
}

export const SocialListening: React.FC = () => {
  const { showToast, user } = useApp();
  const [queries, setQueries] = useState<ListeningQuery[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<ListeningQuery | null>(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filtres
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'all'>('all');
  const [filterCrisis, setFilterCrisis] = useState<'all' | 'crisis' | 'normal'>('all');
  const [filterInfluencer, setFilterInfluencer] = useState<'all' | 'influencer' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form data
  const [queryFormData, setQueryFormData] = useState({
    name: '',
    description: '',
    query_type: 'keyword' as const,
    query_string: '',
    platforms: [] as Platform[],
    languages: [] as string[],
    countries: [] as string[]
  });
  
  // Mots-clés dynamiques
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [booleanOperator, setBooleanOperator] = useState<'AND' | 'OR' | 'NOT'>('AND');

  useEffect(() => {
    loadQueries();
    loadMentions();
    loadAlerts();
    loadInfluencers();
  }, []);

  useEffect(() => {
    loadMentions();
  }, [selectedQuery, filterPlatform, filterSentiment, filterCrisis, filterInfluencer, searchQuery]);

  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('social_listening_queries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
      if (data && data.length > 0 && !selectedQuery) {
        setSelectedQuery(data.find(q => q.is_active) || data[0]);
      }
    } catch (error: any) {
      showToast('Erreur lors du chargement des requêtes', 'error');
    }
  };

  const loadMentions = async () => {
    try {
      let query = supabase
        .from('social_mentions')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100);

      if (selectedQuery) {
        query = query.eq('listening_query_id', selectedQuery.id);
      }

      if (filterPlatform !== 'all') {
        query = query.eq('platform', filterPlatform);
      }

      if (filterSentiment !== 'all') {
        query = query.eq('sentiment', filterSentiment);
      }

      if (filterCrisis === 'crisis') {
        query = query.eq('is_crisis', true);
      } else if (filterCrisis === 'normal') {
        query = query.eq('is_crisis', false);
      }

      if (filterInfluencer === 'influencer') {
        query = query.eq('is_influencer', true);
      } else if (filterInfluencer === 'normal') {
        query = query.eq('is_influencer', false);
      }

      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMentions(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des mentions', 'error');
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_listening_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des alertes', 'error');
    }
  };

  const loadInfluencers = async () => {
    try {
      const { data, error } = await supabase
        .from('social_influencers')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_tracked', true)
        .order('influence_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInfluencers(data || []);
    } catch (error: any) {
      console.error('Error loading influencers:', error);
    }
  };

  const updateQueryString = () => {
    if (queryFormData.query_type === 'boolean' && keywords.length > 0) {
      const operator = booleanOperator === 'AND' ? ' AND ' : booleanOperator === 'OR' ? ' OR ' : ' NOT ';
      const queryString = keywords.join(operator);
      setQueryFormData({ ...queryFormData, query_string: queryString });
    } else if (queryFormData.query_type === 'keyword' && keywords.length > 0) {
      setQueryFormData({ ...queryFormData, query_string: keywords.join(' ') });
    }
  };

  const handleSaveQuery = async () => {
    try {
      // Générer la requête si nécessaire
      if (keywords.length > 0 && !queryFormData.query_string) {
        updateQueryString();
      }

      const queryData = {
        ...queryFormData,
        user_id: user?.id,
        is_active: true
      };

      if (selectedQuery) {
        const { error } = await supabase
          .from('social_listening_queries')
          .update(queryData)
          .eq('id', selectedQuery.id);

        if (error) throw error;
        showToast('Requête mise à jour', 'success');
      } else {
        const { error } = await supabase
          .from('social_listening_queries')
          .insert([queryData]);

        if (error) throw error;
        showToast('Requête créée', 'success');
      }

      setIsQueryModalOpen(false);
      loadQueries();
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleSaveAlert = async () => {
    if (!selectedAlert) return;

    try {
      const { error } = await supabase
        .from('social_listening_alerts')
        .upsert({
          id: selectedAlert.id === 'new' ? undefined : selectedAlert.id,
          user_id: user?.id,
          listening_query_id: selectedQuery?.id,
          ...selectedAlert
        });

      if (error) throw error;
      showToast('Alerte sauvegardée', 'success');
      setIsAlertModalOpen(false);
      loadAlerts();
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleToggleQuery = async (queryId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('social_listening_queries')
        .update({ is_active: !isActive })
        .eq('id', queryId);

      if (error) throw error;
      loadQueries();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('social_listening_alerts')
        .update({ is_active: !isActive })
        .eq('id', alertId);

      if (error) throw error;
      loadAlerts();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const getPlatformIcon = (platform: Platform) => {
    const icons: Record<Platform, string> = {
      linkedin: '💼',
      twitter: '🐦',
      instagram: '📷',
      facebook: '👥',
      tiktok: '🎵',
      web: '🌐',
      news: '📰',
      blog: '📝',
      forum: '💬',
      reddit: '🔴'
    };
    return icons[platform] || '📱';
  };

  const getSentimentColor = (sentiment?: Sentiment) => {
    const colors = {
      positive: 'green',
      negative: 'red',
      neutral: 'slate',
      mixed: 'orange'
    };
    return colors[sentiment || 'neutral'];
  };

  const getCrisisColor = (severity?: string) => {
    const colors = {
      low: 'yellow',
      medium: 'orange',
      high: 'red',
      critical: 'red'
    };
    return colors[severity as keyof typeof colors] || 'slate';
  };

  const stats = {
    total: mentions.length,
    positive: mentions.filter(m => m.sentiment === 'positive').length,
    negative: mentions.filter(m => m.sentiment === 'negative').length,
    neutral: mentions.filter(m => m.sentiment === 'neutral').length,
    crisis: mentions.filter(m => m.is_crisis).length,
    influencers: mentions.filter(m => m.is_influencer).length
  };

  return (
    <PageLayout
      header={{
        icon: Radio,
        title: "Social Listening",
        description: "Surveillez votre e-réputation et analysez les conversations",
        rightActions: [
          {
            label: "Nouvelle requête",
            icon: Plus,
            onClick: () => {
              setSelectedQuery(null);
              setQueryFormData({
                name: '',
                description: '',
                query_type: 'keyword',
                query_string: '',
                platforms: [],
                languages: [],
                countries: []
              });
              setIsQueryModalOpen(true);
            },
            variant: 'primary'
          }
        ]
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Requêtes et filtres */}
        <div className="lg:col-span-1 space-y-6">
          {/* Requêtes actives */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Requêtes de monitoring</h3>
            <div className="space-y-2">
              {queries.map((query) => (
                <div
                  key={query.id}
                  onClick={() => setSelectedQuery(query)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-500 ${
                    selectedQuery?.id === query.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-900 dark:text-white">
                      {query.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleQuery(query.id, query.is_active);
                      }}
                      className={query.is_active ? 'text-green-500' : 'text-slate-400'}
                    >
                      {query.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {query.query_string}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Filtres</h3>
            <div className="space-y-3">
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
              <Dropdown
                value={filterPlatform}
                onChange={(value) => setFilterPlatform(value as any)}
                options={[
                  { value: 'all', label: 'Toutes plateformes' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'twitter', label: 'Twitter/X' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'tiktok', label: 'TikTok' },
                  { value: 'web', label: 'Web' }
                ]}
              />
              <Dropdown
                value={filterSentiment}
                onChange={(value) => setFilterSentiment(value as any)}
                options={[
                  { value: 'all', label: 'Tous sentiments' },
                  { value: 'positive', label: 'Positif' },
                  { value: 'negative', label: 'Négatif' },
                  { value: 'neutral', label: 'Neutre' }
                ]}
              />
              <Dropdown
                value={filterCrisis}
                onChange={(value) => setFilterCrisis(value as any)}
                options={[
                  { value: 'all', label: 'Tout' },
                  { value: 'crisis', label: 'Crises uniquement' },
                  { value: 'normal', label: 'Normal' }
                ]}
              />
              <Dropdown
                value={filterInfluencer}
                onChange={(value) => setFilterInfluencer(value as any)}
                options={[
                  { value: 'all', label: 'Tout' },
                  { value: 'influencer', label: 'Influenceurs' },
                  { value: 'normal', label: 'Normal' }
                ]}
              />
            </div>
          </div>

          {/* Alertes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">Alertes</h3>
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={() => {
                  setSelectedAlert({
                    id: 'new',
                    alert_type: 'keyword_match',
                    alert_name: '',
                    trigger_conditions: {},
                    is_active: true,
                    notification_channels: [],
                    trigger_count: 0
                  });
                  setIsAlertModalOpen(true);
                }}
              />
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {alert.alert_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {alert.trigger_count} déclenchements
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                    className={alert.is_active ? 'text-green-500' : 'text-slate-400'}
                  >
                    {alert.is_active ? <Bell size={14} /> : <BellOff size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone principale - Mentions */}
        <div className="lg:col-span-3 space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.positive}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Positif</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.negative}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Négatif</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.neutral}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Neutre</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.crisis}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Crises</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.influencers}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Influenceurs</div>
            </div>
          </div>

          {/* Liste des mentions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Mentions ({mentions.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {mentions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucune mention trouvée</p>
                </div>
              ) : (
                mentions.map((mention) => (
                  <div key={mention.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">{getPlatformIcon(mention.platform)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {mention.author_name}
                          </span>
                          {mention.author_username && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              @{mention.author_username}
                            </span>
                          )}
                          {mention.is_influencer && (
                            <Badge variant="blue" className="text-xs flex items-center gap-1">
                              <Star size={10} />
                              Influenceur
                            </Badge>
                          )}
                          {mention.is_crisis && (
                            <Badge variant={getCrisisColor(mention.crisis_severity) as any} className="text-xs flex items-center gap-1">
                              <AlertTriangle size={10} />
                              {mention.crisis_severity || 'Crise'}
                            </Badge>
                          )}
                          {mention.sentiment && (
                            <Badge variant={getSentimentColor(mention.sentiment) as any} className="text-xs">
                              {mention.sentiment}
                            </Badge>
                          )}
                          <Badge variant="slate" className="text-xs">
                            {mention.platform}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                          {mention.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            {new Date(mention.published_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {mention.author_followers_count > 0 && (
                            <span>{mention.author_followers_count.toLocaleString()} abonnés</span>
                          )}
                          {mention.author_influence_score > 0 && (
                            <span>Score: {mention.author_influence_score.toFixed(1)}</span>
                          )}
                          <a
                            href={mention.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Voir l'original
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal requête */}
      <Modal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
        title={selectedQuery ? "Modifier la requête" : "Nouvelle requête de monitoring"}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la requête"
            value={queryFormData.name}
            onChange={(e) => setQueryFormData({ ...queryFormData, name: e.target.value })}
            placeholder="Ex: Mentions de ma marque"
            required
          />
          <Textarea
            label="Description"
            value={queryFormData.description}
            onChange={(e) => setQueryFormData({ ...queryFormData, description: e.target.value })}
            rows={2}
          />
          <Dropdown
            label="Type de requête"
            value={queryFormData.query_type}
            onChange={(value) => {
              setQueryFormData({ ...queryFormData, query_type: value as any, query_string: '' });
              setKeywords([]);
            }}
            options={[
              { value: 'keyword', label: 'Mots-clés' },
              { value: 'boolean', label: 'Recherche booléenne' },
              { value: 'hashtag', label: 'Hashtag' },
              { value: 'mention', label: 'Mention' },
              { value: 'url', label: 'URL' }
            ]}
          />

          {/* Gestion des mots-clés dynamiques */}
          {(queryFormData.query_type === 'keyword' || queryFormData.query_type === 'boolean') && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mots-clés
              </label>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ajouter un mot-clé..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newKeyword.trim()) {
                      setKeywords([...keywords, newKeyword.trim()]);
                      setNewKeyword('');
                      updateQueryString();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (newKeyword.trim()) {
                      setKeywords([...keywords, newKeyword.trim()]);
                      setNewKeyword('');
                      updateQueryString();
                    }
                  }}
                >
                  Ajouter
                </Button>
              </div>
              
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      className="flex items-center gap-1"
                    >
                      {keyword}
                      <button
                        onClick={() => {
                          const newKeywords = keywords.filter((_, i) => i !== index);
                          setKeywords(newKeywords);
                          updateQueryString();
                        }}
                        className="ml-1 hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Opérateur booléen pour recherche booléenne */}
              {queryFormData.query_type === 'boolean' && keywords.length > 1 && (
                <Dropdown
                  label="Opérateur booléen"
                  value={booleanOperator}
                  onChange={(value) => {
                    setBooleanOperator(value as 'AND' | 'OR' | 'NOT');
                    updateQueryString();
                  }}
                  options={[
                    { value: 'AND', label: 'ET (tous les mots-clés)' },
                    { value: 'OR', label: 'OU (au moins un mot-clé)' },
                    { value: 'NOT', label: 'SAUF (exclure ces mots-clés)' },
                  ]}
                />
              )}

              {/* Aperçu de la requête générée */}
              {queryFormData.query_string && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Requête générée :</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-white">
                    {queryFormData.query_string}
                  </p>
                </div>
              )}
            </div>
          )}
          <Textarea
            label={queryFormData.query_type === 'boolean' ? 'Requête booléenne' : 'Requête'}
            value={queryFormData.query_string}
            onChange={(e) => setQueryFormData({ ...queryFormData, query_string: e.target.value })}
            placeholder={
              queryFormData.query_type === 'boolean'
                ? 'Ex: (marque OR produit) AND (positif OR excellent)'
                : 'Ex: ma marque, mon produit'
            }
            rows={3}
            required
          />
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium mb-1">Recherche booléenne :</p>
            <p>Utilisez AND, OR, NOT, () pour des recherches avancées</p>
            <p>Ex: (marque OR produit) AND (positif OR excellent) NOT (concurrent)</p>
          </div>

          {/* Filtres plateformes, langues, pays */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Plateformes
              </label>
              <div className="flex flex-wrap gap-2">
                {(['linkedin', 'twitter', 'instagram', 'facebook', 'tiktok', 'web', 'news', 'blog', 'forum', 'reddit'] as Platform[]).map(platform => (
                  <label key={platform} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={queryFormData.platforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQueryFormData({
                            ...queryFormData,
                            platforms: [...queryFormData.platforms, platform],
                          });
                        } else {
                          setQueryFormData({
                            ...queryFormData,
                            platforms: queryFormData.platforms.filter(p => p !== platform),
                          });
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Langues
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: fr, en, es"
                  value={queryFormData.languages.join(', ')}
                  onChange={(e) => {
                    const langs = e.target.value.split(',').map(l => l.trim()).filter(l => l);
                    setQueryFormData({ ...queryFormData, languages: langs });
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Codes ISO 639-1 (fr, en, es, de, it, etc.)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Pays
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: FR, US, GB"
                  value={queryFormData.countries.join(', ')}
                  onChange={(e) => {
                    const countries = e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                    setQueryFormData({ ...queryFormData, countries });
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Codes ISO 3166-1 alpha-2 (FR, US, GB, etc.)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsQueryModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSaveQuery}>
              {selectedQuery ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal alerte */}
      <Modal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        title={selectedAlert?.id === 'new' ? "Nouvelle alerte" : "Modifier l'alerte"}
        size="lg"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <Input
              label="Nom de l'alerte"
              value={selectedAlert.alert_name}
              onChange={(e) => setSelectedAlert({ ...selectedAlert, alert_name: e.target.value })}
              required
            />
            <Dropdown
              label="Type d'alerte"
              value={selectedAlert.alert_type}
              onChange={(value) => setSelectedAlert({ ...selectedAlert, alert_type: value as any })}
              options={[
                { value: 'crisis', label: 'Détection de crise' },
                { value: 'volume_spike', label: 'Pic de volume' },
                { value: 'sentiment_shift', label: 'Changement de sentiment' },
                { value: 'influencer_mention', label: 'Mention par influenceur' },
                { value: 'competitor_mention', label: 'Mention concurrent' },
                { value: 'keyword_match', label: 'Correspondance mot-clé' },
                { value: 'custom', label: 'Personnalisée' }
              ]}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAlertModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleSaveAlert}>
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

