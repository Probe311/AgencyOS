import { useCallback } from 'react';
import { CrmMetrics, SalesPerformance } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { useLeads } from './useLeads';
import { useUsers } from './useUsers';
import { useQuotes } from './useQuotes';
import { useInvoices } from './useInvoices';
import { useState, useEffect } from 'react';

interface UseCrmMetricsReturn {
  getCrmMetrics: (startDate?: string, endDate?: string) => Promise<CrmMetrics>;
  getSalesPerformance: (userId?: string, startDate?: string, endDate?: string) => Promise<SalesPerformance[]>;
  getConversionRate: (startDate?: string, endDate?: string) => Promise<number>;
  getAverageCycleLength: (startDate?: string, endDate?: string) => Promise<number>;
  getWinRate: (startDate?: string, endDate?: string) => Promise<number>;
}

export const useCrmMetrics = (): UseCrmMetricsReturn => {
  const { getQuotes } = useQuotes();
  const { getInvoices } = useInvoices();

  const getConversionRate = useCallback(async (startDate?: string, endDate?: string): Promise<number> => {
    if (!isSupabaseConfigured || !supabase) {
      return 0;
    }

    try {
      let query = supabase
        .from('leads')
        .select('id, status, converted_at, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const totalLeads = data.length;
      const convertedLeads = data.filter(l => l.status === 'Gagné' || l.converted_at).length;

      return totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    } catch (err) {
      console.error('Error calculating conversion rate:', err);
      return 0;
    }
  }, []);

  const getAverageCycleLength = useCallback(async (startDate?: string, endDate?: string): Promise<number> => {
    if (!isSupabaseConfigured || !supabase) {
      return 0;
    }

    try {
      let query = supabase
        .from('leads')
        .select('id, created_at, converted_at, lost_at')
        .or('converted_at.not.is.null,lost_at.not.is.null');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const cycles = data
        .map(lead => {
          const created = new Date(lead.created_at).getTime();
          const ended = lead.converted_at 
            ? new Date(lead.converted_at).getTime()
            : lead.lost_at 
            ? new Date(lead.lost_at).getTime()
            : null;

          if (!ended) return null;

          const diffMs = ended - created;
          return diffMs / (1000 * 60 * 60 * 24); // Convert to days
        })
        .filter((days): days is number => days !== null);

      if (cycles.length === 0) return 0;

      const average = cycles.reduce((sum, days) => sum + days, 0) / cycles.length;
      return Math.round(average);
    } catch (err) {
      console.error('Error calculating average cycle length:', err);
      return 0;
    }
  }, []);

  const getWinRate = useCallback(async (startDate?: string, endDate?: string): Promise<number> => {
    if (!isSupabaseConfigured || !supabase) {
      return 0;
    }

    try {
      let query = supabase
        .from('leads')
        .select('id, status, converted_at, lost_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return 0;

      const closedLeads = data.filter(l => l.status === 'Gagné' || l.converted_at || l.lost_at);
      const wonLeads = data.filter(l => l.status === 'Gagné' || l.converted_at);

      return closedLeads.length > 0 ? (wonLeads.length / closedLeads.length) * 100 : 0;
    } catch (err) {
      console.error('Error calculating win rate:', err);
      return 0;
    }
  }, []);

  const getCrmMetrics = useCallback(async (startDate?: string, endDate?: string): Promise<CrmMetrics> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        conversionRate: 0,
        averageCycleLength: 0,
        winRate: 0,
        leadResponseTime: 0,
        activitiesPerLead: 0,
        revenuePerLead: 0,
        dealsByStage: {},
        conversionBySource: {},
        cycleLengthByStage: {},
      };
    }

    try {
      // Get all leads
      let leadsQuery = supabase.from('leads').select('*');
      if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
      if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

      const { data: leadsData } = await leadsQuery;

      // Get activities
      let activitiesQuery = supabase.from('sales_activities').select('*');
      if (startDate) activitiesQuery = activitiesQuery.gte('activity_date', startDate);
      if (endDate) activitiesQuery = activitiesQuery.lte('activity_date', endDate);

      const { data: activitiesData } = await activitiesQuery;

      // Get invoices for revenue calculation
      const invoices = await getInvoices();

      // Calculate metrics
      const totalLeads = leadsData?.length || 0;
      const convertedLeads = leadsData?.filter(l => l.status === 'Gagné' || l.converted_at).length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Average cycle length
      const cycles = (leadsData || [])
        .filter(l => l.converted_at || l.lost_at)
        .map(l => {
          const created = new Date(l.created_at).getTime();
          const ended = l.converted_at 
            ? new Date(l.converted_at).getTime()
            : l.lost_at 
            ? new Date(l.lost_at).getTime()
            : null;
          if (!ended) return null;
          return (ended - created) / (1000 * 60 * 60 * 24);
        })
        .filter((d): d is number => d !== null);
      const averageCycleLength = cycles.length > 0 
        ? Math.round(cycles.reduce((sum, d) => sum + d, 0) / cycles.length)
        : 0;

      // Win rate
      const closedLeads = leadsData?.filter(l => l.status === 'Gagné' || l.converted_at || l.lost_at).length || 0;
      const wonLeads = leadsData?.filter(l => l.status === 'Gagné' || l.converted_at).length || 0;
      const winRate = closedLeads > 0 ? (wonLeads / closedLeads) * 100 : 0;

      // Lead response time (average time to first activity)
      const responseTimes = (leadsData || [])
        .filter(l => l.first_contact_date)
        .map(l => {
          const created = new Date(l.created_at).getTime();
          const firstContact = new Date(l.first_contact_date).getTime();
          return (firstContact - created) / (1000 * 60 * 60); // hours
        });
      const leadResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length)
        : 0;

      // Activities per lead
      const activitiesPerLead = totalLeads > 0 
        ? ((activitiesData?.length || 0) / totalLeads)
        : 0;

      // Revenue per lead
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const revenuePerLead = totalLeads > 0 ? totalRevenue / totalLeads : 0;

      // Deals by stage
      const dealsByStage: Record<string, number> = {};
      (leadsData || []).forEach(lead => {
        const stage = lead.status || 'Nouveau';
        dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
      });

      // Conversion by source
      const conversionBySource: Record<string, number> = {};
      (leadsData || []).forEach(lead => {
        if (lead.status === 'Gagné' || lead.converted_at) {
          const source = lead.source || 'Autre';
          conversionBySource[source] = (conversionBySource[source] || 0) + 1;
        }
      });

      // Cycle length by stage (simplified)
      const cycleLengthByStage: Record<string, number> = {};

      return {
        conversionRate,
        averageCycleLength,
        winRate,
        leadResponseTime,
        activitiesPerLead,
        revenuePerLead,
        dealsByStage,
        conversionBySource,
        cycleLengthByStage,
      };
    } catch (err) {
      console.error('Error calculating CRM metrics:', err);
      return {
        conversionRate: 0,
        averageCycleLength: 0,
        winRate: 0,
        leadResponseTime: 0,
        activitiesPerLead: 0,
        revenuePerLead: 0,
        dealsByStage: {},
        conversionBySource: {},
        cycleLengthByStage: {},
      };
    }
  }, [getInvoices]);

  const getSalesPerformance = useCallback(async (
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<SalesPerformance[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      // Get all users
      const { data: usersData } = await supabase.from('users').select('*');
      const salesUsers = userId 
        ? (usersData || []).filter((u: any) => u.id === userId)
        : (usersData || []);

      const performances: SalesPerformance[] = [];

      for (const user of salesUsers) {
        // Get leads assigned to this user
        let leadsQuery = supabase
          .from('leads')
          .select('*')
          .eq('assigned_to', user.id);

        if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
        if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate);

        const { data: userLeads } = await leadsQuery;

        // Get activities
        let activitiesQuery = supabase
          .from('sales_activities')
          .select('*')
          .eq('user_id', user.id);

        if (startDate) activitiesQuery = activitiesQuery.gte('activity_date', startDate);
        if (endDate) activitiesQuery = activitiesQuery.lte('activity_date', endDate);

        const { data: userActivities } = await activitiesQuery;

        // Get quotes and invoices for revenue
        const quotes = await getQuotes({ leadId: undefined });
        const invoices = await getInvoices();
        const userQuotes = quotes.filter(q => q.leadId && userLeads?.some(l => l.id === q.leadId));
        const userInvoices = invoices.filter(inv => 
          inv.leadId && userLeads?.some(l => l.id === inv.leadId)
        );

        const totalLeads = userLeads?.length || 0;
        const convertedLeads = userLeads?.filter(l => l.status === 'Gagné' || l.converted_at).length || 0;
        const totalRevenue = userInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const dealsWon = convertedLeads;
        const dealsLost = userLeads?.filter(l => l.lost_at).length || 0;
        const totalDeals = dealsWon + dealsLost;

        // Calculate cycle length
        const cycles = (userLeads || [])
          .filter(l => l.converted_at || l.lost_at)
          .map(l => {
            const created = new Date(l.created_at).getTime();
            const ended = l.converted_at 
              ? new Date(l.converted_at).getTime()
              : l.lost_at 
              ? new Date(l.lost_at).getTime()
              : null;
            if (!ended) return null;
            return (ended - created) / (1000 * 60 * 60 * 24);
          })
          .filter((d): d is number => d !== null);
        const averageCycleLength = cycles.length > 0
          ? Math.round(cycles.reduce((sum, d) => sum + d, 0) / cycles.length)
          : 0;

        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
        const winRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;

        performances.push({
          userId: user.id,
          userName: user.name || 'Utilisateur inconnu',
          userAvatar: user.avatar_url || undefined,
          totalLeads,
          convertedLeads,
          totalRevenue,
          averageCycleLength,
          conversionRate,
          activitiesCount: userActivities?.length || 0,
          dealsWon,
          dealsLost,
          winRate,
        });
      }

      return performances;
    } catch (err) {
      console.error('Error calculating sales performance:', err);
      return [];
    }
  }, [getQuotes, getInvoices]);

  return {
    getCrmMetrics,
    getSalesPerformance,
    getConversionRate,
    getAverageCycleLength,
    getWinRate,
  };
};

