import { useState, useEffect, useCallback } from 'react';
import { Lead } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError, logWarn } from '../../utils/logger';
import { mapSupabaseLeadToLead, mapLeadToSupabaseLead } from '../mappers';
import { SupabaseLead } from '../types';

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  deleteAllLeads: () => Promise<void>;
  refreshLeads: () => Promise<void>;
}

export const useLeads = (): UseLeadsReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedLeads = data.map((l: SupabaseLead) => mapSupabaseLeadToLead(l));
        setLeads(mappedLeads);
      } else {
        setLeads([]);
      }
    } catch (err) {
      logError('Error fetching leads:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();

    // Subscribe to real-time updates
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('leads-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads',
          },
          () => {
            fetchLeads();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchLeads]);

  const addLead = useCallback(async (lead: Omit<Lead, 'id'>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, lead not saved');
      return;
    }

    try {
      const supabaseLead = mapLeadToSupabaseLead(lead);
      const { data, error: insertError } = await supabase
        .from('leads')
        .insert([supabaseLead])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newLead = mapSupabaseLeadToLead(data);
        setLeads(prev => [newLead, ...prev]);
      }
    } catch (err) {
      logError('Error adding lead:', err);
      throw err;
    }
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, lead not updated');
      return;
    }

    try {
      const supabaseUpdates = mapLeadToSupabaseLead(updates);
      const { error: updateError } = await supabase
        .from('leads')
        .update(supabaseUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    } catch (err) {
      logError('Error updating lead:', err);
      throw err;
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, lead not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      logError('Error deleting lead:', err);
      throw err;
    }
  }, []);

  const deleteAllLeads = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      logWarn('Supabase not configured, leads not deleted');
      return;
    }

    try {
      // Récupérer tous les IDs des leads
      const { data: allLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id');

      if (fetchError) throw fetchError;

      if (allLeads && allLeads.length > 0) {
        const ids = allLeads.map(l => l.id);
        
        // Supprimer tous les leads par petits lots pour éviter les erreurs 400
        // Utiliser des lots plus petits (50) pour éviter les problèmes d'URL trop longue
        const batchSize = 50;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          
          // Utiliser une approche plus fiable : supprimer un par un si le lot échoue
          try {
            const { error: deleteError } = await supabase
              .from('leads')
              .delete()
              .in('id', batch);
            
            if (deleteError) {
              // Si la suppression par lot échoue, supprimer un par un
              logWarn(`Erreur suppression par lot, passage à la suppression individuelle:`, deleteError);
              for (const id of batch) {
                const { error: singleDeleteError } = await supabase
                  .from('leads')
                  .delete()
                  .eq('id', id);
                
                if (singleDeleteError) {
                  logError(`Erreur suppression lead ${id}:`, singleDeleteError);
                }
              }
            }
          } catch (err) {
            // En cas d'erreur, supprimer un par un
            logWarn(`Erreur lors de la suppression par lot, passage à la suppression individuelle:`, err);
            for (const id of batch) {
              try {
                const { error: singleDeleteError } = await supabase
                  .from('leads')
                  .delete()
                  .eq('id', id);
                
                if (singleDeleteError) {
                  logError(`Erreur suppression lead ${id}:`, singleDeleteError);
                }
              } catch (singleErr) {
                logError(`Erreur critique suppression lead ${id}:`, singleErr);
              }
            }
          }
        }
      }

      setLeads([]);
    } catch (err) {
      logError('Error deleting all leads:', err);
      throw err;
    }
  }, []);

  return {
    leads,
    loading,
    error,
    addLead,
    updateLead,
    deleteLead,
    deleteAllLeads,
    refreshLeads: fetchLeads,
  };
};

