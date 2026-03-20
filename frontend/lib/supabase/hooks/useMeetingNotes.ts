/**
 * Hook React pour gérer les notes de réunion
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import type { MeetingNote, MeetingActionItem } from '../../services/meetingNotesService';

export function useMeetingNotes(appointmentId: string | null) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    loadNotes();
  }, [appointmentId]);

  const loadNotes = async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotes(data || []);
    } catch (err: any) {
      console.error('Error loading meeting notes:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (userId: string) => {
    if (!appointmentId) throw new Error('Appointment ID is required');

    try {
      const { data, error: createError } = await supabase
        .from('meeting_notes')
        .insert({
          appointment_id: appointmentId,
          user_id: userId,
          transcription_status: 'pending',
          action_items: [],
          language: 'fr'
        })
        .select()
        .single();

      if (createError) throw createError;

      setNotes(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating meeting note:', err);
      throw err;
    }
  };

  const updateNote = async (noteId: string, updates: Partial<MeetingNote>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('meeting_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (updateError) throw updateError;

      setNotes(prev =>
        prev.map(note => (note.id === noteId ? data : note))
      );

      return data;
    } catch (err: any) {
      console.error('Error updating meeting note:', err);
      throw err;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) throw deleteError;

      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (err: any) {
      console.error('Error deleting meeting note:', err);
      throw err;
    }
  };

  return {
    notes,
    loading,
    error,
    loadNotes,
    createNote,
    updateNote,
    deleteNote
  };
}

export function useMeetingActionItems(meetingNoteId: string | null) {
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!meetingNoteId) {
      setActionItems([]);
      setLoading(false);
      return;
    }

    loadActionItems();
  }, [meetingNoteId]);

  const loadActionItems = async () => {
    if (!meetingNoteId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('meeting_action_items')
        .select('*')
        .eq('meeting_note_id', meetingNoteId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setActionItems(data || []);
    } catch (err: any) {
      console.error('Error loading action items:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createActionItem = async (actionItem: Omit<MeetingActionItem, 'id' | 'meeting_note_id' | 'created_at' | 'updated_at'>) => {
    if (!meetingNoteId) throw new Error('Meeting note ID is required');

    try {
      const { data, error: createError } = await supabase
        .from('meeting_action_items')
        .insert({
          meeting_note_id: meetingNoteId,
          ...actionItem
        })
        .select()
        .single();

      if (createError) throw createError;

      setActionItems(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating action item:', err);
      throw err;
    }
  };

  const updateActionItem = async (actionItemId: string, updates: Partial<MeetingActionItem>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('meeting_action_items')
        .update(updates)
        .eq('id', actionItemId)
        .select()
        .single();

      if (updateError) throw updateError;

      setActionItems(prev =>
        prev.map(item => (item.id === actionItemId ? data : item))
      );

      return data;
    } catch (err: any) {
      console.error('Error updating action item:', err);
      throw err;
    }
  };

  const deleteActionItem = async (actionItemId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('meeting_action_items')
        .delete()
        .eq('id', actionItemId);

      if (deleteError) throw deleteError;

      setActionItems(prev => prev.filter(item => item.id !== actionItemId));
    } catch (err: any) {
      console.error('Error deleting action item:', err);
      throw err;
    }
  };

  return {
    actionItems,
    loading,
    error,
    loadActionItems,
    createActionItem,
    updateActionItem,
    deleteActionItem
  };
}

