import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PWAService } from '../../lib/services/pwaService';

export const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    setIsInstalled(PWAService.isInstalled());

    // Écouter l'événement d'installation disponible
    PWAService.onInstallAvailable(() => {
      if (!PWAService.isInstalled()) {
        setShowPrompt(true);
      }
    });

    // Écouter l'événement d'installation complète
    window.addEventListener('pwa-installed', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });
  }, []);

  const handleInstall = async () => {
    const installed = await PWAService.promptInstall();
    if (installed) {
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Ne plus afficher pendant cette session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Ne pas afficher si déjà installé ou si déjà rejeté dans cette session
  if (isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <Modal
      isOpen={showPrompt}
      onClose={handleDismiss}
      title="Installer AgencyOS"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          Installez AgencyOS sur votre appareil pour un accès rapide et une utilisation hors ligne.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            Plus tard
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleInstall}
            className="flex-1"
          >
            Installer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

