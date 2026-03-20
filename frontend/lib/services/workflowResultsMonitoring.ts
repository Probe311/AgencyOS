/**
 * Service de monitoring des résultats des workflows après activation
 * Suit les métriques d'engagement (ouverture, clic, conversion) pour les workflows actifs
 */

import { supabase } from '../supabase';

export interface WorkflowResultMetrics {
  workflowId: string;
  workflowName: string;
  period: {
    start: Date;
    end: Date;
  };
  emailMetrics: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    openRate: number; // %
    clickRate: number; // %
    replyRate: number; // %
    bounceRate: number; // %
  };
  conversionMetrics: {
    leadsConverted: number;
    conversionRate: number; // %
    averageTimeToConversion: number; // jours
  };
  engagementScore: number; // Score global 0-100
  trends: {
    openRate: number[]; // Évolution dans le temps
    clickRate: number[];
    conversionRate: number[];
  };
}

export interface ActionResultMetrics {
  actionId: string;
  actionType: string;
  actionName: string;
  emailMetrics?: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  taskMetrics?: {
    created: number;
    completed: number;
    completionRate: number;
  };
  appointmentMetrics?: {
    scheduled: number;
    confirmed: number;
    completed: number;
    noShow: number;
    confirmationRate: number;
    completionRate: number;
  };
}

/**
 * Service de monitoring des résultats des workflows
 */
export class WorkflowResultsMonitoring {
  /**
   * Récupère les métriques d'engagement pour un workflow
   */
  static async getWorkflowResultMetrics(
    workflowId: string,
    period: { start: Date; end: Date }
  ): Promise<WorkflowResultMetrics | null> {
    try {
      // Récupérer le workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('name')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        console.error('Workflow not found:', workflowError);
        return null;
      }

      // Récupérer les exécutions du workflow
      const { data: executions, error: executionsError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .gte('started_at', period.start.toISOString())
        .lte('started_at', period.end.toISOString());

      if (executionsError) {
        console.error('Error fetching workflow executions:', executionsError);
        return null;
      }

      const executionIds = (executions || []).map(e => e.id);
      const leadIds = (executions || []).map(e => e.lead_id).filter(Boolean) as string[];

      // Récupérer les métriques d'email depuis email_tracking
      const emailMetrics = await this.getEmailMetrics(leadIds, period);

      // Récupérer les métriques de conversion
      const conversionMetrics = await this.getConversionMetrics(leadIds, period);

      // Calculer le score d'engagement global
      const engagementScore = this.calculateEngagementScore(emailMetrics, conversionMetrics);

      // Calculer les tendances
      const trends = await this.calculateTrends(workflowId, period);

      return {
        workflowId,
        workflowName: workflow.name,
        period,
        emailMetrics,
        conversionMetrics,
        engagementScore,
        trends,
      };
    } catch (error: any) {
      console.error('Error getting workflow result metrics:', error);
      return null;
    }
  }

  /**
   * Récupère les métriques d'email pour des leads
   */
  private static async getEmailMetrics(
    leadIds: string[],
    period: { start: Date; end: Date }
  ): Promise<WorkflowResultMetrics['emailMetrics']> {
    if (leadIds.length === 0) {
      return {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
      };
    }

    try {
      // Récupérer les emails envoyés pour ces leads dans la période
      const { data: emailSends, error: sendsError } = await supabase
        .from('email_sends')
        .select('id, lead_id, sent_at, status')
        .in('lead_id', leadIds)
        .gte('sent_at', period.start.toISOString())
        .lte('sent_at', period.end.toISOString());

      if (sendsError) {
        console.warn('Error fetching email sends:', sendsError);
      }

      const sent = emailSends?.length || 0;
      const bounced = emailSends?.filter(e => e.status === 'bounced').length || 0;

      // Récupérer les tracking d'emails
      const emailSendIds = emailSends?.map(e => e.id) || [];
      if (emailSendIds.length === 0) {
        return {
          sent: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          unsubscribed: 0,
          openRate: 0,
          clickRate: 0,
          replyRate: 0,
          bounceRate: 0,
        };
      }

      const { data: emailTracking, error: trackingError } = await supabase
        .from('email_tracking')
        .select('*')
        .in('email_send_id', emailSendIds);

      if (trackingError) {
        console.warn('Error fetching email tracking:', trackingError);
      }

      const opened = emailTracking?.filter(e => e.opened_at).length || 0;
      const clicked = emailTracking?.filter(e => e.clicked_at).length || 0;
      const replied = emailTracking?.filter(e => e.replied_at).length || 0;

      // Récupérer les désabonnements
      const { data: unsubscribedLeads, error: unsubError } = await supabase
        .from('leads')
        .select('id')
        .in('id', leadIds)
        .eq('unsubscribed', true)
        .gte('unsubscribed_at', period.start.toISOString())
        .lte('unsubscribed_at', period.end.toISOString());

      const unsubscribed = unsubscribedLeads?.length || 0;

      const openRate = sent > 0 ? (opened / sent) * 100 : 0;
      const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
      const replyRate = sent > 0 ? (replied / sent) * 100 : 0;
      const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

      return {
        sent,
        opened,
        clicked,
        replied,
        bounced,
        unsubscribed,
        openRate,
        clickRate,
        replyRate,
        bounceRate,
      };
    } catch (error: any) {
      console.error('Error getting email metrics:', error);
      return {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
      };
    }
  }

