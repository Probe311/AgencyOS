/**
 * Service pour les actions d'affectation automatisées
 * Permet d'attribuer, réattribuer, escalader et transférer des leads
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';
import { logError, logInfo, logWarn } from '../utils/logger';
import { logAssignmentDecision } from './assignmentAuditTrail';

export type AssignmentMethod = 'round_robin' | 'geographic' | 'skill_based' | 'workload' | 'performance' | 'custom';

export interface AssignLeadParams {
  leadId: string;
  assignmentMethod?: AssignmentMethod;
  userId?: string; // Attribution directe si fourni
  rules?: {
    roundRobin?: { userIds: string[]; weights?: Record<string, number>; excludeUnavailable?: boolean; resetPeriod?: 'daily' | 'weekly' };
    geographic?: { zones: Record<string, string[]>; fallbackUserId?: string; useDistance?: boolean; maxDistanceKm?: number };
    skillBased?: { skills?: Record<string, string[]>; sectors?: Record<string, string[]>; families?: Record<string, string[]> };
    workload?: { maxLeadsPerUser?: number; excludeOverloaded?: boolean; includeTasks?: boolean };
    performance?: { minConversionRate?: number; topPercentage?: number; period?: 'month' | 'quarter' | 'year'; useWeights?: boolean };
  };
  reason?: string;
  notifyUser?: boolean;
  respectExistingAssignment?: boolean; // Respecter l'assignation existante (défaut: true)
  allowReassignIfUnavailable?: boolean; // Réassigner si commercial indisponible (défaut: true)
  allowReassignIfOverloaded?: boolean; // Réassigner si commercial surchargé (défaut: false)
  checkVIPPriority?: boolean; // Vérifier si lead VIP pour affectation prioritaire (défaut: true)
}

export interface ReassignLeadParams {
  leadId: string;
  reason: string;
  originalUserId?: string;
  newUserId?: string;
  assignmentMethod?: AssignmentMethod;
  rules?: {
    roundRobin?: { userIds: string[]; weights?: Record<string, number> };
    geographic?: { zones: Record<string, string[]>; fallbackUserId?: string };
    skillBased?: { skills?: Record<string, string[]>; sectors?: Record<string, string[]>; families?: Record<string, string[]> };
    workload?: { maxLeadsPerUser?: number; excludeOverloaded?: boolean };
    performance?: { minConversionRate?: number; topPercentage?: number };
  };
  notifyBoth?: boolean;
}

export interface EscalateToManagerParams {
  leadId: string;
  reason: string;
  conditions?: {
    noResponseAfterRelances?: number;
    isVIP?: boolean;
    dealAmount?: number;
    dealAmountThreshold?: number;
  };
  managerId?: string;
  notifyManager?: boolean;
  createTask?: boolean;
}

export interface TransferToTeamParams {
  leadId: string;
  targetTeam: 'support' | 'success' | 'sales' | 'other';
  reason: string;
  teamMemberIds?: string[];
  notifyTeam?: boolean;
  createTask?: boolean;
}

/**
 * Attribue un lead à un commercial selon différentes méthodes
 */
