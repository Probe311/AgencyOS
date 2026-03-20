/**
 * Service de logging et gestion des erreurs pour les workflows
 * Analyse détaillée des erreurs par type, fréquence, résolution
 */

import { supabase } from '../supabase';
import { ActionExecution } from '../supabase/hooks/useAutomatedActions';
import { detectWorkflowErrors, WorkflowError, ErrorType, ErrorSeverity } from './workflowErrorAlerts';

export interface ErrorLog {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  actionId: string;
  actionName: string;
  leadId: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  errorMessage: string;
  stackTrace?: string;
  context: Record<string, any>; // Contexte supplémentaire (données lead, configuration action, etc.)
  occurredAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionStatus: 'open' | 'resolved' | 'ignored';
  resolutionNotes?: string;
  occurrenceCount: number; // Nombre de fois que cette erreur s'est produite
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByWorkflow: Record<string, { count: number; workflowName: string }>;
  errorsByAction: Record<string, { count: number; actionName: string }>;
  errorFrequency: Array<{ date: string; count: number }>;
  averageResolutionTime?: number; // Temps moyen de résolution en heures
  unresolvedErrors: number;
}

/**
 * Enregistre une erreur dans le système de logging
 */
export async function logWorkflowError(
  execution: ActionExecution,
  errorDetails: {
    errorType: ErrorType;
    errorMessage: string;
    stackTrace?: string;
    context?: Record<string, any>;
  }
): Promise<ErrorLog> {
  try {
    // Récupérer les détails de l'action
    const { data: action } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', execution.automated_action_id)
      .single();

    // Calculer la sévérité
    const severity = classifyErrorSeverity(
      errorDetails.errorType,
      await getErrorOccurrenceCount(execution.automated_action_id, errorDetails.errorType)
    );

    // Créer le log d'erreur
    const errorLog: Omit<ErrorLog, 'id'> = {
      executionId: execution.id,
      workflowId: action?.workflow_id || execution.automated_action_id,
      workflowName: action?.name || 'Unknown',
      actionId: execution.automated_action_id,
      actionName: action?.name || 'Unknown',
      leadId: execution.lead_id || '',
      errorType: errorDetails.errorType,
      severity,
      errorMessage: errorDetails.errorMessage,
      stackTrace: errorDetails.stackTrace,
      context: {
        ...errorDetails.context,
        executionMetadata: execution.metadata,
        actionType: action?.action_type,
      },
      occurredAt: execution.executed_at || execution.created_at,
      resolutionStatus: 'open',
      occurrenceCount: 1,
    };

    // Enregistrer dans la table dédiée si elle existe
    const { data: savedLog, error } = await supabase
      .from('workflow_error_logs')
      .insert({
        execution_id: errorLog.executionId,
        workflow_id: errorLog.workflowId,
        workflow_name: errorLog.workflowName,
        action_id: errorLog.actionId,
        action_name: errorLog.actionName,
        lead_id: errorLog.leadId,
        error_type: errorLog.errorType,
        severity: errorLog.severity,
        error_message: errorLog.errorMessage,
        stack_trace: errorLog.stackTrace,
        context: errorLog.context,
        occurred_at: errorLog.occurredAt,
        resolution_status: errorLog.resolutionStatus,
        occurrence_count: errorLog.occurrenceCount,
      })
      .select()
      .single();

    if (error) {
      // Si la table n'existe pas, on peut utiliser action_executions avec un champ dédié
      console.warn('Table workflow_error_logs non disponible:', error);
      // Pour l'instant, on retourne le log en mémoire
      return {
        id: `error_log_${Date.now()}`,
        ...errorLog,
      };
    }

    return {
      id: savedLog.id,
      ...errorLog,
    };
  } catch (error) {
    console.error('Erreur enregistrement log erreur:', error);
    throw error;
  }
}

/**
 * Récupère le nombre d'occurrences d'une erreur pour calculer la sévérité
 */
async function getErrorOccurrenceCount(
  actionId: string,
  errorType: ErrorType
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('workflow_error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_id', actionId)
      .eq('error_type', errorType)
      .eq('resolution_status', 'open');

    if (error) {
      // Si la table n'existe pas, compter dans action_executions
      const { count: execCount } = await supabase
        .from('action_executions')
        .select('*', { count: 'exact', head: true })
        .eq('automated_action_id', actionId)
        .eq('execution_status', 'failed')
        .contains('metadata', { error_type: errorType });

      return execCount || 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Erreur comptage occurrences erreur:', error);
    return 0;
  }
}

