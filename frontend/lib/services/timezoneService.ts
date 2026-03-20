/**
 * Service de gestion des fuseaux horaires
 * Fournit des fonctions pour détecter, convertir et gérer les fuseaux horaires
 */

export interface TimezoneInfo {
  timezone: string;
  name: string;
  offset: string;
  offsetMinutes: number;
  abbreviation?: string;
}

/**
 * Liste des fuseaux horaires principaux
 */
export const COMMON_TIMEZONES: TimezoneInfo[] = [
  { timezone: 'Europe/Paris', name: 'Europe/Paris (CET/CEST)', offset: '+01:00', offsetMinutes: 60 },
  { timezone: 'Europe/London', name: 'Europe/London (GMT/BST)', offset: '+00:00', offsetMinutes: 0 },
  { timezone: 'America/New_York', name: 'America/New_York (EST/EDT)', offset: '-05:00', offsetMinutes: -300 },
  { timezone: 'America/Los_Angeles', name: 'America/Los_Angeles (PST/PDT)', offset: '-08:00', offsetMinutes: -480 },
  { timezone: 'America/Chicago', name: 'America/Chicago (CST/CDT)', offset: '-06:00', offsetMinutes: -360 },
  { timezone: 'America/Denver', name: 'America/Denver (MST/MDT)', offset: '-07:00', offsetMinutes: -420 },
  { timezone: 'Asia/Tokyo', name: 'Asia/Tokyo (JST)', offset: '+09:00', offsetMinutes: 540 },
  { timezone: 'Asia/Shanghai', name: 'Asia/Shanghai (CST)', offset: '+08:00', offsetMinutes: 480 },
  { timezone: 'Asia/Dubai', name: 'Asia/Dubai (GST)', offset: '+04:00', offsetMinutes: 240 },
  { timezone: 'Australia/Sydney', name: 'Australia/Sydney (AEDT/AEST)', offset: '+10:00', offsetMinutes: 600 },
  { timezone: 'America/Sao_Paulo', name: 'America/Sao_Paulo (BRT/BRST)', offset: '-03:00', offsetMinutes: -180 },
  { timezone: 'Europe/Berlin', name: 'Europe/Berlin (CET/CEST)', offset: '+01:00', offsetMinutes: 60 },
  { timezone: 'Europe/Madrid', name: 'Europe/Madrid (CET/CEST)', offset: '+01:00', offsetMinutes: 60 },
  { timezone: 'Europe/Rome', name: 'Europe/Rome (CET/CEST)', offset: '+01:00', offsetMinutes: 60 },
  { timezone: 'America/Toronto', name: 'America/Toronto (EST/EDT)', offset: '-05:00', offsetMinutes: -300 },
  { timezone: 'America/Mexico_City', name: 'America/Mexico_City (CST/CDT)', offset: '-06:00', offsetMinutes: -360 },
  { timezone: 'Asia/Singapore', name: 'Asia/Singapore (SGT)', offset: '+08:00', offsetMinutes: 480 },
  { timezone: 'Asia/Hong_Kong', name: 'Asia/Hong_Kong (HKT)', offset: '+08:00', offsetMinutes: 480 },
  { timezone: 'Asia/Mumbai', name: 'Asia/Mumbai (IST)', offset: '+05:30', offsetMinutes: 330 },
  { timezone: 'Africa/Johannesburg', name: 'Africa/Johannesburg (SAST)', offset: '+02:00', offsetMinutes: 120 },
];

/**
 * Service de gestion des fuseaux horaires
 */