export async function assignLeadAutomated(params: AssignLeadParams): Promise<string | null> {
  try {
    // Récupérer le lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;
    const lead = leadData as any as Lead;

    // Gestion exception 1: Lead déjà assigné (respecter l'assignation)
    const respectExisting = params.respectExistingAssignment !== false; // Défaut: true
    if (respectExisting && lead.assigned_to) {
      const currentUserId = lead.assigned_to;
      
      // Vérifier si le commercial actuel est indisponible ou surchargé
      const isUnavailable = !(await isUserAvailable(currentUserId));
      const isOverloaded = await checkUserOverload(currentUserId);
      
      // Si commercial indisponible ET réassignation autorisée
      if (isUnavailable && params.allowReassignIfUnavailable !== false) {
        logInfo(`Lead ${params.leadId} déjà assigné à ${currentUserId} (indisponible), réattribution autorisée`);
        // Continuer pour réassigner
      }
      // Si commercial surchargé ET réassignation autorisée
      else if (isOverloaded && params.allowReassignIfOverloaded) {
        logInfo(`Lead ${params.leadId} déjà assigné à ${currentUserId} (surchargé), réattribution autorisée`);
        // Continuer pour réassigner
      }
      // Sinon, respecter l'assignation existante
      else {
        logInfo(`Lead ${params.leadId} déjà assigné à ${currentUserId}, assignation respectée`);
        return currentUserId;
      }
    }

    // Gestion exception 2: Lead VIP (affectation prioritaire)
    const checkVIP = params.checkVIPPriority !== false; // Défaut: true
    if (checkVIP && isVIPLead(lead)) {
      logInfo(`Lead ${params.leadId} détecté comme VIP, affectation prioritaire`);
      // Utiliser les meilleurs commerciaux (top 20%) avec priorité
      const vipUserId = await assignVIPLead(lead, params);
      if (vipUserId) {
        await updateLeadAssignment(params.leadId, vipUserId, params, true);
        return vipUserId;
      }
    }

    // Si userId fourni directement, attribution directe
    if (params.userId) {
      // Vérifier disponibilité si fourni directement
      const isAvailable = await isUserAvailable(params.userId);
      if (!isAvailable && params.allowReassignIfUnavailable !== false) {
        logWarn(`Utilisateur ${params.userId} indisponible, recherche alternative...`);
        // Continuer avec les règles d'affectation
      } else {
        await updateLeadAssignment(params.leadId, params.userId, params, false);
        return params.userId;
      }
    }

    // Sinon, utiliser les règles d'affectation depuis la table lead_assignment_rules
    // Récupérer les règles actives triées par priorité
    const { data: rules, error: rulesError } = await supabase
      .from('lead_assignment_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) throw rulesError;

    // Évaluer les règles dans l'ordre de priorité
    let assignedUserId: string | null = null;
    let usedRule: any = null;

    for (const rule of rules || []) {
      // Si une méthode spécifique est demandée, ne traiter que cette règle
      if (params.assignmentMethod && rule.assignment_method !== params.assignmentMethod) {
        continue;
      }

      assignedUserId = await evaluateAssignmentRule(lead, rule, params.rules);
      if (assignedUserId) {
        usedRule = rule;
        break;
      }
    }

    // Si aucune règle n'a fonctionné et qu'on a des règles personnalisées, les utiliser
    if (!assignedUserId && params.rules) {
      assignedUserId = await evaluateCustomRules(lead, params.assignmentMethod, params.rules);
    }

    // Gestion exception 3 & 4: Vérifier disponibilité et surcharge du commercial assigné
    if (assignedUserId) {
      const isAvailable = await isUserAvailable(assignedUserId);
      const isOverloaded = await checkUserOverload(assignedUserId);
      
      // Si commercial indisponible, trouver un fallback
      if (!isAvailable && params.allowReassignIfUnavailable !== false) {
        logWarn(`Commercial ${assignedUserId} indisponible, recherche fallback...`);
        const fallbackUserId = await findFallbackUser(lead, assignedUserId, params, usedRule);
        if (fallbackUserId) {
          assignedUserId = fallbackUserId;
        }
      }
      
      // Si commercial surchargé et réassignation autorisée, trouver alternative
      if (isOverloaded && params.allowReassignIfOverloaded) {
        logWarn(`Commercial ${assignedUserId} surchargé, recherche alternative...`);
        const alternativeUserId = await findAlternativeUser(lead, assignedUserId, params, usedRule);
        if (alternativeUserId) {
          assignedUserId = alternativeUserId;
        }
      }
    }

    if (assignedUserId) {
      // Vérifier et traiter les réintégrations automatiques avant l'affectation
      try {
        const { processAutomaticReintegrations } = await import('./workloadReintegrationService');
        const maxLeads = params.rules?.workload?.maxLeadsPerUser || 20;
        await processAutomaticReintegrations(maxLeads).catch(err => {
          logWarn('Erreur traitement réintégrations automatiques:', err);
        });
      } catch (err) {
        // Ne pas bloquer l'affectation si la réintégration échoue
        logWarn('Erreur import service réintégration:', err);
      }

      const isReassignment = lead.assigned_to && lead.assigned_to !== assignedUserId;
      await updateLeadAssignment(params.leadId, assignedUserId, params, false, isReassignment, lead.assigned_to);
      return assignedUserId;
    }

    return null;
  } catch (error) {
    logError('Erreur attribution lead automatisée:', error);
    throw error;
  }
}

/**
 * Réattribue un lead si le commercial est indisponible
 */
export async function reassignLeadAutomated(params: ReassignLeadParams): Promise<string | null> {
  try {
    // Récupérer le lead actuel
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;
    const lead = leadData as any as Lead;
    
    const originalUserId = params.originalUserId || lead.assigned_to;

    // Vérifier si le commercial est indisponible
    if (originalUserId) {
      const isUnavailable = !(await isUserAvailable(originalUserId));
      const isOverloaded = await checkUserOverload(originalUserId);
      
      if (!isUnavailable && !isOverloaded) {
        logInfo(`Commercial ${originalUserId} disponible, réattribution non nécessaire`);
        // Peut-être retourner null ou continuer selon le contexte
      }
    }

    // Réattribuer
    let newUserId: string | null = null;

    if (params.newUserId) {
      // Vérifier disponibilité du nouveau commercial
      const isAvailable = await isUserAvailable(params.newUserId);
      if (!isAvailable) {
        logWarn(`Commercial ${params.newUserId} indisponible, recherche alternative...`);
        // Continuer avec les règles d'affectation
      } else {
        newUserId = params.newUserId;
      }
    }
    
    if (!newUserId && params.assignmentMethod) {
      // Utiliser les règles d'affectation avec exclusion de l'utilisateur original
      const assignParams: AssignLeadParams = {
        leadId: params.leadId,
        assignmentMethod: params.assignmentMethod,
        rules: params.rules,
        reason: params.reason,
        allowReassignIfUnavailable: true,
      };
      
      // Exclure l'utilisateur original des règles
      if (assignParams.rules?.roundRobin?.userIds && originalUserId) {
        assignParams.rules.roundRobin.userIds = assignParams.rules.roundRobin.userIds.filter(id => id !== originalUserId);
      }
      
      newUserId = await assignLeadAutomated(assignParams);
    }

    if (!newUserId) {
      logError('Impossible de réattribuer le lead: aucun commercial disponible');
      return null;
    }

    // Mettre à jour le lead avec réattribution
    const isReassignment = originalUserId && originalUserId !== newUserId;
    await updateLeadAssignment(params.leadId, newUserId, {
      leadId: params.leadId,
      reason: params.reason,
      notifyUser: params.notifyBoth,
    } as AssignLeadParams, false, isReassignment, originalUserId);

    // Notifications si demandées
    if (params.notifyBoth) {
      const { sendAssignmentNotifications } = await import('./assignmentNotificationService');
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.leadId)
        .single();
      
      if (leadData) {
        // Notifier le nouveau commercial
        await sendAssignmentNotifications({
          leadId: params.leadId,
          lead: leadData as Lead,
          userId: newUserId,
          previousUserId: params.currentUserId,
          notificationType: 'reassigned',
          reason: params.reason,
          inApp: true,
          email: false,
        });
        
        // Notifier l'ancien commercial
        if (params.currentUserId && params.currentUserId !== newUserId) {
          await sendAssignmentNotifications({
            leadId: params.leadId,
            lead: leadData as Lead,
            userId: params.currentUserId,
            previousUserId: params.currentUserId,
            notificationType: 'reassigned',
            reason: params.reason,
            inApp: true,
            email: false,
          });
        }
      }
      logInfo(`Notifications envoyées pour réattribution lead ${params.leadId}`);
    }
    return newUserId;
  } catch (error) {
    logError('Erreur réattribution lead automatisée:', error);
    throw error;
  }
}

