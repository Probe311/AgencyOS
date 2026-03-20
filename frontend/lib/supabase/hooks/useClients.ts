import { useCallback, useState, useEffect } from 'react';
import { Client, ClientUser } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError } from '../../utils/logger';
import { SupabaseClient, SupabaseUserClient } from '../types';
import TableExistsCache from '../utils/tableExistsCache';

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  getClients: () => Promise<void>;
  getClient: (id: string) => Promise<Client | null>;
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client | null>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClientUsers: (clientId: string) => Promise<ClientUser[]>;
  addUserToClient: (clientId: string, userId: string, role: ClientUser['role'], isPrimary?: boolean) => Promise<void>;
  removeUserFromClient: (clientId: string, userId: string) => Promise<void>;
  updateUserRole: (clientId: string, userId: string, role: ClientUser['role']) => Promise<void>;
  getCurrentClient: () => Promise<Client | null>;
  switchClient: (clientId: string) => Promise<void>;
}

export const useClients = (): UseClientsReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const getClients = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Vérifier si la table existe avant de faire la requête
      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Get clients where user is a member
      const { data, error } = await supabase
        .from('user_clients')
        .select(`
          client_id,
          clients (*)
        `)
        .eq('user_id', user.id);

      if (error) {
        // Si la table n'existe pas, mémoriser et retourner un tableau vide
        if (TableExistsCache.handleTableError('user_clients', error)) {
          setClients([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Si la requête réussit, mémoriser que la table existe
      TableExistsCache.setTableExists('user_clients');

      if (data) {
        const clientList = data
          .map((uc: any) => uc.clients)
          .filter(Boolean)
          .map((c: SupabaseClient) => ({
            id: c.id,
            name: c.name,
            subdomain: c.subdomain || undefined,
            domain: c.domain || undefined,
            companyName: c.company_name || undefined,
            logoUrl: c.logo_url || undefined,
            primaryColor: c.primary_color,
            status: c.status as Client['status'],
            plan: c.plan as Client['plan'],
            maxUsers: c.max_users,
            maxProjects: c.max_projects,
            maxStorageGb: c.max_storage_gb,
            trialEndsAt: c.trial_ends_at || undefined,
            billingEmail: c.billing_email || undefined,
            billingAddress: c.billing_address || undefined,
            createdBy: c.created_by || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));

        setClients(clientList);
      }
    } catch (err) {
      logError('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getClients();
  }, [getClients]);

  const getClient = useCallback(async (id: string): Promise<Client | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const c = data as SupabaseClient;
        return {
          id: c.id,
          name: c.name,
          subdomain: c.subdomain || undefined,
          domain: c.domain || undefined,
          companyName: c.company_name || undefined,
          logoUrl: c.logo_url || undefined,
          primaryColor: c.primary_color,
          status: c.status as Client['status'],
          plan: c.plan as Client['plan'],
          maxUsers: c.max_users,
          maxProjects: c.max_projects,
          maxStorageGb: c.max_storage_gb,
          trialEndsAt: c.trial_ends_at || undefined,
          billingEmail: c.billing_email || undefined,
          billingAddress: c.billing_address || undefined,
          createdBy: c.created_by || undefined,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        };
      }
      return null;
    } catch (err) {
      logError('Error fetching client:', err);
      return null;
    }
  }, []);

  const createClient = useCallback(async (
    client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Client | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: client.name,
          subdomain: client.subdomain || null,
          domain: client.domain || null,
          company_name: client.companyName || null,
          logo_url: client.logoUrl || null,
          primary_color: client.primaryColor,
          status: client.status,
          plan: client.plan,
          max_users: client.maxUsers,
          max_projects: client.maxProjects,
          max_storage_gb: client.maxStorageGb,
          trial_ends_at: client.trialEndsAt || null,
          billing_email: client.billingEmail || null,
          billing_address: client.billingAddress || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as Owner
      if (data && userId && !TableExistsCache.shouldSkipQuery('user_clients')) {
        const { error: userClientError } = await supabase
          .from('user_clients')
          .insert({
            user_id: userId,
            client_id: data.id,
            role: 'Owner',
            is_primary: true,
          });
        
        if (userClientError) {
          TableExistsCache.handleTableError('user_clients', userClientError);
        } else {
          TableExistsCache.setTableExists('user_clients');
        }
      }

      if (data) {
        const newClient = {
          id: data.id,
          name: data.name,
          subdomain: data.subdomain || undefined,
          domain: data.domain || undefined,
          companyName: data.company_name || undefined,
          logoUrl: data.logo_url || undefined,
          primaryColor: data.primary_color,
          status: data.status as Client['status'],
          plan: data.plan as Client['plan'],
          maxUsers: data.max_users,
          maxProjects: data.max_projects,
          maxStorageGb: data.max_storage_gb,
          trialEndsAt: data.trial_ends_at || undefined,
          billingEmail: data.billing_email || undefined,
          billingAddress: data.billing_address || undefined,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setClients(prev => [newClient, ...prev]);
        return newClient;
      }
      return null;
    } catch (err) {
      logError('Error creating client:', err);
      throw err;
    }
  }, []);

  const updateClient = useCallback(async (id: string, client: Partial<Client>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: client.name,
          subdomain: client.subdomain || null,
          domain: client.domain || null,
          company_name: client.companyName || null,
          logo_url: client.logoUrl || null,
          primary_color: client.primaryColor,
          status: client.status,
          plan: client.plan,
          max_users: client.maxUsers,
          max_projects: client.maxProjects,
          max_storage_gb: client.maxStorageGb,
          trial_ends_at: client.trialEndsAt || null,
          billing_email: client.billingEmail || null,
          billing_address: client.billingAddress || null,
        })
        .eq('id', id);

      if (error) throw error;

      await getClients();
    } catch (err) {
      logError('Error updating client:', err);
      throw err;
    }
  }, [getClients]);

  const deleteClient = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      logError('Error deleting client:', err);
      throw err;
    }
  }, []);

  const getClientUsers = useCallback(async (clientId: string): Promise<ClientUser[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await TableExistsCache.executeQuery(
        'user_clients',
        () => supabase
          .from('user_clients')
          .select(`
            *,
            users (id, name, email, avatar_url)
          `)
          .eq('client_id', clientId),
        []
      );

      if (error) throw error;

      if (data) {
        return data.map((uc: any) => ({
          id: uc.id,
          userId: uc.user_id,
          clientId: uc.client_id,
          role: uc.role as ClientUser['role'],
          isPrimary: uc.is_primary,
          joinedAt: uc.joined_at,
          userName: uc.users?.name,
          userEmail: uc.users?.email,
          userAvatar: uc.users?.avatar_url,
        }));
      }
      return [];
    } catch (err) {
      logError('Error fetching client users:', err);
      return [];
    }
  }, []);

  const addUserToClient = useCallback(async (
    clientId: string,
    userId: string,
    role: ClientUser['role'],
    isPrimary = false
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // If setting as primary, unset other primary clients for this user
      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        return; // Table n'existe pas, rien à faire
      }

      if (isPrimary) {
        const { error: unsetError } = await supabase
          .from('user_clients')
          .update({ is_primary: false })
          .eq('user_id', userId);
        
        if (unsetError && !TableExistsCache.handleTableError('user_clients', unsetError)) {
          throw unsetError;
        }
      }

      const { error } = await supabase
        .from('user_clients')
        .insert({
          user_id: userId,
          client_id: clientId,
          role,
          is_primary: isPrimary,
        });

      if (error) {
        if (TableExistsCache.handleTableError('user_clients', error)) {
          return; // Table n'existe pas, rien à faire
        }
        throw error;
      }

      TableExistsCache.setTableExists('user_clients');
    } catch (err) {
      logError('Error adding user to client:', err);
      throw err;
    }
  }, []);

  const removeUserFromClient = useCallback(async (clientId: string, userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        return; // Table n'existe pas, rien à faire
      }

      const { error } = await supabase
        .from('user_clients')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) {
        if (TableExistsCache.handleTableError('user_clients', error)) {
          return; // Table n'existe pas, rien à faire
        }
        throw error;
      }
    } catch (err) {
      logError('Error removing user from client:', err);
      throw err;
    }
  }, []);

  const updateUserRole = useCallback(async (
    clientId: string,
    userId: string,
    role: ClientUser['role']
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        return; // Table n'existe pas, rien à faire
      }

      const { error } = await supabase
        .from('user_clients')
        .update({ role })
        .eq('client_id', clientId)
        .eq('user_id', userId);

      if (error) {
        if (TableExistsCache.handleTableError('user_clients', error)) {
          return; // Table n'existe pas, rien à faire
        }
        throw error;
      }
    } catch (err) {
      logError('Error updating user role:', err);
      throw err;
    }
  }, []);

  const getCurrentClient = useCallback(async (): Promise<Client | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Vérifier si la table existe avant de faire la requête
      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        return null;
      }

      // Get primary client for user
      const { data, error } = await supabase
        .from('user_clients')
        .select('clients (*)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Pas de résultat, normal
        }
        if (TableExistsCache.handleTableError('user_clients', error)) {
          return null; // Table n'existe pas
        }
        return null; // Autre erreur, retourner null
      }

      if (!data) return null;

      TableExistsCache.setTableExists('user_clients');

      const c = (data as any).clients as SupabaseClient;
      return {
        id: c.id,
        name: c.name,
        subdomain: c.subdomain || undefined,
        domain: c.domain || undefined,
        companyName: c.company_name || undefined,
        logoUrl: c.logo_url || undefined,
        primaryColor: c.primary_color,
        status: c.status as Client['status'],
        plan: c.plan as Client['plan'],
        maxUsers: c.max_users,
        maxProjects: c.max_projects,
        maxStorageGb: c.max_storage_gb,
        trialEndsAt: c.trial_ends_at || undefined,
        billingEmail: c.billing_email || undefined,
        billingAddress: c.billing_address || undefined,
        createdBy: c.created_by || undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    } catch (err) {
      logError('Error fetching current client:', err);
      return null;
    }
  }, []);

  const switchClient = useCallback(async (clientId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (TableExistsCache.shouldSkipQuery('user_clients')) {
        return; // Table n'existe pas, rien à faire
      }

      // Unset all primary clients
      const { error: unsetError } = await supabase
        .from('user_clients')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      if (unsetError && !TableExistsCache.handleTableError('user_clients', unsetError)) {
        throw unsetError;
      }

      // Set new primary client
      const { error: setError } = await supabase
        .from('user_clients')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('client_id', clientId);

      if (setError && !TableExistsCache.handleTableError('user_clients', setError)) {
        throw setError;
      }

      if (!unsetError && !setError) {
        TableExistsCache.setTableExists('user_clients');
      }

      await getClients();
    } catch (err) {
      logError('Error switching client:', err);
      throw err;
    }
  }, [getClients]);

  return {
    clients,
    loading,
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getClientUsers,
    addUserToClient,
    removeUserFromClient,
    updateUserRole,
    getCurrentClient,
    switchClient,
  };
};

