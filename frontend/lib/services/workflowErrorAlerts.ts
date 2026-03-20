/**
 * Service de détection et alertes pour workflows en erreur
 * Détecte automatiquement les erreurs, envoie des notifications et suggère des résolutions
 */

import { supabase } from '../supabase';
import { ActionExecution } from '../supabase/hooks/useAutomatedActions';

export interface WorkflowError {
  id: string;
  workflowId: string;
  workflowName: string;
  errorType: 'api_error' | 'timeout' | 'validation_error' | 'data_error' | 'condition_error' | 'unknown';
  errorMessage: string;
  stackTrace?: string;
  context: Record<string, any>;
  firstOccurred: Date;
  lastOccurred: Date;
  occurrenceCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStatus: 'open' | 'resolved' | 'ignored';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface ErrorAlert {
  id: string;
  workflowErrorId: string;
  alertType: 'email' | 'in_app' | 'slack' | 'webhook';
  recipientId?: string; // User ID, email, Slack channel, webhook URL
  recipientEmail?: string;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface ResolutionSuggestion {
  workflowErrorId: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  actionRequired: string;
}

/**
 * Détecte automatiquement les workflows en erreur
 */
export async function detectWorkflowErrors(
  workflowId?: string,
  period?: { start: Date; end: Date }
): Promise<WorkflowError[]> {
  try {
    let query = supabase
      .from('action_executions')
      .select('*')
      .eq('execution_status', 'failed');

    if (workflowId) {
      query = query.eq('automated_action_id', workflowId);
    }

    if (period) {
      query = query
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());
    } else {
      // Par défaut, dernière semaine
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', oneWeekAgo.toISOString());
    }

    const { data: failedExecutions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Erreur récupération exécutions échouées:', error);
      return [];
    }

    const executions = (failedExecutions || []) as ActionExecution[];

    // Grouper les erreurs par workflow et type d'erreur
    const errorGroups: Record<string, {
      workflowId: string;
      workflowName: string;
      errorType: WorkflowError['errorType'];
      errorMessage: string;
      executions: ActionExecution[];
    }> = {};

    for (const execution of executions) {
      const errorKey = `${execution.automatedActionId}_${execution.errorMessage || 'unknown'}`;
      
      if (!errorGroups[errorKey]) {
        // Récupérer le nom du workflow
        const { data: action } = await supabase
          .from('automated_actions')
          .select('name')
          .eq('id', execution.automatedActionId)
          .single();

        errorGroups[errorKey] = {
          workflowId: execution.automatedActionId,
          workflowName: action?.name || 'Workflow inconnu',
          errorType: classifyErrorType(execution.errorMessage || ''),
          errorMessage: execution.errorMessage || 'Erreur inconnue',
          executions: [],
        };
      }

      errorGroups[errorKey].executions.push(execution);
    }

    // Convertir en WorkflowError
    const errors: WorkflowError[] = [];

    for (const errorKey in errorGroups) {
      const group = errorGroups[errorKey];
      const executions = group.executions.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const firstExecution = executions[0];
      const lastExecution = executions[executions.length - 1];

      errors.push({
        id: `error_${group.workflowId}_${Date.now()}`,
        workflowId: group.workflowId,
        workflowName: group.workflowName,
        errorType: group.errorType,
        errorMessage: group.errorMessage,
        stackTrace: firstExecution.resultData?.stackTrace || firstExecution.resultData?.error,
        context: {
          leadId: firstExecution.leadId,
          triggerType: firstExecution.triggerType,
          executionId: firstExecution.id,
        },
        firstOccurred: new Date(firstExecution.createdAt),
        lastOccurred: new Date(lastExecution.createdAt),
        occurrenceCount: executions.length,
        severity: calculateSeverity(group.errorType, executions.length),
        resolutionStatus: 'open',
      });
    }

    return errors;
  } catch (error) {
    console.error('Erreur détection workflows en erreur:', error);
    return [];
  }
}

/**
 * Classifie le type d'erreur selon le message
 */
function classifyErrorType(errorMessage: string): WorkflowError['errorType'] {
  const message = errorMessage.toLowerCase();

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }

  if (message.includes('api') || message.includes('http') || message.includes('network')) {
    return 'api_error';
  }

  if (message.includes('validation') || message.includes('invalid') || message.includes('missing')) {
    return 'validation_error';
  }

  if (message.includes('condition') || message.includes('cannot evaluate')) {
    return 'condition_error';
  }

  if (message.includes('data') || message.includes('database') || message.includes('sql')) {
    return 'data_error';
  }

  return 'unknown';
}

/**
 * Calcule la sévérité de l'erreur
 */