/**
 * Escalade un lead vers un manager
 */
export async function escalateToManagerAutomated(params: EscalateToManagerParams): Promise<string | null> {
  try {
    // Récupérer le lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;

    const lead = leadData as any;

    // Vérifier les conditions d'escalade
    if (params.conditions) {
      // Vérifier VIP
      if (params.conditions.isVIP && !(lead.scoring >= 90 || lead.value > 50000)) {
        logInfo(`Lead ${params.leadId} ne répond pas aux critères VIP pour escalade`);
        return null;
      }

      // Vérifier montant deal
      if (params.conditions.dealAmountThreshold && lead.value < params.conditions.dealAmountThreshold) {
        logInfo(`Lead ${params.leadId} ne répond pas au seuil de montant pour escalade`);
        return null;
      }

      // Vérifier relances (à implémenter selon vos données)
      // TODO: Compter les relances depuis quote_follow_ups
    }

    // Trouver le manager
    let managerId = params.managerId;

    if (!managerId) {
      // Récupérer le manager du commercial assigné
      const assignedUserId = lead.assigned_to;
      if (assignedUserId) {
        // TODO: Récupérer le manager depuis une table de hiérarchie
        // Pour l'instant, chercher un utilisateur avec rôle Manager
        const { data: managers } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'Manager')
          .limit(1);

        managerId = managers?.[0]?.id || null;
      } else {
        // Chercher un manager directement
        const { data: managers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Admin'])
          .limit(1);

        managerId = managers?.[0]?.id || null;
      }
    }

    if (!managerId) {
      logError('Aucun manager trouvé pour escalade');
      return null;
    }

    // Assigner le lead au manager
    await supabase
      .from('leads')
      .update({ assigned_to: managerId })
      .eq('id', params.leadId);

    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: params.leadId,
        activity_type: 'escalated',
        subject: 'Lead escaladé vers manager',
        description: `Lead escaladé vers manager ${managerId}. Raison: ${params.reason}`,
        activity_date: new Date().toISOString(),
      });

    // Créer une tâche pour le manager si demandée
    if (params.createTask) {
      await supabase
        .from('tasks')
        .insert({
          title: `Lead escaladé: ${lead.name || lead.company || 'Sans nom'}`,
          description: `Lead escaladé automatiquement. Raison: ${params.reason}`,
          status: 'À faire',
          priority: 'Haute',
          assigned_to: managerId,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // J+1
        });
    }

    // Notification si demandée
    if (params.notifyManager) {
      const { notifyManagerEscalation } = await import('./assignmentNotificationService');
      const leadName = lead.name || lead.company || 'Lead inconnu';
      
      await notifyManagerEscalation(
        managerId,
        params.leadId,
        leadName,
        params.reason || 'Escalade automatique',
        lead.assigned_to
      );
      logInfo(`Notification envoyée au manager ${managerId} pour escalade lead ${params.leadId}`);
    }

    logInfo(`Lead ${params.leadId} escaladé vers manager ${managerId}`);
    return managerId;
  } catch (error) {
    logError('Erreur escalade lead automatisée:', error);
    throw error;
  }
}

/**
 * Transfère un lead vers une autre équipe
 */
export async function transferToTeamAutomated(params: TransferToTeamParams): Promise<boolean> {
  try {
    // Récupérer le lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (leadError) throw leadError;

    const lead = leadData as any;

    // Déterminer les membres de l'équipe cible
    let teamMemberIds = params.teamMemberIds;

    if (!teamMemberIds || teamMemberIds.length === 0) {
      // Récupérer les membres de l'équipe selon le type
      const { data: teamMembers } = await supabase
        .from('users')
        .select('id')
        .in('role', getRolesForTeam(params.targetTeam))
        .limit(5);

      teamMemberIds = teamMembers?.map(u => u.id) || [];
    }

    if (teamMemberIds.length === 0) {
      logError(`Aucun membre trouvé pour l'équipe ${params.targetTeam}`);
      return false;
    }

    // Attribuer au premier membre de l'équipe (ou utiliser round-robin)
    const assignedUserId = teamMemberIds[0];

    await supabase
      .from('leads')
      .update({ assigned_to: assignedUserId })
      .eq('id', params.leadId);

    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: params.leadId,
        activity_type: 'transferred',
        subject: `Lead transféré vers équipe ${params.targetTeam}`,
        description: `Lead transféré vers équipe ${params.targetTeam} (${assignedUserId}). Raison: ${params.reason}`,
        activity_date: new Date().toISOString(),
      });

    // Créer une tâche pour l'équipe si demandée
    if (params.createTask && teamMemberIds.length > 0) {
      await supabase
        .from('tasks')
        .insert({
          title: `Lead transféré: ${lead.name || lead.company || 'Sans nom'}`,
          description: `Lead transféré vers équipe ${params.targetTeam}. Raison: ${params.reason}`,
          status: 'À faire',
          priority: 'Moyenne',
          assigned_to: assignedUserId,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // J+3
        });
    }

    // Notification si demandée
    if (params.notifyTeam) {
      // TODO: Envoyer notification in-app à l'équipe
      logInfo(`Notification envoyée à l'équipe ${params.targetTeam} pour transfert lead ${params.leadId}`);
    }

    logInfo(`Lead ${params.leadId} transféré vers équipe ${params.targetTeam}`);
    return true;
  } catch (error) {
    logError('Erreur transfert lead automatisé:', error);
    throw error;
  }
}

