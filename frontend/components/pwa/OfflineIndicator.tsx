import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { PWAService } from '../../lib/services/pwaService';
import { OfflineSyncService } from '../../lib/services/offlineSyncService';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Écouter les changements de connexion
    const cleanup = PWAService.onConnectionChange((isOnline) => {
      setIsOffline(!isOnline);
      if (isOnline) {
        loadPendingSync();
        syncPendingActions();
      }
    });

    // Charger le nombre d'actions en attente
    loadPendingSync();

    // Vérifier périodiquement
    const interval = setInterval(loadPendingSync, 10000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  const loadPendingSync = async () => {
    const count = await OfflineSyncService.getPendingActionsCount();
    setPendingSync(count);
  };

  const syncPendingActions = async () => {
    setIsSyncing(true);
    try {
      const result = await OfflineSyncService.forceSync();
      await loadPendingSync();
      
      if (result.synced > 0) {
        // Afficher une notification de succès
        console.log(`Synchronisé ${result.synced} action(s)`);
      }
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOffline && pendingSync === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 min-w-[250px]">
        {isOffline ? (
          <>
            <WifiOff className="text-orange-500" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Mode hors ligne
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Les modifications seront synchronisées automatiquement
              </p>
            </div>
          </>
        ) : pendingSync > 0 ? (
          <>
            {isSyncing ? (
              <Loader size={20} variant="minimal" className="text-blue-500" />
            ) : (
              <RefreshCw className="text-blue-500" size={20} />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {pendingSync} action{pendingSync > 1 ? 's' : ''} en attente
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronisation en cours...
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={syncPendingActions}
              disabled={isSyncing}
              isLoading={isSyncing}
            >
              Sync
            </Button>
          </>
        ) : (
          <>
            <Wifi className="text-green-500" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                En ligne
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

