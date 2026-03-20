/**
 * Service d'alertes pour les échecs de scraping
 * Détecte les problèmes et envoie des notifications
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';
import { ScrapingSession } from './scrapingPerformanceService';

export interface ScrapingAlert {
  id?: string;
  sessionId: string;
  alertType: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  errorDetails?: {
    errorType: string;
    errorMessage: string;
    errorCode?: string;
    stackTrace?: string;
  };
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt?: string;
}

export interface AlertConfig {
  enableErrorAlerts: boolean;
  enableWarningAlerts: boolean;
  enableSuccessAlerts: boolean;
  errorThreshold: number; // Nombre d'erreurs avant alerte
  warningThreshold: number;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  notificationChannels: ('in_app' | 'email' | 'slack')[];
  recipients?: string[]; // User IDs ou emails
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enableErrorAlerts: true,
  enableWarningAlerts: true,
  enableSuccessAlerts: false,
  errorThreshold: 1, // Alerte dès la première erreur
  warningThreshold: 3, // Alerte après 3 warnings
  notifyOnFailure: true,
  notifyOnSuccess: false,
  notificationChannels: ['in_app'],
  recipients: [],
};

/**
 * Analyse une session de scraping et génère des alertes si nécessaire
 */
export async function analyzeScrapingSessionAndAlert(
  session: ScrapingSession,
  config: Partial<AlertConfig> = {}
): Promise<ScrapingAlert[]> {
  try {
    const finalConfig = { ...DEFAULT_ALERT_CONFIG, ...config };
    const alerts: ScrapingAlert[] = [];

    // 1. Analyser les erreurs
    if (session.status === 'failed' && finalConfig.enableErrorAlerts) {
      const errorAlert = createErrorAlert(session, finalConfig);
      if (errorAlert) {
        alerts.push(errorAlert);
      }
    }

    // 2. Analyser les warnings (taux de succès faible, peu de leads)
    if (session.status === 'completed') {
      // Taux de conversion leads trouvés → ajoutés trop faible
      const conversionRate = session.leadsFound > 0 
        ? (session.leadsAdded / session.leadsFound) * 100 
        : 0;
      
      if (conversionRate < 50 && finalConfig.enableWarningAlerts) {
        alerts.push(createWarningAlert(
          session,
          'Taux de conversion faible',
          `Seulement ${conversionRate.toFixed(1)}% des leads trouvés ont été ajoutés (${session.leadsAdded}/${session.leadsFound})`,
          'medium'
        ));
      }

      // Très peu de leads trouvés
      if (session.leadsFound < 5 && finalConfig.enableWarningAlerts) {
        alerts.push(createWarningAlert(
          session,
          'Peu de leads trouvés',
          `Seulement ${session.leadsFound} lead(s) trouvé(s) pour cette recherche. Vérifiez les critères de recherche.`,
          'low'
        ));
      }
    }

    // 3. Analyser les erreurs spécifiques
    if (session.errors && session.errors.length > 0) {
      session.errors.forEach((error, index) => {
        const errorType = categorizeError(error);
        const severity = getErrorSeverity(errorType);

        if (shouldAlertForError(errorType, finalConfig)) {
          alerts.push({
            sessionId: session.id || '',
            alertType: 'error',
            severity,
            title: `Erreur de scraping: ${errorType}`,
            message: error,
            errorDetails: {
              errorType,
              errorMessage: error,
            },
            metadata: {
              errorIndex: index,
              totalErrors: session.errors?.length || 0,
            },
            acknowledged: false,
          });
        }
      });
    }

    // 4. Enregistrer les alertes
    for (const alert of alerts) {
      await createAlert(alert);
      
      // Envoyer les notifications si configuré
      if (finalConfig.notifyOnFailure && alert.alertType === 'error') {
        await sendNotifications(alert, finalConfig);
      } else if (finalConfig.notifyOnSuccess && alert.alertType === 'success') {
        await sendNotifications(alert, finalConfig);
      }
    }

    logInfo(`Analyse session scraping ${session.id}: ${alerts.length} alerte(s) générée(s)`);
    return alerts;
  } catch (err) {
    logError('Erreur analyse session scraping pour alertes:', err);
    return [];
  }
}

/**
 * Crée une alerte d'erreur depuis une session échouée
 */
function createErrorAlert(session: ScrapingSession, config: AlertConfig): ScrapingAlert | null {
  if (session.status !== 'failed') return null;

  // Analyser les erreurs pour déterminer la sévérité
  const errors = session.errors || [];
  let errorType = 'Erreur inconnue';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  if (errors.length > 0) {
    const firstError = errors[0];
    errorType = categorizeError(firstError);
    severity = getErrorSeverity(errorType);
  }

  return {
    sessionId: session.id || '',
    alertType: 'error',
    severity,
    title: `Échec de scraping - ${session.source}`,
    message: `La session de scraping a échoué avec ${errors.length} erreur(s). Source: ${session.source}`,
    errorDetails: {
      errorType,
      errorMessage: errors.join('; '),
    },
    metadata: {
      source: session.source,
      query: session.query,
      zone: session.zone,
      activity: session.activity,
      leadsFound: session.leadsFound,
      leadsAdded: session.leadsAdded,
    },
    acknowledged: false,
  };
}

