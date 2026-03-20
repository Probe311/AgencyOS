import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTimeEntry } from '../types';

interface UseTimeEntriesReturn {
  timeEntries: TimeEntry[];
  loading: boolean;
  error: string | null;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TimeEntry | null>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
  getTimeEntriesByTask: (taskId: string) => TimeEntry[];
  getTimeEntriesByProject: (projectId: string) => TimeEntry[];
  getTimeEntriesByUser: (userId: string, startDate?: string, endDate?: string) => TimeEntry[];
  refreshTimeEntries: () => Promise<void>;
}

export const useTimeEntries = (): UseTimeEntriesReturn => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedEntries = data.map((e: SupabaseTimeEntry) => ({
          id: e.id,
          taskId: e.task_id,
          projectId: e.project_id || undefined,
          userId: e.user_id,
          duration: e.duration,
          date: e.date,
          description: e.description || undefined,
          billable: e.billable,
          hourlyRate: e.hourly_rate || undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
        setTimeEntries(mappedEntries);
      } else {
        setTimeEntries([]);
      }
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des entrées de temps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeEntries();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('time-entries-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_entries',
          },
          () => {
            fetchTimeEntries();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchTimeEntries]);

  const addTimeEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeEntry | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, time entry not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = entry.userId || user?.id;
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error: insertError } = await supabase
        .from('time_entries')
        .insert([{
          task_id: entry.taskId,
          project_id: entry.projectId || null,
          user_id: userId,
          duration: entry.duration,
          date: entry.date,
          description: entry.description || null,
          billable: entry.billable !== undefined ? entry.billable : true,
          hourly_rate: entry.hourlyRate || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newEntry: TimeEntry = {
          id: data.id,
          taskId: data.task_id,
          projectId: data.project_id || undefined,
          userId: data.user_id,
          duration: data.duration,
          date: data.date,
          description: data.description || undefined,
          billable: data.billable,
          hourlyRate: data.hourly_rate || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setTimeEntries(prev => [newEntry, ...prev]);
        return newEntry;
      }
      return null;
    } catch (err) {
      console.error('Error adding time entry:', err);
      throw err;
    }
  }, []);

  const updateTimeEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, time entry not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.billable !== undefined) updateData.billable = updates.billable;
      if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate || null;

      const { error: updateError } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setTimeEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (err) {
      console.error('Error updating time entry:', err);
      throw err;
    }
  }, []);

  const deleteTimeEntry = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, time entry not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTimeEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting time entry:', err);
      throw err;
    }
  }, []);

  const getTimeEntriesByTask = useCallback((taskId: string): TimeEntry[] => {
    return timeEntries.filter(e => e.taskId === taskId);
  }, [timeEntries]);

  const getTimeEntriesByProject = useCallback((projectId: string): TimeEntry[] => {
    return timeEntries.filter(e => e.projectId === projectId);
  }, [timeEntries]);

  const getTimeEntriesByUser = useCallback((userId: string, startDate?: string, endDate?: string): TimeEntry[] => {
    let filtered = timeEntries.filter(e => e.userId === userId);
    
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }
    
    return filtered;
  }, [timeEntries]);

  return {
    timeEntries,
    loading,
    error,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTimeEntriesByTask,
    getTimeEntriesByProject,
    getTimeEntriesByUser,
    refreshTimeEntries: fetchTimeEntries,
  };
};

