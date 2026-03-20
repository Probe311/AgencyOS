import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type TriggerType = 'fixed_delay' | 'variable_delay' | 'scheduled';
export type ExecutionStatus = 'pending' | 'executed' | 'failed' | 'cancelled' | 'rescheduled';
export type DelayRuleType = 'score_based' | 'temperature_based' | 'sector_based' | 'custom';

export interface TimeTrigger {
  id: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  workflowId?: string;
  eventType: string;
  delayConfig: {
    fixedHours?: number;
    fixedDays?: number;
    variableRules?: string[]; // IDs des règles de délai variable
    [key: string]: any;
  };
  businessHoursConfig: {
    respectBusinessHours: boolean;
    calendarId?: string;
    [key: string]: any;
  };
  timezoneConfig: {
    useLeadTimezone: boolean;
    defaultTimezone?: string;
    [key: string]: any;
  };
  actionConfig: {
    actionType: string;
    emailTemplateId?: string;
    taskConfig?: Record<string, any>;
    [key: string]: any;
  };
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeTriggerExecution {
  id: string;
  timeTriggerId: string;
  leadId: string;
  eventId?: string;
  eventType: string;
  scheduledAt: string;
  executedAt?: string;
  executionStatus: ExecutionStatus;
  delayApplied?: number;
  delayReason?: string;
  timezoneUsed?: string;
  businessHoursRespected: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCalendar {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  workingDays: number[]; // 1=Lundi, 7=Dimanche
  workingHoursStart: string; // Format HH:mm:ss
  workingHoursEnd: string;
  holidays: Array<{ date: string; name: string }>;
  vacationPeriods: Array<{ start: string; end: string; name?: string }>;
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DelayRule {
  id: string;
  name: string;
  description?: string;
  ruleType: DelayRuleType;
  conditions: Record<string, any>;
  delayHours: number;
  priority: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useTimeTriggers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateDelay = async (
    trigger: TimeTrigger,
    lead: Lead,
    eventDate: Date
  ): Promise<{ delayHours: number; reason: string }> => {
    try {
      if (trigger.triggerType === 'fixed_delay') {
        // Délai fixe
        const hours = trigger.delayConfig.fixedHours || 0;
        const days = trigger.delayConfig.fixedDays || 0;
        const totalHours = hours + (days * 24);
        return {
          delayHours: totalHours,
          reason: `Délai fixe : ${days > 0 ? `${days} jour(s)` : ''} ${hours > 0 ? `${hours} heure(s)` : ''}`,
        };
      } else if (trigger.triggerType === 'variable_delay') {
        // Délai variable selon scoring, température, secteur
        return await calculateVariableDelay(trigger, lead);
      } else {
        // Scheduled (délai calculé depuis une date spécifique)
        const scheduledDate = new Date(trigger.delayConfig.scheduledDate || eventDate);
        const delayMs = scheduledDate.getTime() - eventDate.getTime();
        const delayHours = Math.max(0, Math.floor(delayMs / (1000 * 60 * 60)));
        return {
          delayHours,
          reason: `Délai programmé : ${scheduledDate.toLocaleString('fr-FR')}`,
        };
      }
    } catch (err) {
      throw err;
    }
  };

  const calculateVariableDelay = async (
    trigger: TimeTrigger,
    lead: Lead
  ): Promise<{ delayHours: number; reason: string }> => {
    try {
      // Récupérer les règles de délai actives
      const ruleIds = trigger.delayConfig.variableRules || [];
      if (ruleIds.length === 0) {
        // Pas de règles, utiliser les règles par défaut
        return await calculateDefaultVariableDelay(lead);
      }

      const { data: rules } = await supabase
        .from('delay_rules')
        .select('*')
        .in('id', ruleIds)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!rules || rules.length === 0) {
        return await calculateDefaultVariableDelay(lead);
      }

      // Tester chaque règle dans l'ordre de priorité
      for (const rule of rules) {
        const matches = await evaluateRuleConditions(rule, lead);
        if (matches) {
          return {
            delayHours: rule.delay_hours,
            reason: `Règle "${rule.name}" : ${rule.delay_hours}h`,
          };
        }
      }

      // Aucune règle ne correspond, utiliser les règles par défaut
      return await calculateDefaultVariableDelay(lead);
    } catch (err) {
      console.error('Error calculating variable delay:', err);
      return { delayHours: 24, reason: 'Délai par défaut (erreur)' };
    }
  };

  const calculateDefaultVariableDelay = async (lead: Lead): Promise<{ delayHours: number; reason: string }> => {
    // Règles par défaut basées sur scoring, température, secteur
    const score = lead.qualityScore || 0;
    const temperature = lead.temperature || 'Froid';
    const sector = lead.sector || '';

    // Scoring
    if (score > 75) {
      return { delayHours: 24, reason: 'Scoring élevé (>75) : Délai court (J+1)' };
    } else if (score >= 50) {
      return { delayHours: 72, reason: 'Scoring moyen (50-75) : Délai moyen (J+3)' };
    } else {
      return { delayHours: 168, reason: 'Scoring faible (<50) : Délai long (J+7)' };
    }

    // Température (prioritaire si défini)
    if (temperature === 'Chaud') {
      return { delayHours: 0, reason: 'Température "Chaud" : Délai immédiat (J+0)' };
    } else if (temperature === 'Tiède') {
      return { delayHours: 72, reason: 'Température "Tiède" : Délai moyen (J+3)' };
    } else if (temperature === 'Froid') {
      return { delayHours: 168, reason: 'Température "Froid" : Délai long (J+7)' };
    }

    // Secteur (si défini comme prioritaire)
    // TODO: Vérifier si le secteur est dans la liste des secteurs prioritaires
    // Pour l'instant, on retourne le délai basé sur le scoring
    return { delayHours: 72, reason: 'Délai moyen par défaut (J+3)' };
  };

  const evaluateRuleConditions = async (rule: any, lead: Lead): Promise<boolean> => {
    try {
      const conditions = rule.conditions;

      switch (rule.rule_type) {
        case 'score_based':
          const score = lead.qualityScore || 0;
          const scoreMin = conditions.score_min || 0;
          const scoreMax = conditions.score_max || 100;
          return score >= scoreMin && score <= scoreMax;

        case 'temperature_based':
          const temperature = lead.temperature || 'Froid';
          const allowedTemperatures = conditions.temperatures || [];
          return allowedTemperatures.includes(temperature);

        case 'sector_based':
          const sector = lead.sector || '';
          const prioritySectors = conditions.priority_sectors || [];
          return prioritySectors.includes(sector);

        case 'custom':
          // Évaluation de conditions personnalisées (JSONB)
          // TODO: Implémenter un moteur d'évaluation de conditions
          return false;

        default:
          return false;
      }
    } catch (err) {
      console.error('Error evaluating rule conditions:', err);
      return false;
    }
  };

  const calculateScheduledTime = async (
    eventDate: Date,
    delayHours: number,
    trigger: TimeTrigger,
    lead: Lead
  ): Promise<Date> => {
    try {
      // Calculer la date/heure initiale
      let scheduledTime = new Date(eventDate);
      scheduledTime.setHours(scheduledTime.getHours() + delayHours);

      // Appliquer le fuseau horaire
      scheduledTime = await applyTimezone(scheduledTime, trigger, lead);

      // Respecter les heures ouvrées si configuré
      if (trigger.businessHoursConfig.respectBusinessHours) {
        scheduledTime = await adjustToBusinessHours(scheduledTime, trigger, lead);
      }

      return scheduledTime;
    } catch (err) {
      throw err;
    }
  };

  const applyTimezone = async (
    date: Date,
    trigger: TimeTrigger,
    lead: Lead
  ): Promise<Date> => {
    try {
      let timezone = 'Europe/Paris'; // Par défaut

      if (trigger.timezoneConfig.useLeadTimezone) {
        // Détecter le fuseau horaire du lead
        // TODO: Implémenter la détection depuis l'adresse du lead
        // Pour l'instant, on utilise le fuseau par défaut
        timezone = trigger.timezoneConfig.defaultTimezone || 'Europe/Paris';
      } else {
        timezone = trigger.timezoneConfig.defaultTimezone || 'Europe/Paris';
      }

      // Convertir la date dans le fuseau horaire cible
      // Note: En JavaScript, on utilise toLocaleString avec timeZone
      const dateStr = date.toLocaleString('en-US', { timeZone: timezone });
      return new Date(dateStr);
    } catch (err) {
      console.error('Error applying timezone:', err);
      return date;
    }
  };

  const adjustToBusinessHours = async (
    date: Date,
    trigger: TimeTrigger,
    lead: Lead
  ): Promise<Date> => {
    try {
      // Récupérer le calendrier d'entreprise
      let calendarId = trigger.businessHoursConfig.calendarId;
      if (!calendarId) {
        // Utiliser le calendrier par défaut
        const { data: defaultCalendar } = await supabase
          .from('business_calendars')
          .select('*')
          .eq('is_default', true)
          .limit(1)
          .single();

        if (!defaultCalendar) {
          // Pas de calendrier, retourner la date telle quelle
          return date;
        }

        calendarId = defaultCalendar.id;
      }

      const { data: calendar } = await supabase
        .from('business_calendars')
        .select('*')
        .eq('id', calendarId)
        .single();

      if (!calendar) {
        return date;
      }

      // Vérifier si la date est dans les heures ouvrées
      const dayOfWeek = date.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi
      const workingDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir en format 1-7

      // Vérifier si c'est un jour ouvré
      if (!calendar.working_days.includes(workingDay)) {
        // Ce n'est pas un jour ouvré, reporter au prochain jour ouvré
        return await getNextWorkingDay(date, calendar);
      }

      // Vérifier si c'est dans les heures ouvrées
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      const [startHour, startMin] = calendar.working_hours_start.split(':').map(Number);
      const [endHour, endMin] = calendar.working_hours_end.split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      if (timeInMinutes < startTimeInMinutes) {
        // Avant les heures ouvrées, reporter au début des heures ouvrées
        const adjusted = new Date(date);
        adjusted.setHours(startHour, startMin, 0, 0);
        return adjusted;
      } else if (timeInMinutes > endTimeInMinutes) {
        // Après les heures ouvrées, reporter au début du prochain jour ouvré
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return await getNextWorkingDay(nextDay, calendar);
      }

      // Vérifier si c'est un jour férié
      if (await isHoliday(date, calendar)) {
        return await getNextWorkingDay(date, calendar);
      }

      // Vérifier si c'est dans une période de vacances
      if (await isVacationPeriod(date, calendar)) {
        return await getNextWorkingDay(date, calendar);
      }

      return date;
    } catch (err) {
      console.error('Error adjusting to business hours:', err);
      return date;
    }
  };

  const getNextWorkingDay = async (date: Date, calendar: any): Promise<Date> => {
    let nextDate = new Date(date);
    let attempts = 0;
    const maxAttempts = 14; // Maximum 2 semaines

    while (attempts < maxAttempts) {
      nextDate.setDate(nextDate.getDate() + 1);
      const dayOfWeek = nextDate.getDay();
      const workingDay = dayOfWeek === 0 ? 7 : dayOfWeek;

      if (calendar.working_days.includes(workingDay)) {
        if (!(await isHoliday(nextDate, calendar)) && !(await isVacationPeriod(nextDate, calendar))) {
          // Définir l'heure au début des heures ouvrées
          const [startHour, startMin] = calendar.working_hours_start.split(':').map(Number);
          nextDate.setHours(startHour, startMin, 0, 0);
          return nextDate;
        }
      }

      attempts++;
    }

    // Si on n'a pas trouvé de jour ouvré, retourner la date originale
    return date;
  };

  const isHoliday = async (date: Date, calendar: any): Promise<boolean> => {
    if (!calendar.holidays || calendar.holidays.length === 0) {
      return false;
    }

    const dateStr = date.toISOString().split('T')[0];
    return calendar.holidays.some((holiday: any) => holiday.date === dateStr);
  };

  const isVacationPeriod = async (date: Date, calendar: any): Promise<boolean> => {
    if (!calendar.vacation_periods || calendar.vacation_periods.length === 0) {
      return false;
    }

    const dateStr = date.toISOString().split('T')[0];
    return calendar.vacation_periods.some((period: any) => {
      return dateStr >= period.start && dateStr <= period.end;
    });
  };

  const scheduleTrigger = async (
    trigger: TimeTrigger,
    lead: Lead,
    eventId: string,
    eventType: string,
    eventDate: Date
  ): Promise<TimeTriggerExecution> => {
    try {
      setLoading(true);

      // Calculer le délai
      const { delayHours, reason } = await calculateDelay(trigger, lead, eventDate);

      // Calculer l'heure d'exécution
      const scheduledAt = await calculateScheduledTime(eventDate, delayHours, trigger, lead);

      // Créer l'exécution
      const { data, error: insertError } = await supabase
        .from('time_trigger_executions')
        .insert({
          time_trigger_id: trigger.id,
          lead_id: lead.id,
          event_id: eventId,
          event_type: eventType,
          scheduled_at: scheduledAt.toISOString(),
          execution_status: 'pending',
          delay_applied: delayHours,
          delay_reason: reason,
          timezone_used: trigger.timezoneConfig.defaultTimezone || 'Europe/Paris',
          business_hours_respected: trigger.businessHoursConfig.respectBusinessHours || false,
          metadata: {
            triggerName: trigger.name,
            eventDate: eventDate.toISOString(),
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const execution: TimeTriggerExecution = {
        id: data.id,
        timeTriggerId: data.time_trigger_id,
        leadId: data.lead_id,
        eventId: data.event_id,
        eventType: data.event_type,
        scheduledAt: data.scheduled_at,
        executedAt: data.executed_at,
        executionStatus: data.execution_status,
        delayApplied: data.delay_applied,
        delayReason: data.delay_reason,
        timezoneUsed: data.timezone_used,
        businessHoursRespected: data.business_hours_respected,
        errorMessage: data.error_message,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setError(null);
      return execution;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    calculateDelay,
    calculateScheduledTime,
    scheduleTrigger,
  };
};

