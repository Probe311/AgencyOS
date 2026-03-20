import { supabase } from '../supabase';

export interface UserDevice {
  id: string;
  user_id: string;
  platform: 'ios' | 'android' | 'web';
  device_token: string;
  device_id?: string;
  device_name?: string;
  app_version?: string;
  os_version?: string;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  // Champs supplémentaires pour compatibilité
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'other';
  os?: string;
  browser?: string;
  browser_version?: string;
  ip_address?: string;
  user_agent?: string;
  last_seen_at?: string;
}

export interface DeviceRegistration {
  platform: 'ios' | 'android' | 'web';
  device_token: string;
  device_id?: string;
  device_name?: string;
  app_version?: string;
  os_version?: string;
  // Champs supplémentaires pour compatibilité
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'other';
  os?: string;
  browser?: string;
  browser_version?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Service pour gérer les appareils des utilisateurs
 */
export class DeviceService {
  /**
   * Enregistre ou met à jour un appareil
   */
  static async registerDevice(device: DeviceRegistration): Promise<UserDevice> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Utilisateur non authentifié');

    // Vérifier si l'appareil existe déjà
    const { data: existingDevice } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('device_token', device.device_token)
      .single();

    if (existingDevice) {
      // Mettre à jour l'appareil existant
      const { data, error } = await supabase
        .from('user_devices')
        .update({
          platform: device.platform,
          device_id: device.device_id,
          device_name: device.device_name,
          app_version: device.app_version,
          os_version: device.os_version,
          last_active_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('id', existingDevice.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Créer un nouvel appareil
      const { data, error } = await supabase
        .from('user_devices')
        .insert([{
          user_id: user.user.id,
          platform: device.platform,
          device_token: device.device_token,
          device_id: device.device_id,
          device_name: device.device_name || this.generateDeviceName(device),
          app_version: device.app_version,
          os_version: device.os_version,
          is_active: true,
          last_active_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  /**
   * Récupère tous les appareils d'un utilisateur
   */
  static async getUserDevices(userId?: string): Promise<UserDevice[]> {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', targetUserId)
      .order('last_seen_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère un appareil par ID
   */
  static async getDevice(deviceId: string): Promise<UserDevice | null> {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Met à jour le dernier accès d'un appareil
   */
  static async updateLastSeen(deviceToken: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const { error } = await supabase
      .from('user_devices')
      .update({
        last_active_at: new Date().toISOString(),
        is_active: true,
      })
      .eq('user_id', user.user.id)
      .eq('device_token', deviceToken);

    if (error) throw error;
  }

  /**
   * Désactive un appareil (révocation)
   */
  static async revokeDevice(deviceId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('user_devices')
      .update({
        is_active: false,
      })
      .eq('id', deviceId)
      .eq('user_id', user.user.id); // Sécurité : on ne peut révoquer que ses propres appareils

    if (error) throw error;
  }

  /**
   * Révoke tous les appareils d'un utilisateur (sauf l'appareil actuel)
   */
  static async revokeAllDevices(exceptDeviceToken?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Utilisateur non authentifié');

    let query = supabase
      .from('user_devices')
      .update({
        is_active: false,
      })
      .eq('user_id', user.user.id)
      .eq('is_active', true);

    if (exceptDeviceToken) {
      query = query.neq('device_token', exceptDeviceToken);
    }

    const { error } = await query;

    if (error) throw error;
  }

  /**
   * Supprime un appareil
   */
  static async deleteDevice(deviceId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', user.user.id); // Sécurité : on ne peut supprimer que ses propres appareils

    if (error) throw error;
  }

  /**
   * Récupère les statistiques des appareils d'un utilisateur
   */
  static async getDeviceStats(userId?: string): Promise<{
    total: number;
    active: number;
    by_type: Record<string, number>;
    by_os: Record<string, number>;
    by_browser: Record<string, number>;
  }> {
    const devices = await this.getUserDevices(userId);

    const stats = {
      total: devices.length,
      active: devices.filter(d => d.is_active).length,
      by_type: {} as Record<string, number>,
      by_os: {} as Record<string, number>,
      by_browser: {} as Record<string, number>,
    };

    devices.forEach(device => {
      // Par plateforme
      stats.by_type[device.platform] = (stats.by_type[device.platform] || 0) + 1;

      // Par OS (si disponible via os_version)
      if (device.os_version) {
        const os = device.platform === 'ios' ? 'iOS' : device.platform === 'android' ? 'Android' : 'Web';
        stats.by_os[os] = (stats.by_os[os] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Nettoie les appareils inactifs depuis plus de X jours
   */
  static async cleanupInactiveDevices(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('last_active_at', cutoffDate.toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Détecte les informations de l'appareil depuis le User-Agent
   */
  static detectDeviceInfo(): {
    platform: 'ios' | 'android' | 'web';
    os_version?: string;
    device_name?: string;
    device_type?: 'desktop' | 'mobile' | 'tablet' | 'other';
    os?: string;
    browser?: string;
    browser_version?: string;
  } {
    const userAgent = navigator.userAgent;
    let platform: 'ios' | 'android' | 'web' = 'web';
    let device_type: 'desktop' | 'mobile' | 'tablet' | 'other' = 'desktop';
    let os: string | undefined;
    let os_version: string | undefined;
    let browser: string | undefined;
    let browser_version: string | undefined;
    let device_name: string | undefined;

    // Détecter la plateforme
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      platform = 'ios';
      device_type = /ipad/i.test(userAgent) ? 'tablet' : 'mobile';
    } else if (/android/i.test(userAgent)) {
      platform = 'android';
      device_type = /tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    } else {
      platform = 'web';
      // Détecter le type d'appareil pour web
      if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        device_type = 'tablet';
      } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\s+ce|palm|smartphone|iemobile/i.test(userAgent)) {
        device_type = 'mobile';
      } else {
        device_type = 'desktop';
      }
    }

    // Détecter l'OS
    if (/windows/i.test(userAgent)) {
      os = 'Windows';
      const match = userAgent.match(/Windows NT (\d+\.\d+)/);
      if (match) {
        const version = parseFloat(match[1]);
        if (version === 10.0) os_version = '10/11';
        else if (version === 6.3) os_version = '8.1';
        else if (version === 6.2) os_version = '8';
        else if (version === 6.1) os_version = '7';
        else os_version = match[1];
      }
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      if (match) os_version = match[1].replace('_', '.');
    } else if (/linux/i.test(userAgent)) {
      os = 'Linux';
    } else if (/android/i.test(userAgent)) {
      os = 'Android';
      const match = userAgent.match(/Android (\d+\.\d+)/);
      if (match) os_version = match[1];
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = 'iOS';
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      if (match) os_version = match[1].replace('_', '.');
    }

    // Détecter le navigateur
    if (/edg/i.test(userAgent)) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      if (match) browser_version = match[1];
    } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) browser_version = match[1];
    } else if (/firefox/i.test(userAgent)) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) browser_version = match[1];
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) browser_version = match[1];
    } else if (/opera|opr/i.test(userAgent)) {
      browser = 'Opera';
      const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
      if (match) browser_version = match[1];
    }

    // Générer un nom d'appareil
    const parts: string[] = [];
    if (os) parts.push(os);
    if (browser) parts.push(browser);
    if (device_type !== 'desktop') parts.push(device_type);
    device_name = parts.join(' - ') || 'Appareil inconnu';

    return {
      platform,
      os_version,
      device_name,
      device_type,
      os,
      browser,
      browser_version,
    };
  }

  /**
   * Génère un nom d'appareil à partir des informations
   */
  private static generateDeviceName(device: DeviceRegistration): string {
    const parts: string[] = [];
    if (device.platform === 'ios') parts.push('iOS');
    else if (device.platform === 'android') parts.push('Android');
    else parts.push('Web');
    if (device.os_version) parts.push(device.os_version);
    return parts.join(' - ') || 'Appareil inconnu';
  }

  /**
   * Enregistre automatiquement l'appareil actuel
   */
  static async registerCurrentDevice(deviceToken?: string): Promise<UserDevice> {
    const deviceInfo = this.detectDeviceInfo();
    
    // Générer un token unique si non fourni
    const token = deviceToken || this.generateDeviceToken();

    return await this.registerDevice({
      platform: deviceInfo.platform,
      device_token: token,
      device_id: this.generateDeviceId(),
      device_name: deviceInfo.device_name,
      os_version: deviceInfo.os_version,
      app_version: undefined, // Sera défini par l'application mobile si nécessaire
    });
  }

  /**
   * Génère un token unique pour l'appareil
   */
  private static generateDeviceToken(): string {
    // Utiliser localStorage pour persister le token
    let token = localStorage.getItem('device_token');
    if (!token) {
      token = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_token', token);
    }
    return token;
  }

  /**
   * Génère un ID unique pour l'appareil
   */
  private static generateDeviceId(): string {
    // Utiliser une combinaison de caractéristiques du navigateur
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    const fingerprint = canvas.toDataURL();
    
    // Combiner avec d'autres caractéristiques
    const features = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      fingerprint,
    ].join('|');

    // Hash simple (en production, utiliser un vrai hash)
    let hash = 0;
    for (let i = 0; i < features.length; i++) {
      const char = features.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `device_${Math.abs(hash).toString(36)}`;
  }
}

