import { supabase } from '../supabase';
import { OfflineStorageService } from './offlineStorage';
import { OfflineSyncService } from './offlineSyncService';

export interface FieldVisit {
  id: string;
  lead_id: string | null;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  notes?: string;
  photos?: string[];
  visited_at: string;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
  sync_status?: 'pending' | 'syncing' | 'synced' | 'error';
  conflict_resolution?: 'local' | 'remote' | 'merge';
  // Champ calculé pour l'affichage (non stocké en DB)
  address?: string;
}

export interface FieldVisitConflict {
  local: FieldVisit;
  remote: FieldVisit;
  field: string;
  localValue: any;
  remoteValue: any;
}

/**
 * Service pour gérer les visites terrain avec support offline
 */
export class FieldVisitService {
  /**
   * Crée une visite terrain
   */
  static async createVisit(visit: Omit<FieldVisit, 'id' | 'created_at' | 'updated_at' | 'synced' | 'sync_status'>): Promise<FieldVisit> {
    const visitData = {
      ...visit,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      visited_at: visit.visited_at || new Date().toISOString(),
      synced: false,
      sync_status: 'pending' as const,
    };

    // Si en ligne, essayer de sauvegarder directement
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('field_visits')
          .insert([{
            lead_id: visitData.lead_id,
            user_id: visitData.user_id,
            latitude: visitData.latitude,
            longitude: visitData.longitude,
            accuracy: visitData.accuracy,
            altitude: visitData.altitude,
            heading: visitData.heading,
            speed: visitData.speed,
            notes: visitData.notes,
            photos: visitData.photos,
            visited_at: visitData.visited_at,
          }])
          .select()
          .single();

        if (error) throw error;

        return {
          ...data,
          synced: true,
          sync_status: 'synced' as const,
        };
      } catch (error) {
        console.warn('Online save failed, queueing offline:', error);
        // Continuer avec le stockage offline
      }
    }

    // Stocker localement
    await OfflineStorageService.setItem(`field_visit_${visitData.id}`, visitData);

    // Ajouter à la queue de synchronisation
    await OfflineSyncService.queueAction('create', 'field_visits', {
      lead_id: visitData.lead_id,
      user_id: visitData.user_id,
      latitude: visitData.latitude,
      longitude: visitData.longitude,
      accuracy: visitData.accuracy,
      altitude: visitData.altitude,
      heading: visitData.heading,
      speed: visitData.speed,
      notes: visitData.notes,
      photos: visitData.photos,
      visited_at: visitData.visited_at,
    });

    return visitData;
  }

  /**
   * Met à jour une visite terrain
   */
  static async updateVisit(id: string, updates: Partial<FieldVisit>): Promise<FieldVisit> {
    // Récupérer la visite actuelle
    const currentVisit = await this.getVisit(id);
    if (!currentVisit) {
      throw new Error('Visit not found');
    }

    const updatedVisit = {
      ...currentVisit,
      ...updates,
      updated_at: new Date().toISOString(),
      synced: false,
      sync_status: 'pending' as const,
    };

    // Si en ligne, essayer de mettre à jour directement
    if (navigator.onLine && !id.startsWith('temp-')) {
      try {
        const { data, error } = await supabase
          .from('field_visits')
          .update({
            lead_id: updatedVisit.lead_id,
            latitude: updatedVisit.latitude,
            longitude: updatedVisit.longitude,
            accuracy: updatedVisit.accuracy,
            altitude: updatedVisit.altitude,
            heading: updatedVisit.heading,
            speed: updatedVisit.speed,
            notes: updatedVisit.notes,
            photos: updatedVisit.photos,
            visited_at: updatedVisit.visited_at,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return {
          ...data,
          synced: true,
          sync_status: 'synced' as const,
        };
      } catch (error) {
        console.warn('Online update failed, queueing offline:', error);
      }
    }

    // Mettre à jour localement
    await OfflineStorageService.setItem(`field_visit_${id}`, updatedVisit);

    // Ajouter à la queue de synchronisation (exclure les champs calculés)
    const { address, ...syncUpdates } = updates;
    await OfflineSyncService.queueAction('update', 'field_visits', {
      id: id.startsWith('temp-') ? null : id,
      ...syncUpdates,
    });

    return updatedVisit;
  }

  /**
   * Supprime une visite terrain
   */
  static async deleteVisit(id: string): Promise<void> {
    // Si en ligne, essayer de supprimer directement
    if (navigator.onLine && !id.startsWith('temp-')) {
      try {
        const { error } = await supabase
          .from('field_visits')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return;
      } catch (error) {
        console.warn('Online delete failed, queueing offline:', error);
      }
    }

    // Marquer comme supprimé localement
    const visit = await this.getVisit(id);
    if (visit) {
      await OfflineStorageService.setItem(`field_visit_${id}`, {
        ...visit,
        sync_status: 'pending' as const,
        _deleted: true,
      });
    }

    // Ajouter à la queue de synchronisation
    await OfflineSyncService.queueAction('delete', 'field_visits', { id });
  }

  /**
   * Récupère une visite par ID
   */
  static async getVisit(id: string): Promise<FieldVisit | null> {
    // Essayer de récupérer depuis le stockage local
    const localVisit = await OfflineStorageService.getItem(`field_visit_${id}`);
    if (localVisit) {
      return localVisit;
    }

    // Si en ligne, essayer depuis Supabase
    if (navigator.onLine && !id.startsWith('temp-')) {
      try {
        const { data, error } = await supabase
          .from('field_visits')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data ? { ...data, synced: true, sync_status: 'synced' as const } : null;
      } catch (error) {
        console.error('Error fetching visit:', error);
      }
    }

    return null;
  }

  /**
   * Récupère toutes les visites (local + remote)
   */
  static async getAllVisits(userId?: string): Promise<FieldVisit[]> {
    const visits: FieldVisit[] = [];

    // Récupérer les visites locales
    const localVisits = await this.getLocalVisits();
    visits.push(...localVisits);

    // Si en ligne, récupérer depuis Supabase
    if (navigator.onLine) {
      try {
        let query = supabase
          .from('field_visits')
          .select('*')
          .order('visited_at', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          // Fusionner avec les visites locales (éviter les doublons)
          const remoteVisits = data.map(v => ({
            ...v,
            synced: true,
            sync_status: 'synced' as const,
          }));

          // Filtrer les visites qui existent déjà localement
          const localIds = new Set(localVisits.map(v => v.id));
          const newRemoteVisits = remoteVisits.filter(v => !localIds.has(v.id));

          visits.push(...newRemoteVisits);
        }
      } catch (error) {
        console.error('Error fetching remote visits:', error);
      }
    }

    // Trier par date de visite (plus récent en premier)
    return visits.sort((a, b) => 
      new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    );
  }

  /**
   * Récupère les visites stockées localement
   */
  static async getLocalVisits(): Promise<FieldVisit[]> {
    const visits: FieldVisit[] = [];
    
    // Parcourir tous les items du stockage local
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('field_visit_')) {
        const visit = await OfflineStorageService.getItem(key);
        if (visit && !visit._deleted) {
          visits.push(visit);
        }
      }
    }

    return visits;
  }

  /**
   * Synchronise les visites locales avec le serveur
   */
  static async syncVisits(): Promise<{ synced: number; conflicts: FieldVisitConflict[]; errors: string[] }> {
    const localVisits = await this.getLocalVisits();
    const conflicts: FieldVisitConflict[] = [];
    const errors: string[] = [];
    let synced = 0;

    for (const localVisit of localVisits) {
      try {
        // Si c'est une nouvelle visite (temp ID)
        if (localVisit.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('field_visits')
            .insert([{
              lead_id: localVisit.lead_id,
              user_id: localVisit.user_id,
              latitude: localVisit.latitude,
              longitude: localVisit.longitude,
              address: localVisit.address,
              notes: localVisit.notes,
              photos: localVisit.photos,
              visited_at: localVisit.visited_at,
            }])
            .select()
            .single();

          if (error) throw error;

          // Mettre à jour l'ID local avec l'ID serveur
          await OfflineStorageService.removeItem(`field_visit_${localVisit.id}`);
          await OfflineStorageService.setItem(`field_visit_${data.id}`, {
            ...data,
            synced: true,
            sync_status: 'synced' as const,
          });

          synced++;
        } else {
          // Vérifier s'il y a un conflit
          const { data: remoteVisit, error } = await supabase
            .from('field_visits')
            .select('*')
            .eq('id', localVisit.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

          if (remoteVisit) {
            // Vérifier les conflits
            const visitConflicts = this.detectConflicts(localVisit, remoteVisit);
            if (visitConflicts.length > 0) {
              conflicts.push(...visitConflicts);
              // Ne pas synchroniser en cas de conflit, attendre la résolution
              continue;
            }

            // Mettre à jour sur le serveur
            const { error: updateError } = await supabase
              .from('field_visits')
            .update({
              lead_id: localVisit.lead_id,
              latitude: localVisit.latitude,
              longitude: localVisit.longitude,
              accuracy: localVisit.accuracy,
              altitude: localVisit.altitude,
              heading: localVisit.heading,
              speed: localVisit.speed,
              notes: localVisit.notes,
              photos: localVisit.photos,
              visited_at: localVisit.visited_at,
            })
              .eq('id', localVisit.id);

            if (updateError) throw updateError;
          } else {
            // La visite n'existe pas sur le serveur, la créer
            const { data, error: createError } = await supabase
              .from('field_visits')
              .insert([{
                id: localVisit.id,
                lead_id: localVisit.lead_id,
                user_id: localVisit.user_id,
                latitude: localVisit.latitude,
                longitude: localVisit.longitude,
                accuracy: localVisit.accuracy,
                altitude: localVisit.altitude,
                heading: localVisit.heading,
                speed: localVisit.speed,
                notes: localVisit.notes,
                photos: localVisit.photos,
                visited_at: localVisit.visited_at,
              }])
              .select()
              .single();

            if (createError) throw createError;
          }

          // Marquer comme synchronisé
          await OfflineStorageService.setItem(`field_visit_${localVisit.id}`, {
            ...localVisit,
            synced: true,
            sync_status: 'synced' as const,
          });

          synced++;
        }
      } catch (error: any) {
        console.error('Error syncing visit:', error);
        errors.push(`${localVisit.id}: ${error.message}`);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Détecte les conflits entre une visite locale et distante
   */
  static detectConflicts(local: FieldVisit, remote: FieldVisit): FieldVisitConflict[] {
    const conflicts: FieldVisitConflict[] = [];
    const fieldsToCheck: (keyof FieldVisit)[] = ['notes', 'photos', 'latitude', 'longitude'];

    for (const field of fieldsToCheck) {
      if (local[field] !== remote[field]) {
        conflicts.push({
          local,
          remote,
          field,
          localValue: local[field],
          remoteValue: remote[field],
        });
      }
    }

    return conflicts;
  }

  /**
   * Résout un conflit en choisissant la version locale ou distante
   */
  static async resolveConflict(
    conflict: FieldVisitConflict,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    if (resolution === 'local') {
      // Utiliser la version locale
      await this.updateVisit(conflict.local.id, conflict.local);
    } else if (resolution === 'remote') {
      // Utiliser la version distante
      await OfflineStorageService.setItem(`field_visit_${conflict.remote.id}`, {
        ...conflict.remote,
        synced: true,
        sync_status: 'synced' as const,
      });
    } else {
      // Merge : combiner les deux versions
      const merged: FieldVisit = {
        ...conflict.local,
        notes: conflict.local.notes || conflict.remote.notes,
        photos: [...(conflict.local.photos || []), ...(conflict.remote.photos || [])],
      };
      await this.updateVisit(conflict.local.id, merged);
    }
  }

  /**
   * Récupère la position actuelle de l'utilisateur
   */
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Récupère l'adresse depuis les coordonnées (géocodage inverse)
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // Utiliser l'API Nominatim (OpenStreetMap) - gratuite
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.house_number) parts.push(data.address.house_number);
        if (data.address.postcode) parts.push(data.address.postcode);
        if (data.address.city || data.address.town) parts.push(data.address.city || data.address.town);
        
        return parts.join(', ');
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }
}

