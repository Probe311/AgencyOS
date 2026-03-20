import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError } from '../../utils/logger';
import { AutomationRule, AutomationRuleExecution } from '../../../types';
import { 
  SupabaseAutomationRule, 
  SupabaseAutomationRuleExecution 
} from '../types';
import { 
  mapSupabaseAutomationRuleToAutomationRule,
  mapAutomationRuleToSupabaseAutomationRule,
  mapSupabaseAutomationRuleExecutionToAutomationRuleExecution
} from '../mappers';

export const useAutomationRules = (projectId?: string, workspaceId?: string) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('scope', 'global');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRules((data || []).map(mapSupabaseAutomationRuleToAutomationRule));
      setError(null);
    } catch (err) {
      setError(err as Error);
      logError('Error fetching automation rules:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    fetchRules();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('automation_rules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_rules',
        },
        () => {
          fetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules]);

  const createRule = useCallback(async (rule: Partial<AutomationRule>) => {
    try {
      const ruleData = mapAutomationRuleToSupabaseAutomationRule(rule);
      const { data, error: createError } = await supabase
        .from('automation_rules')
        .insert(ruleData)
        .select()
        .single();

      if (createError) throw createError;

      const newRule = mapSupabaseAutomationRuleToAutomationRule(data);
      setRules((prev) => [newRule, ...prev]);
      return newRule;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<AutomationRule>) => {
    try {
      const ruleData = mapAutomationRuleToSupabaseAutomationRule(updates);
      const { data, error: updateError } = await supabase
        .from('automation_rules')
        .update(ruleData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedRule = mapSupabaseAutomationRuleToAutomationRule(data);
      setRules((prev) => prev.map((r) => (r.id === id ? updatedRule : r)));
      return updatedRule;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const toggleRuleStatus = useCallback(async (id: string, status: AutomationRule['status']) => {
    return updateRule(id, { status });
  }, [updateRule]);

  const getRuleExecutions = useCallback(async (ruleId: string): Promise<AutomationRuleExecution[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('automation_rule_executions')
        .select('*')
        .eq('rule_id', ruleId)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      return (data || []).map(mapSupabaseAutomationRuleExecutionToAutomationRuleExecution);
    } catch (err) {
      logError('Error fetching rule executions:', err);
      return [];
    }
  }, []);

  return {
    rules,
    loading,
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleStatus,
    getRuleExecutions,
    refresh: fetchRules,
  };
};

