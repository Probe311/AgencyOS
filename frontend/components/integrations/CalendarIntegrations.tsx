import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Settings, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, Trash2, Eye, EyeOff, Clock, AlertCircle, Zap
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { CalendarIntegrationService, CalendarIntegration, SyncConflict } from '../../lib/services/calendarIntegrationService';

export const CalendarIntegrations: React.FC = () => {
  const { showToast, user } = useApp();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<CalendarIntegration | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
    loadConflicts();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des intégrations', 'error');
    }
  };

  const loadConflicts = async () => {
    try {
      const allConflicts: SyncConflict[] = [];
      for (const integration of integrations) {
        const integrationConflicts = await CalendarIntegrationService.detectConflicts(integration.id);
        allConflicts.push(...integrationConflicts);
      }
      setConflicts(allConflicts);
    } catch (error: any) {
      console.error('Error loading conflicts:', error);
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const redirectUri = `${window.location.origin}/integrations/calendar/callback`;
      const oauthUrl = CalendarIntegrationService.getOAuthUrl(provider, redirectUri);
      
      // Ouvrir la fenêtre OAuth
      window.location.href = oauthUrl;
    } catch (error: any) {
      showToast('Erreur lors de la connexion', 'error');
    }
  };

  const handleSync = async (integrationId: string) => {
    setIsSyncing(integrationId);
    try {
      const result = await CalendarIntegrationService.syncCalendar(integrationId);
      
      if (result.success) {
        showToast(
          `Synchronisation réussie: ${result.synced} synchronisés, ${result.conflicts} conflits, ${result.errors} erreurs`,
          result.errors > 0 ? 'warning' : 'success'
        );
        loadIntegrations();
        loadConflicts();
      } else {
        showToast('Erreur lors de la synchronisation', 'error');
      }
    } catch (error: any) {
      showToast('Erreur lors de la synchronisation', 'error');
    } finally {
      setIsSyncing(null);
    }
  };

  const handleToggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ sync_enabled: !enabled })
        .eq('id', integrationId);

      if (error) throw error;
      showToast(enabled ? 'Synchronisation désactivée' : 'Synchronisation activée', 'success');
      loadIntegrations();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'local_wins' | 'external_wins' | 'merged' | 'manual') => {
    try {
      const success = await CalendarIntegrationService.resolveConflict(conflictId, resolution, user?.id || '');
      
      if (success) {
        showToast('Conflit résolu', 'success');
        loadConflicts();
        setIsConflictModalOpen(false);
      } else {
        showToast('Erreur lors de la résolution', 'error');
      }
    } catch (error: any) {
      showToast('Erreur lors de la résolution', 'error');
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      google: '🔵',
      outlook: '🔷',
      apple: '🍎',
      ical: '📅'
    };
    return icons[provider] || '📅';
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      google: 'Google Calendar',
      outlook: 'Outlook',
      apple: 'Apple Calendar',
      ical: 'iCal'
    };
    return names[provider] || provider;
  };

  const getSyncStatusBadge = (integration: CalendarIntegration) => {
    if (!integration.sync_enabled) {
      return <Badge variant="slate">Désactivé</Badge>;
    }

    if (!integration.last_sync_at) {
      return <Badge variant="blue">Jamais synchronisé</Badge>;
    }

    const status = integration.last_sync_status;
    if (status === 'success') {
      return <Badge variant="green">Synchronisé</Badge>;
    } else if (status === 'failed') {
      return <Badge variant="red">Erreur</Badge>;
    } else {
      return <Badge variant="orange">Partiel</Badge>;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      time_change: 'Changement d\'horaire',
      deletion: 'Suppression',
      creation: 'Création',
      update: 'Mise à jour'
    };
    return labels[type] || type;
  };

  const activeIntegrations = integrations.filter(i => i.sync_enabled).length;
  const pendingConflicts = conflicts.filter(c => !c.resolution).length;

  return (
    <PageLayout
      header={{
        icon: Calendar,
        title: "Intégrations Calendriers",
        description: "Synchronisez vos rendez-vous avec Google Calendar et Outlook",
        rightActions: [
          {
            label: "Connecter Google",
            icon: Plus,
            onClick: () => handleConnectCalendar('google'),
            variant: 'primary'
          },
          {
            label: "Connecter Outlook",
            icon: Plus,
            onClick: () => handleConnectCalendar('outlook'),
            variant: 'outline'
          }
        ]
      }}
    >
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{integrations.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Intégrations</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeIntegrations}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Actives</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingConflicts}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Conflits</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {integrations.filter(i => i.last_sync_status === 'success').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Synchronisés</div>
          </div>
        </div>

        {/* Liste des intégrations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Calendriers connectés ({integrations.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {integrations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucune intégration configurée</p>
                <p className="text-sm mt-2">Connectez votre premier calendrier pour commencer</p>
              </div>
            ) : (
              integrations.map((integration) => (
                <div key={integration.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{getProviderIcon(integration.provider)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {getProviderName(integration.provider)}
                          </h4>
                          {getSyncStatusBadge(integration)}
                        </div>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Calendrier:</span>
                            <span>{integration.calendar_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Compte:</span>
                            <span>{integration.account_email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Synchronisation:</span>
                            <span>
                              {integration.sync_direction === 'bidirectional' ? 'Bidirectionnelle' :
                               integration.sync_direction === 'to_external' ? 'Vers externe' :
                               'Depuis externe'}
                            </span>
                          </div>
                          {integration.last_sync_at && (
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              <span>
                                Dernière sync: {new Date(integration.last_sync_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          )}
                          {integration.last_sync_error && (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle size={14} />
                              <span>{integration.last_sync_error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleSync(integration.id, integration.sync_enabled)}
                        title={integration.sync_enabled ? 'Désactiver' : 'Activer'}
                      >
                        {integration.sync_enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => handleSync(integration.id)}
                        disabled={isSyncing === integration.id}
                        isLoading={isSyncing === integration.id}
                      >
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setIsModalOpen(true);
                        }}
                        title="Paramètres"
                      >
                        <Settings size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conflits */}
        {pendingConflicts > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  Conflits de synchronisation ({pendingConflicts})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConflictModalOpen(true)}
                >
                  Voir tous les conflits
                </Button>
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {conflicts.filter(c => !c.resolution).slice(0, 5).map((conflict) => (
                <div key={conflict.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="orange">{getConflictTypeLabel(conflict.conflict_type)}</Badge>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {conflict.local_entity_type}: {conflict.local_entity_id.substring(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Conflit détecté entre la version locale et externe
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setIsConflictModalOpen(true);
                      }}
                    >
                      Résoudre
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal configuration */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configuration: ${selectedIntegration?.calendar_name}`}
        size="lg"
      >
        {selectedIntegration && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Direction de synchronisation
                </label>
                <Dropdown
                  value={selectedIntegration.sync_direction}
                  onChange={(value) => {
                    setSelectedIntegration({
                      ...selectedIntegration,
                      sync_direction: value as any
                    });
                  }}
                  options={[
                    { value: 'bidirectional', label: 'Bidirectionnelle' },
                    { value: 'to_external', label: 'Vers externe uniquement' },
                    { value: 'from_external', label: 'Depuis externe uniquement' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Résolution de conflits
                </label>
                <Dropdown
                  value={selectedIntegration.conflict_resolution}
                  onChange={(value) => {
                    setSelectedIntegration({
                      ...selectedIntegration,
                      conflict_resolution: value as any
                    });
                  }}
                  options={[
                    { value: 'agencyos_wins', label: 'AgencyOS gagne' },
                    { value: 'external_wins', label: 'Externe gagne' },
                    { value: 'newest_wins', label: 'Plus récent gagne' },
                    { value: 'manual', label: 'Manuel' }
                  ]}
                />
              </div>
            </div>
            <Input
              label="Fréquence de synchronisation (minutes)"
              type="number"
              value={selectedIntegration.sync_frequency_minutes}
              onChange={(e) => {
                setSelectedIntegration({
                  ...selectedIntegration,
                  sync_frequency_minutes: parseInt(e.target.value) || 15
                });
              }}
              min={1}
              max={1440}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('calendar_integrations')
                      .update({
                        sync_direction: selectedIntegration.sync_direction,
                        conflict_resolution: selectedIntegration.conflict_resolution,
                        sync_frequency_minutes: selectedIntegration.sync_frequency_minutes,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedIntegration.id);

                    if (error) throw error;
                    showToast('Configuration mise à jour', 'success');
                    setIsModalOpen(false);
                    loadIntegrations();
                  } catch (error: any) {
                    showToast('Erreur lors de la mise à jour', 'error');
                  }
                }}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal conflits */}
      <Modal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        title="Résoudre les conflits"
        size="lg"
      >
        {selectedConflict ? (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-orange-500" size={20} />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {getConflictTypeLabel(selectedConflict.conflict_type)}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Un conflit a été détecté entre la version locale et la version externe de cet événement.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Version locale</h4>
                <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto">
                  {JSON.stringify(selectedConflict.local_data, null, 2)}
                </pre>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Version externe</h4>
                <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-auto">
                  {JSON.stringify(selectedConflict.external_data, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Résolution
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id, 'local_wins')}
                >
                  Utiliser la version locale
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id, 'external_wins')}
                >
                  Utiliser la version externe
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id, 'merged')}
                >
                  Fusionner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id, 'manual')}
                >
                  Résoudre manuellement
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.filter(c => !c.resolution).map((conflict) => (
              <div
                key={conflict.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="orange">{getConflictTypeLabel(conflict.conflict_type)}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedConflict(conflict);
                    }}
                  >
                    Résoudre
                  </Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {conflict.local_entity_type}: {conflict.local_entity_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

