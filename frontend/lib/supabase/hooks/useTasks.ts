import { useState, useEffect, useCallback } from 'react';
import { Task } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError, logWarn } from '../../utils/logger';
import { mapSupabaseTaskToTask, mapTaskToSupabaseTask } from '../mappers';
import { SupabaseTask } from '../types';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export const useTasks = (): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Load assignees for each task
        const tasksWithAssignees = await Promise.all(
          data.map(async (t: SupabaseTask) => {
            const task = mapSupabaseTaskToTask(t);
            // Load assignees from task_assignees table
            if (isSupabaseConfigured && supabase) {
              const { data: assigneesData } = await supabase
                .from('task_assignees')
                .select('user_id')
                .eq('task_id', t.id);
              
              if (assigneesData && assigneesData.length > 0) {
                task.assignees = assigneesData.map((a: any) => a.user_id);
              }
            }
            return task;
          })
        );
        setTasks(tasksWithAssignees);
      } else {
        setTasks([]);
      }
    } catch (err) {
      logError('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time updates
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          () => {
            fetchTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, task not saved');
      return;
    }

    try {
      const supabaseTask = mapTaskToSupabaseTask(task);
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([supabaseTask])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newTask = mapSupabaseTaskToTask(data);
        setTasks(prev => [newTask, ...prev]);
      }
    } catch (err) {
      logError('Error adding task:', err);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, task not updated');
      return;
    }

    try {
      const supabaseUpdates = mapTaskToSupabaseTask(updates);
      const { error: updateError } = await supabase
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (err) {
      logError('Error updating task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, task not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      logError('Error deleting task:', err);
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks: fetchTasks,
  };
};