function calculateSeverity(
  errorType: WorkflowError['errorType'],
  occurrenceCount: number
): WorkflowError['severity'] {
  // Erreurs critiques par défaut
  if (errorType === 'api_error' || errorType === 'data_error') {
    if (occurrenceCount >= 10) return 'critical';
    if (occurrenceCount >= 5) return 'high';
    return 'medium';
  }

  // Timeouts moins critiques mais à surveiller
  if (errorType === 'timeout') {
    if (occurrenceCount >= 20) return 'high';
    if (occurrenceCount >= 10) return 'medium';
    return 'low';
  }

  // Erreurs de validation/condition moins critiques
  if (errorType === 'validation_error' || errorType === 'condition_error') {
    if (occurrenceCount >= 30) return 'medium';
    return 'low';
  }

  // Par défaut
  if (occurrenceCount >= 15) return 'high';
  if (occurrenceCount >= 5) return 'medium';
  return 'low';
}

/**
 * Génère des suggestions de résolution pour une erreur
 */
export async function generateResolutionSuggestions(
  workflowError: WorkflowError
): Promise<ResolutionSuggestion[]> {
  const suggestions: ResolutionSuggestion[] = [];

  switch (workflowError.errorType) {
    case 'api_error':
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Vérifier la connexion à l\'API externe et les clés API configurées',
        priority: 'high',
        estimatedImpact: 'Résout immédiatement les erreurs d\'API',
        actionRequired: 'Vérifier les clés API dans les paramètres, tester la connexion',
      });
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Ajouter un délai de retry avec backoff exponentiel',
        priority: 'medium',
        estimatedImpact: 'Améliore la résilience aux erreurs temporaires',
        actionRequired: 'Configurer retry dans les paramètres du workflow',
      });
      break;

    case 'timeout':
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Augmenter le délai de timeout pour les actions longues',
        priority: 'medium',
        estimatedImpact: 'Évite les timeouts prématurés',
        actionRequired: 'Modifier timeout dans configuration workflow',
      });
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Optimiser les requêtes ou diviser les actions longues',
        priority: 'high',
        estimatedImpact: 'Améliore les performances globales',
        actionRequired: 'Réviser la logique du workflow',
      });
      break;

    case 'validation_error':
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Valider les données avant traitement dans le workflow',
        priority: 'high',
        estimatedImpact: 'Évite les erreurs de validation',
        actionRequired: 'Ajouter validation des données dans le workflow',
      });
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Vérifier que tous les champs requis sont présents',
        priority: 'medium',
        estimatedImpact: 'Améliore la robustesse du workflow',
        actionRequired: 'Réviser les conditions et champs utilisés',
      });
      break;

    case 'condition_error':
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Valider les conditions avec l\'outil de validation',
        priority: 'high',
        estimatedImpact: 'Détecte les erreurs de conditions avant exécution',
        actionRequired: 'Utiliser validateConditionGroup sur les conditions',
      });
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Simplifier les conditions complexes ou les diviser',
        priority: 'medium',
        estimatedImpact: 'Réduit la probabilité d\'erreurs',
        actionRequired: 'Réviser la structure des conditions',
      });
      break;

    case 'data_error':
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Vérifier l\'intégrité des données dans la base de données',
        priority: 'high',
        estimatedImpact: 'Résout les problèmes de données',
        actionRequired: 'Auditer les données liées au workflow',
      });
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Ajouter des vérifications d\'existence avant accès aux données',
        priority: 'medium',
        estimatedImpact: 'Prévient les erreurs futures',
        actionRequired: 'Ajouter vérifications dans le workflow',
      });
      break;

    default:
      suggestions.push({
        workflowErrorId: workflowError.id,
        suggestion: 'Examiner les logs détaillés pour identifier la cause',
        priority: 'medium',
        estimatedImpact: 'Permet de comprendre l\'erreur',
        actionRequired: 'Consulter les logs et l\'historique d\'exécution',
      });
  }

  // Suggestion générale si erreur récurrente
  if (workflowError.occurrenceCount >= 10) {
    suggestions.push({
      workflowErrorId: workflowError.id,
      suggestion: 'Considérer la désactivation temporaire du workflow jusqu\'à résolution',
      priority: 'high',
      estimatedImpact: 'Évite d\'accumuler les erreurs',
      actionRequired: 'Désactiver le workflow dans les paramètres',
    });
  }

  return suggestions;
}

/**
 * Envoie une alerte pour une erreur de workflow
 */
