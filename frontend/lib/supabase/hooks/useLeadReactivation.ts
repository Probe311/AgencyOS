import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useInterestSignals, SignalType } from './useInterestSignals';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useLeadAssignment } from './useLeadAssignment';

export interface LeadReactivation {
  id: string;
  leadId: string;
  originalStatus: string;
  reactivationReason: string;
  signalType: SignalType;
  signalData: Record<string, any>;
  newScore?: number;
  originalCommercialId?: string;
  assignedCommercialId?: string;
  reactivatedAt: string;
  notificationSent: boolean;
  taskCreated: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useLeadReactivation = () => {
  const { detectSignal } = useInterestSignals();
  const { createFollowUpTask } = useAutomatedTasks();
  const { assignLead } = useLeadAssignment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reactivateLostLead = async (
    lead: Lead,
    signalType: SignalType,
    signalData: Record<string, any>,
    minScore: number = 50
  ): Promise<LeadReactivation | null> => {
    try {
      setLoading(true);

      // Vérifier que le lead est bien "Perdu"
      if (lead.lifecycleStage !== 'Perdu') {
        throw new Error('Le lead n\'est pas marqué comme perdu');
      }

      // Vérifier le scoring actuel
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_score')
        .eq('lead_id', lead.id)
        .single();

      const currentScore = qualification?.qualification_score || 0;

      if (currentScore < minScore) {
        // Score insuffisant pour réactivation
        return null;
      }

      // Récupérer le commercial d'origine depuis la base de données
      const { data: leadData } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', lead.id)
        .single();
      
      const originalCommercialId = leadData?.assigned_to || null;

      // Vérifier si le commercial d'origine est toujours disponible
      let assignedCommercialId: string | null = null;
      
      if (originalCommercialId) {
        const { data: originalCommercial } = await supabase
          .from('users')
          .select('id, role, status')
          .eq('id', originalCommercialId)
          .single();

        if (originalCommercial && 
            originalCommercial.role !== 'Inactif' && 
            originalCommercial.status === 'Actif') {
          // Vérifier la charge de travail
          const { data: activeLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('assigned_to', originalCommercialId)
            .not('lifecycle_stage', 'eq', 'Perdu')
            .not('lifecycle_stage', 'eq', 'Inactif');

          // Si moins de 20 leads actifs, réassigner au commercial d'origine
          if (activeLeads && activeLeads.length < 20) {
            assignedCommercialId = originalCommercialId;
          }
        }
      }

      // Si pas de commercial d'origine ou surchargé, utiliser les règles d'attribution
      if (!assignedCommercialId) {
        assignedCommercialId = await assignLead(lead);
      }

      // Enregistrer la réactivation
      const { data, error: insertError } = await supabase
        .from('lead_reactivation')
        .insert({
          lead_id: lead.id,
          original_status: lead.lifecycleStage,
          reactivation_reason: `Signal d'intérêt détecté : ${signalType}`,
          signal_type: signalType,
          signal_data: signalData,
          new_score: currentScore,
          original_commercial_id: originalCommercialId,
          assigned_commercial_id: assignedCommercialId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Mettre à jour le statut du lead
      const newStatus = currentScore >= 75 ? 'MQL' : 'Lead';
      await supabase
        .from('leads')
        .update({
          lifecycle_stage: newStatus,
          assigned_to: assignedCommercialId,
          temperature: 'Tiède',
          last_activity_date: new Date().toISOString(),
          // TODO: Retirer le tag "Perdu" et ajouter "Réactivé"
        })
        .eq('id', lead.id);

      const reactivation: LeadReactivation = {
        id: data.id,
        leadId: data.lead_id,
        originalStatus: data.original_status,
        reactivationReason: data.reactivation_reason,
        signalType: data.signal_type,
        signalData: data.signal_data,
        newScore: data.new_score,
        originalCommercialId: data.original_commercial_id,
        assignedCommercialId: data.assigned_commercial_id,
        reactivatedAt: data.reactivated_at,
        notificationSent: data.notification_sent,
        taskCreated: data.task_created,
        metadata: data.metadata,
        createdAt: data.created_at,
      };

      // Envoyer la notification au commercial
      await sendReactivationNotification(reactivation, lead);

      // Créer la tâche de suivi
      await createReactivationTask(reactivation, lead);

      setError(null);
      return reactivation;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendReactivationNotification = async (reactivation: LeadReactivation, lead: Lead) => {
    try {
      // Récupérer l'historique du lead
      const { data: history } = await supabase
        .from('sales_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Récupérer les informations de qualification
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('*')
        .eq('lead_id', lead.id)
        .single();

      // Créer le contenu de la notification
      const notificationContent = {
        subject: `Lead ${lead.name || lead.company} réactivé - Signal d'intérêt détecté`,
        body: `
Lead réactivé : ${lead.name || lead.company}

Signal détecté : ${reactivation.signalType}
Score actuel : ${reactivation.newScore || 'N/A'}/100
Statut précédent : ${reactivation.originalStatus}
Nouveau statut : ${lead.lifecycleStage}

Historique :
${history?.map(h => `- ${h.type} : ${h.description}`).join('\n') || 'Aucun historique'}

Recommandations :
- Contacter rapidement le lead
- Mentionner le signal d'intérêt détecté
- Proposer une démo ou consultation
        `.trim(),
      };

      // TODO: Envoyer l'email au commercial assigné
      // Pour l'instant, on marque comme envoyé
      await supabase
        .from('lead_reactivation')
        .update({ notification_sent: true })
        .eq('id', reactivation.id);
    } catch (err) {
      console.error('Error sending reactivation notification:', err);
    }
  };

  const createReactivationTask = async (reactivation: LeadReactivation, lead: Lead) => {
    try {
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: reactivation.assignedCommercialId,
          title: `Contacter lead réactivé : ${lead.name || lead.company}`,
          description: `Lead réactivé après signal d'intérêt (${reactivation.signalType}). Score : ${reactivation.newScore || 'N/A'}/100. Contacter rapidement.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // J+1
          tags: ['Réactivé', 'Signal d\'intérêt', 'Prioritaire'],
          metadata: {
            reactivationId: reactivation.id,
            signalType: reactivation.signalType,
            originalStatus: reactivation.originalStatus,
          },
        });

      await supabase
        .from('lead_reactivation')
        .update({ task_created: true })
        .eq('id', reactivation.id);
    } catch (err) {
      console.error('Error creating reactivation task:', err);
    }
  };

  const checkAndReactivateLostLeads = async () => {
    try {
      setLoading(true);

      // Récupérer tous les leads perdus
      const { data: lostLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('lifecycle_stage', 'Perdu');

      if (!lostLeads) return [];

      const reactivations: LeadReactivation[] = [];

      for (const lead of lostLeads) {
        // Vérifier s'il y a des signaux d'intérêt récents
        const { data: recentSignals } = await supabase
          .from('interest_signals')
          .select('*')
          .eq('lead_id', lead.id)
          .eq('processed', false)
          .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 derniers jours
          .limit(1);

        if (recentSignals && recentSignals.length > 0) {
          const signal = recentSignals[0];
          try {
            const reactivation = await reactivateLostLead(
              lead,
              signal.signal_type as SignalType,
              signal.signal_data
            );
            if (reactivation) {
              reactivations.push(reactivation);
            }
          } catch (err) {
            console.error(`Error reactivating lead ${lead.id}:`, err);
          }
        }
      }

      return reactivations;
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
    reactivateLostLead,
    checkAndReactivateLostLeads,
  };
};

