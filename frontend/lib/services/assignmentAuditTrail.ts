/**
 * Service de traçabilité spécifique pour les décisions d'affectation
 * Format audit spécialisé pour l'analyse des affectations de leads
 */

import { supabase } from '../supabase';
import { logAuditEvent } from './auditTrailService';

export interface AssignmentDecision {
  id: string;
  leadId: string;
  leadName: string;
  assignedFrom?: string; // User ID précédent (si réattribution)
  assignedTo: string; // User ID assigné
  assignedToName: string;
  decisionType: 'initial' | 'reassignment' | 'escalation' | 'transfer' | 'automatic';
  rulesApplied: string[]; // IDs ou noms des règles appliquées
  ruleDetails: Record<string, any>; // Détails de chaque règle
  reason: string; // Raison de l'affectation
  decisionTimestamp: string;
  triggeredBy?: string; // User ID ou 'system'
  workflowId?: string; // Si déclenché par un workflow
  isVIP?: boolean;
  scoring?: number;
  temperature?: string;
  metadata?: Record<string, any>;
}

/**
 * Enregistre une décision d'affectation dans l'audit trail
 */
export async function logAssignmentDecision(
  decision: Omit<AssignmentDecision, 'id' | 'assignedToName' | 'decisionTimestamp'>
): Promise<AssignmentDecision> {
  try {
    // Récupérer le nom de l'utilisateur assigné
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', decision.assignedTo)
      .single();

    const { data: lead } = await supabase
      .from('leads')
      .select('name')
      .eq('id', decision.leadId)
      .single();

    const fullDecision: AssignmentDecision = {
      ...decision,
      id: `assignment_${decision.leadId}_${Date.now()}`,
      assignedToName: user?.name || 'Unknown',
      leadName: lead?.name || decision.leadId,
      decisionTimestamp: new Date().toISOString(),
    };

    // Enregistrer dans l'audit trail général
    await logAuditEvent({
      userId: decision.triggeredBy || 'system',
      actionType: `lead_${decision.decisionType}`,
      resourceType: 'lead',
      resourceId: decision.leadId,
      action: `${decision.decisionType === 'initial' ? 'Affectation initiale' : 
                 decision.decisionType === 'reassignment' ? 'Réattribution' :
                 decision.decisionType === 'escalation' ? 'Escalade' :
                 decision.decisionType === 'transfer' ? 'Transfert' :
                 'Affectation automatique'} de ${fullDecision.leadName} à ${fullDecision.assignedToName}`,
      details: {
        decisionType: decision.decisionType,
        rulesApplied: decision.rulesApplied,
        ruleDetails: decision.ruleDetails,
        reason: decision.reason,
        isVIP: decision.isVIP,
        scoring: decision.scoring,
        temperature: decision.temperature,
        metadata: decision.metadata,
      },
      reason: decision.reason,
      metadata: {
        workflowId: decision.workflowId,
        assignmentDecision: fullDecision,
      },
    });

    // Enregistrer aussi dans une table dédiée si elle existe
    const { error } = await supabase
      .from('assignment_decisions')
      .insert({
        lead_id: decision.leadId,
        lead_name: fullDecision.leadName,
        assigned_from: decision.assignedFrom,
        assigned_to: decision.assignedTo,
        assigned_to_name: fullDecision.assignedToName,
        decision_type: decision.decisionType,
        rules_applied: decision.rulesApplied,
        rule_details: decision.ruleDetails,
        reason: decision.reason,
        decision_timestamp: fullDecision.decisionTimestamp,
        triggered_by: decision.triggeredBy || 'system',
        workflow_id: decision.workflowId,
        is_vip: decision.isVIP,
        scoring: decision.scoring,
        temperature: decision.temperature,
        metadata: decision.metadata,
      });

    if (error) {
      console.warn('Table assignment_decisions non disponible:', error);
    }

    return fullDecision;
  } catch (error) {
    console.error('Erreur enregistrement décision affectation:', error);
    throw error;
  }
}

/**
 * Récupère l'historique des décisions d'affectation pour un lead
 */
export async function getAssignmentHistoryForLead(leadId: string): Promise<AssignmentDecision[]> {
  try {
    const { data, error } = await supabase
      .from('assignment_decisions')
      .select('*')
      .eq('lead_id', leadId)
      .order('decision_timestamp', { ascending: false });

    if (error) {
      console.warn('Table assignment_decisions non disponible:', error);
      // Fallback: récupérer depuis audit_logs
      const auditLogs = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', 'lead')
        .eq('resource_id', leadId)
        .in('action_type', ['lead_initial', 'lead_reassignment', 'lead_escalation', 'lead_transfer', 'lead_automatic'])
        .order('timestamp', { ascending: false });

      if (auditLogs.error) {
        return [];
      }

      return (auditLogs.data || []).map(formatAssignmentFromAudit);
    }

    return (data || []).map(formatAssignmentDecision);
  } catch (error) {
    console.error('Erreur récupération historique affectation:', error);
    return [];
  }
}

