import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';

export type ZoneType = 'circle' | 'polygon';

export interface ProspectingZone {
  id: string;
  name: string;
  description?: string;
  zoneType: ZoneType;
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  coordinates?: Array<[number, number]>; // Pour les polygones
  color: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const useProspectingZones = () => {
  const [zones, setZones] = useState<ProspectingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('prospecting_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedZones: ProspectingZone[] = (data || []).map((z: any) => ({
        id: z.id,
        name: z.name,
        description: z.description,
        zoneType: z.zone_type,
        centerLat: z.center_lat ? parseFloat(z.center_lat) : undefined,
        centerLng: z.center_lng ? parseFloat(z.center_lng) : undefined,
        radiusKm: z.radius_km ? parseFloat(z.radius_km) : undefined,
        coordinates: z.coordinates || undefined,
        color: z.color || '#3b82f6',
        isActive: z.is_active,
        createdBy: z.created_by,
        createdAt: z.created_at,
        updatedAt: z.updated_at,
      }));

      setZones(formattedZones);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading prospecting zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createZone = async (
    zone: Omit<ProspectingZone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<ProspectingZone> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error: insertError } = await supabase
        .from('prospecting_zones')
        .insert({
          name: zone.name,
          description: zone.description,
          zone_type: zone.zoneType,
          center_lat: zone.centerLat,
          center_lng: zone.centerLng,
          radius_km: zone.radiusKm,
          coordinates: zone.coordinates,
          color: zone.color,
          is_active: zone.isActive,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newZone: ProspectingZone = {
        id: data.id,
        name: data.name,
        description: data.description,
        zoneType: data.zone_type,
        centerLat: data.center_lat ? parseFloat(data.center_lat) : undefined,
        centerLng: data.center_lng ? parseFloat(data.center_lng) : undefined,
        radiusKm: data.radius_km ? parseFloat(data.radius_km) : undefined,
        coordinates: data.coordinates || undefined,
        color: data.color || '#3b82f6',
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setZones([newZone, ...zones]);
      return newZone;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateZone = async (
    id: string,
    updates: Partial<Omit<ProspectingZone, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>
  ): Promise<ProspectingZone> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.zoneType !== undefined) updateData.zone_type = updates.zoneType;
      if (updates.centerLat !== undefined) updateData.center_lat = updates.centerLat;
      if (updates.centerLng !== undefined) updateData.center_lng = updates.centerLng;
      if (updates.radiusKm !== undefined) updateData.radius_km = updates.radiusKm;
      if (updates.coordinates !== undefined) updateData.coordinates = updates.coordinates;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error: updateError } = await supabase
        .from('prospecting_zones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedZone: ProspectingZone = {
        id: data.id,
        name: data.name,
        description: data.description,
        zoneType: data.zone_type,
        centerLat: data.center_lat ? parseFloat(data.center_lat) : undefined,
        centerLng: data.center_lng ? parseFloat(data.center_lng) : undefined,
        radiusKm: data.radius_km ? parseFloat(data.radius_km) : undefined,
        coordinates: data.coordinates || undefined,
        color: data.color || '#3b82f6',
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setZones(zones.map(z => z.id === id ? updatedZone : z));
      return updatedZone;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteZone = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { error: deleteError } = await supabase
        .from('prospecting_zones')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setZones(zones.filter(z => z.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Fonction utilitaire pour vérifier si un point est dans une zone
  const isPointInZone = useCallback((lat: number, lng: number, zone: ProspectingZone): boolean => {
    if (!zone.isActive) return false;

    if (zone.zoneType === 'circle') {
      if (!zone.centerLat || !zone.centerLng || !zone.radiusKm) return false;
      
      // Calcul de la distance en km entre deux points (formule de Haversine)
      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat - zone.centerLat) * Math.PI / 180;
      const dLng = (lng - zone.centerLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(zone.centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return distance <= zone.radiusKm;
    } else if (zone.zoneType === 'polygon') {
      if (!zone.coordinates || zone.coordinates.length < 3) return false;
      
      // Algorithme du point dans un polygone (ray casting)
      let inside = false;
      for (let i = 0, j = zone.coordinates.length - 1; i < zone.coordinates.length; j = i++) {
        const xi = zone.coordinates[i][0], yi = zone.coordinates[i][1];
        const xj = zone.coordinates[j][0], yj = zone.coordinates[j][1];
        
        const intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      return inside;
    }
    
    return false;
  }, []);

  return {
    zones,
    loading,
    error,
    loadZones,
    createZone,
    updateZone,
    deleteZone,
    isPointInZone,
  };
};