  /**
   * Récupère les métriques de conversion
   */
  private static async getConversionMetrics(
    leadIds: string[],
    period: { start: Date; end: Date }
  ): Promise<WorkflowResultMetrics['conversionMetrics']> {
    if (leadIds.length === 0) {
      return {
        leadsConverted: 0,
        conversionRate: 0,
        averageTimeToConversion: 0,
      };
    }

    try {
      // Récupérer les leads convertis dans la période
      const { data: convertedLeads, error } = await supabase
        .from('leads')
        .select('id, converted_at, created_at')
        .in('id', leadIds)
        .not('converted_at', 'is', null)
        .gte('converted_at', period.start.toISOString())
        .lte('converted_at', period.end.toISOString());

      if (error) {
        console.warn('Error fetching converted leads:', error);
      }

      const leadsConverted = convertedLeads?.length || 0;
      const conversionRate = leadIds.length > 0 ? (leadsConverted / leadIds.length) * 100 : 0;

      // Calculer le temps moyen jusqu'à la conversion
      let averageTimeToConversion = 0;
      if (convertedLeads && convertedLeads.length > 0) {
        const timesToConversion = convertedLeads
          .filter(l => l.created_at && l.converted_at)
          .map(l => {
            const created = new Date(l.created_at);
            const converted = new Date(l.converted_at);
            return (converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // jours
          });

        if (timesToConversion.length > 0) {
          averageTimeToConversion =
            timesToConversion.reduce((sum, time) => sum + time, 0) / timesToConversion.length;
        }
      }

      return {
        leadsConverted,
        conversionRate,
        averageTimeToConversion,
      };
    } catch (error: any) {
      console.error('Error getting conversion metrics:', error);
      return {
        leadsConverted: 0,
        conversionRate: 0,
        averageTimeToConversion: 0,
      };
    }
  }

  /**
   * Calcule le score d'engagement global
   */
  private static calculateEngagementScore(
    emailMetrics: WorkflowResultMetrics['emailMetrics'],
    conversionMetrics: WorkflowResultMetrics['conversionMetrics']
  ): number {
    // Score basé sur :
    // - Taux d'ouverture : 30%
    // - Taux de clic : 30%
    // - Taux de conversion : 40%
    const openScore = emailMetrics.openRate * 0.3;
    const clickScore = emailMetrics.clickRate * 0.3;
    const conversionScore = conversionMetrics.conversionRate * 0.4;

    return Math.min(100, openScore + clickScore + conversionScore);
  }

  /**
   * Calcule les tendances dans le temps
   */
  private static async calculateTrends(
    workflowId: string,
    period: { start: Date; end: Date }
  ): Promise<WorkflowResultMetrics['trends']> {
    try {
      // Diviser la période en segments (par jour ou par semaine selon la durée)
      const daysDiff = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
      const segmentCount = daysDiff <= 7 ? Math.ceil(daysDiff) : 7; // 7 segments max
      const segmentDuration = (period.end.getTime() - period.start.getTime()) / segmentCount;

      const openRates: number[] = [];
      const clickRates: number[] = [];
      const conversionRates: number[] = [];

      for (let i = 0; i < segmentCount; i++) {
        const segmentStart = new Date(period.start.getTime() + i * segmentDuration);
        const segmentEnd = new Date(period.start.getTime() + (i + 1) * segmentDuration);

        // Récupérer les exécutions pour ce segment
        const { data: executions } = await supabase
          .from('workflow_executions')
          .select('lead_id')
          .eq('workflow_id', workflowId)
          .gte('started_at', segmentStart.toISOString())
          .lt('started_at', segmentEnd.toISOString());

        const leadIds = (executions || []).map(e => e.lead_id).filter(Boolean) as string[];

        if (leadIds.length > 0) {
          const emailMetrics = await this.getEmailMetrics(leadIds, {
            start: segmentStart,
            end: segmentEnd,
          });
          const conversionMetrics = await this.getConversionMetrics(leadIds, {
            start: segmentStart,
            end: segmentEnd,
          });

          openRates.push(emailMetrics.openRate);
          clickRates.push(emailMetrics.clickRate);
          conversionRates.push(conversionMetrics.conversionRate);
        } else {
          openRates.push(0);
          clickRates.push(0);
          conversionRates.push(0);
        }
      }

      return {
        openRate: openRates,
        clickRate: clickRates,
        conversionRate: conversionRates,
      };
    } catch (error: any) {
      console.error('Error calculating trends:', error);
      return {
        openRate: [],
        clickRate: [],
        conversionRate: [],
      };
    }
  }

  /**
   * Récupère les métriques par action
   */
  static async getActionResultMetrics(
    workflowId: string,
    period: { start: Date; end: Date }
  ): Promise<ActionResultMetrics[]> {
    try {
      // Récupérer les logs d'exécution du workflow
      const { data: logs, error } = await supabase
        .from('workflow_execution_logs')
        .select('*')
        .eq('workflow_id', workflowId)
        .gte('executed_at', period.start.toISOString())
        .lte('executed_at', period.end.toISOString());

      if (error) {
        console.warn('Error fetching workflow execution logs:', error);
        return [];
      }

      // Grouper par type d'action depuis les métadonnées
      const actionGroups: Record<string, any[]> = {};

      (logs || []).forEach(log => {
        const actionType = log.metadata?.action_type || 'unknown';
        if (!actionGroups[actionType]) {
          actionGroups[actionType] = [];
        }
        actionGroups[actionType].push(log);
      });

      const metrics: ActionResultMetrics[] = [];

      for (const [actionType, actionLogs] of Object.entries(actionGroups)) {
        if (actionType === 'send_email') {
          // Métriques spécifiques pour les emails
          const emailMetrics = await this.getEmailMetricsForAction(actionLogs, period);
          metrics.push({
            actionId: `${workflowId}-${actionType}`,
            actionType,
            actionName: 'Envoyer email',
            emailMetrics,
          });
        } else if (actionType === 'create_task') {
          // Métriques pour les tâches
          const taskMetrics = await this.getTaskMetricsForAction(actionLogs, period);
          metrics.push({
            actionId: `${workflowId}-${actionType}`,
            actionType,
            actionName: 'Créer tâche',
            taskMetrics,
          });
        } else if (actionType === 'create_appointment') {
          // Métriques pour les rendez-vous
          const appointmentMetrics = await this.getAppointmentMetricsForAction(actionLogs, period);
          metrics.push({
            actionId: `${workflowId}-${actionType}`,
            actionType,
            actionName: 'Créer rendez-vous',
            appointmentMetrics,
          });
        }
      }

      return metrics;
    } catch (error: any) {
      console.error('Error getting action result metrics:', error);
      return [];
    }
  }

  /**
   * Récupère les métriques d'email pour une action
   */
  private static async getEmailMetricsForAction(
    actionLogs: any[],
    period: { start: Date; end: Date }
  ): Promise<ActionResultMetrics['emailMetrics']> {
    // Extraire les lead_ids depuis les logs
    const leadIds = actionLogs
      .map(log => log.metadata?.lead_id)
      .filter(Boolean) as string[];

    if (leadIds.length === 0) {
      return {
        sent: 0,
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0,
      };
    }

    const emailMetrics = await this.getEmailMetrics(leadIds, period);

    return {
      sent: emailMetrics.sent,
      opened: emailMetrics.opened,
      clicked: emailMetrics.clicked,
      openRate: emailMetrics.openRate,
      clickRate: emailMetrics.clickRate,
    };
  }

  /**
   * Récupère les métriques de tâches pour une action
   */
  private static async getTaskMetricsForAction(
    actionLogs: any[],
    period: { start: Date; end: Date }
  ): Promise<ActionResultMetrics['taskMetrics']> {
    // Extraire les task_ids depuis les logs
    const taskIds = actionLogs
      .map(log => log.metadata?.task_id)
      .filter(Boolean) as string[];

    if (taskIds.length === 0) {
      return {
        created: 0,
        completed: 0,
        completionRate: 0,
      };
    }

    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status')
        .in('id', taskIds);

      if (error) {
        console.warn('Error fetching tasks:', error);
        return {
          created: taskIds.length,
          completed: 0,
          completionRate: 0,
        };
      }

      const created = tasks?.length || 0;
      const completed = tasks?.filter(t => t.status === 'Terminé' || t.status === 'Done').length || 0;
      const completionRate = created > 0 ? (completed / created) * 100 : 0;

      return {
        created,
        completed,
        completionRate,
      };
    } catch (error: any) {
      console.error('Error getting task metrics:', error);
      return {
        created: taskIds.length,
        completed: 0,
        completionRate: 0,
      };
    }
  }

