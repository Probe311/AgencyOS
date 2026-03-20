import { useState, useEffect, useCallback } from 'react';
import { ProductionProject } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError, logWarn } from '../../utils/logger';
import { SupabaseProject } from '../types';

interface UseProjectsReturn {
  projects: ProductionProject[];
  loading: boolean;
  error: string | null;
  addProject: (project: Omit<ProductionProject, 'id'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<ProductionProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const mapSupabaseProjectToProductionProject = (sp: SupabaseProject): ProductionProject => {
  const startDate = sp.start_date || new Date().toISOString().split('T')[0];
  const endDate = sp.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const budget = sp.budget || 0;
  
  // Calculer le progrès et le coût (à adapter selon votre logique métier)
  const progress = 0; // À calculer depuis les tâches associées
  const cost = 0; // À calculer depuis les heures travaillées
  
  return {
    id: sp.id,
    name: sp.name,
    client: sp.client,
    department: 'R&D & Tech', // Par défaut, à adapter
    status: 'Sur les rails',
    soldHours: 0,
    spentHours: 0,
    progress,
    startDate,
    deadline: endDate,
    budget,
    cost,
    team: [],
  };
};

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<ProductionProject[]>([]);
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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedProjects = data.map((p: SupabaseProject) => mapSupabaseProjectToProductionProject(p));
        setProjects(mappedProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      logError('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('projects-changes')
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

  const addProject = useCallback(async (project: Omit<ProductionProject, 'id'>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, project not saved');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: project.name,
          client: project.client,
          status: 'active',
          description: null,
          start_date: project.startDate,
          end_date: project.deadline,
          budget: project.budget,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newProject = mapSupabaseProjectToProductionProject(data);
        setProjects(prev => [newProject, ...prev]);
      }
    } catch (err) {
      logError('Error adding project:', err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<ProductionProject>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, project not updated');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: updates.name,
          client: updates.client,
          start_date: updates.startDate,
          end_date: updates.deadline,
          budget: updates.budget,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      logError('Error updating project:', err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, project not deleted');
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
      logError('Error deleting project:', err);
      throw err;
    }
  }, []);

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    refreshProjects: fetchProjects,
  };
};

