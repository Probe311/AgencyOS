import { supabase } from '../supabase';
import { OfflineStorageService } from './offlineStorage';
import { PWAService } from './pwaService';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Service de synchronisation offline pour PWA
 */
export class OfflineSyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isSyncing = false;

  /**
   * Initialise le service de synchronisation
   */
  static async initialize(): Promise<void> {
    // Initialiser le stockage offline
    await OfflineStorageService.initialize();

    // Écouter les changements de connexion
    PWAService.onConnectionChange(async (isOnline) => {
      if (isOnline) {
        // Synchroniser immédiatement quand la connexion revient
        await this.syncPendingActions();
        this.startPeriodicSync();
      } else {
        this.stopPeriodicSync();
      }
    });

    // Démarrer la synchronisation périodique si en ligne
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    // Synchroniser au chargement de la page
    if (navigator.onLine) {
      await this.syncPendingActions();
    }
  }

  /**
   * Démarre la synchronisation périodique
   */
  private static startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncPendingActions();
      }
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Arrête la synchronisation périodique
   */
  private static stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Ajoute une action à la queue offline
   */
  static async queueAction(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<string> {
    // Si en ligne, essayer d'exécuter immédiatement
    if (navigator.onLine) {
      try {
        await this.executeAction(type, table, data);
        return 'synced';
      } catch (error) {
        // Si échec, ajouter à la queue
        console.warn('Online action failed, queueing:', error);
      }
    }

    // Ajouter à la queue offline
    return await OfflineStorageService.queueAction({
      type,
      table,
      data,
    });
  }

  /**
   * Synchronise les actions en attente
   */
  static async syncPendingActions(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;

    try {
      const pendingActions = await OfflineStorageService.getPendingActions();
      if (pendingActions.length === 0) {
        return { success: true, synced: 0, failed: 0, errors: [] };
      }

      let synced = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const action of pendingActions) {
        try {
          await this.executeAction(action.type, action.table, action.data);
          await OfflineStorageService.removeAction(action.id);
          synced++;
        } catch (error: any) {
          console.error('Error syncing action:', error);
          
          // Incrémenter les tentatives
          await OfflineStorageService.incrementRetries(action.id);
          
          // Supprimer si trop de tentatives (max 3)
          const updatedAction = pendingActions.find(a => a.id === action.id);
          if (updatedAction && updatedAction.retries >= 3) {
            await OfflineStorageService.removeAction(action.id);
          }
          
          failed++;
          errors.push(`${action.table}: ${error.message}`);
        }
      }

      return { success: true, synced, failed, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Exécute une action sur Supabase
   */
  private static async executeAction(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<void> {
    switch (type) {
      case 'create':
        const { error: createError } = await supabase
          .from(table)
          .insert([data]);
        if (createError) throw createError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Récupère le nombre d'actions en attente
   */
  static async getPendingActionsCount(): Promise<number> {
    const actions = await OfflineStorageService.getPendingActions();
    return actions.length;
  }

  /**
   * Force la synchronisation
   */
  static async forceSync(): Promise<SyncResult> {
    return await this.syncPendingActions();
  }

  /**
   * Synchronise en arrière-plan (Background Sync API)
   */
  static async syncBackground(): Promise<void> {
    await PWAService.syncBackground('sync-offline-data');
  }
}

