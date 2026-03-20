import { useCallback } from 'react';
import { SalesGoal } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseSalesGoal } from '../types';

interface UseSalesGoalsReturn {
  getSalesGoals: (userId?: string, periodType?: string) => Promise<SalesGoal[]>;
  createSalesGoal: (goal: Omit<SalesGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SalesGoal | null>;
  updateSalesGoal: (goalId: string, goal: Partial<SalesGoal>) => Promise<void>;
  deleteSalesGoal: (goalId: string) => Promise<void>;
}

export const useSalesGoals = (): UseSalesGoalsReturn => {
  const getSalesGoals = useCallback(async (userId?: string, periodType?: string): Promise<SalesGoal[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('sales_goals')
        .select('*')
        .order('period_start', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((g: SupabaseSalesGoal) => ({
          id: g.id,
          userId: g.user_id || undefined,
          periodType: g.period_type as SalesGoal['periodType'],
          periodStart: g.period_start,
          periodEnd: g.period_end,
          targetRevenue: g.target_revenue,
          targetLeads: g.target_leads,
          targetConversions: g.target_conversions,
          targetDeals: g.target_deals,
          createdBy: g.created_by || undefined,
          createdAt: g.created_at,
          updatedAt: g.updated_at,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching sales goals:', err);
      return [];
    }
  }, []);

  const createSalesGoal = useCallback(async (
    goal: Omit<SalesGoal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SalesGoal | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { data, error } = await supabase
        .from('sales_goals')
        .insert({
          user_id: goal.userId || null,
          period_type: goal.periodType,
          period_start: goal.periodStart,
          period_end: goal.periodEnd,
          target_revenue: goal.targetRevenue,
          target_leads: goal.targetLeads,
          target_conversions: goal.targetConversions,
          target_deals: goal.targetDeals,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          userId: data.user_id || undefined,
          periodType: data.period_type as SalesGoal['periodType'],
          periodStart: data.period_start,
          periodEnd: data.period_end,
          targetRevenue: data.target_revenue,
          targetLeads: data.target_leads,
          targetConversions: data.target_conversions,
          targetDeals: data.target_deals,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error creating sales goal:', err);
      throw err;
    }
  }, []);

  const updateSalesGoal = useCallback(async (goalId: string, goal: Partial<SalesGoal>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sales_goals')
        .update({
          user_id: goal.userId || null,
          period_type: goal.periodType,
          period_start: goal.periodStart,
          period_end: goal.periodEnd,
          target_revenue: goal.targetRevenue,
          target_leads: goal.targetLeads,
          target_conversions: goal.targetConversions,
          target_deals: goal.targetDeals,
        })
        .eq('id', goalId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating sales goal:', err);
      throw err;
    }
  }, []);

  const deleteSalesGoal = useCallback(async (goalId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sales_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting sales goal:', err);
      throw err;
    }
  }, []);

  return {
    getSalesGoals,
    createSalesGoal,
    updateSalesGoal,
    deleteSalesGoal,
  };
};

