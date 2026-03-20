import { useState, useCallback } from 'react';
import { TaskComment } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseTaskComment, SupabaseUser } from '../types';
import { mapSupabaseUserToUser } from '../mappers';

interface UseTaskCommentsReturn {
  getTaskComments: (taskId: string) => Promise<TaskComment[]>;
  addTaskComment: (taskId: string, content: string, mentions?: string[], attachments?: string[], parentId?: string | null) => Promise<TaskComment | null>;
  updateTaskComment: (commentId: string, content: string, mentions?: string[], attachments?: string[]) => Promise<void>;
  deleteTaskComment: (commentId: string) => Promise<void>;
}

export const useTaskComments = (): UseTaskCommentsReturn => {
  const getTaskComments = useCallback(async (taskId: string): Promise<TaskComment[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users(*)
        `)
        .eq('task_id', taskId)
        .is('parent_id', null) // Only get top-level comments
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch replies for each comment
        const commentsWithReplies = await Promise.all(
          data.map(async (c: any) => {
            const user = c.user as SupabaseUser | null;
            
            // Fetch replies
            const { data: repliesData } = await supabase
              .from('task_comments')
              .select(`
                *,
                user:users(*)
              `)
              .eq('parent_id', c.id)
              .order('created_at', { ascending: true });

            const replies = repliesData?.map((r: any) => {
              const replyUser = r.user as SupabaseUser | null;
              return {
                id: r.id,
                taskId: r.task_id,
                userId: r.user_id,
                userName: replyUser?.name,
                userAvatar: replyUser?.avatar_url || undefined,
                parentId: r.parent_id,
                content: r.content,
                mentions: r.mentions || [],
                attachments: r.attachments || [],
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              };
            }) || [];

            return {
              id: c.id,
              taskId: c.task_id,
              userId: c.user_id,
              userName: user?.name,
              userAvatar: user?.avatar_url || undefined,
              parentId: c.parent_id,
              content: c.content,
              mentions: c.mentions || [],
              attachments: c.attachments || [],
              replies,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
            };
          })
        );
        
        return commentsWithReplies;
      }
      return [];
    } catch (err) {
      console.error('Error fetching task comments:', err);
      return [];
    }
  }, []);

  const addTaskComment = useCallback(async (
    taskId: string,
    content: string,
    mentions: string[] = [],
    attachments: string[] = [],
    parentId: string | null = null
  ): Promise<TaskComment | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      // Get current user (you may need to adjust this based on your auth setup)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content,
          mentions,
          attachments: attachments.length > 0 ? attachments : null,
          parent_id: parentId,
        })
        .select(`
          *,
          user:users(*)
        `)
        .single();

      if (error) throw error;

      if (data) {
        const user = data.user as SupabaseUser | null;
        return {
          id: data.id,
          taskId: data.task_id,
          userId: data.user_id,
          userName: user?.name,
          userAvatar: user?.avatar_url || undefined,
          parentId: data.parent_id,
          content: data.content,
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error adding task comment:', err);
      throw err;
    }
  }, []);

  const updateTaskComment = useCallback(async (
    commentId: string,
    content: string,
    mentions: string[] = [],
    attachments: string[] = []
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ 
          content, 
          mentions,
          attachments: attachments.length > 0 ? attachments : null,
        })
        .eq('id', commentId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating task comment:', err);
      throw err;
    }
  }, []);

  const deleteTaskComment = useCallback(async (commentId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task comment:', err);
      throw err;
    }
  }, []);

  return {
    getTaskComments,
    addTaskComment,
    updateTaskComment,
    deleteTaskComment,
  };
};