/**
 * Retourne les rôles appropriés pour une équipe
 */
function getRolesForTeam(team: 'support' | 'success' | 'sales' | 'other'): string[] {
  switch (team) {
    case 'support':
      return ['Éditeur', 'Manager', 'Admin'];
    case 'success':
      return ['Manager', 'Admin'];
    case 'sales':
      return ['Éditeur', 'Manager', 'Admin'];
    default:
      return ['Éditeur', 'Manager', 'Admin'];
  }
}

/**
 * Vérifie si un utilisateur est disponible (pas en congé, pas surchargé)
 * Supporte vérification calendrier, statut, et charge de travail
 */
export async function isUserAvailable(userId: string, checkWorkload?: boolean, maxLeads?: number): Promise<boolean> {
  try {
    // Utiliser le service de disponibilité pour vérifier statut, congés, calendrier
    const { isUserAvailable: checkAvailability } = await import('./userAvailabilityService');
    const isAvailable = await checkAvailability(userId, undefined, true);
    
    if (!isAvailable) {
      return false;
    }
    
    // Vérifier la charge de travail si demandé
    if (checkWorkload && maxLeads) {
      const workload = await getUserWorkload(userId);
      if (workload >= maxLeads) return false;
    }
    
    return true;
  } catch (error) {
    logError('Erreur vérification disponibilité utilisateur:', error);
    // En cas d'erreur, considérer comme disponible pour ne pas bloquer
    return true;
  }
}

/**
 * Calcule la charge de travail d'un utilisateur (nombre de leads actifs)
 */
/**
 * Calcule la charge de travail d'un utilisateur (nombre de leads actifs)
 */
export async function getUserWorkload(userId: string, includeTasks: boolean = false): Promise<number> {
  try {
    // Compter les leads actifs assignés à l'utilisateur
    const { count: leadsCount, error: leadsError } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .not('lifecycle_stage', 'eq', 'Perdu')
      .not('lifecycle_stage', 'eq', 'Client');

    if (leadsError) throw leadsError;

    let workload = leadsCount || 0;

    // Optionnellement inclure les tâches en cours (avec poids 0.5)
    if (includeTasks) {
      const { count: tasksCount, error: tasksError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['À faire', 'En cours']);

      if (!tasksError && tasksCount) {
        workload += Math.floor((tasksCount || 0) * 0.5); // Poids 0.5 pour les tâches
      }
    }

    return workload;
  } catch (err) {
    logError(`Erreur calcul charge utilisateur ${userId}:`, err);
    return 0;
  }
}

/**
 * Évalue une règle d'affectation pour un lead
 * Supporte le routage conditionnel IF-THEN-ELSE
 */
async function evaluateAssignmentRule(
  lead: Lead,
  rule: { assignment_method: AssignmentMethod; rules: any },
  customRules?: AssignLeadParams['rules']
): Promise<string | null> {
  const method = rule.assignment_method;
  const rulesConfig = customRules || rule.rules;

  // Vérifier s'il y a des conditions (routage conditionnel IF-THEN-ELSE)
  if (rulesConfig && (rulesConfig as any).conditions) {
    try {
      const { evaluateConditionGroup } = await import('../utils/conditionEvaluator');
      const conditionResult = await evaluateConditionGroup(lead, (rulesConfig as any).conditions);
      
      // Si condition vraie, utiliser thenAction, sinon elseAction
      const action = conditionResult 
        ? (rulesConfig as any).thenAction 
        : (rulesConfig as any).elseAction;
      
      if (action) {
        // Si action est une méthode d'affectation, l'appliquer
        if (typeof action === 'string') {
          // Méthode simple : utiliser directement
          return await evaluateAssignmentRule(lead, {
            assignment_method: action as AssignmentMethod,
            rules: {},
          }, customRules);
        } else if (action.method) {
          // Action avec méthode et règles
          return await evaluateAssignmentRule(lead, {
            assignment_method: action.method as AssignmentMethod,
            rules: action.rules || {},
          }, customRules);
        }
      }
      
      // Si pas d'action définie mais condition vraie, continuer avec la méthode normale
      if (conditionResult) {
        // Continuer avec la méthode normale
      } else if (!(rulesConfig as any).elseAction) {
        // Si condition fausse et pas d'elseAction, retourner null
        return null;
      }
    } catch (error) {
      logError('Erreur évaluation conditions:', error);
      // En cas d'erreur, continuer avec la méthode normale
    }
  }

  switch (method) {
    case 'round_robin':
      return await roundRobinAssignment(rulesConfig?.roundRobin);
    
    case 'geographic':
      return await geographicAssignment(lead, rulesConfig?.geographic);
    
    case 'skill_based':
      return await skillBasedAssignment(lead, rulesConfig?.skillBased);
    
    case 'workload':
      return await workloadAssignment(rulesConfig?.workload);
    
    case 'performance':
      return await performanceAssignment(rulesConfig?.performance);
    
    case 'custom':
      // TODO: Implémenter logique personnalisée
      return null;
    
    default:
      return null;
  }
}

/**
 * Évalue des règles personnalisées (depuis params.rules)
 */
async function evaluateCustomRules(
  lead: Lead,
  method?: AssignmentMethod,
  rules?: AssignLeadParams['rules']
): Promise<string | null> {
  if (!method || !rules) return null;

  switch (method) {
    case 'round_robin':
      return await roundRobinAssignment(rules.roundRobin);
    case 'geographic':
      return await geographicAssignment(lead, rules.geographic);
    case 'skill_based':
      return await skillBasedAssignment(lead, rules.skillBased);
    case 'workload':
      return await workloadAssignment(rules.workload);
    case 'performance':
      return await performanceAssignment(rules.performance);
    default:
      return null;
  }
}

