import { useState, useCallback } from 'react';
import { TaskReminder } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTaskReminder } from '../types';

interface UseTaskRemindersReturn {
  getTaskReminders: (taskId: string) => Promise<TaskReminder[]>;
  addTaskReminder: (
    taskId: string,
    userId: string,
    reminderDate: string,
    reminderType: 'due_date' | 'start_date' | 'custom',
    daysBefore?: number
  ) => Promise<TaskReminder | null>;
  deleteTaskReminder: (reminderId: string) => Promise<void>;
}

export const useTaskReminders = (): UseTaskRemindersReturn => {
  const getTaskReminders = useCallback(async (taskId: string): Promise<TaskReminder[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', taskId)
        .order('reminder_date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((r: SupabaseTaskReminder) => ({
          id: r.id,
          taskId: r.task_id,
          userId: r.user_id,
          reminderDate: r.reminder_date,
          reminderType: r.reminder_type as 'due_date' | 'start_date' | 'custom',
          daysBefore: r.days_before,
          sent: r.sent,
          createdAt: r.created_at,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching task reminders:', err);
      return [];
    }
  }, []);

  const addTaskReminder = useCallback(async (
    taskId: string,
    userId: string,
    reminderDate: string,
    reminderType: 'due_date' | 'start_date' | 'custom',
    daysBefore: number = 0
  ): Promise<TaskReminder | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('task_reminders')
        .insert({
          task_id: taskId,
          user_id: userId,
          reminder_date: reminderDate,
          reminder_type: reminderType,
          days_before: daysBefore,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          taskId: data.task_id,
          userId: data.user_id,
          reminderDate: data.reminder_date,
          reminderType: data.reminder_type as 'due_date' | 'start_date' | 'custom',
          daysBefore: data.days_before,
          sent: data.sent,
          createdAt: data.created_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error adding task reminder:', err);
      throw err;
    }
  }, []);

  const deleteTaskReminder = useCallback(async (reminderId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task reminder:', err);
      throw err;
    }
  }, []);

  return {
    getTaskReminders,
    addTaskReminder,
    deleteTaskReminder,
  };
};

