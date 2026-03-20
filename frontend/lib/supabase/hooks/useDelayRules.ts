import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type DelayRuleType = 'score_based' | 'temperature_based' | 'sector_based' | 'custom';

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

export const useDelayRules = () => {
  const [rules, setRules] = useState<DelayRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('delay_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;

      const loadedRules: DelayRule[] = (data || []).map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        ruleType: rule.rule_type,
        conditions: rule.conditions || {},
        delayHours: rule.delay_hours,
        priority: rule.priority,
        isActive: rule.is_active,
        createdBy: rule.created_by,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      }));

      setRules(loadedRules);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (rule: Omit<DelayRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<DelayRule> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('delay_rules')
        .insert({
          name: rule.name,
          description: rule.description,
          rule_type: rule.ruleType,
          conditions: rule.conditions,
          delay_hours: rule.delayHours,
          priority: rule.priority,
          is_active: rule.isActive,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newRule: DelayRule = {
        id: data.id,
        name: data.name,
        description: data.description,
        ruleType: data.rule_type,
        conditions: data.conditions || {},
        delayHours: data.delay_hours,
        priority: data.priority,
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadRules();
      setError(null);
      return newRule;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRule = async (id: string, updates: Partial<DelayRule>): Promise<DelayRule> => {
    try {
      setLoading(true);

      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.ruleType !== undefined) updateData.rule_type = updates.ruleType;
      if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
      if (updates.delayHours !== undefined) updateData.delay_hours = updates.delayHours;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error: updateError } = await supabase
        .from('delay_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated: DelayRule = {
        id: data.id,
        name: data.name,
        description: data.description,
        ruleType: data.rule_type,
        conditions: data.conditions || {},
        delayHours: data.delay_hours,
        priority: data.priority,
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      await loadRules();
      setError(null);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('delay_rules')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadRules();
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const evaluateRule = async (rule: DelayRule, lead: Lead): Promise<boolean> => {
    try {
      const conditions = rule.conditions;

      switch (rule.ruleType) {
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
          // Évaluation de conditions personnalisées
          // TODO: Implémenter un moteur d'évaluation de conditions
          return false;

        default:
          return false;
      }
    } catch (err) {
      console.error('Error evaluating rule:', err);
      return false;
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  return {
    rules,
    loading,
    error,
    loadRules,
    createRule,
    updateRule,
    deleteRule,
    evaluateRule,
  };
};

