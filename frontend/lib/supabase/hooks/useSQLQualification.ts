import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useLeadAssignment } from './useLeadAssignment';
import { useEmailSequences } from './useEmailSequences';

export type AuthorityLevel = 'decision_maker' | 'influencer' | 'user' | 'unknown';

export interface SQLQualificationCriteria {
  id: string;
  leadId: string;
  budgetIdentified: boolean;
  budgetAmount?: number;
  budgetRangeMin?: number;
  budgetRangeMax?: number;
  needExpressed: boolean;
  needDescription?: string;
  timelineMonths?: number;
  timelineAcceptable: boolean; // < 6 mois
  authorityIdentified: boolean;
  authorityLevel?: AuthorityLevel;
  engagementScore: number;
  allCriteriaMet: boolean;
  qualifiedAt?: string;
  qualifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useSQLQualification = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const { assignLead } = useLeadAssignment();
  const { enrollLead } = useEmailSequences();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkSQLCriteria = async (lead: Lead): Promise<SQLQualificationCriteria | null> => {
    try {
      setLoading(true);

      // Récupérer le score de qualification depuis la base de données
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_score')
        .eq('lead_id', lead.id)
        .single();

      const qualityScore = qualification?.qualification_score || 0;

      // Vérifier si le lead est MQL avec scoring >= 75
      if (lead.lifecycleStage !== 'MQL' || qualityScore < 75) {
        return null;
      }

      // Récupérer ou créer les critères de qualification
      const { data: existingCriteria } = await supabase
        .from('sql_qualification_criteria')
        .select('*')
        .eq('lead_id', lead.id)
        .single();

      let criteria: SQLQualificationCriteria;

      if (existingCriteria) {
        criteria = {
          id: existingCriteria.id,
          leadId: existingCriteria.lead_id,
          budgetIdentified: existingCriteria.budget_identified,
          budgetAmount: existingCriteria.budget_amount,
          budgetRangeMin: existingCriteria.budget_range_min,
          budgetRangeMax: existingCriteria.budget_range_max,
          needExpressed: existingCriteria.need_expressed,
          needDescription: existingCriteria.need_description,
          timelineMonths: existingCriteria.timeline_months,
          timelineAcceptable: existingCriteria.timeline_acceptable,
          authorityIdentified: existingCriteria.authority_identified,
          authorityLevel: existingCriteria.authority_level,
          engagementScore: existingCriteria.engagement_score || 0,
          allCriteriaMet: existingCriteria.all_criteria_met,
          qualifiedAt: existingCriteria.qualified_at,
          qualifiedBy: existingCriteria.qualified_by,
          createdAt: existingCriteria.created_at,
          updatedAt: existingCriteria.updated_at,
        };
      } else {
        // Créer les critères initiaux
        const { data: newCriteria, error: insertError } = await supabase
          .from('sql_qualification_criteria')
          .insert({
            lead_id: lead.id,
            budget_identified: false,
            need_expressed: false,
            timeline_acceptable: false,
            authority_identified: false,
            engagement_score: 0,
            all_criteria_met: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        criteria = {
          id: newCriteria.id,
          leadId: newCriteria.lead_id,
          budgetIdentified: newCriteria.budget_identified,
          budgetAmount: newCriteria.budget_amount,
          budgetRangeMin: newCriteria.budget_range_min,
          budgetRangeMax: newCriteria.budget_range_max,
          needExpressed: newCriteria.need_expressed,
          needDescription: newCriteria.need_description,
          timelineMonths: newCriteria.timeline_months,
          timelineAcceptable: newCriteria.timeline_acceptable,
          authorityIdentified: newCriteria.authority_identified,
          authorityLevel: newCriteria.authority_level,
          engagementScore: newCriteria.engagement_score || 0,
          allCriteriaMet: newCriteria.all_criteria_met,
          qualifiedAt: newCriteria.qualified_at,
          qualifiedBy: newCriteria.qualified_by,
          createdAt: newCriteria.created_at,
          updatedAt: newCriteria.updated_at,
        };
      }

      // Analyser les critères depuis les données du lead
      await analyzeCriteria(criteria, lead);

      // Vérifier si tous les critères sont remplis
      const allMet = 
        criteria.budgetIdentified &&
        criteria.needExpressed &&
        criteria.timelineAcceptable &&
        criteria.authorityIdentified &&
        criteria.engagementScore >= 3; // Au moins 3 interactions

      if (allMet && !criteria.allCriteriaMet) {
        // Qualifier comme SQL
        await qualifyAsSQL(criteria, lead);
      } else if (!criteria.allCriteriaMet) {
        // Notifier le commercial pour qualification manuelle
        await notifyForQualification(criteria, lead);
      }

      setError(null);
      return criteria;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCriteria = async (criteria: SQLQualificationCriteria, lead: Lead) => {
    try {
      const updates: Record<string, any> = {};

      // 1. Vérifier le budget (depuis les champs du lead ou qualification)
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('bant_budget')
        .eq('lead_id', lead.id)
        .single();

      if (qualification?.bant_budget) {
        updates.budget_identified = true;
        // TODO: Extraire le montant du budget depuis bant_budget
      }

      // 2. Vérifier le besoin (depuis les notes ou activités)
      const { data: activities } = await supabase
        .from('sales_activities')
        .select('description')
        .eq('lead_id', lead.id)
        .ilike('description', '%besoin%')
        .or('description.ilike.%problème%')
        .limit(1);

      if (activities && activities.length > 0) {
        updates.need_expressed = true;
        updates.need_description = activities[0].description;
      }

      // 3. Vérifier le timeline (depuis qualification)
      if (qualification?.bant_timeline) {
        // TODO: Parser le timeline et vérifier si < 6 mois
        updates.timeline_acceptable = true; // Simplifié pour l'instant
      }

      // 4. Vérifier l'autorité (depuis qualification)
      if (qualification?.bant_authority) {
        updates.authority_identified = true;
        updates.authority_level = qualification.bant_authority === 'decision_maker' ? 'decision_maker' : 'influencer';
      }

      // 5. Calculer le score d'engagement
      const { data: engagements } = await supabase
        .from('lead_engagement')
        .select('id')
        .eq('lead_id', lead.id);

      const engagementScore = engagements?.length || 0;
      updates.engagement_score = engagementScore;

      // Mettre à jour les critères
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('sql_qualification_criteria')
          .update(updates)
          .eq('id', criteria.id);
      }
    } catch (err) {
      console.error('Error analyzing criteria:', err);
    }
  };

  const qualifyAsSQL = async (criteria: SQLQualificationCriteria, lead: Lead) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Mettre à jour le statut du lead
      await supabase
        .from('leads')
        .update({
          lifecycle_stage: 'SQL',
          // TODO: Ajouter tag "SQL"
        })
        .eq('id', lead.id);

      // Marquer les critères comme qualifiés
      await supabase
        .from('sql_qualification_criteria')
        .update({
          all_criteria_met: true,
          qualified_at: new Date().toISOString(),
          qualified_by: userId,
        })
        .eq('id', criteria.id);

      // Attribuer un commercial
      const assignedUserId = await assignLead(lead);
      if (assignedUserId) {
        await supabase
          .from('leads')
          .update({ assigned_to: assignedUserId })
          .eq('id', lead.id);
      }

      // Créer une tâche de qualification
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'qualification',
          lead_id: lead.id,
          assigned_to: assignedUserId,
          title: `Qualifier SQL : ${lead.name || lead.company}`,
          description: `Lead qualifié comme SQL. Tous les critères sont remplis. Contacter rapidement.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // J+1
          tags: ['SQL', 'Qualification', 'Prioritaire'],
          metadata: {
            criteriaId: criteria.id,
            budgetIdentified: criteria.budgetIdentified,
            needExpressed: criteria.needExpressed,
            engagementScore: criteria.engagementScore,
          },
        });

      // Inscrire dans la séquence d'onboarding SQL
      const { data: sqlSequence } = await supabase
        .from('email_sequences')
        .select('id')
        .eq('scenario_type', 'onboarding')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (sqlSequence) {
        await enrollLead(sqlSequence.id, lead.id, {
          qualificationType: 'SQL',
          criteria: criteria,
        });
      }

      // Notification équipe commerciale
      // TODO: Envoyer notification à l'équipe
    } catch (err) {
      console.error('Error qualifying as SQL:', err);
    }
  };

  const notifyForQualification = async (criteria: SQLQualificationCriteria, lead: Lead) => {
    try {
      // Récupérer le commercial assigné et le score depuis la base de données
      const { data: leadData } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', lead.id)
        .single();

      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_score')
        .eq('lead_id', lead.id)
        .single();

      const assignedTo = leadData?.assigned_to || null;
      const qualityScore = qualification?.qualification_score || 0;

      // Créer une tâche pour qualification manuelle
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'qualification',
          lead_id: lead.id,
          assigned_to: assignedTo,
          title: `Qualifier MQL : ${lead.name || lead.company}`,
          description: `MQL avec scoring élevé (${qualityScore}/100). Critères à vérifier : Budget, Besoin, Timeline, Autorité.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // J+1
          tags: ['MQL', 'Qualification', 'SQL'],
          metadata: {
            criteriaId: criteria.id,
            missingCriteria: {
              budget: !criteria.budgetIdentified,
              need: !criteria.needExpressed,
              timeline: !criteria.timelineAcceptable,
              authority: !criteria.authorityIdentified,
            },
          },
        });
    } catch (err) {
      console.error('Error notifying for qualification:', err);
    }
  };

  const updateCriteria = async (
    criteriaId: string,
    updates: Partial<SQLQualificationCriteria>
  ): Promise<SQLQualificationCriteria> => {
    try {
      setLoading(true);

      const updateData: Record<string, any> = {};
      if (updates.budgetIdentified !== undefined) updateData.budget_identified = updates.budgetIdentified;
      if (updates.budgetAmount !== undefined) updateData.budget_amount = updates.budgetAmount;
      if (updates.budgetRangeMin !== undefined) updateData.budget_range_min = updates.budgetRangeMin;
      if (updates.budgetRangeMax !== undefined) updateData.budget_range_max = updates.budgetRangeMax;
      if (updates.needExpressed !== undefined) updateData.need_expressed = updates.needExpressed;
      if (updates.needDescription !== undefined) updateData.need_description = updates.needDescription;
      if (updates.timelineMonths !== undefined) updateData.timeline_months = updates.timelineMonths;
      if (updates.timelineAcceptable !== undefined) updateData.timeline_acceptable = updates.timelineAcceptable;
      if (updates.authorityIdentified !== undefined) updateData.authority_identified = updates.authorityIdentified;
      if (updates.authorityLevel !== undefined) updateData.authority_level = updates.authorityLevel;

      const { data, error: updateError } = await supabase
        .from('sql_qualification_criteria')
        .update(updateData)
        .eq('id', criteriaId)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated: SQLQualificationCriteria = {
        id: data.id,
        leadId: data.lead_id,
        budgetIdentified: data.budget_identified,
        budgetAmount: data.budget_amount,
        budgetRangeMin: data.budget_range_min,
        budgetRangeMax: data.budget_range_max,
        needExpressed: data.need_expressed,
        needDescription: data.need_description,
        timelineMonths: data.timeline_months,
        timelineAcceptable: data.timeline_acceptable,
        authorityIdentified: data.authority_identified,
        authorityLevel: data.authority_level,
        engagementScore: data.engagement_score || 0,
        allCriteriaMet: data.all_criteria_met,
        qualifiedAt: data.qualified_at,
        qualifiedBy: data.qualified_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Vérifier si tous les critères sont maintenant remplis
      const allMet = 
        updated.budgetIdentified &&
        updated.needExpressed &&
        updated.timelineAcceptable &&
        updated.authorityIdentified &&
        updated.engagementScore >= 3;

      if (allMet && !updated.allCriteriaMet) {
        // Récupérer le lead et qualifier
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', updated.leadId)
          .single();

        if (lead) {
          await qualifyAsSQL(updated, lead);
        }
      }

      setError(null);
      return updated;
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
    checkSQLCriteria,
    updateCriteria,
  };
};

