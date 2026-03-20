import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTaskAssignee } from '../types';

interface UseTaskAssigneesReturn {
  getTaskAssignees: (taskId: string) => Promise<string[]>;
  setTaskAssignees: (taskId: string, userIds: string[]) => Promise<void>;
  addTaskAssignee: (taskId: string, userId: string) => Promise<void>;
  removeTaskAssignee: (taskId: string, userId: string) => Promise<void>;
}

export const useTaskAssignees = (): UseTaskAssigneesReturn => {
  const getTaskAssignees = useCallback(async (taskId: string): Promise<string[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId);

      if (error) throw error;
      return data?.map((a: SupabaseTaskAssignee) => a.user_id) || [];
    } catch (err) {
      console.error('Error fetching task assignees:', err);
      return [];
    }
  }, []);

  const setTaskAssignees = useCallback(async (taskId: string, userIds: string[]) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Delete existing assignees
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

      // Insert new assignees
      if (userIds.length > 0) {
        const assignees = userIds.map(userId => ({
          task_id: taskId,
          user_id: userId
        }));

        const { error } = await supabase
          .from('task_assignees')
          .insert(assignees);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error setting task assignees:', err);
      throw err;
    }
  }, []);

  const addTaskAssignee = useCallback(async (taskId: string, userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_assignees')
        .insert({ task_id: taskId, user_id: userId });

      if (error) throw error;
    } catch (err) {
      console.error('Error adding task assignee:', err);
      throw err;
    }
  }, []);

  const removeTaskAssignee = useCallback(async (taskId: string, userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing task assignee:', err);
      throw err;
    }
  }, []);

  return {
    getTaskAssignees,
    setTaskAssignees,
    addTaskAssignee,
    removeTaskAssignee,
  };
};

