import { useState, useEffect, useCallback } from 'react';
import { TaskDependency } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTaskDependency } from '../types';

interface UseTaskDependenciesReturn {
  dependencies: TaskDependency[];
  loading: boolean;
  error: string | null;
  getDependenciesByTask: (taskId: string) => TaskDependency[];
  addDependency: (dependency: Omit<TaskDependency, 'id' | 'createdAt'>) => Promise<TaskDependency | null>;
  deleteDependency: (id: string) => Promise<void>;
  refreshDependencies: () => Promise<void>;
}

export const useTaskDependencies = (): UseTaskDependenciesReturn => {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDependencies = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('task_dependencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedDependencies = data.map((d: SupabaseTaskDependency) => ({
          id: d.id,
          taskId: d.task_id,
          dependsOnTaskId: d.depends_on_task_id,
          dependencyType: d.dependency_type as TaskDependency['dependencyType'],
          lagDays: d.lag_days,
          createdAt: d.created_at,
        }));
        setDependencies(mappedDependencies);
      } else {
        setDependencies([]);
      }
    } catch (err) {
      console.error('Error fetching task dependencies:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dépendances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDependencies();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('task-dependencies-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_dependencies',
          },
          () => {
            fetchDependencies();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchDependencies]);

  const getDependenciesByTask = useCallback((taskId: string): TaskDependency[] => {
    return dependencies.filter(d => d.taskId === taskId);
  }, [dependencies]);

  const addDependency = useCallback(async (dependency: Omit<TaskDependency, 'id' | 'createdAt'>): Promise<TaskDependency | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, dependency not saved');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('task_dependencies')
        .insert([{
          task_id: dependency.taskId,
          depends_on_task_id: dependency.dependsOnTaskId,
          dependency_type: dependency.dependencyType,
          lag_days: dependency.lagDays || 0,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newDependency: TaskDependency = {
          id: data.id,
          taskId: data.task_id,
          dependsOnTaskId: data.depends_on_task_id,
          dependencyType: data.dependency_type as TaskDependency['dependencyType'],
          lagDays: data.lag_days,
          createdAt: data.created_at,
        };
        setDependencies(prev => [newDependency, ...prev]);
        return newDependency;
      }
      return null;
    } catch (err) {
      console.error('Error adding dependency:', err);
      throw err;
    }
  }, []);

  const deleteDependency = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, dependency not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setDependencies(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting dependency:', err);
      throw err;
    }
  }, []);

  return {
    dependencies,
    loading,
    error,
    getDependenciesByTask,
    addDependency,
    deleteDependency,
    refreshDependencies: fetchDependencies,
  };
};

