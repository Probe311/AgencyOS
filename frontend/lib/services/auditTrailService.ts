/**
 * Service d'audit trail pour conformité
 * Enregistre toutes les actions importantes avec qui, quoi, quand, pourquoi
 * Génère des exports pour audit externe
 */

import { supabase } from '../supabase';

export interface AuditLog {
  id: string;
  userId: string; // Qui a effectué l'action
  userName: string;
  actionType: string; // Type d'action (workflow_created, lead_assigned, etc.)
  resourceType: string; // Type de ressource (workflow, lead, campaign, etc.)
  resourceId: string; // ID de la ressource
  action: string; // Description de l'action
  details: Record<string, any>; // Détails de l'action
  reason?: string; // Raison de l'action (pourquoi)
  ipAddress?: string; // Adresse IP (si disponible)
  userAgent?: string; // User agent (si disponible)
  timestamp: string; // Quand
  metadata?: Record<string, any>; // Métadonnées supplémentaires
}

export interface AuditTrailFilters {
  userId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  period?: { start: Date; end: Date };
  limit?: number;
}

export interface AuditExport {
  period: { start: Date; end: Date };
  totalRecords: number;
  records: AuditLog[];
  summary: {
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    actionsByResource: Record<string, number>;
  };
  exportedAt: string;
  exportedBy: string;
}

/**
 * Enregistre une action dans l'audit trail
 */
export async function logAuditEvent(
  event: Omit<AuditLog, 'id' | 'timestamp' | 'userName'>
): Promise<AuditLog> {
  try {
    // Récupérer le nom de l'utilisateur
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', event.userId)
      .single();

    const auditLog: Omit<AuditLog, 'id'> = {
      ...event,
      userName: user?.name || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    // Enregistrer dans la table d'audit
    const { data: savedLog, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: auditLog.userId,
        user_name: auditLog.userName,
        action_type: auditLog.actionType,
        resource_type: auditLog.resourceType,
        resource_id: auditLog.resourceId,
        action: auditLog.action,
        details: auditLog.details,
        reason: auditLog.reason,
        ip_address: auditLog.ipAddress,
        user_agent: auditLog.userAgent,
        timestamp: auditLog.timestamp,
        metadata: auditLog.metadata,
      })
      .select()
      .single();

    if (error) {
      // Si la table n'existe pas, on peut utiliser une table alternative ou logger
      console.warn('Table audit_logs non disponible:', error);
      // Retourner le log en mémoire
      return {
        id: `audit_${Date.now()}`,
        ...auditLog,
      };
    }

    return {
      id: savedLog.id,
      ...auditLog,
    };
  } catch (error) {
    console.error('Erreur enregistrement audit trail:', error);
    throw error;
  }
}

/**
 * Récupère les logs d'audit avec filtres
 */
export async function getAuditLogs(filters: AuditTrailFilters): Promise<AuditLog[]> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }

    if (filters.period) {
      query = query
        .gte('timestamp', filters.period.start.toISOString())
        .lte('timestamp', filters.period.end.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Table audit_logs non disponible:', error);
      return [];
    }

    return (data || []).map(formatAuditLog);
  } catch (error) {
    console.error('Erreur récupération audit logs:', error);
    return [];
  }
}

/**
 * Formate un log d'audit depuis les données de la base
 */
function formatAuditLog(data: any): AuditLog {
  return {
    id: data.id,
    userId: data.user_id,
    userName: data.user_name,
    actionType: data.action_type,
    resourceType: data.resource_type,
    resourceId: data.resource_id,
    action: data.action,
    details: data.details || {},
    reason: data.reason,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    timestamp: data.timestamp,
    metadata: data.metadata || {},
  };
}

/**
 * Exporte l'audit trail pour un audit externe
 */
export async function exportAuditTrail(
  filters: AuditTrailFilters,
  exportedBy: string
): Promise<AuditExport> {
  try {
    const logs = await getAuditLogs(filters);

    // Calculer le résumé
    const summary = {
      actionsByType: {} as Record<string, number>,
      actionsByUser: {} as Record<string, number>,
      actionsByResource: {} as Record<string, number>,
    };

    for (const log of logs) {
      summary.actionsByType[log.actionType] = (summary.actionsByType[log.actionType] || 0) + 1;
      summary.actionsByUser[log.userName] = (summary.actionsByUser[log.userName] || 0) + 1;
      const resourceKey = `${log.resourceType}:${log.resourceId}`;
      summary.actionsByResource[resourceKey] = (summary.actionsByResource[resourceKey] || 0) + 1;
    }

    return {
      period: filters.period || {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      totalRecords: logs.length,
      records: logs,
      summary,
      exportedAt: new Date().toISOString(),
      exportedBy,
    };
  } catch (error) {
    console.error('Erreur export audit trail:', error);
    throw error;
  }
}

/**
 * Exporte l'audit trail au format CSV
 */
export async function exportAuditTrailCSV(
  filters: AuditTrailFilters,
  exportedBy: string
): Promise<string> {
  try {
    const exportData = await exportAuditTrail(filters, exportedBy);

    // En-têtes CSV
    const headers = [
      'Date',
      'Utilisateur',
      'Type d\'action',
      'Type de ressource',
      'ID ressource',
      'Action',
      'Raison',
      'IP',
      'Détails',
    ];

    // Lignes de données
    const rows = exportData.records.map(log => [
      new Date(log.timestamp).toISOString(),
      log.userName,
      log.actionType,
      log.resourceType,
      log.resourceId,
      log.action,
      log.reason || '',
      log.ipAddress || '',
      JSON.stringify(log.details),
    ]);

    // Générer le CSV
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ];

    // Ajouter le résumé
    csvLines.push('');
    csvLines.push('=== RÉSUMÉ ===');
    csvLines.push(`Total d'enregistrements: ${exportData.totalRecords}`);
    csvLines.push(`Période: ${exportData.period.start.toISOString()} - ${exportData.period.end.toISOString()}`);
    csvLines.push(`Exporté le: ${exportData.exportedAt}`);
    csvLines.push(`Exporté par: ${exportData.exportedBy}`);

    return csvLines.join('\n');
  } catch (error) {
    console.error('Erreur export CSV audit trail:', error);
    throw error;
  }
}

/**
 * Exporte l'audit trail au format JSON (pour audit externe)
 */
export async function exportAuditTrailJSON(
  filters: AuditTrailFilters,
  exportedBy: string
): Promise<string> {
  try {
    const exportData = await exportAuditTrail(filters, exportedBy);
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Erreur export JSON audit trail:', error);
    throw error;
  }
}

/**
 * Récupère les logs d'audit pour une ressource spécifique
 */
export async function getAuditTrailForResource(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  return getAuditLogs({
    resourceType,
    resourceId,
  });
}

/**
 * Récupère les logs d'audit pour un utilisateur spécifique
 */
export async function getAuditTrailForUser(
  userId: string,
  period?: { start: Date; end: Date }
): Promise<AuditLog[]> {
  return getAuditLogs({
    userId,
    period,
  });
}

