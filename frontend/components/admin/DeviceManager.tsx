import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, Shield, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { DeviceService, UserDevice } from '../../lib/services/deviceService';
import { useApp } from '../contexts/AppContext';

export const DeviceManager: React.FC = () => {
  const { showToast, currentUser } = useApp();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingDevice, setRevokingDevice] = useState<string | null>(null);
  const [isRevokeAllModalOpen, setIsRevokeAllModalOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDevices();
    loadStats();
    // Enregistrer l'appareil actuel au chargement
    registerCurrentDevice();
  }, []);

  const registerCurrentDevice = async () => {
    try {
      await DeviceService.registerCurrentDevice();
    } catch (error) {
      console.error('Error registering current device:', error);
    }
  };

  const loadDevices = async () => {
    setLoading(true);
    try {
      const userDevices = await DeviceService.getUserDevices();
      setDevices(userDevices);
    } catch (error: any) {
      showToast(`Erreur lors du chargement: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const deviceStats = await DeviceService.getDeviceStats();
      setStats(deviceStats);
    } catch (error) {
      console.error('Error loading device stats:', error);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cet appareil ?')) {
      return;
    }

    setRevokingDevice(deviceId);
    try {
      await DeviceService.revokeDevice(deviceId);
      showToast('Appareil révoqué', 'success');
      loadDevices();
      loadStats();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleRevokeAllDevices = async () => {
    setIsRevokeAllModalOpen(false);
    
    try {
      const currentToken = localStorage.getItem('device_token');
      await DeviceService.revokeAllDevices(currentToken || undefined);
      showToast('Tous les autres appareils ont été révoqués', 'success');
      loadDevices();
      loadStats();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appareil ? Cette action est irréversible.')) {
      return;
    }

    try {
      await DeviceService.deleteDevice(deviceId);
      showToast('Appareil supprimé', 'success');
      loadDevices();
      loadStats();
    } catch (error: any) {
      showToast(`Erreur: ${error.message}`, 'error');
    }
  };

  const getDeviceIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return Smartphone;
      case 'web':
        return Monitor;
      default:
        return Smartphone;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      ios: 'iOS',
      android: 'Android',
      web: 'Web',
    };
    return labels[platform] || platform;
  };

  const currentDeviceToken = localStorage.getItem('device_token');
  const isCurrentDevice = (device: UserDevice) => device.device_token === currentDeviceToken;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des appareils</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez les appareils connectés à votre compte
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={loadDevices}
            isLoading={loading}
          >
            Actualiser
          </Button>
          {devices.filter(d => d.is_active && !isCurrentDevice(d)).length > 0 && (
            <Button
              variant="outline"
              icon={Shield}
              onClick={() => setIsRevokeAllModalOpen(true)}
            >
              Révoquer tous les autres
            </Button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Actifs</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Inactifs</p>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.total - stats.active}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Types</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {Object.keys(stats.by_type).length}
            </p>
          </div>
        </div>
      )}

      {/* Liste des appareils */}
      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Smartphone size={48} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Aucun appareil enregistré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.platform);
            const isCurrent = isCurrentDevice(device);

            return (
              <div
                key={device.id}
                className={`p-4 bg-white dark:bg-slate-800 rounded-lg border ${
                  isCurrent
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'bg-slate-50 dark:bg-slate-700'
                    }`}>
                      <DeviceIcon
                        size={24}
                        className={isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {device.device_name || 'Appareil inconnu'}
                        </h3>
                        {isCurrent && (
                          <Badge variant="info" size="sm">Appareil actuel</Badge>
                        )}
                        {device.is_active ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle size={12} className="mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            <XCircle size={12} className="mr-1" />
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="flex items-center gap-4">
                          <span><strong>Plateforme:</strong> {getPlatformLabel(device.platform)}</span>
                          {device.os_version && (
                            <span><strong>OS:</strong> {device.os_version}</span>
                          )}
                          {device.app_version && (
                            <span><strong>Version app:</strong> {device.app_version}</span>
                          )}
                        </div>
                        <div>
                          <strong>Dernière activité:</strong> {formatDate(device.last_active_at)}
                        </div>
                        {device.device_id && (
                          <div className="text-xs text-slate-400 font-mono">
                            ID: {device.device_id.slice(0, 16)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCurrent && device.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Shield}
                        onClick={() => handleRevokeDevice(device.id)}
                        isLoading={revokingDevice === device.id}
                      >
                        Révoquer
                      </Button>
                    )}
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteDevice(device.id)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmation pour révoquer tous les appareils */}
      <Modal
        isOpen={isRevokeAllModalOpen}
        onClose={() => setIsRevokeAllModalOpen(false)}
        title="Révoquer tous les autres appareils"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Vous êtes sur le point de révoquer tous les autres appareils connectés à votre compte.
                Ces appareils devront se reconnecter pour accéder à votre compte.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cette action révoquera <strong>{devices.filter(d => d.is_active && !isCurrentDevice(d)).length}</strong> appareil(s).
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={() => setIsRevokeAllModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleRevokeAllDevices}>
              Révoquer tous les autres
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