/**
 * Crée une alerte de warning
 */
function createWarningAlert(
  session: ScrapingSession,
  title: string,
  message: string,
  severity: 'low' | 'medium' | 'high' = 'medium'
): ScrapingAlert {
  return {
    sessionId: session.id || '',
    alertType: 'warning',
    severity,
    title,
    message,
    metadata: {
      source: session.source,
      query: session.query,
      zone: session.zone,
      activity: session.activity,
      leadsFound: session.leadsFound,
      leadsAdded: session.leadsAdded,
    },
    acknowledged: false,
  };
}

/**
 * Catégorise une erreur
 */
function categorizeError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('timeout') || errorLower.includes('time')) {
    return 'Timeout';
  }
  if (errorLower.includes('quota') || errorLower.includes('limit') || errorLower.includes('rate limit')) {
    return 'Quota API';
  }
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
    return 'Erreur réseau';
  }
  if (errorLower.includes('parse') || errorLower.includes('format') || errorLower.includes('json')) {
    return 'Erreur de parsing';
  }
  if (errorLower.includes('auth') || errorLower.includes('api key') || errorLower.includes('unauthorized')) {
    return 'Erreur d\'authentification';
  }
  if (errorLower.includes('not found') || errorLower.includes('404')) {
    return 'Ressource non trouvée';
  }
  if (errorLower.includes('server') || errorLower.includes('500') || errorLower.includes('503')) {
    return 'Erreur serveur';
  }

  return 'Erreur inconnue';
}

/**
 * Détermine la sévérité d'une erreur
 */
function getErrorSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (errorType) {
    case 'Quota API':
      return 'high'; // Critique car bloque les opérations
    case 'Erreur d\'authentification':
      return 'critical'; // Très critique
    case 'Erreur serveur':
      return 'high';
    case 'Timeout':
      return 'medium';
    case 'Erreur réseau':
      return 'medium';
    case 'Erreur de parsing':
      return 'low';
    case 'Ressource non trouvée':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Détermine si on doit alerter pour ce type d'erreur
 */
function shouldAlertForError(errorType: string, config: AlertConfig): boolean {
  if (!config.enableErrorAlerts) return false;

  // Toujours alerter pour les erreurs critiques/hautes
  const severity = getErrorSeverity(errorType);
  if (severity === 'critical' || severity === 'high') {
    return true;
  }

  // Pour les autres, vérifier le seuil
  return true; // Pour l'instant, on alerte toujours (peut être configuré plus finement)
}

/**
 * Crée une alerte dans la base de données
 */
async function createAlert(alert: Omit<ScrapingAlert, 'id' | 'createdAt'>): Promise<ScrapingAlert> {
  try {
    const { data, error } = await supabase
      .from('scraping_alerts')
      .insert({
        session_id: alert.sessionId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        error_details: alert.errorDetails || {},
        metadata: alert.metadata || {},
        acknowledged: alert.acknowledged || false,
        acknowledged_by: alert.acknowledgedBy,
        acknowledged_at: alert.acknowledgedAt,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      sessionId: data.session_id,
      alertType: data.alert_type,
      severity: data.severity,
      title: data.title,
      message: data.message,
      errorDetails: data.error_details,
      metadata: data.metadata,
      acknowledged: data.acknowledged,
      acknowledgedBy: data.acknowledged_by,
      acknowledgedAt: data.acknowledged_at,
      createdAt: data.created_at,
    };
  } catch (err) {
    logError('Erreur création alerte scraping:', err);
    throw err;
  }
}

/**
 * Envoie les notifications pour une alerte
 */
async function sendNotifications(alert: ScrapingAlert, config: AlertConfig): Promise<void> {
  try {
    for (const channel of config.notificationChannels) {
      switch (channel) {
        case 'in_app':
          await sendInAppNotification(alert);
          break;
        case 'email':
          await sendEmailNotification(alert, config.recipients || []);
          break;
        case 'slack':
          await sendSlackNotification(alert, config);
          break;
      }
    }
  } catch (err) {
    logError('Erreur envoi notifications alerte:', err);
  }
}

/**
 * Envoie une notification in-app
 */
async function sendInAppNotification(alert: ScrapingAlert): Promise<void> {
  try {
    // Récupérer l'utilisateur qui a lancé la session
    const { data: session } = await supabase
      .from('scraping_sessions')
      .select('user_id')
      .eq('id', alert.sessionId)
      .single();

    if (!session?.user_id) {
      // Si pas d'utilisateur spécifique, envoyer aux admins
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .in('role', ['SuperAdmin', 'Admin']);

      if (admins) {
        for (const admin of admins) {
          await supabase
            .from('notifications')
            .insert({
              user_id: admin.id,
              type: 'scraping_alert',
              title: alert.title,
              message: alert.message,
              severity: alert.severity,
              metadata: {
                alertId: alert.id,
                sessionId: alert.sessionId,
                alertType: alert.alertType,
              },
              read: false,
            });
        }
      }
    } else {
      // Envoyer à l'utilisateur de la session
      await supabase
        .from('notifications')
        .insert({
          user_id: session.user_id,
          type: 'scraping_alert',
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          metadata: {
            alertId: alert.id,
            sessionId: alert.sessionId,
            alertType: alert.alertType,
          },
          read: false,
        });
    }

    logInfo(`Notification in-app envoyée pour alerte ${alert.id}`);
  } catch (err) {
    logError('Erreur envoi notification in-app:', err);
  }
}

/**
 * Envoie une notification email (TODO: implémenter)
 */
async function sendEmailNotification(alert: ScrapingAlert, recipients: string[]): Promise<void> {
  // TODO: Implémenter l'envoi d'email
  logInfo(`Email notification préparée pour alerte ${alert.id} (non implémenté)`);
}

/**
 * Envoie une notification Slack (TODO: implémenter)
 */
async function sendSlackNotification(alert: ScrapingAlert, config: AlertConfig): Promise<void> {
  // TODO: Implémenter l'envoi Slack
  logInfo(`Slack notification préparée pour alerte ${alert.id} (non implémenté)`);
}

/**
 * Récupère les alertes non acquittées
 */
export async function getUnacknowledgedAlerts(
  filters?: {
    severity?: string;
    alertType?: string;
    limit?: number;
  }
): Promise<ScrapingAlert[]> {
  try {
    let query = supabase
      .from('scraping_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(a => ({
      id: a.id,
      sessionId: a.session_id,
      alertType: a.alert_type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      errorDetails: a.error_details,
      metadata: a.metadata,
      acknowledged: a.acknowledged,
      acknowledgedBy: a.acknowledged_by,
      acknowledgedAt: a.acknowledged_at,
      createdAt: a.created_at,
    }));
  } catch (err) {
    logError('Erreur récupération alertes non acquittées:', err);
    return [];
  }
}

