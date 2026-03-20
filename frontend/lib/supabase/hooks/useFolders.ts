import { useState, useEffect, useCallback } from 'react';
import { Folder } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseFolder } from '../types';

interface UseFoldersReturn {
  folders: Folder[];
  loading: boolean;
  error: string | null;
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'projects'>) => Promise<Folder | null>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  refreshFolders: () => Promise<void>;
  getFoldersByWorkspace: (workspaceId?: string) => Folder[];
  getFoldersTree: (workspaceId?: string) => Folder[];
}

export const useFolders = (): UseFoldersReturn => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('folders')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedFolders = data.map((f: SupabaseFolder) => ({
          id: f.id,
          name: f.name,
          description: f.description || undefined,
          workspaceId: f.workspace_id || undefined,
          parentFolderId: f.parent_folder_id || undefined,
          color: f.color,
          icon: f.icon || undefined,
          position: f.position,
          createdBy: f.created_by || undefined,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        }));
        setFolders(mappedFolders);
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('folders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'folders',
          },
          () => {
            fetchFolders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchFolders]);

  const addFolder = useCallback(async (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'projects'>): Promise<Folder | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, folder not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get max position for ordering
      const { data: maxPosData } = await supabase
        .from('folders')
        .select('position')
        .eq('workspace_id', folder.workspaceId || null)
        .eq('parent_folder_id', folder.parentFolderId || null)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      
      const maxPosition = maxPosData?.position ?? -1;
      
      const { data, error: insertError } = await supabase
        .from('folders')
        .insert([{
          name: folder.name,
          description: folder.description || null,
          workspace_id: folder.workspaceId || null,
          parent_folder_id: folder.parentFolderId || null,
          color: folder.color || '#8b5cf6',
          icon: folder.icon || null,
          position: maxPosition + 1,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newFolder: Folder = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          workspaceId: data.workspace_id || undefined,
          parentFolderId: data.parent_folder_id || undefined,
          color: data.color,
          icon: data.icon || undefined,
          position: data.position,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setFolders(prev => [...prev, newFolder].sort((a, b) => a.position - b.position));
        return newFolder;
      }
      return null;
    } catch (err) {
      console.error('Error adding folder:', err);
      throw err;
    }
  }, []);

  const updateFolder = useCallback(async (id: string, updates: Partial<Folder>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, folder not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon || null;
      if (updates.position !== undefined) updateData.position = updates.position;

      const { error: updateError } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    } catch (err) {
      console.error('Error updating folder:', err);
      throw err;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, folder not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setFolders(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error deleting folder:', err);
      throw err;
    }
  }, []);

  const getFoldersByWorkspace = useCallback((workspaceId?: string): Folder[] => {
    return folders.filter(f => f.workspaceId === workspaceId);
  }, [folders]);

  const getFoldersTree = useCallback((workspaceId?: string): Folder[] => {
    const filtered = workspaceId 
      ? folders.filter(f => f.workspaceId === workspaceId)
      : folders.filter(f => !f.workspaceId);
    
    const buildTree = (parentId: string | undefined): Folder[] => {
      return filtered
        .filter(f => f.parentFolderId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id),
        }))
        .sort((a, b) => a.position - b.position);
    };
    
    return buildTree(undefined);
  }, [folders]);

  return {
    folders,
    loading,
    error,
    addFolder,
    updateFolder,
    deleteFolder,
    refreshFolders: fetchFolders,
    getFoldersByWorkspace,
    getFoldersTree,
  };
};

