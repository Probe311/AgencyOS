import React, { useState, useEffect } from 'react';
import { Mail, Eye, MousePointerClick, TrendingUp, Clock, MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEmailTracking, EmailTracking } from '../../lib/supabase/hooks/useEmailTracking';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface EmailTrackingStatsProps {
  emailId?: string;
  leadId?: string;
  emailType?: 'campaign' | 'sequence' | 'manual' | 'automated';
}

export const EmailTrackingStats: React.FC<EmailTrackingStatsProps> = ({
  emailId,
  leadId,
  emailType = 'manual',
}) => {
  const [trackings, setTrackings] = useState<EmailTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTracking, setSelectedTracking] = useState<EmailTracking | null>(null);

  useEffect(() => {
    loadTrackings();
  }, [emailId, leadId]);

  const loadTrackings = async () => {
    try {
      setLoading(true);
      let query = supabase.from('email_tracking').select('*');

      if (emailId) {
        query = query.eq('email_id', emailId);
      }
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      if (emailType) {
        query = query.eq('email_type', emailType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTrackings: EmailTracking[] = (data || []).map((item: any) => ({
        id: item.id,
        emailId: item.email_id,
        leadId: item.lead_id,
        emailType: item.email_type,
        subject: item.subject,
        firstOpenedAt: item.first_opened_at,
        lastOpenedAt: item.last_opened_at,
        openCount: item.open_count || 0,
        clickedLinks: item.clicked_links || [],
        totalClicks: item.total_clicks || 0,
        isOpened: item.is_opened || false,
        isClicked: item.is_clicked || false,
        userAgent: item.user_agent,
        ipAddress: item.ip_address,
        location: item.location || {},
        metadata: item.metadata || {},
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setTrackings(mappedTrackings);
    } catch (error) {
      console.error('Error loading email trackings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Statistiques agrégées
  const stats = trackings.reduce(
    (acc, t) => {
      acc.totalEmails++;
      if (t.isOpened) acc.totalOpens++;
      acc.totalOpenCount += t.openCount;
      if (t.isClicked) acc.totalClicks++;
      acc.totalClickCount += t.totalClicks;
      return acc;
    },
    {
      totalEmails: 0,
      totalOpens: 0,
      totalOpenCount: 0,
      totalClicks: 0,
      totalClickCount: 0,
    }
  );

  const openRate = stats.totalEmails > 0 ? (stats.totalOpens / stats.totalEmails) * 100 : 0;
  const clickRate = stats.totalOpens > 0 ? (stats.totalClicks / stats.totalOpens) * 100 : 0;

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor size={16} />;
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return <Smartphone size={16} />;
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return <Tablet size={16} />;
    }
    return <Monitor size={16} />;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-slate-500">Chargement des statistiques...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Mail size={20} className="text-slate-400" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEmails}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Emails envoyés</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye size={20} className="text-blue-500" />
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOpens}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                ({openRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.totalOpenCount} ouverture{stats.totalOpenCount > 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <MousePointerClick size={20} className="text-green-500" />
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalClicks}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                ({clickRate.toFixed(1)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.totalClickCount} clic{stats.totalClickCount > 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={20} className="text-purple-500" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalOpens > 0 ? ((stats.totalClickCount / stats.totalOpens) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Taux de clic</p>
        </Card>
      </div>

      {/* Liste des trackings */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Historique des emails
        </h3>
        {trackings.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            Aucun email tracké pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {trackings.map((tracking) => (
              <div
                key={tracking.id}
                className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                onClick={() => setSelectedTracking(selectedTracking?.id === tracking.id ? null : tracking)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-slate-400" />
                      <span className="font-medium text-sm text-slate-900 dark:text-white">
                        {tracking.subject || 'Email sans sujet'}
                      </span>
                      <Badge variant={tracking.isOpened ? 'success' : 'default'} className="text-xs">
                        {tracking.emailType}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      {tracking.firstOpenedAt && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>
                            Ouvert le {new Date(tracking.firstOpenedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      {tracking.location && tracking.location.city && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{tracking.location.city}</span>
                        </div>
                      )}
                      {tracking.userAgent && (
                        <div className="flex items-center gap-1">
                          {getDeviceIcon(tracking.userAgent)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    {tracking.isOpened && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                          <Eye size={14} />
                          <span>{tracking.openCount}</span>
                        </div>
                      </div>
                    )}
                    {tracking.isClicked && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                          <MousePointerClick size={14} />
                          <span>{tracking.totalClicks}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Détails expandus */}
                {selectedTracking?.id === tracking.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Première ouverture :</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {tracking.firstOpenedAt
                            ? new Date(tracking.firstOpenedAt).toLocaleString('fr-FR')
                            : 'Non ouvert'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Dernière ouverture :</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {tracking.lastOpenedAt
                            ? new Date(tracking.lastOpenedAt).toLocaleString('fr-FR')
                            : 'Non ouvert'}
                        </span>
                      </div>
                      {tracking.ipAddress && (
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Adresse IP :</span>
                          <span className="ml-2 text-slate-900 dark:text-white">{tracking.ipAddress}</span>
                        </div>
                      )}
                      {tracking.userAgent && (
                        <div className="col-span-2">
                          <span className="text-slate-500 dark:text-slate-400">User Agent :</span>
                          <span className="ml-2 text-xs text-slate-900 dark:text-white">{tracking.userAgent}</span>
                        </div>
                      )}
                    </div>

                    {tracking.clickedLinks && tracking.clickedLinks.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Liens cliqués :
                        </span>
                        <div className="space-y-2">
                          {tracking.clickedLinks.map((link: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1"
                                >
                                  {link.url}
                                </a>
                                <Badge variant="info" className="ml-2">
                                  {link.count} clic{link.count > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {link.clicked_at && (
                                <div className="text-slate-500 dark:text-slate-400 mt-1">
                                  Dernier clic : {new Date(link.clicked_at).toLocaleString('fr-FR')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

