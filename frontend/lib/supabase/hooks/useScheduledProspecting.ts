import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useUsers } from './useUsers';
import { logError, logWarn } from '../../utils/logger';

export interface ScheduledProspectingSearch {
  id: string;
  name: string;
  zone: string;
  activity: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  time_of_day: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  total_runs: number;
  total_leads_found: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectingHistory {
  id: string;
  scheduled_search_id?: string | null;
  zone: string;
  activity: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  leads_found: number;
  leads_added: number;
  sources_used: string[];
  error_message?: string | null;
  execution_time_seconds?: number | null;
  started_at: string;
  completed_at?: string | null;
  created_by?: string | null;
}

export function useScheduledProspecting() {
  const { users, currentUser } = useUsers();
  const user = currentUser || (users && users.length > 0 ? users[0] : null);
  const [scheduledSearches, setScheduledSearches] = useState<ScheduledProspectingSearch[]>([]);
  const [history, setHistory] = useState<ProspectingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les recherches planifiées
  useEffect(() => {
    if (!user) return;

    loadScheduledSearches();
    loadHistory();
  }, [user]);

  const loadScheduledSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_prospecting_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Vérifier si c'est une erreur de table manquante
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          logWarn('Table scheduled_prospecting_searches non trouvée. Veuillez exécuter le script SQL dans Supabase pour créer les tables de prospection.');
          setScheduledSearches([]);
          return;
        }
        throw error;
      }
      setScheduledSearches(data || []);
    } catch (error) {
      logError('Erreur chargement recherches planifiées:', error);
      setScheduledSearches([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('prospecting_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Vérifier si c'est une erreur de table manquante
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          logWarn('Table prospecting_history non trouvée. Veuillez exécuter le script SQL dans Supabase pour créer les tables de prospection.');
          setHistory([]);
          return;
        }
        throw error;
      }
      setHistory(data || []);
    } catch (error) {
      logError('Erreur chargement historique:', error);
      setHistory([]);
    }
  };

  const createScheduledSearch = async (search: Omit<ScheduledProspectingSearch, 'id' | 'created_at' | 'updated_at' | 'total_runs' | 'total_leads_found' | 'last_run_at' | 'next_run_at'>) => {
    if (!user) throw new Error('Utilisateur non connecté');

    // Calculer next_run_at
    const nextRun = calculateNextRun(search.frequency, search.day_of_week, search.day_of_month, search.time_of_day);

    const { data, error } = await supabase
      .from('scheduled_prospecting_searches')
      .insert({
        ...search,
        created_by: user.id,
        next_run_at: nextRun.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    await loadScheduledSearches();
    return data;
  };

  const updateScheduledSearch = async (id: string, updates: Partial<ScheduledProspectingSearch>) => {
    // Recalculer next_run_at si la fréquence change
    if (updates.frequency || updates.day_of_week !== undefined || updates.day_of_month !== undefined || updates.time_of_day) {
      const search = scheduledSearches.find(s => s.id === id);
      if (search) {
        const nextRun = calculateNextRun(
          updates.frequency || search.frequency,
          updates.day_of_week !== undefined ? updates.day_of_week : search.day_of_week,
          updates.day_of_month !== undefined ? updates.day_of_month : search.day_of_month,
          updates.time_of_day || search.time_of_day
        );
        updates.next_run_at = nextRun.toISOString();
      }
    }

    const { data, error } = await supabase
      .from('scheduled_prospecting_searches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await loadScheduledSearches();
    return data;
  };

  const deleteScheduledSearch = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_prospecting_searches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadScheduledSearches();
  };

  const createHistoryEntry = async (entry: Omit<ProspectingHistory, 'id' | 'started_at'>) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const { data, error } = await supabase
      .from('prospecting_history')
      .insert({
        ...entry,
        created_by: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Vérifier si c'est une erreur de table manquante
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          logWarn('Table prospecting_history non trouvée. Veuillez exécuter le script SQL dans Supabase pour créer les tables de prospection.');
        // Retourner null au lieu de lancer une erreur pour permettre au code de continuer
        return null;
      }
      throw error;
    }
    await loadHistory();
    return data;
  };

  const updateHistoryEntry = async (id: string, updates: Partial<ProspectingHistory>) => {
    const { data, error } = await supabase
      .from('prospecting_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await loadHistory();
    return data;
  };

  return {
    scheduledSearches,
    history,
    loading,
    createScheduledSearch,
    updateScheduledSearch,
    deleteScheduledSearch,
    createHistoryEntry,
    updateHistoryEntry,
    refresh: () => {
      loadScheduledSearches();
      loadHistory();
    },
  };
}

// Fonction pour calculer la prochaine exécution
function calculateNextRun(
  frequency: 'daily' | 'weekly' | 'monthly',
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  timeOfDay: string = '09:00:00'
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const nextRun = new Date(now);

  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextRun.getDay();
        let daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
        if (daysUntilNext === 0 && nextRun <= now) {
          daysUntilNext = 7;
        }
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
      } else {
        // Par défaut, même jour de la semaine prochaine
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;

    case 'monthly':
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextRun.setDate(dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      } else {
        // Par défaut, même jour du mois prochain
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}

