import { useState, useEffect, useCallback } from 'react';
import { Project } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseProject } from '../types';

interface UseProjectsHierarchyReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sections'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  getProjectsByWorkspace: (workspaceId: string) => Project[];
  getProjectsByFolder: (folderId: string) => Project[];
  getArchivedProjects: () => Project[];
}

export const useProjectsHierarchy = (): UseProjectsHierarchyReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedProjects = data.map((p: SupabaseProject) => ({
          id: p.id,
          name: p.name,
          client: p.client,
          status: p.status as Project['status'],
          description: p.description || undefined,
          startDate: p.start_date || undefined,
          endDate: p.end_date || undefined,
          budget: p.budget || undefined,
          workspaceId: p.workspace_id || undefined,
          folderId: p.folder_id || undefined,
          archived: p.archived,
          archivedAt: p.archived_at || undefined,
          position: p.position,
          createdBy: p.created_by || undefined,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setProjects(mappedProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('projects-hierarchy-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
          },
          () => {
            fetchProjects();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchProjects]);

  const addProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sections'>): Promise<Project | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, project not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get max position
      const { data: maxPosData } = await supabase
        .from('projects')
        .select('position')
        .eq('workspace_id', project.workspaceId || null)
        .eq('folder_id', project.folderId || null)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      
      const maxPosition = maxPosData?.position ?? -1;
      
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: project.name,
          client: project.client,
          status: project.status || 'active',
          description: project.description || null,
          start_date: project.startDate || null,
          end_date: project.endDate || null,
          budget: project.budget || null,
          workspace_id: project.workspaceId || null,
          folder_id: project.folderId || null,
          archived: false,
          position: maxPosition + 1,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newProject: Project = {
          id: data.id,
          name: data.name,
          client: data.client,
          status: data.status as Project['status'],
          description: data.description || undefined,
          startDate: data.start_date || undefined,
          endDate: data.end_date || undefined,
          budget: data.budget || undefined,
          workspaceId: data.workspace_id || undefined,
          folderId: data.folder_id || undefined,
          archived: data.archived,
          archivedAt: data.archived_at || undefined,
          position: data.position,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setProjects(prev => [...prev, newProject]);
        return newProject;
      }
      return null;
    } catch (err) {
      console.error('Error adding project:', err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, project not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.client !== undefined) updateData.client = updates.client;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate || null;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
      if (updates.budget !== undefined) updateData.budget = updates.budget || null;
      if (updates.workspaceId !== undefined) updateData.workspace_id = updates.workspaceId || null;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId || null;
      if (updates.position !== undefined) updateData.position = updates.position;

      const { error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, project not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  }, []);

  const archiveProject = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, project not archived');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          status: 'archived',
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: new Date().toISOString(), status: 'archived' } : p));
    } catch (err) {
      console.error('Error archiving project:', err);
      throw err;
    }
  }, []);

  const restoreProject = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, project not restored');
      return;
    }

    try {
      const project = projects.find(p => p.id === id);
      const previousStatus = project?.status === 'archived' ? 'active' : project?.status || 'active';
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          archived: false,
          archived_at: null,
          status: previousStatus,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: false, archivedAt: undefined, status: previousStatus as Project['status'] } : p));
    } catch (err) {
      console.error('Error restoring project:', err);
      throw err;
    }
  }, [projects]);

  const getProjectsByWorkspace = useCallback((workspaceId: string): Project[] => {
    return projects.filter(p => p.workspaceId === workspaceId && !p.archived);
  }, [projects]);

  const getProjectsByFolder = useCallback((folderId: string): Project[] => {
    return projects.filter(p => p.folderId === folderId && !p.archived);
  }, [projects]);

  const getArchivedProjects = useCallback((): Project[] => {
    return projects.filter(p => p.archived);
  }, [projects]);

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,
    refreshProjects: fetchProjects,
    getProjectsByWorkspace,
    getProjectsByFolder,
    getArchivedProjects,
  };
};

