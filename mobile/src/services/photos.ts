import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { Platform, Alert } from 'react-native';
import { supabase } from '../config/supabase';

export interface PhotoOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
}

export class PhotoService {
  /**
   * Ouvre la galerie de photos
   */
  static async pickFromGallery(options: PhotoOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      launchImageLibrary(
        {
          mediaType: 'photo' as MediaType,
          quality: options.quality || 0.8,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1920,
          allowsEditing: options.allowsEditing || true,
        },
        async (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const uri = response.assets[0].uri;
            if (uri) {
              const uploadedUrl = await this.uploadPhoto(uri);
              resolve(uploadedUrl);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Ouvre l'appareil photo
   */
  static async takePhoto(options: PhotoOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      launchCamera(
        {
          mediaType: 'photo' as MediaType,
          quality: options.quality || 0.8,
          maxWidth: options.maxWidth || 1920,
          maxHeight: options.maxHeight || 1920,
          allowsEditing: options.allowsEditing || true,
        },
        async (response: ImagePickerResponse) => {
          if (response.didCancel || response.errorMessage) {
            resolve(null);
            return;
          }

          if (response.assets && response.assets[0]) {
            const uri = response.assets[0].uri;
            if (uri) {
              const uploadedUrl = await this.uploadPhoto(uri);
              resolve(uploadedUrl);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Affiche un menu pour choisir entre galerie et appareil photo
   */
  static async pickPhoto(options: PhotoOptions = {}): Promise<string | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Sélectionner une photo',
        'Choisissez une option',
        [
          {
            text: 'Galerie',
            onPress: async () => {
              const uri = await this.pickFromGallery(options);
              resolve(uri);
            },
          },
          {
            text: 'Appareil photo',
            onPress: async () => {
              const uri = await this.takePhoto(options);
              resolve(uri);
            },
          },
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true }
      );
    });
  }

  /**
   * Upload une photo vers Supabase Storage
   */
  private static async uploadPhoto(uri: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Lire le fichier
      const filename = `photos/${user.id}/${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filename, formData, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  /**
   * Supprime une photo
   */
  static async deletePhoto(url: string): Promise<void> {
    try {
      // Extraire le chemin du fichier depuis l'URL
      const path = url.split('/photos/')[1];
      if (!path) return;

      const { error } = await supabase.storage
        .from('photos')
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
}