/**
 * Attribution round-robin
 */
async function roundRobinAssignment(
  rules?: { userIds?: string[]; weights?: Record<string, number>; excludeUnavailable?: boolean; resetPeriod?: 'daily' | 'weekly' }
): Promise<string | null> {
  let userIds = rules?.userIds || [];
  if (userIds.length === 0) return null;

  // Filtrer les utilisateurs indisponibles si demandé
  if (rules?.excludeUnavailable) {
    userIds = await filterAvailableUsers(userIds);
    if (userIds.length === 0) return null;
  }

  // Récupérer les assignments selon la période de réinitialisation
  const resetDate = getResetDate(rules?.resetPeriod || 'daily');
  
  const { data: lastAssignments } = await supabase
    .from('leads')
    .select('assigned_to')
    .in('assigned_to', userIds)
    .not('assigned_to', 'is', null)
    .gte('created_at', resetDate.toISOString())
    .order('created_at', { ascending: false });

  // Compter les assignments depuis la réinitialisation
  const assignmentCounts: Record<string, number> = {};
  userIds.forEach(id => assignmentCounts[id] = 0);
  
  lastAssignments?.forEach((l: any) => {
    if (l.assigned_to && userIds.includes(l.assigned_to)) {
      assignmentCounts[l.assigned_to] = (assignmentCounts[l.assigned_to] || 0) + 1;
    }
  });

  // Appliquer les poids si définis
  if (rules?.weights) {
    const weightedCounts: Record<string, number> = {};
    userIds.forEach(id => {
      const weight = rules.weights![id] || 1;
      weightedCounts[id] = (assignmentCounts[id] || 0) / weight;
    });
    
    // Sélectionner l'utilisateur avec le plus petit count pondéré
    const sorted = Object.entries(weightedCounts).sort(([, a], [, b]) => a - b);
    return sorted[0]?.[0] || null;
  }

  // Sélectionner l'utilisateur avec le moins d'assignments
  const sorted = Object.entries(assignmentCounts)
    .filter(([id]) => userIds.includes(id))
    .sort(([, a], [, b]) => a - b);
  
  return sorted[0]?.[0] || userIds[0] || null;
}

/**
 * Calcule la date de réinitialisation selon la période
 */
function getResetDate(period: 'daily' | 'weekly'): Date {
  const now = new Date();
  const resetDate = new Date(now);
  
  if (period === 'daily') {
    resetDate.setHours(0, 0, 0, 0); // Début de la journée
  } else if (period === 'weekly') {
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi
    resetDate.setDate(diff);
    resetDate.setHours(0, 0, 0, 0);
  }
  
  return resetDate;
}

/**
 * Attribution géographique
 * Supporte les zones par code postal, ville, région, et calcul de distance GPS
 */
async function geographicAssignment(
  lead: Lead,
  rules?: { zones?: Record<string, string[]>; fallbackUserId?: string; useDistance?: boolean; maxDistanceKm?: number }
): Promise<string | null> {
  const zones = rules?.zones || {};
  
  // Vérifier si le lead a des coordonnées GPS
  const leadLat = (lead as any).latitude;
  const leadLng = (lead as any).longitude;
  const hasCoordinates = leadLat && leadLng;
  
  // Vérifier par code postal, ville ou région
  const leadPostalCode = (lead as any).postal_code || '';
  const leadCity = (lead as any).city || '';
  const leadRegion = (lead as any).region || '';
  const leadAddress = lead.address || '';
  
  // Chercher une correspondance de zone
  for (const [zoneName, userIds] of Object.entries(zones)) {
    if (userIds.length === 0) continue;
    
    // Vérifier si la zone correspond au lead (par nom de zone ou critères)
    const zoneMatch = zoneName.toLowerCase();
    if (
      leadPostalCode.includes(zoneMatch) ||
      leadCity.toLowerCase().includes(zoneMatch) ||
      leadRegion.toLowerCase().includes(zoneMatch) ||
      leadAddress.toLowerCase().includes(zoneMatch)
    ) {
      // Si calcul de distance activé, vérifier la proximité
      if (rules?.useDistance && hasCoordinates && userIds.length > 1) {
        const { calculateDistance } = await import('../utils/routing');
        
        // Récupérer les coordonnées des utilisateurs
        const { data: users } = await supabase
          .from('users')
          .select('id, latitude, longitude')
          .in('id', userIds)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
        
        if (!users || users.length === 0) {
          // Aucun utilisateur avec coordonnées, utiliser le premier de la zone
          return userIds[0] || null;
        }
        
        // Calculer les distances
        const distances = users.map((user: any) => {
          const distance = calculateDistance(
            leadLat,
            leadLng,
            parseFloat(user.latitude),
            parseFloat(user.longitude)
          );
          return { userId: user.id, distance };
        });
        
        // Sélectionner le commercial le plus proche
        const closest = distances.sort((a, b) => a.distance - b.distance)[0];
        if (rules.maxDistanceKm && closest.distance > rules.maxDistanceKm) {
          continue; // Trop loin, passer à la zone suivante
        }
        return closest.userId;
      }
      
      // Sinon, retourner le premier utilisateur de la zone
      return userIds[0] || null;
    }
  }
  
  // Fallback si aucune zone ne correspond
  return rules?.fallbackUserId || null;
}

/**
 * Attribution basée sur les compétences
 * Match par famille, secteur, ou compétences spécifiques
 */
