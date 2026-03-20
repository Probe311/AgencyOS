import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead, LifecycleStage } from '../../../types';

export interface LifecycleTransitionRule {
  id: string;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  ruleName: string;
  description?: string;
  conditions: {
    scoring?: { min?: number; max?: number };
    engagement?: { minInteractions?: number; types?: string[] };
    profileComplete?: number; // Pourcentage (0-100)
    budget?: { identified: boolean; minAmount?: number };
    need?: { identified: boolean };
    authority?: { identified: boolean };
    timeline?: { maxMonths?: number };
    [key: string]: any;
  };
  isActive: boolean;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleTransition {
  id: string;
  leadId: string;
  fromStage?: LifecycleStage;
  toStage: LifecycleStage;
  transitionType: 'automatic' | 'manual' | 'rule_based';
  ruleId?: string;
  triggeredBy?: string;
  transitionDate: string;
  durationInStage?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const useLifecycleStages = () => {
  const [rules, setRules] = useState<LifecycleTransitionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lifecycle_transition_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: LifecycleTransitionRule[] = (data || []).map((r: any) => ({
        id: r.id,
        fromStage: r.from_stage as LifecycleStage,
        toStage: r.to_stage as LifecycleStage,
        ruleName: r.rule_name,
        description: r.description,
        conditions: r.conditions || {},
        isActive: r.is_active,
        priority: r.priority || 0,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      setRules(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading lifecycle rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (rule: Omit<LifecycleTransitionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('lifecycle_transition_rules')
        .insert({
          from_stage: rule.fromStage,
          to_stage: rule.toStage,
          rule_name: rule.ruleName,
          description: rule.description,
          conditions: rule.conditions,
          is_active: rule.isActive,
          priority: rule.priority,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newRule: LifecycleTransitionRule = {
        id: data.id,
        fromStage: data.from_stage,
        toStage: data.to_stage,
        ruleName: data.rule_name,
        description: data.description,
        conditions: data.conditions,
        isActive: data.is_active,
        priority: data.priority,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setRules([newRule, ...rules]);
      return newRule;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const checkAndTransition = async (lead: Lead): Promise<LifecycleTransition | null> => {
    try {
      const currentStage = lead.lifecycleStage || 'Lead';
      
      // Vérifier toutes les règles actives qui partent de l'étape actuelle
      const applicableRules = rules.filter(r => 
        r.fromStage === currentStage && r.isActive
      );

      for (const rule of applicableRules.sort((a, b) => b.priority - a.priority)) {
        if (await evaluateRuleConditions(lead, rule)) {
          // Effectuer la transition
          return await executeTransition(lead.id, currentStage, rule.toStage, rule.id);
        }
      }

      return null;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const evaluateRuleConditions = async (lead: Lead, rule: LifecycleTransitionRule): Promise<boolean> => {
    const conditions = rule.conditions;

    // Vérifier le scoring
    if (conditions.scoring) {
      // Récupérer le scoring du lead depuis lead_quality_scores
      const { data: qualityScore } = await supabase
        .from('lead_quality_scores')
        .select('overall_score')
        .eq('lead_id', lead.id)
        .single();

      const leadScore = qualityScore?.overall_score || 0;
      if (conditions.scoring.min !== undefined && leadScore < conditions.scoring.min) return false;
      if (conditions.scoring.max !== undefined && leadScore > conditions.scoring.max) return false;
    }

    // Vérifier l'engagement
    if (conditions.engagement) {
      const { data: engagements } = await supabase
        .from('lead_engagement')
        .select('id')
        .eq('lead_id', lead.id);

      const interactionCount = engagements?.length || 0;
      if (conditions.engagement.minInteractions && interactionCount < conditions.engagement.minInteractions) {
        return false;
      }
    }

    // Vérifier le profil complet
    if (conditions.profileComplete !== undefined) {
      const profileCompleteness = calculateProfileCompleteness(lead);
      if (profileCompleteness < conditions.profileComplete) return false;
    }

    // Vérifier le budget (depuis qualification)
    if (conditions.budget) {
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_criteria')
        .eq('lead_id', lead.id)
        .single();

      if (qualification?.qualification_criteria?.budget?.identified !== conditions.budget.identified) {
        return false;
      }
    }

    // Vérifier le besoin
    if (conditions.need) {
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_criteria')
        .eq('lead_id', lead.id)
        .single();

      if (qualification?.qualification_criteria?.need?.identified !== conditions.need.identified) {
        return false;
      }
    }

    // Vérifier l'autorité
    if (conditions.authority) {
      const { data: qualification } = await supabase
        .from('lead_qualification')
        .select('qualification_criteria')
        .eq('lead_id', lead.id)
        .single();

      if (qualification?.qualification_criteria?.authority?.identified !== conditions.authority.identified) {
        return false;
      }
    }

    return true;
  };

  const calculateProfileCompleteness = (lead: Lead): number => {
    let score = 0;
    const fields = ['name', 'email', 'phone', 'company', 'source', 'family', 'temperature'];
    const weights: Record<string, number> = {
      name: 15,
      email: 20,
      phone: 15,
      company: 20,
      source: 10,
      family: 10,
      temperature: 10,
    };

    fields.forEach(field => {
      if (lead[field as keyof Lead]) {
        score += weights[field] || 0;
      }
    });

    return score;
  };

  const executeTransition = async (
    leadId: string,
    fromStage: LifecycleStage,
    toStage: LifecycleStage,
    ruleId?: string
  ): Promise<LifecycleTransition> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Calculer la durée dans l'étape précédente
      const { data: lastTransition } = await supabase
        .from('lifecycle_transitions')
        .select('transition_date')
        .eq('lead_id', leadId)
        .order('transition_date', { ascending: false })
        .limit(1)
        .single();

      let durationInStage: number | undefined;
      if (lastTransition) {
        const days = Math.floor(
          (new Date().getTime() - new Date(lastTransition.transition_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        durationInStage = days;
      }

      // Créer l'enregistrement de transition
      const { data: transition, error: transitionError } = await supabase
        .from('lifecycle_transitions')
        .insert({
          lead_id: leadId,
          from_stage: fromStage,
          to_stage: toStage,
          transition_type: ruleId ? 'rule_based' : 'automatic',
          rule_id: ruleId,
          triggered_by: userId,
          duration_in_stage: durationInStage,
        })
        .select()
        .single();

      if (transitionError) throw transitionError;

      // Mettre à jour le lead
      await supabase
        .from('leads')
        .update({ lifecycle_stage: toStage })
        .eq('id', leadId);

      const newTransition: LifecycleTransition = {
        id: transition.id,
        leadId: transition.lead_id,
        fromStage: transition.from_stage,
        toStage: transition.to_stage,
        transitionType: transition.transition_type,
        ruleId: transition.rule_id,
        triggeredBy: transition.triggered_by,
        transitionDate: transition.transition_date,
        durationInStage: transition.duration_in_stage,
        metadata: transition.metadata,
        createdAt: transition.created_at,
      };

      return newTransition;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getTransitionHistory = async (leadId: string): Promise<LifecycleTransition[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('lifecycle_transitions')
        .select('*')
        .eq('lead_id', leadId)
        .order('transition_date', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []).map((t: any) => ({
        id: t.id,
        leadId: t.lead_id,
        fromStage: t.from_stage,
        toStage: t.to_stage,
        transitionType: t.transition_type,
        ruleId: t.rule_id,
        triggeredBy: t.triggered_by,
        transitionDate: t.transition_date,
        durationInStage: t.duration_in_stage,
        metadata: t.metadata,
        createdAt: t.created_at,
      }));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    rules,
    loading,
    error,
    loadRules,
    createRule,
    checkAndTransition,
    executeTransition,
    getTransitionHistory,
  };
};

