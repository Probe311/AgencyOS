import { supabase } from '../supabase';
import { AutomationNotificationsService } from './automationNotificationsService';

export interface WorkflowAlert {
  id: string;
  workflow_id: string;
  alert_type: 'execution_rate' | 'step_time' | 'critical_error' | 'low_performance';
  threshold: number;
  current_value: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  triggered_at: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Service d'alertes pour les workflows
 */
export class WorkflowAlertsService {
  /**
   * Vérifie le taux d'exécution d'un workflow et envoie une alerte si nécessaire
   */
  static async checkExecutionRate(workflowId: string, threshold: number = 80): Promise<void> {
    try {
      // Calculer le taux d'exécution sur les 7 derniers jours
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: logs, error } = await supabase
        .from('workflow_execution_logs')
        .select('execution_status')
        .eq('workflow_id', workflowId)
        .gte('executed_at', sevenDaysAgo);

      if (error) throw error;

      const total = logs?.length || 0;
      const successful = logs?.filter(l => l.execution_status === 'success').length || 0;
      const executionRate = total > 0 ? (successful / total) * 100 : 100;

      if (executionRate < threshold) {
        // Récupérer le workflow
        const { data: workflow } = await supabase
          .from('workflows')
          .select('name, user_id')
          .eq('id', workflowId)
          .single();

        if (workflow) {
          await AutomationNotificationsService.notifyError(
            workflowId,
            `Taux d'exécution faible: ${executionRate.toFixed(1)}% (seuil: ${threshold}%)`,
            {
              execution_rate: executionRate,
              threshold,
              total_executions: total,
              successful_executions: successful,
            }
          );

          // Créer une alerte
          await this.createAlert({
            workflow_id: workflowId,
            alert_type: 'execution_rate',
            threshold,
            current_value: executionRate,
            severity: executionRate < 50 ? 'critical' : executionRate < 70 ? 'error' : 'warning',
            message: `Le taux d'exécution du workflow "${workflow.name}" est de ${executionRate.toFixed(1)}%, en dessous du seuil de ${threshold}%`,
            metadata: {
              total_executions: total,
              successful_executions: successful,
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking execution rate:', error);
    }
  }

  /**
   * Vérifie le temps d'exécution des étapes et envoie une alerte si nécessaire
   */
  static async checkStepTime(workflowId: string, maxStepTimeMs: number = 60000): Promise<void> {
    try {
      // Récupérer les logs récents avec temps d'exécution élevé
      const { data: slowLogs, error } = await supabase
        .from('workflow_execution_logs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('execution_status', 'success')
        .gte('execution_time_ms', maxStepTimeMs)
        .order('executed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (slowLogs && slowLogs.length > 0) {
        const avgTime = slowLogs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / slowLogs.length;

        const { data: workflow } = await supabase
          .from('workflows')
          .select('name, user_id')
          .eq('id', workflowId)
          .single();

        if (workflow) {
          await AutomationNotificationsService.notifyError(
            workflowId,
            `Temps d'exécution élevé détecté: ${(avgTime / 1000).toFixed(1)}s (seuil: ${maxStepTimeMs / 1000}s)`,
            {
              average_time_ms: avgTime,
              max_threshold_ms: maxStepTimeMs,
              slow_executions_count: slowLogs.length,
            }
          );

          await this.createAlert({
            workflow_id: workflowId,
            alert_type: 'step_time',
            threshold: maxStepTimeMs,
            current_value: avgTime,
            severity: avgTime > maxStepTimeMs * 2 ? 'critical' : 'warning',
            message: `Le temps d'exécution moyen du workflow "${workflow.name}" est de ${(avgTime / 1000).toFixed(1)}s, au-dessus du seuil de ${(maxStepTimeMs / 1000).toFixed(1)}s`,
            metadata: {
              slow_executions_count: slowLogs.length,
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking step time:', error);
    }
  }

  /**
   * Détecte les erreurs critiques et envoie des alertes
   */
  static async detectCriticalErrors(workflowId: string): Promise<void> {
    try {
      // Récupérer les erreurs récentes (24 dernières heures)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: errors, error } = await supabase
        .from('workflow_execution_logs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('execution_status', 'error')
        .gte('executed_at', oneDayAgo)
        .order('executed_at', { ascending: false });

      if (error) throw error;

      if (errors && errors.length >= 5) {
        // 5 erreurs ou plus dans les 24h = critique
        const { data: workflow } = await supabase
          .from('workflows')
          .select('name, user_id')
          .eq('id', workflowId)
          .single();

        if (workflow) {
          await AutomationNotificationsService.notifyError(
            workflowId,
            `${errors.length} erreurs critiques détectées dans les 24 dernières heures`,
            {
              error_count: errors.length,
              errors: errors.map(e => ({
                message: e.error_message,
                executed_at: e.executed_at,
              })),
            }
          );

          await this.createAlert({
            workflow_id: workflowId,
            alert_type: 'critical_error',
            threshold: 5,
            current_value: errors.length,
            severity: 'critical',
            message: `${errors.length} erreurs critiques détectées dans le workflow "${workflow.name}"`,
            metadata: {
              error_count: errors.length,
              time_period: '24h',
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error detecting critical errors:', error);
    }
  }

  /**
   * Vérifie la performance globale d'un workflow
   */
  static async checkWorkflowPerformance(workflowId: string): Promise<void> {
    try {
      // Vérifier plusieurs métriques
      await Promise.all([
        this.checkExecutionRate(workflowId),
        this.checkStepTime(workflowId),
        this.detectCriticalErrors(workflowId),
      ]);
    } catch (error: any) {
      console.error('Error checking workflow performance:', error);
    }
  }

  /**
   * Crée une alerte
   */
  private static async createAlert(alert: Omit<WorkflowAlert, 'id' | 'triggered_at'>): Promise<void> {
    try {
      await supabase
        .from('workflow_alerts')
        .insert([{
          ...alert,
          triggered_at: new Date().toISOString(),
        }]);
    } catch (error: any) {
      // Si la table n'existe pas, on log juste l'erreur
      console.error('Error creating alert (table may not exist):', error);
    }
  }

  /**
   * Récupère les alertes actives pour un workflow
   */
  static async getActiveAlerts(workflowId: string): Promise<WorkflowAlert[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_alerts')
        .select('*')
        .eq('workflow_id', workflowId)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false });

      if (error) {
        // Table peut ne pas exister
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Résout une alerte
   */
  static async resolveAlert(alertId: string): Promise<void> {
    try {
      await supabase
        .from('workflow_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    } catch (error: any) {
      console.error('Error resolving alert:', error);
    }
  }
}

