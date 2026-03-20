import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export interface BusinessCalendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  workingDays: number[]; // 1=Lundi, 7=Dimanche
  workingHoursStart: string; // Format HH:mm:ss
  workingHoursEnd: string;
  holidays: Array<{ date: string; name: string }>;
  vacationPeriods: Array<{ start: string; end: string; name?: string }>;
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useBusinessCalendars = () => {
  const [calendars, setCalendars] = useState<BusinessCalendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('business_calendars')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;

      const loadedCalendars: BusinessCalendar[] = (data || []).map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        description: cal.description,
        timezone: cal.timezone,
        workingDays: cal.working_days || [],
        workingHoursStart: cal.working_hours_start,
        workingHoursEnd: cal.working_hours_end,
        holidays: cal.holidays || [],
        vacationPeriods: cal.vacation_periods || [],
        isDefault: cal.is_default,
        createdBy: cal.created_by,
        createdAt: cal.created_at,
        updatedAt: cal.updated_at,
      }));

      setCalendars(loadedCalendars);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createCalendar = async (calendar: Omit<BusinessCalendar, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessCalendar> => {
    try {
      setLoading(true);

      // Si c'est le calendrier par défaut, désactiver les autres
      if (calendar.isDefault) {
        await supabase
          .from('business_calendars')
          .update({ is_default: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Tous sauf un ID fictif
      }

      const { data, error: insertError } = await supabase
        .from('business_calendars')
        .insert({
          name: calendar.name,
          description: calendar.description,
          timezone: calendar.timezone,
          working_days: calendar.workingDays,
          working_hours_start: calendar.workingHoursStart,
          working_hours_end: calendar.workingHoursEnd,
          holidays: calendar.holidays,
          vacation_periods: calendar.vacationPeriods,
          is_default: calendar.isDefault,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newCalendar: BusinessCalendar = {
        id: data.id,
        name: data.name,
        description: data.description,
        timezone: data.timezone,
        workingDays: data.working_days || [],
        workingHoursStart: data.working_hours_start,
        workingHoursEnd: data.working_hours_end,
        holidays: data.holidays || [],
        vacationPeriods: data.vacation_periods || [],
        isDefault: data.is_default,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadCalendars();
      setError(null);
      return newCalendar;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCalendar = async (id: string, updates: Partial<BusinessCalendar>): Promise<BusinessCalendar> => {
    try {
      setLoading(true);

      // Si on définit comme par défaut, désactiver les autres
      if (updates.isDefault) {
        await supabase
          .from('business_calendars')
          .update({ is_default: false })
          .neq('id', id);
      }

      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
      if (updates.workingDays !== undefined) updateData.working_days = updates.workingDays;
      if (updates.workingHoursStart !== undefined) updateData.working_hours_start = updates.workingHoursStart;
      if (updates.workingHoursEnd !== undefined) updateData.working_hours_end = updates.workingHoursEnd;
      if (updates.holidays !== undefined) updateData.holidays = updates.holidays;
      if (updates.vacationPeriods !== undefined) updateData.vacation_periods = updates.vacationPeriods;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

      const { data, error: updateError } = await supabase
        .from('business_calendars')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated: BusinessCalendar = {
        id: data.id,
        name: data.name,
        description: data.description,
        timezone: data.timezone,
        workingDays: data.working_days || [],
        workingHoursStart: data.working_hours_start,
        workingHoursEnd: data.working_hours_end,
        holidays: data.holidays || [],
        vacationPeriods: data.vacation_periods || [],
        isDefault: data.is_default,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadCalendars();
      setError(null);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCalendar = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('business_calendars')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadCalendars();
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCalendar = (): BusinessCalendar | undefined => {
    return calendars.find(cal => cal.isDefault);
  };

  useEffect(() => {
    loadCalendars();
  }, []);

  return {
    calendars,
    loading,
    error,
    loadCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    getDefaultCalendar,
  };
};

