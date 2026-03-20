import { useState, useEffect, useCallback } from 'react';
import { Calendar, NonWorkingDay, WorkingHours } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError } from '../../utils/logger';
import { SupabaseCalendar, SupabaseNonWorkingDay, SupabaseWorkingHours } from '../types';
import TableExistsCache from '../utils/tableExistsCache';

interface UseCalendarsReturn {
  calendars: Calendar[];
  loading: boolean;
  error: string | null;
  getDefaultCalendar: () => Calendar | null;
  addCalendar: (calendar: Omit<Calendar, 'id' | 'createdAt' | 'updatedAt' | 'nonWorkingDays' | 'workingHours'>) => Promise<Calendar | null>;
  updateCalendar: (id: string, updates: Partial<Calendar>) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  addNonWorkingDay: (day: Omit<NonWorkingDay, 'id' | 'createdAt'>) => Promise<NonWorkingDay | null>;
  deleteNonWorkingDay: (id: string) => Promise<void>;
  addWorkingHours: (hours: Omit<WorkingHours, 'id' | 'createdAt'>) => Promise<WorkingHours | null>;
  updateWorkingHours: (id: string, updates: Partial<WorkingHours>) => Promise<void>;
  refreshCalendars: () => Promise<void>;
}

export const useCalendars = (): UseCalendarsReturn => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Vérifier si la table existe avant de faire la requête
      if (TableExistsCache.shouldSkipQuery('calendars')) {
        setCalendars([]);
        setLoading(false);
        return;
      }
      
      // Fetch calendars
      const { data: calendarsData, error: calendarsError } = await supabase
        .from('calendars')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (calendarsError) {
        // Si la table n'existe pas, mémoriser et retourner un tableau vide
        if (TableExistsCache.handleTableError('calendars', calendarsError)) {
          setCalendars([]);
          setLoading(false);
          return;
        }
        throw calendarsError;
      }

      // Si la requête réussit, mémoriser que la table existe
      TableExistsCache.setTableExists('calendars');

      // Fetch non-working days
      const { data: nonWorkingDaysData, error: nonWorkingDaysError } = await supabase
        .from('non_working_days')
        .select('*');

      if (nonWorkingDaysError) throw nonWorkingDaysError;

      // Fetch working hours
      const { data: workingHoursData, error: workingHoursError } = await supabase
        .from('working_hours')
        .select('*');

      if (workingHoursError) throw workingHoursError;

      if (calendarsData && calendarsData.length > 0) {
        const mappedCalendars = calendarsData.map((c: SupabaseCalendar) => {
          const nonWorkingDays = (nonWorkingDaysData || [])
            .filter((d: SupabaseNonWorkingDay) => d.calendar_id === c.id)
            .map((d: SupabaseNonWorkingDay) => ({
              id: d.id,
              calendarId: d.calendar_id,
              date: d.date,
              name: d.name || undefined,
              isRecurring: d.is_recurring,
              createdAt: d.created_at,
            }));

          const workingHours = (workingHoursData || [])
            .filter((h: SupabaseWorkingHours) => h.calendar_id === c.id)
            .map((h: SupabaseWorkingHours) => ({
              id: h.id,
              calendarId: h.calendar_id,
              dayOfWeek: h.day_of_week,
              startTime: h.start_time,
              endTime: h.end_time,
              isWorkingDay: h.is_working_day,
              createdAt: h.created_at,
            }));

          return {
            id: c.id,
            name: c.name,
            description: c.description || undefined,
            isDefault: c.is_default,
            createdBy: c.created_by || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            nonWorkingDays,
            workingHours,
          };
        });
        setCalendars(mappedCalendars);
      } else {
        setCalendars([]);
      }
    } catch (err) {
      logError('Error fetching calendars:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des calendriers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('calendars-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calendars',
          },
          () => {
            fetchCalendars();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchCalendars]);

  const getDefaultCalendar = useCallback((): Calendar | null => {
    return calendars.find(c => c.isDefault) || calendars[0] || null;
  }, [calendars]);

  const addCalendar = useCallback(async (calendar: Omit<Calendar, 'id' | 'createdAt' | 'updatedAt' | 'nonWorkingDays' | 'workingHours'>): Promise<Calendar | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, calendar not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (TableExistsCache.shouldSkipQuery('calendars')) {
        console.warn('La table calendars n\'existe pas dans la base de données');
        return null;
      }

      // If this is set as default, unset other defaults
      if (calendar.isDefault) {
        const { error: unsetError } = await supabase
          .from('calendars')
          .update({ is_default: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
        
        if (unsetError && !TableExistsCache.handleTableError('calendars', unsetError)) {
          throw unsetError;
        }
      }
      
      const { data, error: insertError } = await supabase
        .from('calendars')
        .insert([{
          name: calendar.name,
          description: calendar.description || null,
          is_default: calendar.isDefault || false,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) {
        if (TableExistsCache.handleTableError('calendars', insertError)) {
          console.warn('La table calendars n\'existe pas dans la base de données');
          return null;
        }
        throw insertError;
      }

      TableExistsCache.setTableExists('calendars');

      if (data) {
        const newCalendar: Calendar = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          isDefault: data.is_default,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          nonWorkingDays: [],
          workingHours: [],
        };
        setCalendars(prev => [newCalendar, ...prev]);
        return newCalendar;
      }
      return null;
    } catch (err) {
      console.error('Error adding calendar:', err);
      throw err;
    }
  }, []);

  const updateCalendar = useCallback(async (id: string, updates: Partial<Calendar>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, calendar not updated');
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('calendars')) {
        console.warn('La table calendars n\'existe pas dans la base de données');
        return;
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        const { error: unsetError } = await supabase
          .from('calendars')
          .update({ is_default: false })
          .neq('id', id);
        
        if (unsetError && !TableExistsCache.handleTableError('calendars', unsetError)) {
          throw unsetError;
        }
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

      const { error: updateError } = await supabase
        .from('calendars')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        if (TableExistsCache.handleTableError('calendars', updateError)) {
          console.warn('La table calendars n\'existe pas dans la base de données');
          return;
        }
        throw updateError;
      }

      TableExistsCache.setTableExists('calendars');

      setCalendars(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating calendar:', err);
      throw err;
    }
  }, []);

  const deleteCalendar = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, calendar not deleted');
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('calendars')) {
        console.warn('La table calendars n\'existe pas dans la base de données');
        return;
      }

      const { error: deleteError } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id);

      if (deleteError) {
        if (TableExistsCache.handleTableError('calendars', deleteError)) {
          console.warn('La table calendars n\'existe pas dans la base de données');
          return;
        }
        throw deleteError;
      }

      TableExistsCache.setTableExists('calendars');

      setCalendars(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting calendar:', err);
      throw err;
    }
  }, []);

  const addNonWorkingDay = useCallback(async (day: Omit<NonWorkingDay, 'id' | 'createdAt'>): Promise<NonWorkingDay | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, non-working day not saved');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('non_working_days')
        .insert([{
          calendar_id: day.calendarId,
          date: day.date,
          name: day.name || null,
          is_recurring: day.isRecurring || false,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newDay: NonWorkingDay = {
          id: data.id,
          calendarId: data.calendar_id,
          date: data.date,
          name: data.name || undefined,
          isRecurring: data.is_recurring,
          createdAt: data.created_at,
        };
        setCalendars(prev => prev.map(c => 
          c.id === day.calendarId 
            ? { ...c, nonWorkingDays: [...(c.nonWorkingDays || []), newDay] }
            : c
        ));
        return newDay;
      }
      return null;
    } catch (err) {
      console.error('Error adding non-working day:', err);
      throw err;
    }
  }, []);

  const deleteNonWorkingDay = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, non-working day not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('non_working_days')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCalendars(prev => prev.map(c => ({
        ...c,
        nonWorkingDays: c.nonWorkingDays?.filter(d => d.id !== id) || []
      })));
    } catch (err) {
      console.error('Error deleting non-working day:', err);
      throw err;
    }
  }, []);

  const addWorkingHours = useCallback(async (hours: Omit<WorkingHours, 'id' | 'createdAt'>): Promise<WorkingHours | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, working hours not saved');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('working_hours')
        .insert([{
          calendar_id: hours.calendarId,
          day_of_week: hours.dayOfWeek,
          start_time: hours.startTime,
          end_time: hours.endTime,
          is_working_day: hours.isWorkingDay !== undefined ? hours.isWorkingDay : true,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newHours: WorkingHours = {
          id: data.id,
          calendarId: data.calendar_id,
          dayOfWeek: data.day_of_week,
          startTime: data.start_time,
          endTime: data.end_time,
          isWorkingDay: data.is_working_day,
          createdAt: data.created_at,
        };
        setCalendars(prev => prev.map(c => 
          c.id === hours.calendarId 
            ? { ...c, workingHours: [...(c.workingHours || []), newHours] }
            : c
        ));
        return newHours;
      }
      return null;
    } catch (err) {
      console.error('Error adding working hours:', err);
      throw err;
    }
  }, []);

  const updateWorkingHours = useCallback(async (id: string, updates: Partial<WorkingHours>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, working hours not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.isWorkingDay !== undefined) updateData.is_working_day = updates.isWorkingDay;

      const { error: updateError } = await supabase
        .from('working_hours')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setCalendars(prev => prev.map(c => ({
        ...c,
        workingHours: c.workingHours?.map(h => h.id === id ? { ...h, ...updates } : h) || []
      })));
    } catch (err) {
      console.error('Error updating working hours:', err);
      throw err;
    }
  }, []);

  return {
    calendars,
    loading,
    error,
    getDefaultCalendar,
    addCalendar,
    updateCalendar,
    deleteCalendar,
    addNonWorkingDay,
    deleteNonWorkingDay,
    addWorkingHours,
    updateWorkingHours,
    refreshCalendars: fetchCalendars,
  };
};