async function skillBasedAssignment(
  lead: Lead,
  rules?: { skills?: Record<string, string[]>; sectors?: Record<string, string[]>; families?: Record<string, string[]> }
): Promise<string | null> {
  const skills = rules?.skills || {};
  const sectors = rules?.sectors || {};
  const families = rules?.families || {};

  // Vérifier par famille (priorité 1)
  if (lead.family && families[lead.family]) {
    const userIds = families[lead.family];
    if (userIds.length > 0) {
      // Vérifier disponibilité des utilisateurs
      const availableUsers = await filterAvailableUsers(userIds);
      return availableUsers[0] || userIds[0] || null;
    }
  }

  // Vérifier par secteur (priorité 2)
  const leadSector = lead.sector || lead.industry || (lead as any).business_category;
  if (leadSector) {
    // Chercher un secteur qui correspond (partiel ou exact)
    for (const [sectorKey, userIds] of Object.entries(sectors)) {
      if (leadSector.toLowerCase().includes(sectorKey.toLowerCase()) || 
          sectorKey.toLowerCase().includes(leadSector.toLowerCase())) {
        if (userIds.length > 0) {
          const availableUsers = await filterAvailableUsers(userIds);
          return availableUsers[0] || userIds[0] || null;
        }
      }
    }
  }

  // Vérifier par compétences spécifiques (priorité 3)
  for (const [skillKey, userIds] of Object.entries(skills)) {
    // Rechercher dans la description ou les tags du lead
    const leadDescription = (lead.description || '').toLowerCase();
    const leadTags = ((lead as any).tags || []).join(' ').toLowerCase();
    if (leadDescription.includes(skillKey.toLowerCase()) || 
        leadTags.includes(skillKey.toLowerCase())) {
      if (userIds.length > 0) {
        const availableUsers = await filterAvailableUsers(userIds);
        return availableUsers[0] || userIds[0] || null;
      }
    }
  }

  return null;
}

/**
 * Attribution basée sur la charge de travail
 * Inclut les leads actifs et les tâches en cours pour un calcul précis
 */
async function workloadAssignment(
  rules?: { maxLeadsPerUser?: number; excludeOverloaded?: boolean; includeTasks?: boolean }
): Promise<string | null> {
  const maxLeads = rules?.maxLeadsPerUser || 20;

  // Récupérer tous les utilisateurs actifs (exclure indisponibles)
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .in('role', ['Manager', 'Éditeur', 'Admin']);

  if (!users || users.length === 0) return null;

  // Filtrer les utilisateurs indisponibles (utiliser le service de disponibilité)
  const { filterAvailableUsers: filterAvail } = await import('./userAvailabilityService');
  const availableUsers = await filterAvail(users.map(u => u.id));
  if (availableUsers.length === 0) return null;

  // Compter les leads actifs par utilisateur
  const { data: leadCounts } = await supabase
    .from('leads')
    .select('assigned_to')
    .in('assigned_to', availableUsers)
    .not('lifecycle_stage', 'eq', 'Perdu')
    .not('lifecycle_stage', 'eq', 'Inactif')
    .not('status', 'eq', 'Perdu');

  const counts: Record<string, number> = {};
  availableUsers.forEach(id => counts[id] = 0);
  leadCounts?.forEach((l: any) => {
    if (l.assigned_to && availableUsers.includes(l.assigned_to)) {
      counts[l.assigned_to] = (counts[l.assigned_to] || 0) + 1;
    }
  });

  // Ajouter les tâches en cours si demandé
  if (rules?.includeTasks) {
    const { data: taskCounts } = await supabase
      .from('tasks')
      .select('assigned_to')
      .in('assigned_to', availableUsers)
      .in('status', ['À faire', 'En cours']);

    taskCounts?.forEach((t: any) => {
      if (t.assigned_to && availableUsers.includes(t.assigned_to)) {
        counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 0.5; // Poids plus faible pour les tâches
      }
    });
  }

  // Filtrer les utilisateurs surchargés si nécessaire
  const eligibleUsers = rules?.excludeOverloaded
    ? availableUsers.filter(id => counts[id] < maxLeads)
    : availableUsers;

  if (eligibleUsers.length === 0) {
    // Si tous sont surchargés et exclusion activée, retourner celui avec le moins de charge
    if (rules?.excludeOverloaded) {
      const sorted = availableUsers
        .map(id => ({ id, count: counts[id] || 0 }))
        .sort((a, b) => a.count - b.count);
      return sorted[0]?.id || null;
    }
    return null;
  }

  // Sélectionner l'utilisateur avec le moins de charge
  const sorted = eligibleUsers
    .map(id => ({ id, count: counts[id] || 0 }))
    .sort((a, b) => a.count - b.count);

  return sorted[0]?.id || null;
}

/**
 * Attribution basée sur les performances
 * Supporte pondération et période de calcul
 */
