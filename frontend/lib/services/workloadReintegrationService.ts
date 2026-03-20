/**
 * Service de réintégration automatique des commerciaux surchargés
 * Détecte lorsque la charge d'un commercial diminue et le réintègre automatiquement
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';
// Import dynamique pour éviter les dépendances circulaires
async function getUserWorkload(userId: string, includeTasks: boolean = false): Promise<number> {
  const { getUserWorkload: getWorkload } = await import('./assignmentActions');
  return getWorkload(userId, includeTasks);
}

export interface UserWorkloadStatus {
  userId: string;
  currentWorkload: number;
  maxLeads: number;
  isOverloaded: boolean;
  wasOverloaded: boolean;
}

/**
 * Vérifie tous les utilisateurs surchargés et détecte ceux dont la charge a diminué
 */
export async function checkUsersForReintegration(
  maxLeadsPerUser: number = 20
): Promise<UserWorkloadStatus[]> {
  try {
    // Récupérer tous les utilisateurs actifs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('role', ['Admin', 'Manager', 'Éditeur']); // Rôles commerciaux

    if (usersError) throw usersError;
    if (!users || users.length === 0) return [];

    const workloadStatuses: UserWorkloadStatus[] = [];

    for (const user of users) {
      try {
        // Calculer la charge actuelle
        const currentWorkload = await getUserWorkload(user.id);
        const isOverloaded = currentWorkload >= maxLeadsPerUser;

        // Vérifier si l'utilisateur était marqué comme surchargé précédemment
        // On peut utiliser une table de tracking ou simplement vérifier la charge actuelle
        // Pour simplifier, on considère qu'un utilisateur peut être réintégré si sa charge < 80% du seuil
        const reintegrationThreshold = maxLeadsPerUser * 0.8;
        const wasOverloaded = currentWorkload >= reintegrationThreshold * 1.2; // Était surchargé si > 120% du seuil de réintégration

        if (!isOverloaded && wasOverloaded) {
          workloadStatuses.push({
            userId: user.id,
            currentWorkload,
            maxLeads: maxLeadsPerUser,
            isOverloaded: false,
            wasOverloaded: true,
          });
        }
      } catch (err) {
        logWarn(`Erreur calcul charge pour utilisateur ${user.id}:`, err);
      }
    }

    return workloadStatuses;
  } catch (err) {
    logError('Erreur vérification réintégration utilisateurs:', err);
    return [];
  }
}

/**
 * Réintègre un utilisateur dans le pool d'affectation automatique
 * Enregistre l'événement de réintégration pour traçabilité
 */
export async function reintegrateUser(userId: string, currentWorkload: number, maxLeads: number): Promise<void> {
  try {
    // Enregistrer la réintégration dans les logs/audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action_type: 'user_reintegrated',
        resource_type: 'user',
        resource_id: userId,
        details: {
          currentWorkload,
          maxLeads,
          reintegrationThreshold: maxLeads * 0.8,
          timestamp: new Date().toISOString(),
        },
        reason: `Utilisateur réintégré : charge ${currentWorkload}/${maxLeads} (en dessous du seuil de surcharge)`,
      });

    logInfo(`Utilisateur ${userId} réintégré dans le pool d'affectation (charge: ${currentWorkload}/${maxLeads})`);
  } catch (err) {
    logError(`Erreur réintégration utilisateur ${userId}:`, err);
    throw err;
  }
}

/**
 * Vérifie et réintègre automatiquement les utilisateurs éligibles
 * À appeler périodiquement (par exemple toutes les heures ou après chaque affectation)
 */
export async function processAutomaticReintegrations(
  maxLeadsPerUser: number = 20
): Promise<number> {
  try {
    const usersToReintegrate = await checkUsersForReintegration(maxLeadsPerUser);
    let reintegratedCount = 0;

    for (const status of usersToReintegrate) {
      try {
        await reintegrateUser(
          status.userId,
          status.currentWorkload,
          status.maxLeads
        );
        reintegratedCount++;
      } catch (err) {
        logWarn(`Échec réintégration utilisateur ${status.userId}:`, err);
      }
    }

    if (reintegratedCount > 0) {
      logInfo(`${reintegratedCount} utilisateur(s) réintégré(s) automatiquement`);
    }

    return reintegratedCount;
  } catch (err) {
    logError('Erreur traitement réintégrations automatiques:', err);
    return 0;
  }
}

/**
 * Vérifie si un utilisateur peut être réintégré (charge < seuil)
 */
export async function canUserBeReintegrated(
  userId: string,
  maxLeadsPerUser: number = 20
): Promise<boolean> {
  try {
    const currentWorkload = await getUserWorkload(userId);
    const reintegrationThreshold = maxLeadsPerUser * 0.8; // 80% du seuil max
    
    return currentWorkload < reintegrationThreshold;
  } catch (err) {
    logError(`Erreur vérification réintégration utilisateur ${userId}:`, err);
    return false;
  }
}

/**
 * Vérifie si un utilisateur est actuellement surchargé
 */
export async function isUserCurrentlyOverloaded(
  userId: string,
  maxLeadsPerUser: number = 20
): Promise<boolean> {
  try {
    const currentWorkload = await getUserWorkload(userId);
    return currentWorkload >= maxLeadsPerUser;
  } catch (err) {
    logError(`Erreur vérification surcharge utilisateur ${userId}:`, err);
    return false;
  }
}

