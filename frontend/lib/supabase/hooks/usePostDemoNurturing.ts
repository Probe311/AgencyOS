import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useEmailSequences } from './useEmailSequences';
import { useAutomatedTasks } from './useAutomatedTasks';

export type DemoType = 'discovery' | 'product' | 'technical' | 'custom';
export type InterestLevel = 'high' | 'medium' | 'low' | 'none';
export type NurturingStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Demo {
  id: string;
  leadId: string;
  demoType: DemoType;
  scheduledAt: string;
  completedAt?: string;
  durationMinutes?: number;
  participants: Array<{ name: string; role?: string; email?: string }>;
  demoNotes?: string;
  interestLevel?: InterestLevel;
  interestExpressed: boolean;
  needsIdentified: Record<string, any>;
  budgetDiscussed: boolean;
  budgetRange?: string;
  nextSteps?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  conductedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostDemoNurturing {
  id: string;
  demoId: string;
  leadId: string;
  nurturingStatus: NurturingStatus;
  currentStep: number;
  thankYouEmailSent: boolean;
  sequenceEnrolled: boolean;
  sequenceId?: string;
  quoteCreated: boolean;
  quoteId?: string;
  lastContactDate?: string;
  responseReceived: boolean;
  escalated: boolean;
  metadata: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePostDemoNurturing = () => {
  const { enrollLead } = useEmailSequences();
  const { createFollowUpTask } = useAutomatedTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startNurturingAfterDemo = async (demo: Demo, lead: Lead): Promise<PostDemoNurturing> => {
    try {
      setLoading(true);

      // Créer l'enregistrement de nurturing
      const { data, error: insertError } = await supabase
        .from('post_demo_nurturing')
        .insert({
          demo_id: demo.id,
          lead_id: lead.id,
          nurturing_status: 'active',
          metadata: {
            demoType: demo.demoType,
            interestLevel: demo.interestLevel,
            needsIdentified: demo.needsIdentified,
            budgetRange: demo.budgetRange,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const nurturing: PostDemoNurturing = {
        id: data.id,
        demoId: data.demo_id,
        leadId: data.lead_id,
        nurturingStatus: data.nurturing_status,
        currentStep: data.current_step,
        thankYouEmailSent: data.thank_you_email_sent,
        sequenceEnrolled: data.sequence_enrolled,
        sequenceId: data.sequence_id,
        quoteCreated: data.quote_created,
        quoteId: data.quote_id,
        lastContactDate: data.last_contact_date,
        responseReceived: data.response_received,
        escalated: data.escalated,
        metadata: data.metadata,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Exécuter les actions automatiques
      await executeNurturingActions(nurturing, demo, lead);

      setError(null);
      return nurturing;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeNurturingActions = async (
    nurturing: PostDemoNurturing,
    demo: Demo,
    lead: Lead
  ) => {
    try {
      // 1. Envoyer l'email de remerciement
      await sendThankYouEmail(nurturing, demo, lead);

      // 2. Inscrire dans la séquence de nurturing
      await enrollInNurturingSequence(nurturing, demo, lead);

      // 3. Créer un devis si intérêt exprimé
      if (demo.interestExpressed && demo.budgetDiscussed) {
        await createQuoteTask(nurturing, demo, lead);
      }

      // 4. Planifier le suivi automatique
      await scheduleFollowUp(nurturing, demo, lead);
    } catch (err) {
      console.error('Error executing nurturing actions:', err);
    }
  };

  const sendThankYouEmail = async (nurturing: PostDemoNurturing, demo: Demo, lead: Lead) => {
    try {
      // TODO: Intégrer avec le système d'envoi d'emails
      // Pour l'instant, on marque juste comme envoyé
      await supabase
        .from('post_demo_nurturing')
        .update({
          thank_you_email_sent: true,
        })
        .eq('id', nurturing.id);
    } catch (err) {
      console.error('Error sending thank you email:', err);
    }
  };

  const enrollInNurturingSequence = async (
    nurturing: PostDemoNurturing,
    demo: Demo,
    lead: Lead
  ) => {
    try {
      // Trouver une séquence de nurturing post-demo
      const { data: nurturingSequence } = await supabase
        .from('email_sequences')
        .select('id')
        .eq('scenario_type', 'nurturing')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (nurturingSequence) {
        await enrollLead(nurturingSequence.id, lead.id, {
          demoId: demo.id,
          demoType: demo.demoType,
          interestLevel: demo.interestLevel,
          needsIdentified: demo.needsIdentified,
        });

        await supabase
          .from('post_demo_nurturing')
          .update({
            sequence_enrolled: true,
            sequence_id: nurturingSequence.id,
          })
          .eq('id', nurturing.id);
      }
    } catch (err) {
      console.error('Error enrolling in nurturing sequence:', err);
    }
  };

  const createQuoteTask = async (nurturing: PostDemoNurturing, demo: Demo, lead: Lead) => {
    try {
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: lead.assignedTo,
          title: `Créer devis pour ${lead.name || lead.company}`,
          description: `Intérêt exprimé pendant la demo. Besoin et budget identifiés. Créer un devis personnalisé.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // J+2
          tags: ['Devis', 'Post-Demo', 'Intéressé'],
          metadata: {
            demoId: demo.id,
            nurturingId: nurturing.id,
            budgetRange: demo.budgetRange,
            needsIdentified: demo.needsIdentified,
          },
        });

      await supabase
        .from('post_demo_nurturing')
        .update({ quote_created: true })
        .eq('id', nurturing.id);
    } catch (err) {
      console.error('Error creating quote task:', err);
    }
  };

  const scheduleFollowUp = async (nurturing: PostDemoNurturing, demo: Demo, lead: Lead) => {
    try {
      // Planifier le suivi après 7 jours si pas de réponse
      // TODO: Utiliser un système de jobs/cron pour planifier
      // Pour l'instant, on crée une tâche programmée
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: lead.assignedTo,
          title: `Relancer post-demo : ${lead.name || lead.company}`,
          description: `Pas de réponse après la demo. Relancer avec questions ouvertes.`,
          priority: 'Moyenne',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // J+7
          tags: ['Post-Demo', 'Relance'],
          metadata: {
            demoId: demo.id,
            nurturingId: nurturing.id,
          },
        });
    } catch (err) {
      console.error('Error scheduling follow-up:', err);
    }
  };

  const checkAndEscalate = async (nurturing: PostDemoNurturing, lead: Lead) => {
    try {
      // Vérifier si pas de réponse après 14 jours
      if (!nurturing.lastContactDate) return;

      const daysSinceLastContact = Math.floor(
        (Date.now() - new Date(nurturing.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastContact >= 14 && !nurturing.escalated) {
        // Escalade
        await supabase
          .from('automated_tasks')
          .insert({
            task_type: 'follow_up',
            lead_id: lead.id,
            assigned_to: lead.assignedTo,
            title: `Escalade post-demo : ${lead.name || lead.company}`,
            description: `Pas de réponse depuis 14 jours après la demo. Escalade requise.`,
            priority: 'Haute',
            tags: ['Post-Demo', 'Escalade'],
            metadata: {
              nurturingId: nurturing.id,
              daysSinceLastContact,
            },
          });

        await supabase
          .from('post_demo_nurturing')
          .update({ escalated: true })
          .eq('id', nurturing.id);
      }
    } catch (err) {
      console.error('Error checking and escalating:', err);
    }
  };

  return {
    loading,
    error,
    startNurturingAfterDemo,
    checkAndEscalate,
  };
};