async function performanceAssignment(
  rules?: { minConversionRate?: number; topPercentage?: number; period?: 'month' | 'quarter' | 'year'; useWeights?: boolean }
): Promise<string | null> {
  // Calculer les dates de début selon la période
  const period = rules?.period || 'year';
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0); // Toutes les périodes
  }
  
  const startDateISO = startDate.toISOString();
  
  // Récupérer les performances des commerciaux (si table existe)
  // Sinon, calculer depuis les leads convertis
  let performances: Array<{ user_id: string; conversion_rate: number; revenue?: number; deals?: number }> = [];
  
  try {
    const { data: perfData } = await supabase
      .from('sales_performance')
      .select('user_id, conversion_rate, revenue, deals_count, period, period_start')
      .gte('conversion_rate', rules?.minConversionRate || 0)
      .eq('period', period)
      .gte('period_start', startDateISO)
      .order('conversion_rate', { ascending: false });

    if (perfData && perfData.length > 0) {
      performances = perfData.map((p: any) => ({
        user_id: p.user_id,
        conversion_rate: p.conversion_rate || 0,
        revenue: p.revenue || 0,
        deals: p.deals_count || 0,
      }));
    }
  } catch (error) {
    // Table sales_performance n'existe peut-être pas, calculer depuis leads
    console.warn('Table sales_performance non disponible, calcul depuis leads:', error);
  }
  
  // Si pas de données depuis sales_performance, calculer depuis les leads convertis
  if (performances.length === 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .in('role', ['Manager', 'Éditeur', 'Admin']);

    if (!users || users.length === 0) return null;

    // Pour chaque utilisateur, calculer taux de conversion sur la période
    for (const user of users) {
      // Leads assignés sur la période
      let totalLeadsQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .not('lifecycle_stage', 'eq', 'Perdu');

      // Filtrer par période si spécifiée
      if (period !== 'year' || rules?.period) {
        totalLeadsQuery = totalLeadsQuery.gte('created_at', startDateISO);
      }

      const { count: totalLeads } = await totalLeadsQuery;

      // Leads convertis sur la période
      let convertedLeadsQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('lifecycle_stage', 'Client');

      if (period !== 'year' || rules?.period) {
        // Pour les leads convertis, vérifier la date de conversion (created_at ou updated_at quand lifecycle_stage est devenu Client)
        // Pour simplifier, on utilise created_at si lifecycle_stage = Client
        convertedLeadsQuery = convertedLeadsQuery.gte('created_at', startDateISO);
      }

      const { count: convertedLeads } = await convertedLeadsQuery;

      const total = totalLeads || 0;
      const converted = convertedLeads || 0;
      const conversionRate = total > 0 ? (converted / total) * 100 : 0;

      // Calculer le CA généré depuis les quotes acceptés/factures
      let revenue = 0;
      try {
        // Récupérer les quotes via les leads assignés à l'utilisateur
        const { data: userLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('assigned_to', user.id);
        
        if (userLeads && userLeads.length > 0) {
          const leadIds = userLeads.map(l => l.id);
          let quotesQuery = supabase
            .from('quotes')
            .select('amount_total, status, lead_id, updated_at')
            .in('lead_id', leadIds)
            .in('status', ['accepted', 'invoiced']);
          
          // Filtrer par période si spécifiée (utiliser updated_at pour date d'acceptation)
          if (period !== 'year' || rules?.period) {
            quotesQuery = quotesQuery.gte('updated_at', startDateISO);
          }
          
          const { data: quotes } = await quotesQuery;
          
          if (quotes) {
            revenue = quotes.reduce((sum: number, q: any) => sum + (parseFloat(q.amount_total || 0)), 0);
          }
        }
      } catch {
        // Table quotes peut ne pas exister
      }

      if (conversionRate >= (rules?.minConversionRate || 0)) {
        performances.push({
          user_id: user.id,
          conversion_rate: conversionRate,
          revenue,
          deals: converted,
        });
      }
    }

    performances.sort((a, b) => b.conversion_rate - a.conversion_rate);
  }

  if (performances.length === 0) return null;

  // Filtrer les top performers si nécessaire
  let topPerformers = performances;
  if (rules?.topPercentage) {
    const topCount = Math.max(1, Math.ceil(performances.length * (rules.topPercentage / 100)));
    topPerformers = performances.slice(0, topCount);
  }

  // Filtrer les utilisateurs disponibles
  const availablePerformers = await filterAvailableUsers(topPerformers.map(p => p.user_id));
  if (availablePerformers.length === 0) return null;

  const filteredPerformers = topPerformers.filter(p => availablePerformers.includes(p.user_id));
  if (filteredPerformers.length === 0) return null;

  // Appliquer pondération si demandé
  if (rules?.useWeights) {
    const maxRate = Math.max(...filteredPerformers.map(p => p.conversion_rate));
    const weighted = filteredPerformers.map(p => ({
      ...p,
      weight: p.conversion_rate / maxRate, // Poids proportionnel au taux de conversion
    }));

    // Sélection pondérée (probabilité proportionnelle au poids)
    const totalWeight = weighted.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const p of weighted) {
      random -= p.weight;
      if (random <= 0) return p.user_id;
    }
  }

  // Sinon, sélectionner aléatoirement parmi les top performers
  const randomIndex = Math.floor(Math.random() * filteredPerformers.length);
  return filteredPerformers[randomIndex]?.user_id || null;
}

/**
 * Filtre les utilisateurs disponibles (non indisponibles, non en congé, non surchargés)
 */
async function filterAvailableUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  // Utiliser le service de disponibilité pour filtrer
  try {
    const { filterAvailableUsers: filterAvail } = await import('./userAvailabilityService');
    return await filterAvail(userIds);
  } catch (error) {
    logWarn('Erreur filtrage utilisateurs disponibles, retour de tous les utilisateurs:', error);
    // En cas d'erreur, retourner tous les utilisateurs pour ne pas bloquer
    return userIds;
  }
}

/**
 * Vérifie si un lead est VIP (scoring >= 90, valeur > 50k€, tag "VIP")
 */
function isVIPLead(lead: Lead): boolean {
  const scoring = (lead as any)?.scoring || (lead as any)?.quality_score || 0;
  const estimatedValue = (lead as any)?.estimated_value || (lead as any)?.deal_amount || 0;
  const tags = (lead as any)?.tags || [];
  const hasVIPTag = tags.some((tag: string) => tag.toLowerCase() === 'vip');
  
  return scoring >= 90 || estimatedValue > 50000 || hasVIPTag;
}

/**
 * Attribue un lead VIP aux meilleurs commerciaux avec priorité
 */
async function assignVIPLead(lead: Lead, params: AssignLeadParams): Promise<string | null> {
  // Utiliser performance avec top 20%
  const vipRules = {
    performance: {
      minConversionRate: 50,
      topPercentage: 20,
      useWeights: true,
    },
  };
  
  return await performanceAssignment(vipRules.performance);
}


