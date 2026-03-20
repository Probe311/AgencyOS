import { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Notification } from '../../types';

interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
}

/**
 * Hook pour les notifications en temps réel avec Supabase Realtime
 */
export const useRealtimeNotifications = (
  userId?: string,
  onNewNotification?: (notification: Notification) => void
): UseRealtimeNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const onNewNotificationRef = useRef(onNewNotification);
  
  // Mettre à jour la ref quand le callback change
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      return;
    }

    // Charger les notifications initiales
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data) {
          const mappedNotifications: Notification[] = data.map((n: any) => ({
            id: n.id,
            title: n.title || 'Notification',
            message: n.message || n.content || '',
            type: (n.type || 'info') as Notification['type'],
            read: n.read || false,
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Maintenant',
            link: n.link || undefined,
            metadata: n.metadata || undefined,
          }));

          setNotifications(mappedNotifications);
          setUnreadCount(mappedNotifications.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // S'abonner aux nouvelles notifications en temps réel
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            title: payload.new.title || 'Notification',
            message: payload.new.message || payload.new.content || '',
            type: (payload.new.type || 'info') as Notification['type'],
            read: payload.new.read || false,
            time: payload.new.created_at 
              ? new Date(payload.new.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Maintenant',
            link: payload.new.link || undefined,
            metadata: payload.new.metadata || undefined,
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Callback pour actions supplémentaires (ex: toast, son)
          onNewNotificationRef.current?.(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Mettre à jour la notification si elle a été marquée comme lue
          if (payload.new.read !== payload.old.read) {
            setNotifications(prev =>
              prev.map(n =>
                n.id === payload.new.id
                  ? { ...n, read: payload.new.read }
                  : n
              )
            );
            setUnreadCount(prev => payload.new.read ? Math.max(0, prev - 1) : prev + 1);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to real-time notifications');
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
  };
};

