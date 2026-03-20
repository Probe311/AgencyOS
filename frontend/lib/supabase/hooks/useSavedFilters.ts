import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { LeadFamily, LeadTemperature } from '../../../types';

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  resourceType: 'leads' | 'tasks' | 'projects' | 'campaigns';
  criteria: {
    searchQuery?: string;
    filterStage?: string;
    filterIndustry?: string;
    filterSource?: string;
    filterFamily?: LeadFamily | 'Tous';
    filterTemperature?: LeadTemperature | 'Tous';
    filterCertified?: 'Tous' | 'Certifiés' | 'Non certifiés';
    // Ajouter d'autres critères selon les besoins
    [key: string]: any;
  };
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const useSavedFilters = () => {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      // Charger les filtres de l'utilisateur et les filtres partagés
      const { data, error: fetchError } = await supabase
        .from('saved_filters')
        .select('*')
        .or(`created_by.eq.${userId},is_shared.eq.true`)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedFilters: SavedFilter[] = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        resourceType: f.resource_type,
        criteria: f.criteria || {},
        isShared: f.is_shared,
        createdBy: f.created_by,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      setFilters(formattedFilters);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading saved filters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFilter = async (
    name: string,
    resourceType: 'leads' | 'tasks' | 'projects' | 'campaigns',
    criteria: SavedFilter['criteria'],
    description?: string,
    isShared: boolean = false
  ): Promise<SavedFilter> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error: insertError } = await supabase
        .from('saved_filters')
        .insert({
          name,
          description,
          resource_type: resourceType,
          criteria,
          is_shared: isShared,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newFilter: SavedFilter = {
        id: data.id,
        name: data.name,
        description: data.description,
        resourceType: data.resource_type,
        criteria: data.criteria,
        isShared: data.is_shared,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setFilters([newFilter, ...filters]);
      return newFilter;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateFilter = async (
    id: string,
    updates: Partial<Pick<SavedFilter, 'name' | 'description' | 'criteria' | 'isShared'>>
  ): Promise<SavedFilter> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
      if (updates.isShared !== undefined) updateData.is_shared = updates.isShared;

      const { data, error: updateError } = await supabase
        .from('saved_filters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedFilter: SavedFilter = {
        id: data.id,
        name: data.name,
        description: data.description,
        resourceType: data.resource_type,
        criteria: data.criteria,
        isShared: data.is_shared,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setFilters(filters.map(f => f.id === id ? updatedFilter : f));
      return updatedFilter;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteFilter = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { error: deleteError } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setFilters(filters.filter(f => f.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getFiltersByResourceType = useCallback(
    (resourceType: 'leads' | 'tasks' | 'projects' | 'campaigns'): SavedFilter[] => {
      return filters.filter(f => f.resourceType === resourceType);
    },
    [filters]
  );

  return {
    filters,
    loading,
    error,
    loadFilters,
    saveFilter,
    updateFilter,
    deleteFilter,
    getFiltersByResourceType,
  };
};

