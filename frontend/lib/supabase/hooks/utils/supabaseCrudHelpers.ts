/**
 * Utilitaires pour factoriser les patterns CRUD communs dans les hooks Supabase
 */

import { supabase, isSupabaseConfigured } from '../../../supabase';
import { logError, logWarn } from '../../../utils/logger';

/**
 * Structure de base pour les opérations CRUD
 */
export interface CrudOperations<T> {
  fetch: () => Promise<T[]>;
  create: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

/**
 * Configuration pour les helpers CRUD
 */
export interface CrudHelperConfig<T, TSupabase> {
  tableName: string;
  mapToEntity: (data: TSupabase) => T;
  mapFromEntity?: (data: Partial<T>) => any;
  defaultOrderBy?: { column: string; ascending: boolean };
  selectQuery?: string;
}

/**
 * Crée des fonctions CRUD génériques pour une table Supabase
 */
export function createCrudHelpers<T extends { id: string }, TSupabase>(
  config: CrudHelperConfig<T, TSupabase>
): CrudOperations<T> {
  const fetch = async (): Promise<T[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from(config.tableName)
        .select(config.selectQuery || '*');

      if (config.defaultOrderBy) {
        query = query.order(config.defaultOrderBy.column, {
          ascending: config.defaultOrderBy.ascending,
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: TSupabase) => config.mapToEntity(item));
    } catch (err) {
      logError(`Error fetching ${config.tableName}:`, err);
      throw err;
    }
  };

  const create = async (item: Omit<T, 'id'>): Promise<T> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const itemToInsert = config.mapFromEntity
        ? config.mapFromEntity(item)
        : (item as any);

      const { data, error } = await supabase
        .from(config.tableName)
        .insert([itemToInsert])
        .select()
        .single();

      if (error) throw error;

      return config.mapToEntity(data as TSupabase);
    } catch (err) {
      logError(`Error creating ${config.tableName}:`, err);
      throw err;
    }
  };

  const update = async (id: string, updates: Partial<T>): Promise<T> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const updatesToApply = config.mapFromEntity
        ? config.mapFromEntity(updates)
        : (updates as any);

      const { data, error } = await supabase
        .from(config.tableName)
        .update(updatesToApply)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return config.mapToEntity(data as TSupabase);
    } catch (err) {
      logError(`Error updating ${config.tableName}:`, err);
      throw err;
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from(config.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logError(`Error deleting ${config.tableName}:`, err);
      throw err;
    }
  };

  return { fetch, create, update, delete: deleteItem };
}

/**
 * Helper pour créer une subscription real-time
 */
export function createRealtimeSubscription(
  tableName: string,
  channelName: string,
  onUpdate: () => void
): (() => void) | undefined {
  if (!isSupabaseConfigured || !supabase) {
    return undefined;
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

