import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';

interface TaskAssignee {
  taskId: string;
  userId: string;
}

interface UseTaskAssigneesBulkReturn {
  taskAssignees: Record<string, string[]>; // taskId -> userId[]
  loading: boolean;
  getTaskAssignees: (taskId: string) => string[];
  refreshAssignees: () => Promise<void>;
}

/**
 * Hook pour charger tous les assignés de tâches en une seule requête
 * et fournir un accès rapide par taskId
 */
export const useTaskAssigneesBulk = (taskIds?: string[]): UseTaskAssigneesBulkReturn => {
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const loadAssignees = useCallback(async (ids?: string[]) => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('task_assignees')
        .select('task_id, user_id');

      // Si des IDs spécifiques sont fournis, filtrer
      if (ids && ids.length > 0) {
        query = query.in('task_id', ids);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Grouper les assignés par taskId
      const grouped: Record<string, string[]> = {};
      
      if (data) {
        data.forEach((assignment: any) => {
          if (!grouped[assignment.task_id]) {
            grouped[assignment.task_id] = [];
          }
          grouped[assignment.task_id].push(assignment.user_id);
        });
      }

      if (ids) {
        // Si des IDs spécifiques sont fournis, ne mettre à jour que ceux-là
        setTaskAssignees(prev => ({
          ...prev,
          ...grouped,
        }));
      } else {
        // Sinon, remplacer complètement
        setTaskAssignees(grouped);
      }
    } catch (error) {
      console.error('Error loading task assignees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskIds) {
      loadAssignees(taskIds);
    } else {
      loadAssignees();
    }
  }, [taskIds, loadAssignees]);

  const getTaskAssignees = useCallback((taskId: string): string[] => {
    return taskAssignees[taskId] || [];
  }, [taskAssignees]);

  return {
    taskAssignees,
    loading,
    getTaskAssignees,
    refreshAssignees: () => loadAssignees(taskIds),
  };
};