export async function sendErrorAlert(
  workflowError: WorkflowError,
  alertType: ErrorAlert['alertType'],
  recipients: { userId?: string; email?: string; channel?: string; webhookUrl?: string }
): Promise<ErrorAlert> {
  try {
    const alert: ErrorAlert = {
      id: `alert_${workflowError.id}_${Date.now()}`,
      workflowErrorId: workflowError.id,
      alertType,
      recipientId: recipients.userId || recipients.channel || recipients.webhookUrl,
      recipientEmail: recipients.email,
      sentAt: new Date(),
      status: 'pending',
    };

    // Enregistrer l'alerte
    // Note: Créer une table workflow_error_alerts si nécessaire
    // Pour l'instant, on simule l'envoi
    const alertMessage = buildAlertMessage(workflowError);

    switch (alertType) {
      case 'email':
        if (recipients.email) {
          // TODO: Intégrer avec service d'envoi d'email
          // await sendEmail({
          //   to: recipients.email,
          //   subject: `[AgencyOS] Erreur workflow: ${workflowError.workflowName}`,
          //   body: alertMessage,
          // });
          console.log('Envoi email alerte:', recipients.email, alertMessage);
        }
        break;

      case 'in_app':
        if (recipients.userId) {
          // Créer une notification in-app
          const { error } = await supabase
            .from('notifications')
            .insert({
              user_id: recipients.userId,
              type: 'workflow_error',
              title: `Erreur workflow: ${workflowError.workflowName}`,
              message: alertMessage,
              metadata: {
                workflowErrorId: workflowError.id,
                workflowId: workflowError.workflowId,
                severity: workflowError.severity,
              },
              read: false,
            });

          if (error) throw error;
        }
        break;

      case 'slack':
      case 'webhook':
        // TODO: Implémenter envoi Slack/webhook
        console.log('Envoi webhook alerte:', recipients.webhookUrl || recipients.channel, alertMessage);
        break;
    }

    alert.status = 'sent';

    return alert;
  } catch (error) {
    console.error('Erreur envoi alerte:', error);
    return {
      id: `alert_${workflowError.id}_${Date.now()}`,
      workflowErrorId: workflowError.id,
      alertType,
      sentAt: new Date(),
      status: 'failed',
      error: (error as Error).message,
    };
  }
}

/**
 * Construit le message d'alerte
 */
function buildAlertMessage(workflowError: WorkflowError): string {
  return `
🚨 Erreur workflow détectée

Workflow: ${workflowError.workflowName}
Type: ${workflowError.errorType}
Sévérité: ${workflowError.severity.toUpperCase()}
Occurrences: ${workflowError.occurrenceCount}

Message: ${workflowError.errorMessage}

Première occurrence: ${workflowError.firstOccurred.toLocaleString('fr-FR')}
Dernière occurrence: ${workflowError.lastOccurred.toLocaleString('fr-FR')}

Actions recommandées:
- Vérifier les logs détaillés
- Consulter les suggestions de résolution
- Corriger le problème ou désactiver temporairement le workflow
  `.trim();
}

/**
 * Marque une erreur comme résolue
 */
export async function resolveWorkflowError(
  workflowErrorId: string,
  resolvedBy: string,
  resolutionNotes?: string
): Promise<void> {
  try {
    // Note: Créer une table workflow_errors pour stocker les erreurs
    // Pour l'instant, on peut enregistrer dans une table générique
    const { error } = await supabase
      .from('workflow_errors') // TODO: Créer cette table
      .update({
        resolution_status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes,
      })
      .eq('id', workflowErrorId);

    if (error) {
      // Si la table n'existe pas, on log juste
      console.warn('Table workflow_errors non disponible:', error);
    }
  } catch (error) {
    console.error('Erreur résolution erreur workflow:', error);
  }
}

/**
 * Surveille les workflows et envoie des alertes automatiquement
 */
export async function monitorWorkflowsAndAlert(
  checkInterval: number = 60 * 60 * 1000 // 1 heure par défaut
): Promise<void> {
  try {
    // Détecter les erreurs
    const errors = await detectWorkflowErrors();

    // Filtrer seulement les erreurs critiques et high
    const criticalErrors = errors.filter(e => 
      e.severity === 'critical' || e.severity === 'high'
    );

    // Pour chaque erreur critique, envoyer une alerte
    for (const error of criticalErrors) {
      // Récupérer les destinataires (admins, managers, créateur du workflow)
      const { data: admins } = await supabase
        .from('users')
        .select('id, email')
        .in('role', ['SuperAdmin', 'Admin', 'Manager']);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await sendErrorAlert(error, 'in_app', { userId: admin.id, email: admin.email });
        }
      }
    }

    // TODO: Programmer le prochain check (cron job, scheduled task, etc.)
  } catch (error) {
    console.error('Erreur monitoring workflows:', error);
  }
}

