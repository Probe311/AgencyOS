import { useCallback } from 'react';
import { SalesActivity } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseSalesActivity } from '../types';

interface UseSalesActivitiesReturn {
  getSalesActivities: (filters?: { userId?: string; leadId?: string; startDate?: string; endDate?: string }) => Promise<SalesActivity[]>;
  createSalesActivity: (activity: Omit<SalesActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SalesActivity | null>;
  updateSalesActivity: (activityId: string, activity: Partial<SalesActivity>) => Promise<void>;
  deleteSalesActivity: (activityId: string) => Promise<void>;
}

export const useSalesActivities = (): UseSalesActivitiesReturn => {
  const getSalesActivities = useCallback(async (
    filters?: { userId?: string; leadId?: string; startDate?: string; endDate?: string }
  ): Promise<SalesActivity[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('sales_activities')
        .select('*')
        .order('activity_date', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }
      if (filters?.startDate) {
        query = query.gte('activity_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('activity_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((a: SupabaseSalesActivity) => ({
          id: a.id,
          userId: a.user_id,
          leadId: a.lead_id,
          activityType: a.activity_type as SalesActivity['activityType'],
          subject: a.subject || undefined,
          description: a.description || undefined,
          duration: a.duration || undefined,
          activityDate: a.activity_date,
          outcome: a.outcome || undefined,
          nextFollowupDate: a.next_followup_date || undefined,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching sales activities:', err);
      return [];
    }
  }, []);

  const createSalesActivity = useCallback(async (
    activity: Omit<SalesActivity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SalesActivity | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('sales_activities')
        .insert({
          user_id: activity.userId,
          lead_id: activity.leadId,
          activity_type: activity.activityType,
          subject: activity.subject || null,
          description: activity.description || null,
          duration: activity.duration || null,
          activity_date: activity.activityDate,
          outcome: activity.outcome || null,
          next_followup_date: activity.nextFollowupDate || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update lead's last_activity_date
      await supabase
        .from('leads')
        .update({ last_activity_date: activity.activityDate })
        .eq('id', activity.leadId);

      // Update lead's first_contact_date if it's the first activity
      const { data: lead } = await supabase
        .from('leads')
        .select('first_contact_date')
        .eq('id', activity.leadId)
        .single();

      if (lead && !lead.first_contact_date) {
        await supabase
          .from('leads')
          .update({ first_contact_date: activity.activityDate })
          .eq('id', activity.leadId);
      }

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          leadId: data.lead_id,
          activityType: data.activity_type as SalesActivity['activityType'],
          subject: data.subject || undefined,
          description: data.description || undefined,
          duration: data.duration || undefined,
          activityDate: data.activity_date,
          outcome: data.outcome || undefined,
          nextFollowupDate: data.next_followup_date || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error creating sales activity:', err);
      throw err;
    }
  }, []);

  const updateSalesActivity = useCallback(async (activityId: string, activity: Partial<SalesActivity>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sales_activities')
        .update({
          activity_type: activity.activityType,
          subject: activity.subject || null,
          description: activity.description || null,
          duration: activity.duration || null,
          activity_date: activity.activityDate,
          outcome: activity.outcome || null,
          next_followup_date: activity.nextFollowupDate || null,
        })
        .eq('id', activityId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating sales activity:', err);
      throw err;
    }
  }, []);

  const deleteSalesActivity = useCallback(async (activityId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sales_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting sales activity:', err);
      throw err;
    }
  }, []);

  return {
    getSalesActivities,
    createSalesActivity,
    updateSalesActivity,
    deleteSalesActivity,
  };
};

