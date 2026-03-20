import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';
import { supabase } from '../config/supabase';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export class GeolocationService {
  /**
   * Demande les permissions de géolocalisation
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de géolocalisation',
            message: 'AgencyOS a besoin de votre position pour certaines fonctionnalités',
            buttonNeutral: 'Demander plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Autoriser',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS gère les permissions automatiquement
  }

  /**
   * Obtient la position actuelle
   */
  static getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Suit la position en continu
   */
  static watchPosition(
    callback: (location: Location) => void,
    errorCallback?: (error: any) => void
  ): number {
    return Geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp,
        });
      },
      errorCallback,
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Mettre à jour tous les 10 mètres
      }
    );
  }

  /**
   * Arrête le suivi de position
   */
  static clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }

  /**
   * Enregistre une visite terrain avec géolocalisation
   */
  static async recordFieldVisit(
    leadId: string,
    notes?: string,
    photos?: string[]
  ): Promise<void> {
    try {
      const location = await this.getCurrentPosition();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('field_visits')
        .insert([{
          lead_id: leadId,
          user_id: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          notes,
          photos: photos || [],
          visited_at: new Date().toISOString(),
        }]);
    } catch (error) {
      console.error('Error recording field visit:', error);
      throw error;
    }
  }
}

