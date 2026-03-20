import { useState, useCallback } from 'react';
import { TaskHistory } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTaskHistory, SupabaseUser } from '../types';

interface UseTaskHistoryReturn {
  getTaskHistory: (taskId: string) => Promise<TaskHistory[]>;
  addTaskHistoryEntry: (
    taskId: string,
    action: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string
  ) => Promise<void>;
}

export const useTaskHistory = (): UseTaskHistoryReturn => {
  const getTaskHistory = useCallback(async (taskId: string): Promise<TaskHistory[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('task_history')
        .select(`
          *,
          user:users(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((h: any) => {
          const user = h.user as SupabaseUser | null;
          return {
            id: h.id,
            taskId: h.task_id,
            userId: h.user_id,
            userName: user?.name,
            userAvatar: user?.avatar_url || undefined,
            action: h.action,
            fieldName: h.field_name || undefined,
            oldValue: h.old_value || undefined,
            newValue: h.new_value || undefined,
            createdAt: h.created_at,
          };
        });
      }
      return [];
    } catch (err) {
      console.error('Error fetching task history:', err);
      return [];
    }
  }, []);

  const addTaskHistoryEntry = useCallback(async (
    taskId: string,
    action: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Get current user (you may need to adjust this based on your auth setup)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { error } = await supabase
        .from('task_history')
        .insert({
          task_id: taskId,
          user_id: userId,
          action,
          field_name: fieldName || null,
          old_value: oldValue || null,
          new_value: newValue || null,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error adding task history entry:', err);
      // Don't throw, history is not critical
    }
  }, []);

  return {
    getTaskHistory,
    addTaskHistoryEntry,
  };
};

