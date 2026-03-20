/**
 * Service pour gérer la PWA (Progressive Web App)
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAService {
  private static deferredPrompt: BeforeInstallPromptEvent | null = null;
  private static installListeners: Array<() => void> = [];

  /**
   * Initialise le service PWA
   */
  static initialize(): void {
    // Écouter l'événement beforeinstallprompt
    // Note: preventDefault() empêche l'affichage automatique de la bannière
    // pour permettre un contrôle manuel via promptInstall()
    // L'avertissement du navigateur "Banner not shown" est normal et attendu
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyInstallAvailable();
    });

    // Écouter l'installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed');
      this.deferredPrompt = null;
      this.notifyInstallComplete();
    });

    // Vérifier si déjà installé
    if (this.isInstalled()) {
      console.log('PWA already installed');
    }
  }

  /**
   * Vérifie si l'application est installée
   */
  static isInstalled(): boolean {
    // Vérifier si l'app est en mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Vérifier si l'app est ajoutée à l'écran d'accueil (iOS)
    if ((window.navigator as any).standalone) {
      return true;
    }

    return false;
  }

  /**
   * Vérifie si l'installation est disponible
   */
  static isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Propose l'installation de l'application
   */
  static async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }

  /**
   * Notifie que l'installation est disponible
   */
  private static notifyInstallAvailable(): void {
    this.installListeners.forEach(listener => listener());
  }

  /**
   * Notifie que l'installation est terminée
   */
  private static notifyInstallComplete(): void {
    // Émettre un événement personnalisé
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  }

  /**
   * Ajoute un listener pour l'événement d'installation disponible
   */
  static onInstallAvailable(callback: () => void): void {
    this.installListeners.push(callback);
  }

  /**
   * Vérifie si le Service Worker est actif
   */
  static async isServiceWorkerActive(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined && registration.active !== null;
    }
    return false;
  }

  /**
   * Enregistre le Service Worker
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Met à jour le Service Worker
   */
  static async updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  }

  /**
   * Vérifie les mises à jour du Service Worker
   */
  static async checkForUpdates(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return registration.waiting !== null;
      }
    }
    return false;
  }

  /**
   * Active la mise à jour du Service Worker
   */
  static async activateUpdate(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  /**
   * Vérifie si l'application est en mode offline
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Écoute les changements de statut de connexion
   */
  static onConnectionChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Retourner la fonction de nettoyage
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  /**
   * Demande la permission pour les notifications
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  /**
   * Vérifie la permission de notification
   */
  static getNotificationPermission(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  /**
   * Affiche une notification
   */
  static async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    }
  }

  /**
   * Cache des URLs pour utilisation offline
   */
  static async cacheUrls(urls: string[]): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'CACHE_URLS',
          urls,
        });
      }
    }
  }

  /**
   * Vide le cache
   */
  static async clearCache(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'CLEAR_CACHE',
        });
      }
    }

    // Vider aussi les caches manuellement
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  /**
   * Synchronise les données en arrière-plan
   */
  static async syncBackground(tag: string = 'sync-offline-data'): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in (ServiceWorkerRegistration.prototype as any)) {
      const registration = await navigator.serviceWorker.ready;
      try {
        await (registration as any).sync.register(tag);
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
  }
}

