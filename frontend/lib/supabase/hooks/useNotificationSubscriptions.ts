import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError } from '../../utils/logger';
import { NotificationSubscription, NotificationEventType, NotificationChannel } from '../../../types';
import { SupabaseNotificationSubscription } from '../types';
import { 
  mapSupabaseNotificationSubscriptionToNotificationSubscription,
  mapNotificationSubscriptionToSupabaseNotificationSubscription
} from '../mappers';

export const useNotificationSubscriptions = (userId?: string) => {
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSubscriptions((data || []).map(mapSupabaseNotificationSubscriptionToNotificationSubscription));
      setError(null);
    } catch (err) {
      setError(err as Error);
      logError('Error fetching notification subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscriptions();

    // Subscribe to real-time updates
    if (userId) {
      const channel = supabase
        .channel('notification_subscriptions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_subscriptions',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchSubscriptions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchSubscriptions, userId]);

  const createSubscription = useCallback(async (
    eventType: NotificationEventType,
    channels: NotificationChannel[],
    resourceType?: string,
    resourceId?: string,
    projectId?: string
  ) => {
    if (!userId) throw new Error('User ID is required');

    try {
      const subscriptionData = mapNotificationSubscriptionToSupabaseNotificationSubscription({
        userId,
        eventType,
        resourceType,
        resourceId,
        projectId,
        enabled: true,
        channels,
      });

      const { data, error: createError } = await supabase
        .from('notification_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id,event_type,resource_type,resource_id'
        })
        .select()
        .single();

      if (createError) throw createError;

      const newSubscription = mapSupabaseNotificationSubscriptionToNotificationSubscription(data);
      setSubscriptions((prev) => [newSubscription, ...prev]);
      return newSubscription;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [userId]);

  const updateSubscription = useCallback(async (
    id: string,
    updates: Partial<NotificationSubscription>
  ) => {
    try {
      const subscriptionData = mapNotificationSubscriptionToSupabaseNotificationSubscription(updates);
      const { data, error: updateError } = await supabase
        .from('notification_subscriptions')
        .update(subscriptionData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedSubscription = mapSupabaseNotificationSubscriptionToNotificationSubscription(data);
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updatedSubscription : s)));
      return updatedSubscription;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notification_subscriptions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const toggleSubscription = useCallback(async (id: string, enabled: boolean) => {
    return updateSubscription(id, { enabled });
  }, [updateSubscription]);

  return {
    subscriptions,
    loading,
    error,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscription,
    refresh: fetchSubscriptions,
  };
};

