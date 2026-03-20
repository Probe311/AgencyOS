/**
 * Service de stockage offline avec IndexedDB
 */

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'agencyos-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';

export class OfflineStorageService {
  private static db: IDBDatabase | null = null;

  /**
   * Initialise IndexedDB
   */
  static async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Créer l'object store s'il n'existe pas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('table', 'table', { unique: false });
        }
      };
    });
  }

  /**
   * Ajoute une action à la queue offline
   */
  static async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    if (!this.db) {
      await this.initialize();
    }

    const offlineAction: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(offlineAction);

      request.onsuccess = () => {
        resolve(offlineAction.id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Récupère toutes les actions en attente
   */
  static async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Supprime une action de la queue
   */
  static async removeAction(actionId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(actionId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Incrémente le compteur de tentatives
   */
  static async incrementRetries(actionId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retries++;
          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Vide la queue
   */
  static async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Stocke des données localement
   */
  static async setItem(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing in localStorage:', error);
      // Fallback vers IndexedDB si localStorage est plein
      await this.storeInIndexedDB(key, value);
    }
  }

  /**
   * Récupère des données localement
   */
  static async getItem(key: string): Promise<any | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return await this.getFromIndexedDB(key);
    }
  }

  /**
   * Supprime des données localement
   */
  static async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * Stocke dans IndexedDB (fallback)
   */
  private static async storeInIndexedDB(key: string, value: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    // Créer un store pour les données générales si nécessaire
    // Pour simplifier, on utilise le même store
    const action: OfflineAction = {
      id: `data_${key}`,
      type: 'create',
      table: 'local_storage',
      data: { key, value },
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère depuis IndexedDB (fallback)
   */
  private static async getFromIndexedDB(key: string): Promise<any | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(`data_${key}`);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data.value : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

