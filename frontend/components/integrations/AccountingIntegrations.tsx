import React, { useState, useEffect } from 'react';
import {
  Calculator, Plus, Settings, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, Trash2, Eye, EyeOff, Clock, Sync, AlertCircle, Download, FileText
} from 'lucide-react';
import { PageLayout } from '../ui/PageLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { supabase } from '../../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { AccountingIntegrationService, AccountingIntegration } from '../../lib/services/accountingIntegrationService';

export const AccountingIntegrations: React.FC = () => {
  const { showToast, user } = useApp();
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<AccountingIntegration | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('accounting_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      showToast('Erreur lors du chargement des intégrations', 'error');
    }
  };

  const loadSyncLogs = async (integrationId: string) => {
    try {
      const { data, error } = await supabase
        .from('accounting_sync_logs')
        .select('*')
        .eq('accounting_integration_id', integrationId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error: any) {
      console.error('Error loading sync logs:', error);
    }
  };

  const handleConnectAccounting = async (provider: 'sage' | 'quickbooks' | 'xero') => {
    try {
      const redirectUri = `${window.location.origin}/integrations/accounting/callback`;
      const oauthUrl = AccountingIntegrationService.getOAuthUrl(provider, redirectUri);
      
      window.location.href = oauthUrl;
    } catch (error: any) {
      showToast('Erreur lors de la connexion', 'error');
    }
  };

  const handleSync = async (integrationId: string) => {
    setIsSyncing(integrationId);
    try {
      const result = await AccountingIntegrationService.syncInvoices(integrationId);
      
      if (result.success) {
        showToast(
          `Synchronisation réussie: ${result.synced} synchronisés, ${result.failed} échecs`,
          result.failed > 0 ? 'warning' : 'success'
        );
        loadIntegrations();
        loadSyncLogs(integrationId);
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
        .from('accounting_integrations')
        .update({ sync_enabled: !enabled })
        .eq('id', integrationId);

      if (error) throw error;
      showToast(enabled ? 'Synchronisation désactivée' : 'Synchronisation activée', 'success');
      loadIntegrations();
    } catch (error: any) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleExport = async (integrationId: string, format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const blob = await AccountingIntegrationService.exportData(integrationId, format, 'all');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_accounting_${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Export réussi', 'success');
    } catch (error: any) {
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      sage: '📊',
      quickbooks: '📈',
      xero: '📉'
    };
    return icons[provider] || '💰';
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      sage: 'Sage',
      quickbooks: 'QuickBooks',
      xero: 'Xero'
    };
    return names[provider] || provider;
  };

  const getSyncStatusBadge = (integration: AccountingIntegration) => {
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

  const activeIntegrations = integrations.filter(i => i.sync_enabled).length;

  return (
    <PageLayout
      header={{
        icon: Calculator,
        title: "Intégrations Comptables",
        description: "Synchronisez vos factures avec Sage, QuickBooks et Xero",
        rightActions: [
          {
            label: "Connecter Sage",
            icon: Plus,
            onClick: () => handleConnectAccounting('sage'),
            variant: 'primary'
          },
          {
            label: "Connecter QuickBooks",
            icon: Plus,
            onClick: () => handleConnectAccounting('quickbooks'),
            variant: 'outline'
          },
          {
            label: "Connecter Xero",
            icon: Plus,
            onClick: () => handleConnectAccounting('xero'),
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
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {integrations.filter(i => i.last_sync_status === 'success').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Synchronisées</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {integrations.reduce((sum, i) => sum + (i.sync_invoices ? 1 : 0), 0)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Factures sync</div>
          </div>
        </div>

        {/* Liste des intégrations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Comptes connectés ({integrations.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {integrations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Calculator size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucune intégration configurée</p>
                <p className="text-sm mt-2">Connectez votre premier compte comptable pour commencer</p>
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
                            <span className="font-medium">Compte:</span>
                            <span>{integration.account_name}</span>
                          </div>
                          {integration.company_name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Entreprise:</span>
                              <span>{integration.company_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Synchronisation:</span>
                            <span>
                              {integration.sync_direction === 'bidirectional' ? 'Bidirectionnelle' :
                               integration.sync_direction === 'to_accounting' ? 'Vers comptabilité' :
                               'Depuis comptabilité'}
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
                        icon={Sync}
                        onClick={() => handleSync(integration.id)}
                        disabled={isSyncing === integration.id}
                        isLoading={isSyncing === integration.id}
                      >
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Download}
                        onClick={() => handleExport(integration.id, 'csv')}
                        title="Exporter"
                      >
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setIsConfigModalOpen(true);
                          loadSyncLogs(integration.id);
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
      </div>

      {/* Modal configuration */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configuration: ${selectedIntegration?.account_name}`}
        size="lg"
      >
        {selectedIntegration && (
          <div className="space-y-6">
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
                    { value: 'to_accounting', label: 'Vers comptabilité uniquement' },
                    { value: 'from_accounting', label: 'Depuis comptabilité uniquement' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Fréquence de synchronisation
                </label>
                <Dropdown
                  value={selectedIntegration.sync_frequency}
                  onChange={(value) => {
                    setSelectedIntegration({
                      ...selectedIntegration,
                      sync_frequency: value as any
                    });
                  }}
                  options={[
                    { value: 'manual', label: 'Manuelle' },
                    { value: 'hourly', label: 'Horaire' },
                    { value: 'daily', label: 'Quotidienne' },
                    { value: 'weekly', label: 'Hebdomadaire' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Éléments à synchroniser
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIntegration.sync_invoices}
                    onChange={(e) => {
                      setSelectedIntegration({
                        ...selectedIntegration,
                        sync_invoices: e.target.checked
                      });
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Factures</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIntegration.sync_customers}
                    onChange={(e) => {
                      setSelectedIntegration({
                        ...selectedIntegration,
                        sync_customers: e.target.checked
                      });
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Clients</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIntegration.sync_payments}
                    onChange={(e) => {
                      setSelectedIntegration({
                        ...selectedIntegration,
                        sync_payments: e.target.checked
                      });
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Paiements</span>
                </label>
              </div>
            </div>

            {/* Logs de synchronisation */}
            {syncLogs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Historique des synchronisations
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{new Date(log.started_at).toLocaleString('fr-FR')}</span>
                        <Badge variant={log.status === 'success' ? 'green' : log.status === 'failed' ? 'red' : 'orange'}>
                          {log.status}
                        </Badge>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {log.synced_count} synchronisés, {log.failed_count} échecs
                      </div>
                      {log.error_message && (
                        <div className="text-red-600 dark:text-red-400 text-xs mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('accounting_integrations')
                      .update({
                        sync_direction: selectedIntegration.sync_direction,
                        sync_frequency: selectedIntegration.sync_frequency,
                        sync_invoices: selectedIntegration.sync_invoices,
                        sync_customers: selectedIntegration.sync_customers,
                        sync_payments: selectedIntegration.sync_payments,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedIntegration.id);

                    if (error) throw error;
                    showToast('Configuration mise à jour', 'success');
                    setIsConfigModalOpen(false);
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
    </PageLayout>
  );
};

