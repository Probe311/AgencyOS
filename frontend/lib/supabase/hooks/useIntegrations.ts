import { useState, useEffect, useCallback } from 'react';
import { Integration } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseIntegration } from '../types';

interface UseIntegrationsReturn {
  integrations: Integration[];
  loading: boolean;
  error: string | null;
  addIntegration: (integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIntegration: (id: string, updates: Partial<Integration>) => Promise<void>;
  deleteIntegration: (id: string) => Promise<void>;
  toggleIntegration: (id: string, enabled: boolean) => Promise<void>;
  refreshIntegrations: () => Promise<void>;
}

const mapSupabaseIntegrationToIntegration = (si: SupabaseIntegration): Integration => ({
  id: si.id,
  provider: si.provider as Integration['provider'],
  name: si.name,
  category: si.category as Integration['category'],
  status: si.status as Integration['status'],
  enabled: si.enabled,
  accessToken: si.access_token || undefined,
  refreshToken: si.refresh_token || undefined,
  tokenExpiresAt: si.token_expires_at || undefined,
  config: si.config || undefined,
  accountId: si.account_id || undefined,
  accountName: si.account_name || undefined,
  accountAvatar: si.account_avatar || undefined,
  lastSyncAt: si.last_sync_at || undefined,
  lastError: si.last_error || undefined,
  createdBy: si.created_by || undefined,
  createdAt: si.created_at,
  updatedAt: si.updated_at,
});

const mapIntegrationToSupabaseIntegration = (integration: Partial<Integration>): Partial<SupabaseIntegration> => ({
  provider: integration.provider,
  name: integration.name,
  category: integration.category,
  status: integration.status,
  enabled: integration.enabled,
  access_token: integration.accessToken || null,
  refresh_token: integration.refreshToken || null,
  token_expires_at: integration.tokenExpiresAt || null,
  config: integration.config || null,
  account_id: integration.accountId || null,
  account_name: integration.accountName || null,
  account_avatar: integration.accountAvatar || null,
  last_sync_at: integration.lastSyncAt || null,
  last_error: integration.lastError || null,
  created_by: integration.createdBy || null,
});

export const useIntegrations = (): UseIntegrationsReturn => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedIntegrations = data.map((i: SupabaseIntegration) => mapSupabaseIntegrationToIntegration(i));
        setIntegrations(mappedIntegrations);
      } else {
        setIntegrations([]);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des intégrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();

    // Subscribe to real-time updates
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('integrations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'integrations',
          },
          () => {
            fetchIntegrations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchIntegrations]);

  const addIntegration = useCallback(async (integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, integration not saved');
      return;
    }

    try {
      const supabaseIntegration = mapIntegrationToSupabaseIntegration(integration);
      const { data, error: insertError } = await supabase
        .from('integrations')
        .insert([supabaseIntegration])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newIntegration = mapSupabaseIntegrationToIntegration(data);
        setIntegrations(prev => [newIntegration, ...prev]);
      }
    } catch (err) {
      console.error('Error adding integration:', err);
      throw err;
    }
  }, []);

  const updateIntegration = useCallback(async (id: string, updates: Partial<Integration>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, integration not updated');
      return;
    }

    try {
      const supabaseUpdates = mapIntegrationToSupabaseIntegration(updates);
      const { error: updateError } = await supabase
        .from('integrations')
        .update(supabaseUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch (err) {
      console.error('Error updating integration:', err);
      throw err;
    }
  }, []);

  const deleteIntegration = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, integration not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setIntegrations(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting integration:', err);
      throw err;
    }
  }, []);

  const toggleIntegration = useCallback(async (id: string, enabled: boolean) => {
    await updateIntegration(id, { enabled, status: enabled ? 'Connecté' : 'Déconnecté' });
  }, [updateIntegration]);

  return {
    integrations,
    loading,
    error,
    addIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegration,
    refreshIntegrations: fetchIntegrations,
  };
};

