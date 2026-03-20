import { useState, useCallback } from 'react';
import { CommentReaction } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseCommentReaction, SupabaseUser } from '../types';
import { mapSupabaseUserToUser } from '../mappers';

interface UseCommentReactionsReturn {
  getCommentReactions: (commentId: string) => Promise<CommentReaction[]>;
  addReaction: (commentId: string, emoji: string) => Promise<CommentReaction | null>;
  removeReaction: (commentId: string, emoji: string) => Promise<void>;
  toggleReaction: (commentId: string, emoji: string) => Promise<void>;
}

export const useCommentReactions = (): UseCommentReactionsReturn => {
  const getCommentReactions = useCallback(async (commentId: string): Promise<CommentReaction[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('comment_reactions')
        .select(`
          *,
          user:users(*)
        `)
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((r: any) => {
          const user = r.user as SupabaseUser | null;
          return {
            id: r.id,
            commentId: r.comment_id,
            userId: r.user_id,
            userName: user?.name,
            userAvatar: user?.avatar_url || undefined,
            emoji: r.emoji,
            createdAt: r.created_at,
          };
        });
      }
      return [];
    } catch (err) {
      console.error('Error fetching comment reactions:', err);
      return [];
    }
  }, []);

  const addReaction = useCallback(async (
    commentId: string,
    emoji: string
  ): Promise<CommentReaction | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: userId,
          emoji,
        })
        .select(`
          *,
          user:users(*)
        `)
        .single();

      if (error) throw error;

      if (data) {
        const userData = data.user as SupabaseUser | null;
        return {
          id: data.id,
          commentId: data.comment_id,
          userId: data.user_id,
          userName: userData?.name,
          userAvatar: userData?.avatar_url || undefined,
          emoji: data.emoji,
          createdAt: data.created_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error adding reaction:', err);
      throw err;
    }
  }, []);

  const removeReaction = useCallback(async (commentId: string, emoji: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing reaction:', err);
      throw err;
    }
  }, []);

  const toggleReaction = useCallback(async (commentId: string, emoji: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        await removeReaction(commentId, emoji);
      } else {
        await addReaction(commentId, emoji);
      }
    } catch (err) {
      // If no existing reaction, add it
      if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
        await addReaction(commentId, emoji);
      } else {
        console.error('Error toggling reaction:', err);
        throw err;
      }
    }
  }, [addReaction, removeReaction]);

  return {
    getCommentReactions,
    addReaction,
    removeReaction,
    toggleReaction,
  };
};

