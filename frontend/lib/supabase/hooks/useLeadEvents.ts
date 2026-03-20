import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export interface LeadEvent {
  id: string;
  leadId: string;
  eventType: 'anniversaire' | 'evenement_entreprise' | 'rappel' | 'suivi' | 'autre';
  title: string;
  description?: string;
  eventDate: string; // DATE format
  isRecurring: boolean;
  recurrencePattern?: string;
  reminderDays: number[];
  notified: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadEvents = (leadId?: string) => {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (leadId) {
      loadEvents(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadEvents = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_events')
        .select('*')
        .eq('lead_id', id)
        .order('event_date', { ascending: true });

      if (fetchError) throw fetchError;

      const formatted: LeadEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        leadId: e.lead_id,
        eventType: e.event_type,
        title: e.title,
        description: e.description,
        eventDate: e.event_date,
        isRecurring: e.is_recurring || false,
        recurrencePattern: e.recurrence_pattern,
        reminderDays: e.reminder_days || [],
        notified: e.notified || false,
        createdBy: e.created_by,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));

      setEvents(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (event: Omit<LeadEvent, 'id' | 'createdAt' | 'updatedAt' | 'notified'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('lead_events')
        .insert({
          lead_id: event.leadId,
          event_type: event.eventType,
          title: event.title,
          description: event.description,
          event_date: event.eventDate,
          is_recurring: event.isRecurring,
          recurrence_pattern: event.recurrencePattern,
          reminder_days: event.reminderDays,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newEvent: LeadEvent = {
        id: data.id,
        leadId: data.lead_id,
        eventType: data.event_type,
        title: data.title,
        description: data.description,
        eventDate: data.event_date,
        isRecurring: data.is_recurring,
        recurrencePattern: data.recurrence_pattern,
        reminderDays: data.reminder_days || [],
        notified: data.notified || false,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setEvents([...events, newEvent].sort((a, b) => 
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ));
      return newEvent;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<Omit<LeadEvent, 'id' | 'createdAt' | 'updatedAt' | 'leadId'>>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('lead_events')
        .update({
          event_type: updates.eventType,
          title: updates.title,
          description: updates.description,
          event_date: updates.eventDate,
          is_recurring: updates.isRecurring,
          recurrence_pattern: updates.recurrencePattern,
          reminder_days: updates.reminderDays,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedEvent: LeadEvent = {
        id: data.id,
        leadId: data.lead_id,
        eventType: data.event_type,
        title: data.title,
        description: data.description,
        eventDate: data.event_date,
        isRecurring: data.is_recurring,
        recurrencePattern: data.recurrence_pattern,
        reminderDays: data.reminder_days || [],
        notified: data.notified || false,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setEvents(events.map(e => e.id === id ? updatedEvent : e).sort((a, b) => 
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ));
      return updatedEvent;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('lead_events')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};

