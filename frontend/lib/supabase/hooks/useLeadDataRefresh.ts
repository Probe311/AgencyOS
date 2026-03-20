import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export interface LeadDataRefresh {
  id: string;
  leadId: string;
  refreshType: 'full' | 'enrichment' | 'validation' | 'scoring';
  refreshStatus: 'pending' | 'running' | 'completed' | 'failed';
  refreshSource?: string;
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
  changesDetected?: Record<string, any>;
  refreshTrigger?: string;
  errorMessage?: string;
  nextRefreshAt?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export const useLeadDataRefresh = (leadId?: string) => {
  const [refreshes, setRefreshes] = useState<LeadDataRefresh[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadRefreshes(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadRefreshes = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_data_refresh')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      const formatted: LeadDataRefresh[] = (data || []).map((r: any) => ({
        id: r.id,
        leadId: r.lead_id,
        refreshType: r.refresh_type,
        refreshStatus: r.refresh_status,
        refreshSource: r.refresh_source,
        dataBefore: r.data_before,
        dataAfter: r.data_after,
        changesDetected: r.changes_detected,
        refreshTrigger: r.refresh_trigger,
        errorMessage: r.error_message,
        nextRefreshAt: r.next_refresh_at,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        updatedAt: r.updated_at,
      }));

      setRefreshes(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading refreshes:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshLeadData = async (
    leadId: string,
    type: 'full' | 'enrichment' | 'validation' | 'scoring' = 'enrichment',
    source?: string
  ): Promise<LeadDataRefresh> => {
    try {
      setIsRefreshing(true);
      setError(null);

      // Récupérer les données actuelles du lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      const dataBefore = leadData;

      // Créer l'enregistrement de refresh
      const { data: refreshRecord, error: createError } = await supabase
        .from('lead_data_refresh')
        .insert({
          lead_id: leadId,
          refresh_type: type,
          refresh_status: 'running',
          refresh_source: source || 'manual',
          refresh_trigger: 'manual',
          data_before: dataBefore,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Simuler la mise à jour (à remplacer par la vraie logique d'enrichissement)
      // Ici, on pourrait appeler des APIs externes, faire de l'enrichissement IA, etc.
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simuler un délai

      // Pour l'instant, on ne modifie pas les données (à implémenter selon les besoins)
      const dataAfter = { ...dataBefore };
      const changesDetected: Record<string, any> = {};

      // Mettre à jour le statut
      const { data: updated, error: updateError } = await supabase
        .from('lead_data_refresh')
        .update({
          refresh_status: 'completed',
          data_after: dataAfter,
          changes_detected: changesDetected,
          completed_at: new Date().toISOString(),
          next_refresh_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
        })
        .eq('id', refreshRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const refresh: LeadDataRefresh = {
        id: updated.id,
        leadId: updated.lead_id,
        refreshType: updated.refresh_type,
        refreshStatus: updated.refresh_status,
        refreshSource: updated.refresh_source,
        dataBefore: updated.data_before,
        dataAfter: updated.data_after,
        changesDetected: updated.changes_detected,
        refreshTrigger: updated.refresh_trigger,
        errorMessage: updated.error_message,
        nextRefreshAt: updated.next_refresh_at,
        createdAt: updated.created_at,
        completedAt: updated.completed_at,
        updatedAt: updated.updated_at,
      };

      setRefreshes([refresh, ...refreshes]);
      return refresh;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };

  const scheduleAutoRefresh = async (
    leadId: string,
    type: 'full' | 'enrichment' | 'validation' | 'scoring',
    intervalDays: number = 30
  ) => {
    try {
      const nextRefreshAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error: insertError } = await supabase
        .from('lead_data_refresh')
        .insert({
          lead_id: leadId,
          refresh_type: type,
          refresh_status: 'pending',
          refresh_trigger: 'scheduled',
          next_refresh_at: nextRefreshAt,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    refreshes,
    loading,
    error,
    isRefreshing,
    loadRefreshes,
    refreshLeadData,
    scheduleAutoRefresh,
  };
};

