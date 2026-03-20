import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type RuleType = 'family' | 'temperature' | 'sector' | 'scoring' | 'custom';

export interface PersonalizationRule {
  id: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  conditions: {
    family?: string[];
    temperature?: string[];
    sector?: string[];
    scoring?: { min?: number; max?: number };
    [key: string]: any;
  };
  contentTemplate: {
    subject?: string;
    body?: string;
    cta?: string;
    variables?: Record<string, string>;
  };
  variablesMapping: Record<string, string>;
  priority: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useContentPersonalization = () => {
  const [rules, setRules] = useState<PersonalizationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('content_personalization_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: PersonalizationRule[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        ruleType: r.rule_type,
        conditions: r.conditions || {},
        contentTemplate: r.content_template || {},
        variablesMapping: r.variables_mapping || {},
        priority: r.priority || 0,
        isActive: r.is_active,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      setRules(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading personalization rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPersonalizedContent = (lead: Lead, defaultContent: { subject: string; body: string }): { subject: string; body: string } => {
    // Trier les règles par priorité
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (matchesRule(lead, rule)) {
        // Appliquer le template personnalisé
        let subject = rule.contentTemplate.subject || defaultContent.subject;
        let body = rule.contentTemplate.body || defaultContent.body;

        // Remplacer les variables
        subject = replaceVariables(subject, lead, rule.variablesMapping);
        body = replaceVariables(body, lead, rule.variablesMapping);

        return { subject, body };
      }
    }

    return defaultContent;
  };

  const matchesRule = (lead: Lead, rule: PersonalizationRule): boolean => {
    const conditions = rule.conditions;

    // Vérifier la famille
    if (conditions.family && conditions.family.length > 0) {
      if (!lead.family || !conditions.family.includes(lead.family)) {
        return false;
      }
    }

    // Vérifier la température
    if (conditions.temperature && conditions.temperature.length > 0) {
      if (!lead.temperature || !conditions.temperature.includes(lead.temperature)) {
        return false;
      }
    }

    // Vérifier le secteur
    if (conditions.sector && conditions.sector.length > 0) {
      // TODO: Ajouter secteur dans le lead si nécessaire
      // if (!lead.sector || !conditions.sector.includes(lead.sector)) {
      //   return false;
      // }
    }

    // Vérifier le scoring
    if (conditions.scoring) {
      const score = lead.qualityScore || 0;
      if (conditions.scoring.min !== undefined && score < conditions.scoring.min) {
        return false;
      }
      if (conditions.scoring.max !== undefined && score > conditions.scoring.max) {
        return false;
      }
    }

    return true;
  };

  const replaceVariables = (content: string, lead: Lead, mapping: Record<string, string>): string => {
    let result = content;

    // Variables par défaut
    const variables: Record<string, string> = {
      nom: lead.name || '',
      prénom: lead.name?.split(' ')[0] || '',
      entreprise: lead.company || '',
      secteur: lead.source || '', // TODO: Ajouter secteur
      famille: lead.family || '',
      température: lead.temperature || '',
      scoring: lead.qualityScore?.toString() || '0',
    };

    // Appliquer le mapping
    Object.entries(mapping).forEach(([key, value]) => {
      variables[key] = value;
    });

    // Remplacer les variables {{variable}}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });

    return result;
  };

  const createRule = async (rule: Omit<PersonalizationRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('content_personalization_rules')
        .insert({
          name: rule.name,
          description: rule.description,
          rule_type: rule.ruleType,
          conditions: rule.conditions,
          content_template: rule.contentTemplate,
          variables_mapping: rule.variablesMapping,
          priority: rule.priority,
          is_active: rule.isActive,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadRules();
      return data;
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
    getPersonalizedContent,
    createRule,
  };
};

