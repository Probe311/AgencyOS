import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError } from '../../utils/logger';
import { Permission, RolePermission, ResourcePermission, Role, ResourceType } from '../../../types';
import { 
  SupabasePermission, 
  SupabaseRolePermission, 
  SupabaseResourcePermission 
} from '../types';
import { 
  mapSupabasePermissionToPermission,
  mapSupabaseRolePermissionToRolePermission,
  mapSupabaseResourcePermissionToResourcePermission,
  mapResourcePermissionToSupabaseResourcePermission
} from '../mappers';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setPermissions((data || []).map(mapSupabasePermissionToPermission));
      setError(null);
    } catch (err) {
      setError(err as Error);
      logError('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const getRolePermissions = useCallback(async (role: Role): Promise<RolePermission[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*, permissions(*)')
        .eq('role', role);

      if (fetchError) throw fetchError;

      return (data || []).map((rp: any) => ({
        id: rp.id,
        role: rp.role as Role,
        permissionId: rp.permission_id,
        granted: rp.granted,
        createdAt: rp.created_at,
      }));
    } catch (err) {
      logError('Error fetching role permissions:', err);
      return [];
    }
  }, []);

  const updateRolePermission = useCallback(async (
    role: Role,
    permissionId: string,
    granted: boolean
  ) => {
    try {
      const { data, error: upsertError } = await supabase
        .from('role_permissions')
        .upsert({
          role,
          permission_id: permissionId,
          granted,
        }, {
          onConflict: 'role,permission_id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      return mapSupabaseRolePermissionToRolePermission(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const getResourcePermissions = useCallback(async (
    resourceType: ResourceType,
    resourceId: string
  ): Promise<ResourcePermission[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('resource_permissions')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (fetchError) throw fetchError;

      return (data || []).map(mapSupabaseResourcePermissionToResourcePermission);
    } catch (err) {
      logError('Error fetching resource permissions:', err);
      return [];
    }
  }, []);

  const setResourcePermission = useCallback(async (
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionId: string,
    granted: boolean,
    grantedBy?: string
  ) => {
    try {
      const permissionData = mapResourcePermissionToSupabaseResourcePermission({
        userId,
        resourceType,
        resourceId,
        permissionId,
        granted,
        grantedBy,
      });

      const { data, error: upsertError } = await supabase
        .from('resource_permissions')
        .upsert(permissionData, {
          onConflict: 'user_id,resource_type,resource_id,permission_id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      return mapSupabaseResourcePermissionToResourcePermission(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const removeResourcePermission = useCallback(async (
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionId: string
  ) => {
    try {
      const { error: deleteError } = await supabase
        .from('resource_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('permission_id', permissionId);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const checkPermission = useCallback(async (
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissionName: string
  ): Promise<boolean> => {
    try {
      // First, get the permission
      const { data: permData, error: permError } = await supabase
        .from('permissions')
        .select('id')
        .eq('name', permissionName)
        .single();

      if (permError || !permData) return false;

      // Check resource-specific permission
      const { data: resourcePerm, error: resourceError } = await supabase
        .from('resource_permissions')
        .select('granted')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('permission_id', permData.id)
        .single();

      if (!resourceError && resourcePerm) {
        return resourcePerm.granted;
      }

      // Check role-based permission
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!userData) return false;

      const { data: rolePerm, error: roleError } = await supabase
        .from('role_permissions')
        .select('granted')
        .eq('role', userData.role)
        .eq('permission_id', permData.id)
        .single();

      if (!roleError && rolePerm) {
        return rolePerm.granted;
      }

      return false;
    } catch (err) {
      logError('Error checking permission:', err);
      return false;
    }
  }, []);

  return {
    permissions,
    loading,
    error,
    getRolePermissions,
    updateRolePermission,
    getResourcePermissions,
    setResourcePermission,
    removeResourcePermission,
    checkPermission,
    refresh: fetchPermissions,
  };
};