/**
 * Récupère l'historique des décisions d'affectation pour un utilisateur
 */
export async function getAssignmentHistoryForUser(
  userId: string,
  period?: { start: Date; end: Date }
): Promise<AssignmentDecision[]> {
  try {
    let query = supabase
      .from('assignment_decisions')
      .select('*')
      .or(`assigned_to.eq.${userId},assigned_from.eq.${userId}`)
      .order('decision_timestamp', { ascending: false });

    if (period) {
      query = query
        .gte('decision_timestamp', period.start.toISOString())
        .lte('decision_timestamp', period.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Table assignment_decisions non disponible:', error);
      return [];
    }

    return (data || []).map(formatAssignmentDecision);
  } catch (error) {
    console.error('Erreur récupération historique affectation utilisateur:', error);
    return [];
  }
}

/**
 * Exporte l'historique des affectations pour analyse
 */
export async function exportAssignmentHistory(
  filters: {
    leadId?: string;
    userId?: string;
    decisionType?: string;
    period?: { start: Date; end: Date };
  }
): Promise<string> {
  try {
    let decisions: AssignmentDecision[] = [];

    if (filters.leadId) {
      decisions = await getAssignmentHistoryForLead(filters.leadId);
    } else if (filters.userId) {
      decisions = await getAssignmentHistoryForUser(filters.userId, filters.period);
    } else {
      // Récupérer toutes les décisions
      let query = supabase
        .from('assignment_decisions')
        .select('*')
        .order('decision_timestamp', { ascending: false });

      if (filters.decisionType) {
        query = query.eq('decision_type', filters.decisionType);
      }

      if (filters.period) {
        query = query
          .gte('decision_timestamp', filters.period.start.toISOString())
          .lte('decision_timestamp', filters.period.end.toISOString());
      }

      const { data } = await query;
      decisions = (data || []).map(formatAssignmentDecision);
    }

    // Générer le CSV
    const headers = [
      'Date',
      'Lead',
      'Assigné à',
      'Assigné depuis',
      'Type de décision',
      'Règles appliquées',
      'Raison',
      'VIP',
      'Scoring',
      'Température',
    ];

    const rows = decisions.map(decision => [
      new Date(decision.decisionTimestamp).toISOString(),
      decision.leadName,
      decision.assignedToName,
      decision.assignedFrom || '',
      decision.decisionType,
      decision.rulesApplied.join('; '),
      decision.reason,
      decision.isVIP ? 'Oui' : 'Non',
      decision.scoring?.toString() || '',
      decision.temperature || '',
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ];

    return csvLines.join('\n');
  } catch (error) {
    console.error('Erreur export historique affectation:', error);
    throw error;
  }
}

/**
 * Formate une décision d'affectation depuis les données de la base
 */
function formatAssignmentDecision(data: any): AssignmentDecision {
  return {
    id: data.id,
    leadId: data.lead_id,
    leadName: data.lead_name,
    assignedFrom: data.assigned_from,
    assignedTo: data.assigned_to,
    assignedToName: data.assigned_to_name,
    decisionType: data.decision_type,
    rulesApplied: data.rules_applied || [],
    ruleDetails: data.rule_details || {},
    reason: data.reason,
    decisionTimestamp: data.decision_timestamp,
    triggeredBy: data.triggered_by,
    workflowId: data.workflow_id,
    isVIP: data.is_vip,
    scoring: data.scoring,
    temperature: data.temperature,
    metadata: data.metadata || {},
  };
}

/**
 * Formate une décision depuis un log d'audit (fallback)
 */
function formatAssignmentFromAudit(auditLog: any): AssignmentDecision {
  const details = auditLog.details || {};
  const decision = details.assignmentDecision || {};

  return {
    id: auditLog.id,
    leadId: auditLog.resource_id,
    leadName: decision.leadName || auditLog.resource_id,
    assignedFrom: decision.assignedFrom,
    assignedTo: decision.assignedTo || '',
    assignedToName: decision.assignedToName || auditLog.user_name,
    decisionType: decision.decisionType || 'automatic',
    rulesApplied: decision.rulesApplied || [],
    ruleDetails: decision.ruleDetails || {},
    reason: auditLog.reason || '',
    decisionTimestamp: auditLog.timestamp,
    triggeredBy: auditLog.user_id,
    workflowId: details.workflowId,
    isVIP: decision.isVIP,
    scoring: decision.scoring,
    temperature: decision.temperature,
    metadata: decision.metadata || {},
  };
}

