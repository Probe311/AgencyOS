import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';

const OFFLINE_STORAGE_KEY = '@agencyos_offline_queue';
const SYNC_INTERVAL = 30000; // 30 secondes

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

export class OfflineSyncService {
  private static syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialise le service de synchronisation offline
   */
  static async initialize(): Promise<void> {
    // Vérifier la connexion réseau
    const netInfo = await NetInfo.fetch();
    
    if (netInfo.isConnected) {
      // Synchroniser immédiatement si connecté
      await this.syncPendingActions();
      
      // Démarrer la synchronisation périodique
      this.startPeriodicSync();
    }

    // Écouter les changements de connexion
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncPendingActions();
        this.startPeriodicSync();
      } else {
        this.stopPeriodicSync();
      }
    });
  }

  /**
   * Démarre la synchronisation périodique
   */
  private static startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncPendingActions();
    }, SYNC_INTERVAL);
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
  static async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newAction: OfflineAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retries: 0,
      };

      queue.push(newAction);
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queueing action:', error);
    }
  }

  /**
   * Récupère la queue d'actions offline
   */
  private static async getQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Synchronise les actions en attente
   */
  static async syncPendingActions(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return;
    }

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      const syncedActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await this.executeAction(action);
          syncedActions.push(action.id);
        } catch (error) {
          console.error('Error syncing action:', error);
          
          // Réessayer jusqu'à 3 fois
          if (action.retries < 3) {
            action.retries++;
            failedActions.push(action);
          }
        }
      }

      // Mettre à jour la queue
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(failedActions));

      if (syncedActions.length > 0) {
        console.log(`Synced ${syncedActions.length} actions`);
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    }
  }

  /**
   * Exécute une action sur Supabase
   */
  private static async executeAction(action: OfflineAction): Promise<void> {
    const { table, type, data } = action;

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
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Vide la queue (pour tests ou reset)
   */
  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY);
  }
}