  /**
   * Récupère les métriques de rendez-vous pour une action
   */
  private static async getAppointmentMetricsForAction(
    actionLogs: any[],
    period: { start: Date; end: Date }
  ): Promise<ActionResultMetrics['appointmentMetrics']> {
    // Extraire les appointment_ids depuis les logs
    const appointmentIds = actionLogs
      .map(log => log.metadata?.appointment_id)
      .filter(Boolean) as string[];

    if (appointmentIds.length === 0) {
      return {
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        noShow: 0,
        confirmationRate: 0,
        completionRate: 0,
      };
    }

    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, status')
        .in('id', appointmentIds);

      if (error) {
        console.warn('Error fetching appointments:', error);
        return {
          scheduled: appointmentIds.length,
          confirmed: 0,
          completed: 0,
          noShow: 0,
          confirmationRate: 0,
          completionRate: 0,
        };
      }

      const scheduled = appointments?.length || 0;
      const confirmed = appointments?.filter(a => a.status === 'confirmed').length || 0;
      const completed = appointments?.filter(a => a.status === 'completed').length || 0;
      const noShow = appointments?.filter(a => a.status === 'no_show').length || 0;

      const confirmationRate = scheduled > 0 ? (confirmed / scheduled) * 100 : 0;
      const completionRate = scheduled > 0 ? (completed / scheduled) * 100 : 0;

      return {
        scheduled,
        confirmed,
        completed,
        noShow,
        confirmationRate,
        completionRate,
      };
    } catch (error: any) {
      console.error('Error getting appointment metrics:', error);
      return {
        scheduled: appointmentIds.length,
        confirmed: 0,
        completed: 0,
        noShow: 0,
        confirmationRate: 0,
        completionRate: 0,
      };
    }
  }

  /**
   * Compare les métriques avec des benchmarks
   */
  static getBenchmarkComparison(metrics: WorkflowResultMetrics): {
    openRate: { current: number; benchmark: number; status: 'above' | 'below' | 'equal' };
    clickRate: { current: number; benchmark: number; status: 'above' | 'below' | 'equal' };
    conversionRate: { current: number; benchmark: number; status: 'above' | 'below' | 'equal' };
  } {
    // Benchmarks standards de l'industrie
    const benchmarks = {
      openRate: 20, // 20% taux d'ouverture moyen
      clickRate: 3, // 3% taux de clic moyen
      conversionRate: 2, // 2% taux de conversion moyen
    };

    const compare = (current: number, benchmark: number) => {
      if (current > benchmark * 1.1) return 'above'; // 10% au-dessus
      if (current < benchmark * 0.9) return 'below'; // 10% en dessous
      return 'equal';
    };

    return {
      openRate: {
        current: metrics.emailMetrics.openRate,
        benchmark: benchmarks.openRate,
        status: compare(metrics.emailMetrics.openRate, benchmarks.openRate),
      },
      clickRate: {
        current: metrics.emailMetrics.clickRate,
        benchmark: benchmarks.clickRate,
        status: compare(metrics.emailMetrics.clickRate, benchmarks.clickRate),
      },
      conversionRate: {
        current: metrics.conversionMetrics.conversionRate,
        benchmark: benchmarks.conversionRate,
        status: compare(metrics.conversionMetrics.conversionRate, benchmarks.conversionRate),
      },
    };
  }
}

