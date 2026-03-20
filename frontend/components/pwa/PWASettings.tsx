import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Smartphone, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PWAService } from '../../lib/services/pwaService';
import { useApp } from '../contexts/AppContext';

export const PWASettings: React.FC = () => {
  const { showToast } = useApp();
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial
    checkStatus();

    // Écouter les changements d'état périodiquement
    const checkInterval = setInterval(checkStatus, 2000);

    // Écouter l'événement d'installation disponible
    PWAService.onInstallAvailable(() => {
      setIsInstallable(true);
      checkStatus();
    });

    // Écouter l'événement d'installation complète
    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      showToast('Application installée avec succès !', 'success');
      checkStatus();
    };
    window.addEventListener('pwa-installed', handleInstalled);

    // Écouter directement l'événement beforeinstallprompt au cas où
    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true);
      checkStatus();
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter les changements de connexion
    const cleanup = PWAService.onConnectionChange((isOnline) => {
      setIsOffline(!isOnline);
    });

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      cleanup();
    };
  }, []);

  const checkStatus = async () => {
    setIsInstalled(PWAService.isInstalled());
    setIsInstallable(PWAService.isInstallable());
    const swActive = await PWAService.isServiceWorkerActive();
    setIsServiceWorkerActive(swActive);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const installed = await PWAService.promptInstall();
      if (installed) {
        setIsInstalled(true);
        setIsInstallable(false);
        showToast('Application installée avec succès !', 'success');
      } else {
        showToast('Installation annulée', 'info');
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
      showToast('Erreur lors de l\'installation', 'error');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdateServiceWorker = async () => {
    setIsUpdating(true);
    try {
      await PWAService.updateServiceWorker();
      showToast('Service Worker mis à jour', 'success');
      await checkStatus();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await PWAService.clearCache();
      showToast('Cache vidé avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error);
      showToast('Erreur lors du vidage du cache', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Application mobile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Installez AgencyOS sur votre appareil pour un accès rapide et une utilisation hors ligne
            </p>
          </div>
        </div>

        {/* Statut d'installation */}
        <div className="space-y-4 mb-6">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isInstalled ? (
                  <CheckCircle2 className="text-emerald-500" size={20} />
                ) : (
                  <Smartphone className="text-slate-400" size={20} />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Statut d'installation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isInstalled 
                      ? 'Application installée sur votre appareil' 
                      : 'Application non installée'}
                  </p>
                </div>
              </div>
              <Badge variant={isInstalled ? 'success' : 'info'}>
                {isInstalled ? 'Installé' : 'Non installé'}
              </Badge>
            </div>
          </div>

          {/* Bouton d'installation */}
          {!isInstalled && (
            <div className="p-4 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/20 dark:bg-indigo-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-1">
                    Installer l'application
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400">
                    {isInstallable 
                      ? 'L\'application peut être installée sur votre appareil'
                      : 'L\'installation sera disponible lorsque les critères seront remplis'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleInstall}
                  disabled={!isInstallable || isInstalling}
                  isLoading={isInstalling}
                >
                  {isInstalling ? 'Installation...' : 'Installer'}
                </Button>
              </div>
              {!isInstallable && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    💡 Pour installer l'application, utilisez le menu de votre navigateur :
                    <br />
                    • <strong>Chrome/Edge</strong> : Menu (⋮) → "Installer l'application"
                    <br />
                    • <strong>Safari (iOS)</strong> : Partager (□↑) → "Sur l'écran d'accueil"
                    <br />
                    • <strong>Firefox</strong> : Menu (☰) → "Installer"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statut du Service Worker */}
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isServiceWorkerActive ? (
                  <CheckCircle2 className="text-emerald-500" size={20} />
                ) : (
                  <WifiOff className="text-slate-400" size={20} />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Service Worker
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isServiceWorkerActive 
                      ? 'Actif - Fonctionnalités hors ligne disponibles' 
                      : 'Inactif - Fonctionnalités hors ligne non disponibles'}
                  </p>
                </div>
              </div>
              <Badge variant={isServiceWorkerActive ? 'success' : 'warning'}>
                {isServiceWorkerActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>

          {/* Statut de connexion */}
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOffline ? (
                  <WifiOff className="text-orange-500" size={20} />
                ) : (
                  <Wifi className="text-emerald-500" size={20} />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Connexion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isOffline ? 'Mode hors ligne' : 'En ligne'}
                  </p>
                </div>
              </div>
              <Badge variant={isOffline ? 'warning' : 'success'}>
                {isOffline ? 'Hors ligne' : 'En ligne'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={handleUpdateServiceWorker}
              disabled={isUpdating}
              isLoading={isUpdating}
            >
              Mettre à jour le Service Worker
            </Button>
            <Button
              variant="outline"
              icon={Trash2}
              onClick={handleClearCache}
              disabled={isClearing}
              isLoading={isClearing}
            >
              Vider le cache
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