export class TimezoneService {
  /**
   * Détecte le fuseau horaire du navigateur
   */
  static detectBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Error detecting timezone, defaulting to UTC:', error);
      return 'UTC';
    }
  }

  /**
   * Détecte le fuseau horaire d'un lead basé sur sa localisation
   */
  static async detectLeadTimezone(
    latitude?: number,
    longitude?: number,
    country?: string
  ): Promise<string> {
    // Si on a des coordonnées, on peut utiliser une API de géolocalisation
    if (latitude && longitude) {
      try {
        // Utilisation d'une API de géolocalisation (ex: TimeZoneDB, Google Time Zone API)
        // Pour l'instant, on utilise une détection basée sur le pays
        return this.detectTimezoneByCountry(country);
      } catch (error) {
        console.warn('Error detecting timezone from coordinates:', error);
      }
    }

    // Fallback sur la détection par pays
    if (country) {
      return this.detectTimezoneByCountry(country);
    }

    // Fallback sur le fuseau horaire du navigateur
    return this.detectBrowserTimezone();
  }

  /**
   * Détecte le fuseau horaire basé sur le pays
   */
  static detectTimezoneByCountry(country?: string): string {
    const countryTimezoneMap: Record<string, string> = {
      'FR': 'Europe/Paris',
      'GB': 'Europe/London',
      'UK': 'Europe/London',
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'MX': 'America/Mexico_City',
      'BR': 'America/Sao_Paulo',
      'DE': 'Europe/Berlin',
      'ES': 'Europe/Madrid',
      'IT': 'Europe/Rome',
      'JP': 'Asia/Tokyo',
      'CN': 'Asia/Shanghai',
      'SG': 'Asia/Singapore',
      'HK': 'Asia/Hong_Kong',
      'IN': 'Asia/Mumbai',
      'AE': 'Asia/Dubai',
      'AU': 'Australia/Sydney',
      'ZA': 'Africa/Johannesburg',
    };

    if (country && countryTimezoneMap[country.toUpperCase()]) {
      return countryTimezoneMap[country.toUpperCase()];
    }

    return this.detectBrowserTimezone();
  }

  /**
   * Convertit une date d'un fuseau horaire à un autre
   */
  static convertTimezone(
    date: Date | string,
    fromTimezone: string,
    toTimezone: string
  ): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Créer une date dans le fuseau source
    const sourceDate = new Date(dateObj.toLocaleString('en-US', { timeZone: fromTimezone }));

    // Créer une date dans le fuseau cible
    const targetDate = new Date(dateObj.toLocaleString('en-US', { timeZone: toTimezone }));

    // Calculer la différence
    const diff = targetDate.getTime() - sourceDate.getTime();

    // Appliquer la différence
    return new Date(dateObj.getTime() + diff);
  }

  /**
   * Formate une date dans un fuseau horaire spécifique
   */
  static formatInTimezone(
    date: Date | string,
    timezone: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };

    return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(dateObj);
  }

  /**
   * Récupère les informations d'un fuseau horaire
   */
  static getTimezoneInfo(timezone: string): TimezoneInfo | null {
    // Chercher dans la liste commune
    const found = COMMON_TIMEZONES.find(tz => tz.timezone === timezone);
    if (found) {
      return found;
    }

    // Sinon, créer une info basique
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'short',
      });

      const parts = formatter.formatToParts(now);
      const timeZoneName = parts.find(p => p.type === 'timeZoneName')?.value || '';

      // Calculer l'offset
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const offset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

      return {
        timezone,
        name: `${timezone} (${timeZoneName})`,
        offset,
        offsetMinutes,
        abbreviation: timeZoneName,
      };
    } catch (error) {
      console.error('Error getting timezone info:', error);
      return null;
    }
  }

  /**
   * Récupère tous les fuseaux horaires disponibles
   */
  static getAllTimezones(): TimezoneInfo[] {
    // Utiliser la liste commune + détection dynamique si nécessaire
    return COMMON_TIMEZONES;
  }

  /**
   * Vérifie si un fuseau horaire est valide
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calcule la différence d'heures entre deux fuseaux horaires
   */
  static getTimezoneOffsetDifference(timezone1: string, timezone2: string): number {
    try {
      const now = new Date();
      const date1 = new Date(now.toLocaleString('en-US', { timeZone: timezone1 }));
      const date2 = new Date(now.toLocaleString('en-US', { timeZone: timezone2 }));
      return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60); // Différence en heures
    } catch (error) {
      console.error('Error calculating timezone offset difference:', error);
      return 0;
    }
  }

  /**
   * Formate l'offset d'un fuseau horaire de manière lisible
   */
  static formatOffset(offsetMinutes: number): string {
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Récupère l'heure actuelle dans un fuseau horaire spécifique
   */
  static getCurrentTimeInTimezone(timezone: string): Date {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  }
}

