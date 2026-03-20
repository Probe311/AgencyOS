import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

export class NotificationService {
  /**
   * Initialise le service de notifications
   */
  static initialize(): void {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
        // Enregistrer le token dans Supabase
        if (token.token) {
          NotificationService.registerDeviceToken(token.token);
        }
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        // Gérer la notification
        if (notification.userInteraction) {
          // L'utilisateur a interagi avec la notification
          NotificationService.handleNotificationTap(notification);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Créer le canal de notification (Android)
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'agencyos-default',
          channelName: 'AgencyOS Notifications',
          channelDescription: 'Notifications par défaut',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel créé: ${created}`)
      );
    }
  }

  /**
   * Enregistre le token de l'appareil
   */
  private static async registerDeviceToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_devices')
        .upsert([{
          user_id: user.id,
          device_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'user_id,device_token',
        });
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  /**
   * Affiche une notification locale
   */
  static showLocalNotification(
    title: string,
    message: string,
    data?: any
  ): void {
    PushNotification.localNotification({
      channelId: 'agencyos-default',
      title,
      message,
      data,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Planifie une notification locale
   */
  static scheduleNotification(
    title: string,
    message: string,
    date: Date,
    data?: any
  ): void {
    PushNotification.localNotificationSchedule({
      channelId: 'agencyos-default',
      title,
      message,
      date,
      data,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Gère le tap sur une notification
   */
  private static handleNotificationTap(notification: any): void {
    // Navigation vers la vue appropriée selon le type de notification
    const { data } = notification;
    if (data?.type && data?.id) {
      // Navigation sera gérée par le composant de navigation
      console.log('Navigate to:', data.type, data.id);
    }
  }

  /**
   * Annule toutes les notifications planifiées
   */
  static cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Annule une notification spécifique
   */
  static cancelNotification(id: string): void {
    PushNotification.cancelLocalNotifications({ id });
  }
}

