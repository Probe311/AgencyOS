import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type AssignmentMethod = 'round_robin' | 'geographic' | 'skill_based' | 'workload' | 'performance' | 'custom';

export interface LeadAssignmentRule {
  id: string;
  name: string;
  description?: string;
  assignmentMethod: AssignmentMethod;
  rules: {
    // Round-robin
    userIds?: string[];
    weights?: Record<string, number>; // Poids par utilisateur
    
    // Geographic
    zones?: Record<string, string[]>; // Zone -> user IDs
    fallbackUserId?: string;
    
    // Skill-based
    skills?: Record<string, string[]>; // Compétence -> user IDs
    sectors?: Record<string, string[]>; // Secteur -> user IDs
    families?: Record<string, string[]>; // Famille -> user IDs
    
    // Workload
    maxLeadsPerUser?: number;
    excludeOverloaded?: boolean;
    
    // Performance
    minConversionRate?: number;
    topPerformersOnly?: boolean;
    topPercentage?: number; // Top X%
    
    // Custom
    customLogic?: string; // Code/logic personnalisée
    [key: string]: any;
  };
  priority: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadAssignment = () => {
  const [rules, setRules] = useState<LeadAssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: LeadAssignmentRule[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        assignmentMethod: r.assignment_method,
        rules: r.rules || {},
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
      console.error('Error loading assignment rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignLead = async (lead: Lead): Promise<string | null> => {
    try {
      // Trier les règles par priorité
      const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const assignedUserId = await evaluateRule(lead, rule);
        if (assignedUserId) {
          // Assigner le lead
          await supabase
            .from('leads')
            .update({ assigned_to: assignedUserId })
            .eq('id', lead.id);

          return assignedUserId;
        }
      }

      return null;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const evaluateRule = async (lead: Lead, rule: LeadAssignmentRule): Promise<string | null> => {
    const method = rule.assignmentMethod;
    const rulesConfig = rule.rules;

    switch (method) {
      case 'round_robin':
        return await roundRobinAssignment(rulesConfig);
      
      case 'geographic':
        return await geographicAssignment(lead, rulesConfig);
      
      case 'skill_based':
        return await skillBasedAssignment(lead, rulesConfig);
      
      case 'workload':
        return await workloadAssignment(rulesConfig);
      
      case 'performance':
        return await performanceAssignment(rulesConfig);
      
      case 'custom':
        // TODO: Implémenter logique personnalisée
        return null;
      
      default:
        return null;
    }
  };

  const roundRobinAssignment = async (rules: LeadAssignmentRule['rules']): Promise<string | null> => {
    const userIds = rules.userIds || [];
    if (userIds.length === 0) return null;

    // Récupérer le dernier lead assigné pour chaque utilisateur
    const { data: lastAssignments } = await supabase
      .from('leads')
      .select('assigned_to')
      .in('assigned_to', userIds)
      .not('assigned_to', 'is', null)
      .order('created_at', { ascending: false })
      .limit(userIds.length);

    // Compter les assignments récents
    const assignmentCounts: Record<string, number> = {};
    userIds.forEach(id => assignmentCounts[id] = 0);
    
    lastAssignments?.forEach((l: any) => {
      if (l.assigned_to) {
        assignmentCounts[l.assigned_to] = (assignmentCounts[l.assigned_to] || 0) + 1;
      }
    });

    // Appliquer les poids si définis
    if (rules.weights) {
      const weightedCounts: Record<string, number> = {};
      userIds.forEach(id => {
        const weight = rules.weights![id] || 1;
        weightedCounts[id] = (assignmentCounts[id] || 0) / weight;
      });
      
      // Trouver l'utilisateur avec le moins d'assignments pondérés
      const sorted = Object.entries(weightedCounts).sort((a, b) => a[1] - b[1]);
      return sorted[0]?.[0] || null;
    }

    // Trouver l'utilisateur avec le moins d'assignments
    const sorted = Object.entries(assignmentCounts).sort((a, b) => a[1] - b[1]);
    return sorted[0]?.[0] || userIds[0];
  };

  const geographicAssignment = async (lead: Lead, rules: LeadAssignmentRule['rules']): Promise<string | null> => {
    // TODO: Utiliser les coordonnées GPS du lead pour déterminer la zone
    // Pour l'instant, on peut utiliser le code postal ou la ville
    const zones = rules.zones || {};
    
    // Chercher une correspondance de zone (à implémenter selon vos données)
    // Pour l'instant, retourner le fallback
    return rules.fallbackUserId || null;
  };

  const skillBasedAssignment = async (lead: Lead, rules: LeadAssignmentRule['rules']): Promise<string | null> => {
    const skills = rules.skills || {};
    const sectors = rules.sectors || {};
    const families = rules.families || {};

    // Vérifier par famille
    if (lead.family && families[lead.family]) {
      const userIds = families[lead.family];
      return userIds[0] || null;
    }

    // Vérifier par secteur (si disponible dans le lead)
    // TODO: Ajouter secteur dans le lead si nécessaire

    return null;
  };

  const workloadAssignment = async (rules: LeadAssignmentRule['rules']): Promise<string | null> => {
    const maxLeads = rules.maxLeadsPerUser || 20;

    // Récupérer tous les utilisateurs actifs
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Manager')
      .or('role.eq.Éditeur,role.eq.Admin');

    if (!users || users.length === 0) return null;

    // Compter les leads actifs par utilisateur
    const { data: leadCounts } = await supabase
      .from('leads')
      .select('assigned_to')
      .in('assigned_to', users.map(u => u.id))
      .not('lifecycle_stage', 'eq', 'Perdu')
      .not('lifecycle_stage', 'eq', 'Inactif');

    const counts: Record<string, number> = {};
    users.forEach(u => counts[u.id] = 0);
    leadCounts?.forEach((l: any) => {
      if (l.assigned_to) {
        counts[l.assigned_to] = (counts[l.assigned_to] || 0) + 1;
      }
    });

    // Filtrer les utilisateurs surchargés si nécessaire
    const availableUsers = rules.excludeOverloaded
      ? Object.entries(counts).filter(([_, count]) => count < maxLeads).map(([id]) => id)
      : Object.keys(counts);

    if (availableUsers.length === 0) return null;

    // Trouver l'utilisateur avec le moins de leads
    const sorted = availableUsers.sort((a, b) => counts[a] - counts[b]);
    return sorted[0];
  };

  const performanceAssignment = async (rules: LeadAssignmentRule['rules']): Promise<string | null> => {
    // Récupérer les performances des commerciaux
    const { data: performances } = await supabase
      .from('sales_performance')
      .select('user_id, conversion_rate')
      .gte('conversion_rate', rules.minConversionRate || 0)
      .order('conversion_rate', { ascending: false });

    if (!performances || performances.length === 0) return null;

    // Filtrer les top performers si nécessaire
    let topPerformers = performances;
    if (rules.topPercentage) {
      const topCount = Math.ceil(performances.length * (rules.topPercentage / 100));
      topPerformers = performances.slice(0, topCount);
    }

    // Sélectionner aléatoirement parmi les top performers
    const randomIndex = Math.floor(Math.random() * topPerformers.length);
    return topPerformers[randomIndex]?.user_id || null;
  };

  const createRule = async (rule: Omit<LeadAssignmentRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('lead_assignment_rules')
        .insert({
          name: rule.name,
          description: rule.description,
          assignment_method: rule.assignmentMethod,
          rules: rule.rules,
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
    assignLead,
    createRule,
  };
};

