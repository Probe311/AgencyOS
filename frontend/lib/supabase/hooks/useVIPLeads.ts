import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';

export type PriorityLevel = 'high' | 'critical' | 'urgent';
export type ContactAttemptType = 'email' | 'call' | 'sms' | 'linkedin' | 'meeting';
export type ContactAttemptStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed' | 'no_answer';

export interface VIPLead {
  id: string;
  leadId: string;
  vipReason: string;
  vipCriteria: {
    highScore?: boolean;
    highValue?: boolean;
    manualTag?: boolean;
    fortune500?: boolean;
    cLevel?: boolean;
    [key: string]: any;
  };
  potentialValue?: number;
  priorityLevel: PriorityLevel;
  assignedTo?: string;
  escalationLevel: number; // 0=commercial, 1=manager, 2=direction
  lastContactAttempt?: string;
  contactAttemptsCount: number;
  escalatedAt?: string;
  specialHandling: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VIPContactAttempt {
  id: string;
  vipLeadId: string;
  attemptType: ContactAttemptType;
  attemptDate: string;
  attemptNumber: number;
  status: ContactAttemptStatus;
  responseReceived: boolean;
  responseDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export const useVIPLeads = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectVIPLead = async (lead: Lead, minScore: number = 90, minValue: number = 50000): Promise<VIPLead | null> => {
    try {
      setLoading(true);

      const criteria: Record<string, any> = {};
      let isVIP = false;
      let priorityLevel: PriorityLevel = 'high';
      let potentialValue = 0;

      // 1. Vérifier le scoring et l'autorité BANT
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_score, bant_authority')
        .eq('lead_id', lead.id)
        .single();

      const score = qualification?.qualification_score || 0;
      if (score >= minScore) {
        criteria.highScore = true;
        isVIP = true;
      }

      // 2. Vérifier la valeur potentielle
      // TODO: Récupérer depuis les devis ou estimation
      if (potentialValue >= minValue) {
        criteria.highValue = true;
        isVIP = true;
        if (potentialValue >= 100000) {
          priorityLevel = 'critical';
        }
      }

      // 3. Vérifier le tag VIP manuel
      // TODO: Vérifier les tags du lead
      // if (lead.tags?.includes('VIP')) {
      //   criteria.manualTag = true;
      //   isVIP = true;
      // }

      // 4. Vérifier si Fortune 500 ou équivalent
      // TODO: Intégrer avec données d'enrichissement
      // if (lead.companySize === 'Fortune 500') {
      //   criteria.fortune500 = true;
      //   isVIP = true;
      // }

      // 5. Vérifier si C-level identifié
      if (qualification?.bant_authority === 'decision_maker') {
        criteria.cLevel = true;
        isVIP = true;
      }

      if (!isVIP) {
        return null;
      }

      // Vérifier si déjà enregistré comme VIP
      const { data: existingVIP } = await supabase
        .from('vip_leads')
        .select('*')
        .eq('lead_id', lead.id)
        .single();

      if (existingVIP) {
        // Mettre à jour si nécessaire
        const { data: updated } = await supabase
          .from('vip_leads')
          .update({
            vip_criteria: criteria,
            potential_value: potentialValue,
            priority_level: priorityLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVIP.id)
          .select()
          .single();

        return mapToVIPLead(updated);
      }

      // Créer le lead VIP
      const { data, error: insertError } = await supabase
        .from('vip_leads')
        .insert({
          lead_id: lead.id,
          vip_reason: Object.keys(criteria).join(', '),
          vip_criteria: criteria,
          potential_value: potentialValue,
          priority_level: priorityLevel,
          special_handling: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const vipLead = mapToVIPLead(data);

      // Traiter le lead VIP
      await processVIPLead(vipLead, lead);

      setError(null);
      return vipLead;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const mapToVIPLead = (data: any): VIPLead => ({
    id: data.id,
    leadId: data.lead_id,
    vipReason: data.vip_reason,
    vipCriteria: data.vip_criteria || {},
    potentialValue: data.potential_value,
    priorityLevel: data.priority_level,
    assignedTo: data.assigned_to,
    escalationLevel: data.escalation_level || 0,
    lastContactAttempt: data.last_contact_attempt,
    contactAttemptsCount: data.contact_attempts_count || 0,
    escalatedAt: data.escalated_at,
    specialHandling: data.special_handling,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });

  const processVIPLead = async (vipLead: VIPLead, lead: Lead) => {
    try {
      // 1. Attribution prioritaire
      await assignPriority(vipLead, lead);

      // 2. Séquence de contact accélérée
      await startAcceleratedContactSequence(vipLead, lead);

      // 3. Notification immédiate
      await sendImmediateNotification(vipLead, lead);
    } catch (err) {
      console.error('Error processing VIP lead:', err);
    }
  };

  const assignPriority = async (vipLead: VIPLead, lead: Lead) => {
    try {
      // Si valeur > 100k€, attribuer au manager
      if (vipLead.potentialValue && vipLead.potentialValue >= 100000) {
        const { data: managers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Admin'])
          .limit(1);

        if (managers && managers.length > 0) {
          await supabase
            .from('vip_leads')
            .update({ assigned_to: managers[0].id })
            .eq('id', vipLead.id);

          await supabase
            .from('leads')
            .update({ assigned_to: managers[0].id })
            .eq('id', lead.id);
        }
      } else {
        // Attribuer aux meilleurs commerciaux (top 20%)
        // TODO: Implémenter la logique de sélection des top performers
        // Pour l'instant, on utilise les règles d'attribution standard
      }
    } catch (err) {
      console.error('Error assigning priority:', err);
    }
  };

  const startAcceleratedContactSequence = async (vipLead: VIPLead, lead: Lead) => {
    try {
      // J+0 : Email personnalisé
      await recordContactAttempt(vipLead.id, 'email', 1, lead);

      // Récupérer le commercial assigné depuis la base de données si nécessaire
      let assignedTo = vipLead.assignedTo;
      if (!assignedTo) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('assigned_to')
          .eq('id', lead.id)
          .single();
        assignedTo = leadData?.assigned_to || null;
      }

      // J+0 : Tâche d'appel immédiat
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: assignedTo,
          title: `Appeler lead VIP : ${lead.name || lead.company}`,
          description: `Lead VIP détecté. Appel immédiat requis. Priorité : ${vipLead.priorityLevel}`,
          priority: 'Urgente',
          due_date: new Date().toISOString(), // Immédiat
          tags: ['VIP', 'Urgent', 'Appel'],
          metadata: {
            vipLeadId: vipLead.id,
            potentialValue: vipLead.potentialValue,
          },
        });

      // Planifier les relances (J+1, J+2, J+3)
      // TODO: Utiliser un système de jobs/cron pour planifier
    } catch (err) {
      console.error('Error starting contact sequence:', err);
    }
  };

  const recordContactAttempt = async (
    vipLeadId: string,
    attemptType: ContactAttemptType,
    attemptNumber: number,
    lead: Lead
  ): Promise<VIPContactAttempt> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('vip_contact_attempts')
        .insert({
          vip_lead_id: vipLeadId,
          attempt_type: attemptType,
          attempt_number: attemptNumber,
          status: attemptType === 'email' ? 'sent' : 'pending',
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Mettre à jour le compteur de tentatives
      await supabase
        .from('vip_leads')
        .update({
          contact_attempts_count: attemptNumber,
          last_contact_attempt: new Date().toISOString(),
        })
        .eq('id', vipLeadId);

      const attempt: VIPContactAttempt = {
        id: data.id,
        vipLeadId: data.vip_lead_id,
        attemptType: data.attempt_type,
        attemptDate: data.attempt_date,
        attemptNumber: data.attempt_number,
        status: data.status,
        responseReceived: data.response_received,
        responseDate: data.response_date,
        notes: data.notes,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };

      return attempt;
    } catch (err) {
      throw err;
    }
  };

  const escalateVIPLead = async (vipLead: VIPLead, lead: Lead) => {
    try {
      const newEscalationLevel = vipLead.escalationLevel + 1;

      if (newEscalationLevel === 1) {
        // Escalade vers manager
        const { data: managers } = await supabase
          .from('users')
          .select('id, name, email')
          .in('role', ['Manager', 'Admin'])
          .limit(1);

        if (managers && managers.length > 0) {
          await supabase
            .from('vip_leads')
            .update({
              escalation_level: 1,
              assigned_to: managers[0].id,
              escalated_at: new Date().toISOString(),
            })
            .eq('id', vipLead.id);

          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: lead.id,
              assigned_to: managers[0].id,
              title: `Escalade VIP : ${lead.name || lead.company}`,
              description: `Lead VIP sans réponse depuis 24h. Escalade vers manager.`,
              priority: 'Urgente',
              tags: ['VIP', 'Escalade', 'Manager'],
            });
        }
      } else if (newEscalationLevel === 2) {
        // Escalade vers direction
        const { data: directors } = await supabase
          .from('users')
          .select('id, name, email')
          .in('role', ['Admin', 'SuperAdmin'])
          .limit(1);

        if (directors && directors.length > 0) {
          await supabase
            .from('vip_leads')
            .update({
              escalation_level: 2,
              assigned_to: directors[0].id,
              escalated_at: new Date().toISOString(),
            })
            .eq('id', vipLead.id);

          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: lead.id,
              assigned_to: directors[0].id,
              title: `Escalade VIP critique : ${lead.name || lead.company}`,
              description: `Lead VIP sans réponse depuis 48h. Escalade vers direction.`,
              priority: 'Urgente',
              tags: ['VIP', 'Escalade', 'Direction'],
            });
        }
      }
    } catch (err) {
      console.error('Error escalating VIP lead:', err);
    }
  };

  const sendImmediateNotification = async (vipLead: VIPLead, lead: Lead) => {
    try {
      // Créer une notification in-app
      // TODO: Intégrer avec système de notifications

      // Envoyer un email
      // TODO: Intégrer avec système d'envoi d'emails

      // Envoyer un SMS si configuré
      // TODO: Intégrer avec service SMS
    } catch (err) {
      console.error('Error sending immediate notification:', err);
    }
  };

  const checkVIPLeadsForEscalation = async () => {
    try {
      setLoading(true);

      // Récupérer les leads VIP sans réponse depuis 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: vipLeads } = await supabase
        .from('vip_leads')
        .select('*, leads(*)')
        .or(`last_contact_attempt.is.null,last_contact_attempt.lt.${yesterday.toISOString()}`)
        .eq('escalation_level', 0);

      if (!vipLeads) return;

      for (const vipData of vipLeads) {
        const vipLead = mapToVIPLead(vipData);
        const lead = (vipData as any).leads;

        if (lead) {
          await escalateVIPLead(vipLead, lead);
        }
      }
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
    detectVIPLead,
    recordContactAttempt,
    escalateVIPLead,
    checkVIPLeadsForEscalation,
  };
};

