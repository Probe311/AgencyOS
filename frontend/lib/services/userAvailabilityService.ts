/**
 * Service de gestion de la disponibilité des utilisateurs
 * Statuts, congés, calendrier, vérification disponibilité
 */

import { supabase } from '../supabase';
import { logError, logInfo, logWarn } from '../utils/logger';

export type UserAvailabilityStatus = 'available' | 'busy' | 'on_vacation' | 'sick' | 'unavailable' | 'out_of_office';

export interface UserAvailability {
  id: string;
  userId: string;
  status: UserAvailabilityStatus;
  reason?: string; // Raison de l'indisponibilité
  startDate?: string; // Date de début (pour congés/indisponibilités)
  endDate?: string; // Date de fin (pour congés/indisponibilités)
  autoAssignBack?: boolean; // Réattribution automatique au retour
  createdAt: string;
  updatedAt: string;
}

export interface VacationPeriod {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal' | 'training' | 'other';
  reason?: string;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
}

/**
 * Vérifie si un utilisateur est disponible
 */
export async function isUserAvailable(
  userId: string,
  checkDate?: string, // Date à vérifier (par défaut: maintenant)
  checkCalendar?: boolean // Vérifier aussi les événements calendrier
): Promise<boolean> {
  try {
    const checkDateTime = checkDate ? new Date(checkDate) : new Date();

    // 1. Vérifier le statut de disponibilité dans user_availability
    const { data: availability, error: availError } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (availError && availError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, ce qui est OK
      logWarn(`Erreur vérification disponibilité pour ${userId}:`, availError);
    }

    if (availability) {
      // Vérifier si la période d'indisponibilité est active
      if (availability.start_date && availability.end_date) {
        const startDate = new Date(availability.start_date);
        const endDate = new Date(availability.end_date);
        
        if (checkDateTime >= startDate && checkDateTime <= endDate) {
          // Utilisateur dans une période d'indisponibilité
          if (['on_vacation', 'sick', 'unavailable', 'out_of_office'].includes(availability.status)) {
            logInfo(`Utilisateur ${userId} indisponible: ${availability.status} (${availability.start_date} - ${availability.end_date})`);
            return false;
          }
        } else if (checkDateTime > endDate) {
          // Période passée, vérifier si réattribution automatique
          if (availability.auto_assign_back) {
            // Désactiver la disponibilité et réactiver l'utilisateur
            await updateUserAvailability(userId, { status: 'available', isActive: false });
          }
        }
      } else {
        // Statut permanent (pas de dates)
        if (['on_vacation', 'sick', 'unavailable', 'out_of_office'].includes(availability.status)) {
          logInfo(`Utilisateur ${userId} indisponible: ${availability.status}`);
          return false;
        }
      }
    }

    // 2. Vérifier les congés dans vacation_periods
    if (checkCalendar !== false) {
      const { data: vacations, error: vacationError } = await supabase
        .from('vacation_periods')
        .select('*')
        .eq('user_id', userId)
        .eq('approved', true)
        .lte('start_date', checkDateTime.toISOString().split('T')[0])
        .gte('end_date', checkDateTime.toISOString().split('T')[0]);

      if (vacationError) {
        logWarn(`Erreur vérification congés pour ${userId}:`, vacationError);
      } else if (vacations && vacations.length > 0) {
        logInfo(`Utilisateur ${userId} en congés: ${vacations[0].type} (${vacations[0].start_date} - ${vacations[0].end_date})`);
        return false;
      }
    }

    // 3. Vérifier les événements calendrier (si checkCalendar activé)
    if (checkCalendar) {
      const { data: events, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .lte('start_time', checkDateTime.toISOString())
        .gte('end_time', checkDateTime.toISOString())
        .eq('type', 'unavailable'); // Type d'événement pour indisponibilité

      if (eventError) {
        logWarn(`Erreur vérification calendrier pour ${userId}:`, eventError);
      } else if (events && events.length > 0) {
        logInfo(`Utilisateur ${userId} indisponible selon calendrier`);
        return false;
      }
    }

    // Utilisateur disponible
    return true;
  } catch (error) {
    logError('Erreur vérification disponibilité utilisateur:', error);
    // En cas d'erreur, considérer comme disponible pour ne pas bloquer
    return true;
  }
}

/**
 * Met à jour le statut de disponibilité d'un utilisateur
 */
export async function updateUserAvailability(
  userId: string,
  availability: {
    status: UserAvailabilityStatus;
    reason?: string;
    startDate?: string;
    endDate?: string;
    autoAssignBack?: boolean;
    isActive?: boolean;
  }
): Promise<UserAvailability | null> {
  try {
    // Désactiver les autres disponibilités actives
    if (availability.isActive !== false) {
      await supabase
        .from('user_availability')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
    }

    // Créer ou mettre à jour la disponibilité
    const { data, error } = await supabase
      .from('user_availability')
      .upsert({
        user_id: userId,
        status: availability.status,
        reason: availability.reason,
        start_date: availability.startDate,
        end_date: availability.endDate,
        auto_assign_back: availability.autoAssignBack ?? false,
        is_active: availability.isActive !== false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logInfo(`Disponibilité mise à jour pour utilisateur ${userId}: ${availability.status}`);
    
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      reason: data.reason,
      startDate: data.start_date,
      endDate: data.end_date,
      autoAssignBack: data.auto_assign_back,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    logError('Erreur mise à jour disponibilité:', error);
    throw error;
  }
}

/**
 * Récupère la disponibilité actuelle d'un utilisateur
 */
export async function getUserAvailability(userId: string): Promise<UserAvailability | null> {
  try {
    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de disponibilité enregistrée, considérer comme disponible
        return null;
      }
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      reason: data.reason,
      startDate: data.start_date,
      endDate: data.end_date,
      autoAssignBack: data.auto_assign_back,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    logError('Erreur récupération disponibilité:', error);
    return null;
  }
}

/**
 * Crée une période de congés
 */
export async function createVacationPeriod(
  userId: string,
  vacation: {
    startDate: string;
    endDate: string;
    type: VacationPeriod['type'];
    reason?: string;
    approved?: boolean;
    approvedBy?: string;
  }
): Promise<VacationPeriod> {
  try {
    const { data, error } = await supabase
      .from('vacation_periods')
      .insert({
        user_id: userId,
        start_date: vacation.startDate,
        end_date: vacation.endDate,
        type: vacation.type,
        reason: vacation.reason,
        approved: vacation.approved ?? false,
        approved_by: vacation.approvedBy,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Mettre à jour automatiquement la disponibilité
    if (vacation.approved) {
      await updateUserAvailability(userId, {
        status: vacation.type === 'sick' ? 'sick' : 'on_vacation',
        reason: vacation.reason,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        autoAssignBack: true,
      });
    }

    logInfo(`Période de congés créée pour utilisateur ${userId}: ${vacation.startDate} - ${vacation.endDate}`);
    
    return {
      id: data.id,
      userId: data.user_id,
      startDate: data.start_date,
      endDate: data.end_date,
      type: data.type,
      reason: data.reason,
      approved: data.approved,
      approvedBy: data.approved_by,
      createdAt: data.created_at,
    };
  } catch (error) {
    logError('Erreur création période congés:', error);
    throw error;
  }
}

/**
 * Récupère les périodes de congés d'un utilisateur
 */
export async function getUserVacationPeriods(
  userId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    approved?: boolean;
    type?: VacationPeriod['type'];
  }
): Promise<VacationPeriod[]> {
  try {
    let query = supabase
      .from('vacation_periods')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    if (filters?.approved !== undefined) {
      query = query.eq('approved', filters.approved);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(v => ({
      id: v.id,
      userId: v.user_id,
      startDate: v.start_date,
      endDate: v.end_date,
      type: v.type,
      reason: v.reason,
      approved: v.approved,
      approvedBy: v.approved_by,
      createdAt: v.created_at,
    }));
  } catch (error) {
    logError('Erreur récupération congés:', error);
    return [];
  }
}

/**
 * Filtre une liste d'utilisateurs pour ne garder que ceux disponibles
 */
export async function filterAvailableUsers(
  userIds: string[],
  checkDate?: string,
  checkCalendar?: boolean
): Promise<string[]> {
  try {
    const availableUsers: string[] = [];

    for (const userId of userIds) {
      const isAvailable = await isUserAvailable(userId, checkDate, checkCalendar);
      if (isAvailable) {
        availableUsers.push(userId);
      }
    }

    return availableUsers;
  } catch (error) {
    logError('Erreur filtrage utilisateurs disponibles:', error);
    // En cas d'erreur, retourner tous les utilisateurs pour ne pas bloquer
    return userIds;
  }
}

/**
 * Vérifie si un utilisateur a besoin de réattribution automatique
 * (congé terminé avec autoAssignBack activé)
 */
export async function checkUsersNeedingReassignment(): Promise<Array<{
  userId: string;
  previousStatus: UserAvailabilityStatus;
  leadsToReassign: string[];
}>> {
  try {
    const now = new Date();
    const { data: availabilities, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('is_active', true)
      .eq('auto_assign_back', true)
      .in('status', ['on_vacation', 'sick', 'unavailable', 'out_of_office'])
      .lte('end_date', now.toISOString());

    if (error) {
      throw error;
    }

    const usersToReassign: Array<{
      userId: string;
      previousStatus: UserAvailabilityStatus;
      leadsToReassign: string[];
    }> = [];

    for (const avail of availabilities || []) {
      // Récupérer les leads assignés à cet utilisateur
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('assigned_to', avail.user_id)
        .not('lifecycle_stage', 'eq', 'Perdu')
        .not('lifecycle_stage', 'eq', 'Inactif');

      if (leads && leads.length > 0) {
        usersToReassign.push({
          userId: avail.user_id,
          previousStatus: avail.status,
          leadsToReassign: leads.map(l => l.id),
        });
      }
    }

    return usersToReassign;
  } catch (error) {
    logError('Erreur vérification réattribution automatique:', error);
    return [];
  }
}

