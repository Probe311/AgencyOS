/**
 * Hook générique pour les opérations CRUD sur Supabase
 * Factorise les patterns répétés dans les hooks de gestion de données
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError, logWarn } from '../../utils/logger';

export interface SupabaseCrudConfig<T, TSupabase> {
  tableName: string;
  realtimeChannel?: string;
  mapToEntity: (data: TSupabase) => T;
  mapFromEntity?: (data: Partial<T>) => any;
  orderBy?: { column: string; ascending: boolean };
  selectQuery?: string;
  enableRealtime?: boolean;
}

export interface UseSupabaseCrudReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  add: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook générique pour les opérations CRUD
 */
export function useSupabaseCrud<T extends { id: string }, TSupabase>(
  config: SupabaseCrudConfig<T, TSupabase>
): UseSupabaseCrudReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from(config.tableName)
        .select(config.selectQuery || '*');

      if (config.orderBy) {
        query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending });
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (fetchedData && fetchedData.length > 0) {
        const mappedData = fetchedData.map((item: TSupabase) => config.mapToEntity(item));
        setData(mappedData);
      } else {
        setData([]);
      }
    } catch (err) {
      logError(`Error fetching ${config.tableName}:`, err);
      setError(err instanceof Error ? err.message : `Erreur lors du chargement des ${config.tableName}`);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    if (config.enableRealtime !== false && isSupabaseConfigured && supabase) {
      const channelName = config.realtimeChannel || `${config.tableName}-changes`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: config.tableName,
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, config]);

  const add = useCallback(
    async (item: Omit<T, 'id'>) => {
      if (!isSupabaseConfigured || !supabase) {
        logWarn(`Supabase not configured, ${config.tableName} not saved`);
        return;
      }

      try {
        const itemToInsert = config.mapFromEntity
          ? config.mapFromEntity(item)
          : (item as any);

        const { data: insertedData, error: insertError } = await supabase
          .from(config.tableName)
          .insert([itemToInsert])
          .select()
          .single();

        if (insertError) throw insertError;

        if (insertedData) {
          const newItem = config.mapToEntity(insertedData as TSupabase);
          setData((prev) => [newItem, ...prev]);
        }
      } catch (err) {
        logError(`Error adding ${config.tableName}:`, err);
        throw err;
      }
    },
    [config]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      if (!isSupabaseConfigured || !supabase) {
        logWarn(`Supabase not configured, ${config.tableName} not updated`);
        return;
      }

      try {
        const updatesToApply = config.mapFromEntity
          ? config.mapFromEntity(updates)
          : (updates as any);

        const { error: updateError } = await supabase
          .from(config.tableName)
          .update(updatesToApply)
          .eq('id', id);

        if (updateError) throw updateError;

        setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
      } catch (err) {
        logError(`Error updating ${config.tableName}:`, err);
        throw err;
      }
    },
    [config]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured || !supabase) {
        logWarn(`Supabase not configured, ${config.tableName} not deleted`);
        return;
      }

      try {
        const { error: deleteError } = await supabase
          .from(config.tableName)
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        setData((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        logError(`Error deleting ${config.tableName}:`, err);
        throw err;
      }
    },
    [config]
  );

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    refresh: fetchData,
  };
}

