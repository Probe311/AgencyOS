import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead, EmailTemplate } from '../../../types';

export type ScenarioType = 'onboarding' | 'nurturing' | 'reactivation' | 'relance' | 'conversion' | 'retention' | 'custom';

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  scenarioType?: ScenarioType;
  triggerConditions: {
    temperature?: string[];
    daysInactive?: number;
    lifecycleStage?: string[];
    scoring?: { min?: number; max?: number };
    tags?: string[];
    [key: string]: any;
  };
  isActive: boolean;
  pauseOnEngagement: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  steps?: EmailSequenceStep[];
}

export interface EmailSequenceStep {
  id: string;
  sequenceId: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  templateId?: string;
  subject?: string;
  content?: string;
  personalizationRules?: Record<string, any>;
  escalationLevel: number; // 1=email, 2=SMS, 3=appel
  conditions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequenceEnrollment {
  id: string;
  sequenceId: string;
  leadId: string;
  enrollmentDate: string;
  currentStep: number;
  nextSendAt?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  pausedReason?: string;
  completedAt?: string;
  cancelledAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const useEmailSequences = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('email_sequences')
        .select(`
          *,
          email_sequence_steps (*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: EmailSequence[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        scenarioType: s.scenario_type,
        triggerConditions: s.trigger_conditions || {},
        isActive: s.is_active,
        pauseOnEngagement: s.pause_on_engagement,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        steps: (s.email_sequence_steps || []).map((step: any) => ({
          id: step.id,
          sequenceId: step.sequence_id,
          stepOrder: step.step_order,
          delayDays: step.delay_days,
          delayHours: step.delay_hours,
          templateId: step.template_id,
          subject: step.subject,
          content: step.content,
          personalizationRules: step.personalization_rules || {},
          escalationLevel: step.escalation_level || 1,
          conditions: step.conditions || {},
          createdAt: step.created_at,
          updatedAt: step.updated_at,
        })).sort((a: EmailSequenceStep, b: EmailSequenceStep) => a.stepOrder - b.stepOrder),
      }));

      setSequences(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading email sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSequence = async (sequence: Omit<EmailSequence, 'id' | 'createdAt' | 'updatedAt' | 'steps'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('email_sequences')
        .insert({
          name: sequence.name,
          description: sequence.description,
          scenario_type: sequence.scenarioType,
          trigger_conditions: sequence.triggerConditions,
          is_active: sequence.isActive,
          pause_on_engagement: sequence.pauseOnEngagement,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newSequence: EmailSequence = {
        id: data.id,
        name: data.name,
        description: data.description,
        scenarioType: data.scenario_type,
        triggerConditions: data.trigger_conditions,
        isActive: data.is_active,
        pauseOnEngagement: data.pause_on_engagement,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        steps: [],
      };

      setSequences([newSequence, ...sequences]);
      return newSequence;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const addStep = async (sequenceId: string, step: Omit<EmailSequenceStep, 'id' | 'sequenceId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('email_sequence_steps')
        .insert({
          sequence_id: sequenceId,
          step_order: step.stepOrder,
          delay_days: step.delayDays,
          delay_hours: step.delayHours,
          template_id: step.templateId && step.templateId.trim() !== '' ? step.templateId : null,
          subject: step.subject,
          content: step.content,
          personalization_rules: step.personalizationRules || {},
          escalation_level: step.escalationLevel,
          conditions: step.conditions || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadSequences();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const enrollLead = async (sequenceId: string, leadId: string, metadata?: Record<string, any>): Promise<EmailSequenceEnrollment> => {
    try {
      // Vérifier si une inscription active existe déjà
      const { data: existingEnrollment } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .eq('sequence_id', sequenceId)
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .maybeSingle();

      // Si une inscription active existe déjà, la retourner
      if (existingEnrollment) {
        return {
          id: existingEnrollment.id,
          sequenceId: existingEnrollment.sequence_id,
          leadId: existingEnrollment.lead_id,
          enrollmentDate: existingEnrollment.enrollment_date,
          currentStep: existingEnrollment.current_step,
          nextSendAt: existingEnrollment.next_send_at,
          status: existingEnrollment.status,
          pausedReason: existingEnrollment.paused_reason,
          completedAt: existingEnrollment.completed_at,
          cancelledAt: existingEnrollment.cancelled_at,
          metadata: existingEnrollment.metadata || {},
          createdAt: existingEnrollment.created_at,
          updatedAt: existingEnrollment.updated_at,
        };
      }

      // Récupérer la séquence
      const sequence = sequences.find(s => s.id === sequenceId);
      if (!sequence) throw new Error('Séquence non trouvée');

      // Calculer le prochain envoi (première étape)
      const firstStep = sequence.steps?.[0];
      const nextSendAt = firstStep
        ? new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000 + firstStep.delayHours * 60 * 60 * 1000).toISOString()
        : undefined;

      // Récupérer les métadonnées du lead
      const { data: lead } = await supabase
        .from('leads')
        .select('temperature, family, source, lifecycle_stage')
        .eq('id', leadId)
        .single();

      const enrollmentMetadata = {
        ...metadata,
        temperature: lead?.temperature,
        family: lead?.family,
        source: lead?.source,
        lifecycleStage: lead?.lifecycle_stage,
      };

      const { data, error: insertError } = await supabase
        .from('email_sequence_enrollments')
        .insert({
          sequence_id: sequenceId,
          lead_id: leadId,
          current_step: 1,
          next_send_at: nextSendAt,
          status: 'active',
          metadata: enrollmentMetadata,
        })
        .select()
        .single();

      if (insertError) {
        // Si l'erreur est due à la contrainte unique, vérifier à nouveau
        if (insertError.code === '23505' || insertError.message?.includes('unique')) {
          const { data: retryEnrollment } = await supabase
            .from('email_sequence_enrollments')
            .select('*')
            .eq('sequence_id', sequenceId)
            .eq('lead_id', leadId)
            .eq('status', 'active')
            .maybeSingle();

          if (retryEnrollment) {
            return {
              id: retryEnrollment.id,
              sequenceId: retryEnrollment.sequence_id,
              leadId: retryEnrollment.lead_id,
              enrollmentDate: retryEnrollment.enrollment_date,
              currentStep: retryEnrollment.current_step,
              nextSendAt: retryEnrollment.next_send_at,
              status: retryEnrollment.status,
              pausedReason: retryEnrollment.paused_reason,
              completedAt: retryEnrollment.completed_at,
              cancelledAt: retryEnrollment.cancelled_at,
              metadata: retryEnrollment.metadata || {},
              createdAt: retryEnrollment.created_at,
              updatedAt: retryEnrollment.updated_at,
            };
          }
        }
        throw insertError;
      }

      const enrollment: EmailSequenceEnrollment = {
        id: data.id,
        sequenceId: data.sequence_id,
        leadId: data.lead_id,
        enrollmentDate: data.enrollment_date,
        currentStep: data.current_step,
        nextSendAt: data.next_send_at,
        status: data.status,
        pausedReason: data.paused_reason,
        completedAt: data.completed_at,
        cancelledAt: data.cancelled_at,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return enrollment;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const pauseEnrollment = async (enrollmentId: string, reason: string) => {
    try {
      const { data, error: updateError } = await supabase
        .from('email_sequence_enrollments')
        .update({
          status: 'paused',
          paused_reason: reason,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const checkAndEnrollLeads = async (sequenceId: string) => {
    try {
      const sequence = sequences.find(s => s.id === sequenceId);
      if (!sequence || !sequence.isActive) return;

      const conditions = sequence.triggerConditions;
      let query = supabase.from('leads').select('id');

      // Appliquer les conditions
      if (conditions.temperature) {
        query = query.in('temperature', conditions.temperature);
      }

      if (conditions.lifecycleStage) {
        query = query.in('lifecycle_stage', conditions.lifecycleStage);
      }

      if (conditions.daysInactive) {
        const cutoffDate = new Date(Date.now() - conditions.daysInactive * 24 * 60 * 60 * 1000);
        query = query.lte('last_activity_date', cutoffDate.toISOString());
      }

      if (conditions.scoring) {
        // TODO: Joindre avec lead_quality_scores pour filtrer par scoring
      }

      const { data: matchingLeads, error: leadsError } = await query;

      if (leadsError) throw leadsError;

      // Vérifier qu'ils ne sont pas déjà inscrits
      const leadIds = (matchingLeads || []).map((l: any) => l.id).filter((id: string) => id && id.trim() !== '');
      
      if (leadIds.length === 0) {
        return 0;
      }

      const { data: existingEnrollments } = await supabase
        .from('email_sequence_enrollments')
        .select('lead_id')
        .eq('sequence_id', sequenceId)
        .eq('status', 'active')
        .in('lead_id', leadIds);

      const existingLeadIds = new Set(existingEnrollments?.map((e: any) => e.lead_id) || []);
      const newLeads = (matchingLeads || []).filter((l: any) => l.id && !existingLeadIds.has(l.id));

      // Inscrire les nouveaux leads
      let enrolledCount = 0;
      for (const lead of newLeads) {
        if (lead.id && lead.id.trim() !== '') {
          try {
            await enrollLead(sequenceId, lead.id);
            enrolledCount++;
          } catch (err) {
            console.error(`Error enrolling lead ${lead.id}:`, err);
          }
        }
      }

      return enrolledCount;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const checkEngagementAndPause = async (enrollmentId: string) => {
    try {
      const { data: enrollment } = await supabase
        .from('email_sequence_enrollments')
        .select('*, email_sequences!inner(pause_on_engagement)')
        .eq('id', enrollmentId)
        .single();

      if (!enrollment || !enrollment.email_sequences?.pause_on_engagement) return;

      // Vérifier l'engagement récent (dernières 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: recentEngagements } = await supabase
        .from('lead_engagement')
        .select('id')
        .eq('lead_id', enrollment.lead_id)
        .gte('engagement_date', yesterday.toISOString())
        .in('engagement_type', ['email_open', 'email_click', 'site_visit', 'download', 'form_submit']);

      if (recentEngagements && recentEngagements.length > 0) {
        // Engagement détecté, pauser la séquence
        await pauseEnrollment(enrollmentId, 'Engagement détecté');
      }
    } catch (err) {
      console.error('Error checking engagement:', err);
    }
  };

  const updateSequence = async (sequenceId: string, updates: Partial<Omit<EmailSequence, 'id' | 'createdAt' | 'updatedAt' | 'steps'>>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('email_sequences')
        .update({
          name: updates.name,
          description: updates.description,
          scenario_type: updates.scenarioType,
          trigger_conditions: updates.triggerConditions,
          is_active: updates.isActive,
          pause_on_engagement: updates.pauseOnEngagement,
        })
        .eq('id', sequenceId)
        .select()
        .single();

      if (updateError) throw updateError;

      await loadSequences();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteSequence = async (sequenceId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('email_sequences')
        .delete()
        .eq('id', sequenceId);

      if (deleteError) throw deleteError;

      await loadSequences();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    sequences,
    loading,
    error,
    loadSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    addStep,
    enrollLead,
    pauseEnrollment,
    checkAndEnrollLeads,
    checkEngagementAndPause,
  };
};

