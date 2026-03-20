import { useState, useEffect, useCallback } from 'react';
import { Workspace } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseWorkspace } from '../types';

interface UseWorkspacesReturn {
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  addWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workspace | null>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const useWorkspaces = (): UseWorkspacesReturn => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedWorkspaces = data.map((w: SupabaseWorkspace) => ({
          id: w.id,
          name: w.name,
          description: w.description || undefined,
          color: w.color,
          icon: w.icon || undefined,
          createdBy: w.created_by || undefined,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        }));
        setWorkspaces(mappedWorkspaces);
      } else {
        setWorkspaces([]);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des espaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('workspaces-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workspaces',
          },
          () => {
            fetchWorkspaces();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchWorkspaces]);

  const addWorkspace = useCallback(async (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, workspace not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('workspaces')
        .insert([{
          name: workspace.name,
          description: workspace.description || null,
          color: workspace.color || '#6366f1',
          icon: workspace.icon || null,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newWorkspace: Workspace = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          color: data.color,
          icon: data.icon || undefined,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setWorkspaces(prev => [newWorkspace, ...prev]);
        return newWorkspace;
      }
      return null;
    } catch (err) {
      console.error('Error adding workspace:', err);
      throw err;
    }
  }, []);

  const updateWorkspace = useCallback(async (id: string, updates: Partial<Workspace>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, workspace not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon || null;

      const { error: updateError } = await supabase
        .from('workspaces')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    } catch (err) {
      console.error('Error updating workspace:', err);
      throw err;
    }
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, workspace not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setWorkspaces(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  }, []);

  return {
    workspaces,
    loading,
    error,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces: fetchWorkspaces,
  };
};

