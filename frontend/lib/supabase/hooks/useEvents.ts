import { useState, useEffect, useCallback } from 'react';
import { AgencyEvent } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { mapSupabaseEventToAgencyEvent } from '../mappers';
import { SupabaseEvent } from '../types';

interface UseEventsReturn {
  events: AgencyEvent[];
  loading: boolean;
  error: string | null;
  addEvent: (event: Omit<AgencyEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<AgencyEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export const useEvents = (): UseEventsReturn => {
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedEvents = data.map((e: SupabaseEvent) => mapSupabaseEventToAgencyEvent(e));
        setEvents(mappedEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
          },
          () => {
            fetchEvents();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchEvents]);

  const addEvent = useCallback(async (event: Omit<AgencyEvent, 'id'>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, event not saved');
      return;
    }

    try {
      const startTime = new Date(`${event.date}T10:00:00`).toISOString();
      const endTime = new Date(`${event.date}T18:00:00`).toISOString();

      const { data, error: insertError } = await supabase
        .from('events')
        .insert([{
          title: event.name,
          description: null,
          start_time: startTime,
          end_time: endTime,
          location: event.venue,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newEvent = mapSupabaseEventToAgencyEvent(data);
        setEvents(prev => [newEvent, ...prev]);
      }
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    }
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<AgencyEvent>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, event not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.title = updates.name;
      if (updates.venue) updateData.location = updates.venue;
      if (updates.date) {
        updateData.start_time = new Date(`${updates.date}T10:00:00`).toISOString();
        updateData.end_time = new Date(`${updates.date}T18:00:00`).toISOString();
      }

      const { error: updateError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, event not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  }, []);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents,
  };
};