/**
 * Classifie la sévérité d'une erreur
 */
function classifyErrorSeverity(type: ErrorType, occurrenceCount: number): ErrorSeverity {
  switch (type) {
    case 'api_error':
    case 'condition_error':
      return occurrenceCount > 5 ? 'critical' : occurrenceCount > 1 ? 'high' : 'medium';
    case 'validation_error':
    case 'data_error':
      return occurrenceCount > 10 ? 'high' : 'medium';
    case 'timeout':
      return 'high';
    case 'unknown':
    default:
      return 'low';
  }
}

/**
 * Récupère les logs d'erreurs avec filtres
 */
export async function getErrorLogs(filters: {
  workflowId?: string;
  actionId?: string;
  errorType?: ErrorType;
  severity?: ErrorSeverity;
  resolutionStatus?: 'open' | 'resolved' | 'ignored';
  period?: { start: Date; end: Date };
  limit?: number;
}): Promise<ErrorLog[]> {
  try {
    let query = supabase
      .from('workflow_error_logs')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (filters.workflowId) {
      query = query.eq('workflow_id', filters.workflowId);
    }

    if (filters.actionId) {
      query = query.eq('action_id', filters.actionId);
    }

    if (filters.errorType) {
      query = query.eq('error_type', filters.errorType);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.resolutionStatus) {
      query = query.eq('resolution_status', filters.resolutionStatus);
    }

    if (filters.period) {
      query = query
        .gte('occurred_at', filters.period.start.toISOString())
        .lte('occurred_at', filters.period.end.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Table workflow_error_logs non disponible:', error);
      // Fallback: récupérer depuis action_executions
      return await getErrorLogsFromExecutions(filters);
    }

    return (data || []).map(formatErrorLog);
  } catch (error) {
    console.error('Erreur récupération logs erreurs:', error);
    return [];
  }
}

/**
 * Récupère les logs d'erreurs depuis action_executions (fallback)
 */
async function getErrorLogsFromExecutions(filters: {
  workflowId?: string;
  actionId?: string;
  errorType?: ErrorType;
  severity?: ErrorSeverity;
  resolutionStatus?: 'open' | 'resolved' | 'ignored';
  period?: { start: Date; end: Date };
  limit?: number;
}): Promise<ErrorLog[]> {
  try {
    let query = supabase
      .from('action_executions')
      .select('*')
      .eq('execution_status', 'failed')
      .order('created_at', { ascending: false });

    if (filters.actionId) {
      query = query.eq('automated_action_id', filters.actionId);
    }

    if (filters.period) {
      query = query
        .gte('created_at', filters.period.start.toISOString())
        .lte('created_at', filters.period.end.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data: executions } = await query;

    // Convertir en ErrorLog
    const errors = await detectWorkflowErrors({
      start: filters.period?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: filters.period?.end || new Date(),
    });

    return errors.map((error, index) => ({
      id: error.id,
      executionId: error.executionId,
      workflowId: error.workflowId,
      workflowName: error.workflowName,
      actionId: error.actionId,
      actionName: error.actionName,
      leadId: error.leadId,
      errorType: error.errorType,
      severity: error.severity,
      errorMessage: error.errorMessage,
      context: {},
      occurredAt: error.timestamp,
      resolutionStatus: error.isResolved ? 'resolved' : 'open',
      resolvedAt: undefined,
      resolvedBy: undefined,
      occurrenceCount: 1,
    }));
  } catch (error) {
    console.error('Erreur récupération logs depuis executions:', error);
    return [];
  }
}

/**
 * Formate un log d'erreur depuis les données de la base
 */
function formatErrorLog(data: any): ErrorLog {
  return {
    id: data.id,
    executionId: data.execution_id,
    workflowId: data.workflow_id,
    workflowName: data.workflow_name,
    actionId: data.action_id,
    actionName: data.action_name,
    leadId: data.lead_id,
    errorType: data.error_type,
    severity: data.severity,
    errorMessage: data.error_message,
    stackTrace: data.stack_trace,
    context: data.context || {},
    occurredAt: data.occurred_at,
    resolvedAt: data.resolved_at,
    resolvedBy: data.resolved_by,
    resolutionStatus: data.resolution_status || 'open',
    resolutionNotes: data.resolution_notes,
    occurrenceCount: data.occurrence_count || 1,
  };
}

/**
 * Marque une erreur comme résolue
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  resolutionNotes?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('workflow_error_logs')
      .update({
        resolution_status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes,
      })
      .eq('id', errorId);

    if (error) {
      console.warn('Table workflow_error_logs non disponible:', error);
    }
  } catch (error) {
    console.error('Erreur résolution erreur:', error);
    throw error;
  }
}

/**
 * Ignore une erreur (ne sera pas comptée dans les statistiques critiques)
 */
export async function ignoreError(
  errorId: string,
  ignoredBy: string,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('workflow_error_logs')
      .update({
        resolution_status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: ignoredBy,
        resolution_notes: reason || 'Erreur ignorée',
      })
      .eq('id', errorId);

    if (error) {
      console.warn('Table workflow_error_logs non disponible:', error);
    }
  } catch (error) {
    console.error('Erreur ignore erreur:', error);
    throw error;
  }
}

/**
 * Calcule les statistiques d'erreurs
 */
export async function getErrorStatistics(
  period: { start: Date; end: Date }
): Promise<ErrorStatistics> {
  try {
    const errors = await getErrorLogs({ period, resolutionStatus: undefined });

    const stats: ErrorStatistics = {
      totalErrors: errors.length,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByWorkflow: {},
      errorsByAction: {},
      errorFrequency: [],
      unresolvedErrors: errors.filter(e => e.resolutionStatus === 'open').length,
    };

    // Calculer les erreurs par type
    for (const error of errors) {
      stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + error.occurrenceCount;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + error.occurrenceCount;

      // Par workflow
      if (!stats.errorsByWorkflow[error.workflowId]) {
        stats.errorsByWorkflow[error.workflowId] = { count: 0, workflowName: error.workflowName };
      }
      stats.errorsByWorkflow[error.workflowId].count += error.occurrenceCount;

      // Par action
      if (!stats.errorsByAction[error.actionId]) {
        stats.errorsByAction[error.actionId] = { count: 0, actionName: error.actionName };
      }
      stats.errorsByAction[error.actionId].count += error.occurrenceCount;
    }

    // Calculer la fréquence par jour
    const frequencyMap = new Map<string, number>();
    for (const error of errors) {
      const date = new Date(error.occurredAt).toISOString().split('T')[0];
      frequencyMap.set(date, (frequencyMap.get(date) || 0) + error.occurrenceCount);
    }

    stats.errorFrequency = Array.from(frequencyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculer le temps moyen de résolution
    const resolvedErrors = errors.filter(e => e.resolvedAt && e.occurredAt);
    if (resolvedErrors.length > 0) {
      const totalResolutionTime = resolvedErrors.reduce((sum, error) => {
        const resolutionTime = new Date(error.resolvedAt!).getTime() - new Date(error.occurredAt).getTime();
        return sum + resolutionTime;
      }, 0);

      stats.averageResolutionTime = totalResolutionTime / resolvedErrors.length / (1000 * 60 * 60); // En heures
    }

    return stats;
  } catch (error) {
    console.error('Erreur calcul statistiques erreurs:', error);
    return {
      totalErrors: 0,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByWorkflow: {},
      errorsByAction: {},
      errorFrequency: [],
      unresolvedErrors: 0,
    };
  }
}

/**
 * Analyse la fréquence des erreurs par type
 */
export async function getErrorFrequencyByType(
  period: { start: Date; end: Date }
): Promise<Record<ErrorType, Array<{ date: string; count: number }>>> {
  try {
    const errors = await getErrorLogs({ period });

    const frequencyByType: Record<string, Map<string, number>> = {};

    for (const error of errors) {
      if (!frequencyByType[error.errorType]) {
        frequencyByType[error.errorType] = new Map();
      }

      const date = new Date(error.occurredAt).toISOString().split('T')[0];
      const currentCount = frequencyByType[error.errorType].get(date) || 0;
      frequencyByType[error.errorType].set(date, currentCount + error.occurrenceCount);
    }

    const result: Record<ErrorType, Array<{ date: string; count: number }>> = {} as any;

    for (const [type, frequencyMap] of Object.entries(frequencyByType)) {
      result[type as ErrorType] = Array.from(frequencyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return result;
  } catch (error) {
    console.error('Erreur calcul fréquence erreurs:', error);
    return {} as Record<ErrorType, Array<{ date: string; count: number }>>;
  }
}