/**
 * Marque une alerte comme acquittée
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('scraping_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    logInfo(`Alerte ${alertId} acquittée par utilisateur ${userId}`);
  } catch (err) {
    logError(`Erreur acquittement alerte ${alertId}:`, err);
    throw err;
  }
}

/**
 * Détecte et alerte sur les problèmes récurrents
 */
export async function detectRecurringIssues(period: 'day' | 'week' | 'month' = 'week'): Promise<ScrapingAlert[]> {
  try {
    // Calculer la date de début
    const now = new Date();
    let periodStart: Date;
    
    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Récupérer les sessions échouées
    const { data: failedSessions } = await supabase
      .from('scraping_sessions')
      .select('*')
      .eq('status', 'failed')
      .gte('started_at', periodStart.toISOString());

    if (!failedSessions || failedSessions.length === 0) {
      return [];
    }

    // Analyser les patterns d'erreurs
    const errorPatterns: Record<string, { count: number; sessions: string[] }> = {};
    
    failedSessions.forEach(session => {
      const errors = session.errors || [];
      errors.forEach(error => {
        const errorType = categorizeError(error);
        if (!errorPatterns[errorType]) {
          errorPatterns[errorType] = { count: 0, sessions: [] };
        }
        errorPatterns[errorType].count++;
        if (!errorPatterns[errorType].sessions.includes(session.id)) {
          errorPatterns[errorType].sessions.push(session.id);
        }
      });
    });

    const alerts: ScrapingAlert[] = [];

    // Créer des alertes pour les problèmes récurrents (>= 3 occurrences)
    Object.entries(errorPatterns).forEach(([errorType, pattern]) => {
      if (pattern.count >= 3) {
        alerts.push({
          sessionId: pattern.sessions[0] || '', // Utiliser la première session comme référence
          alertType: 'error',
          severity: getErrorSeverity(errorType),
          title: `Problème récurrent: ${errorType}`,
          message: `${errorType} s'est produit ${pattern.count} fois dans ${pattern.sessions.length} session(s) au cours de la période.`,
          errorDetails: {
            errorType,
            errorMessage: `Problème récurrent détecté (${pattern.count} occurrences)`,
          },
          metadata: {
            occurrenceCount: pattern.count,
            sessionCount: pattern.sessions.length,
            period,
            sessions: pattern.sessions,
          },
          acknowledged: false,
        });
      }
    });

    // Enregistrer les alertes
    for (const alert of alerts) {
      await createAlert(alert);
    }

    logInfo(`Détection problèmes récurrents: ${alerts.length} alerte(s) créée(s)`);
    return alerts;
  } catch (err) {
    logError('Erreur détection problèmes récurrents:', err);
    return [];
  }
}