/**
 * Vérifie si un utilisateur est surchargé
 */
async function checkUserOverload(userId: string, maxLeads?: number): Promise<boolean> {
  const workload = await getUserWorkload(userId);
  const threshold = maxLeads || 20;
  return workload >= threshold;
}

/**
 * Trouve un utilisateur de fallback si le commercial assigné est indisponible
 */
async function findFallbackUser(
  lead: Lead,
  unavailableUserId: string,
  params: AssignLeadParams,
  usedRule?: any
): Promise<string | null> {
  // Essayer de trouver un autre utilisateur avec les mêmes règles
  if (usedRule) {
    // Exclure l'utilisateur indisponible des règles
    const modifiedRules = { ...params.rules };
    if (modifiedRules.roundRobin?.userIds) {
      modifiedRules.roundRobin.userIds = modifiedRules.roundRobin.userIds.filter(id => id !== unavailableUserId);
    }
    
    const fallbackUserId = await evaluateAssignmentRule(lead, usedRule, modifiedRules);
    if (fallbackUserId) return fallbackUserId;
  }
  
  // Sinon, utiliser workload pour trouver quelqu'un de disponible
  return await workloadAssignment({
    maxLeadsPerUser: 20,
    excludeOverloaded: true,
  });
}

/**
 * Trouve un utilisateur alternatif si le commercial est surchargé
 */
async function findAlternativeUser(
  lead: Lead,
  overloadedUserId: string,
  params: AssignLeadParams,
  usedRule?: any
): Promise<string | null> {
  // Utiliser workload pour trouver quelqu'un de moins chargé
  return await workloadAssignment({
    maxLeadsPerUser: 20,
    excludeOverloaded: true,
  });
}

/**
 * Met à jour l'assignation du lead et enregistre dans l'historique
 */
/**
 * Met à jour l'assignation d'un lead et enregistre dans l'audit trail
 */
async function updateLeadAssignment(
  leadId: string,
  userId: string,
  params: AssignLeadParams,
  isVIP: boolean,
  isReassignment: boolean = false,
  previousUserId?: string
): Promise<void> {
  // Mettre à jour le lead
  await supabase
    .from('leads')
    .update({ assigned_to: userId })
    .eq('id', leadId);

  // Récupérer les informations du lead pour l'audit trail
  const { data: leadData } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  const lead = leadData as any;

  // Déterminer le type de décision
  const decisionType = isReassignment
    ? 'reassignment'
    : params.assignmentMethod === 'performance' || params.assignmentMethod === 'skill_based'
    ? 'automatic'
    : 'initial';

  // Récupérer les règles appliquées
  const rulesApplied: string[] = [];
  const ruleDetails: Record<string, any> = {};

  if (params.assignmentMethod) {
    rulesApplied.push(params.assignmentMethod);
    if (params.rules) {
      ruleDetails[params.assignmentMethod] = params.rules[params.assignmentMethod];
    }
  }

  // Enregistrer dans l'audit trail des affectations
  try {
    await logAssignmentDecision({
      leadId,
      assignedFrom: previousUserId,
      assignedTo: userId,
      decisionType: decisionType as 'initial' | 'reassignment' | 'escalation' | 'transfer' | 'automatic',
      rulesApplied,
      ruleDetails,
      reason: params.reason || (isReassignment ? 'Réattribution automatique' : 'Affectation automatique'),
      triggeredBy: 'system', // TODO: Récupérer l'utilisateur actuel si action manuelle
      isVIP,
      scoring: lead?.scoring || lead?.quality_score,
      temperature: lead?.temperature,
      metadata: {
        assignmentMethod: params.assignmentMethod,
        previousAssignedTo: previousUserId,
      },
    });
  } catch (error) {
    // Ne pas bloquer l'assignation si l'audit trail échoue
    logWarn('Erreur enregistrement audit trail affectation:', error);
  }

  // Enregistrer dans l'historique (sales_activities)
  const activityType = isReassignment ? 'reassigned' : 'assigned';
  const description = isReassignment
    ? `Lead réattribué de ${previousUserId || 'N/A'} à ${userId}${params.reason ? `: ${params.reason}` : ''}`
    : `Lead attribué${isVIP ? ' (VIP - prioritaire)' : ''}${params.reason ? `: ${params.reason}` : ''}`;

  await supabase
    .from('sales_activities')
    .insert({
      lead_id: leadId,
      activity_type: activityType,
      subject: isReassignment ? 'Lead réattribué' : 'Lead attribué',
      description,
      activity_date: new Date().toISOString(),
      metadata: {
        assigned_to: userId,
        previous_assigned_to: previousUserId,
        is_vip: isVIP,
        assignment_method: params.assignmentMethod,
        reason: params.reason,
      },
    });

  // Notification si demandée
  if (params.notifyUser) {
    const { sendAssignmentNotifications } = await import('./assignmentNotificationService');
    
    // Récupérer le lead si non fourni
    let lead: Lead | undefined;
    if (!lead) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      if (leadData) lead = leadData as Lead;
    }
    
    const notificationType = isVIP ? 'vip_assigned' : isReassignment ? 'reassigned' : 'assigned';
    
    await sendAssignmentNotifications({
      leadId,
      lead,
      userId,
      previousUserId: isReassignment ? currentUserId : undefined,
      notificationType,
      reason: params.reason,
      inApp: true,
      email: isVIP, // Email pour VIP
      sms: isVIP, // SMS pour VIP
      priority: isVIP ? 'urgent' : 'medium',
    });
  }

  logInfo(`Lead ${leadId} ${isReassignment ? 'réattribué' : 'attribué'} à ${userId}${isVIP ? ' (VIP)' : ''}`);
}

