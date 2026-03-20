import { useCallback, useState, useEffect } from 'react';
import { Webhook, WebhookDelivery, WebhookEvent } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseWebhook, SupabaseWebhookDelivery, SupabaseWebhookEvent } from '../types';

interface UseWebhooksReturn {
  webhooks: Webhook[];
  loading: boolean;
  getWebhooks: () => Promise<void>;
  getWebhook: (id: string) => Promise<Webhook | null>;
  createWebhook: (webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Webhook | null>;
  updateWebhook: (id: string, webhook: Partial<Webhook>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  toggleWebhook: (id: string, active: boolean) => Promise<void>;
  getWebhookDeliveries: (webhookId: string, limit?: number) => Promise<WebhookDelivery[]>;
  retryDelivery: (deliveryId: string) => Promise<void>;
  testWebhook: (webhookId: string) => Promise<boolean>;
}

export const useWebhooks = (): UseWebhooksReturn => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const getWebhooks = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setWebhooks(data.map((w: SupabaseWebhook) => ({
          id: w.id,
          name: w.name,
          url: w.url,
          secret: w.secret || undefined,
          events: w.events,
          active: w.active,
          description: w.description || undefined,
          headers: w.headers || undefined,
          createdBy: w.created_by || undefined,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        })));
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWebhooks();
  }, [getWebhooks]);

  const getWebhook = useCallback(async (id: string): Promise<Webhook | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const w = data as SupabaseWebhook;
        return {
          id: w.id,
          name: w.name,
          url: w.url,
          secret: w.secret || undefined,
          events: w.events,
          active: w.active,
          description: w.description || undefined,
          headers: w.headers || undefined,
          createdBy: w.created_by || undefined,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching webhook:', err);
      return null;
    }
  }, []);

  const createWebhook = useCallback(async (
    webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Webhook | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          name: webhook.name,
          url: webhook.url,
          secret: webhook.secret || null,
          events: webhook.events,
          active: webhook.active,
          description: webhook.description || null,
          headers: webhook.headers || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newWebhook = {
          id: data.id,
          name: data.name,
          url: data.url,
          secret: data.secret || undefined,
          events: data.events,
          active: data.active,
          description: data.description || undefined,
          headers: data.headers || undefined,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setWebhooks(prev => [newWebhook, ...prev]);
        return newWebhook;
      }
      return null;
    } catch (err) {
      console.error('Error creating webhook:', err);
      throw err;
    }
  }, []);

  const updateWebhook = useCallback(async (id: string, webhook: Partial<Webhook>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webhooks')
        .update({
          name: webhook.name,
          url: webhook.url,
          secret: webhook.secret || null,
          events: webhook.events,
          active: webhook.active,
          description: webhook.description || null,
          headers: webhook.headers || null,
        })
        .eq('id', id);

      if (error) throw error;

      await getWebhooks();
    } catch (err) {
      console.error('Error updating webhook:', err);
      throw err;
    }
  }, [getWebhooks]);

  const deleteWebhook = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Error deleting webhook:', err);
      throw err;
    }
  }, []);

  const toggleWebhook = useCallback(async (id: string, active: boolean) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ active })
        .eq('id', id);

      if (error) throw error;

      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active } : w));
    } catch (err) {
      console.error('Error toggling webhook:', err);
      throw err;
    }
  }, []);

  const getWebhookDeliveries = useCallback(async (
    webhookId: string,
    limit = 50
  ): Promise<WebhookDelivery[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (data) {
        return data.map((d: SupabaseWebhookDelivery) => ({
          id: d.id,
          webhookId: d.webhook_id,
          eventType: d.event_type,
          payload: d.payload,
          status: d.status as WebhookDelivery['status'],
          responseStatus: d.response_status || undefined,
          responseBody: d.response_body || undefined,
          errorMessage: d.error_message || undefined,
          attempts: d.attempts,
          nextRetryAt: d.next_retry_at || undefined,
          deliveredAt: d.delivered_at || undefined,
          createdAt: d.created_at,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching webhook deliveries:', err);
      return [];
    }
  }, []);

  const retryDelivery = useCallback(async (deliveryId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Get the delivery
      const { data: delivery, error: fetchError } = await supabase
        .from('webhook_deliveries')
        .select('*, webhooks(*)')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      if (delivery) {
        // Trigger webhook service to retry
        // This would typically be done server-side, but for now we'll update the status
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'retrying',
            next_retry_at: new Date().toISOString(),
          })
          .eq('id', deliveryId);
      }
    } catch (err) {
      console.error('Error retrying delivery:', err);
      throw err;
    }
  }, []);

  const testWebhook = useCallback(async (webhookId: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      const webhook = await getWebhook(webhookId);
      if (!webhook) return false;

      // Create a test delivery
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook',
        },
      };

      const { error } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhookId,
          event_type: 'webhook.test',
          payload: testPayload,
          status: 'pending',
        });

      if (error) throw error;

      // Trigger the webhook service (would be done server-side)
      return true;
    } catch (err) {
      console.error('Error testing webhook:', err);
      return false;
    }
  }, [getWebhook]);

  return {
    webhooks,
    loading,
    getWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    getWebhookDeliveries,
    retryDelivery,
    testWebhook,
  };
};

