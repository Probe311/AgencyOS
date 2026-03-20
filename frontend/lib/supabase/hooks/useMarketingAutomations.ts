import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead, WorkflowNode, WorkflowEdge } from '../../../types';
import { useLeadSegments, SegmentCriteria } from './useLeadSegments';
import { useAutomatedActions } from './useAutomatedActions';

export type AutomationCategory = 
  | 'onboarding' 
  | 'nurturing' 
  | 'relance' 
  | 'conversion' 
  | 'retention' 
  | 'reactivation' 
  | 'upsell' 
  | 'qualification' 
  | 'escalade' 
  | 'custom';

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface MarketingAutomation {
  id: string;
  name: string;
  description?: string;
  category: AutomationCategory;
  status: AutomationStatus;
  targetSegmentId?: string;
  targetCriteria?: SegmentCriteria;
  workflowData: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  pauseOnEngagement: boolean;
  maxEnrollments?: number;
  priority: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationEnrollment {
  id: string;
  automationId: string;
  leadId: string;
  enrollmentDate: string;
  currentNodeId?: string;
  status: EnrollmentStatus;
  pausedReason?: string;
  nextActionAt?: string;
  executionData: Record<string, any>;
  completedAt?: string;
  cancelledAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const useMarketingAutomations = () => {
  const { getLeadsByCriteria } = useLeadSegments();
  const { executeAction } = useAutomatedActions();
  const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('marketing_automations')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: MarketingAutomation[] = (data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        status: a.status,
        targetSegmentId: a.target_segment_id,
        targetCriteria: a.target_criteria || {},
        workflowData: a.workflow_data || { nodes: [], edges: [] },
        pauseOnEngagement: a.pause_on_engagement,
        maxEnrollments: a.max_enrollments,
        priority: a.priority || 0,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));

      setAutomations(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading automations:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAutomation = async (automation: Omit<MarketingAutomation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('marketing_automations')
        .insert({
          name: automation.name,
          description: automation.description,
          category: automation.category,
          status: automation.status,
          target_segment_id: automation.targetSegmentId,
          target_criteria: automation.targetCriteria || {},
          workflow_data: automation.workflowData,
          pause_on_engagement: automation.pauseOnEngagement,
          max_enrollments: automation.maxEnrollments,
          priority: automation.priority,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadAutomations();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAutomation = async (automationId: string, updates: Partial<MarketingAutomation>) => {
    try {
      setLoading(true);
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.targetSegmentId !== undefined) updateData.target_segment_id = updates.targetSegmentId;
      if (updates.targetCriteria !== undefined) updateData.target_criteria = updates.targetCriteria;
      if (updates.workflowData !== undefined) updateData.workflow_data = updates.workflowData;
      if (updates.pauseOnEngagement !== undefined) updateData.pause_on_engagement = updates.pauseOnEngagement;
      if (updates.maxEnrollments !== undefined) updateData.max_enrollments = updates.maxEnrollments;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { error: updateError } = await supabase
        .from('marketing_automations')
        .update(updateData)
        .eq('id', automationId);

      if (updateError) throw updateError;
      await loadAutomations();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAutomation = async (automationId: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('marketing_automations')
        .delete()
        .eq('id', automationId);

      if (deleteError) throw deleteError;
      await loadAutomations();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const enrollLead = async (automationId: string, leadId: string, metadata?: Record<string, any>): Promise<AutomationEnrollment> => {
    try {
      // Vérifier si une inscription active existe déjà
      const { data: existingEnrollment } = await supabase
        .from('automation_enrollments')
        .select('*')
        .eq('automation_id', automationId)
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEnrollment) {
        return {
          id: existingEnrollment.id,
          automationId: existingEnrollment.automation_id,
          leadId: existingEnrollment.lead_id,
          enrollmentDate: existingEnrollment.enrollment_date,
          currentNodeId: existingEnrollment.current_node_id,
          status: existingEnrollment.status,
          pausedReason: existingEnrollment.paused_reason,
          nextActionAt: existingEnrollment.next_action_at,
          executionData: existingEnrollment.execution_data || {},
          completedAt: existingEnrollment.completed_at,
          cancelledAt: existingEnrollment.cancelled_at,
          metadata: existingEnrollment.metadata || {},
          createdAt: existingEnrollment.created_at,
          updatedAt: existingEnrollment.updated_at,
        };
      }

      const automation = automations.find(a => a.id === automationId);
      if (!automation) throw new Error('Automation non trouvée');

      // Trouver le nœud de départ (trigger)
      const startNode = automation.workflowData.nodes.find(n => n.type === 'trigger');
      const nextActionAt = startNode ? new Date().toISOString() : undefined;

      const { data, error: insertError } = await supabase
        .from('automation_enrollments')
        .insert({
          automation_id: automationId,
          lead_id: leadId,
          current_node_id: startNode?.id,
          status: 'active',
          next_action_at: nextActionAt,
          execution_data: {
            startNode: startNode?.id,
            variables: metadata || {},
          },
          metadata: metadata || {},
        })
        .select()
        .single();

      if (insertError) {
        // Gérer l'erreur de contrainte unique
        if (insertError.code === '23505' || insertError.message?.includes('unique')) {
          const { data: retryEnrollment } = await supabase
            .from('automation_enrollments')
            .select('*')
            .eq('automation_id', automationId)
            .eq('lead_id', leadId)
            .eq('status', 'active')
            .maybeSingle();

          if (retryEnrollment) {
            return {
              id: retryEnrollment.id,
              automationId: retryEnrollment.automation_id,
              leadId: retryEnrollment.lead_id,
              enrollmentDate: retryEnrollment.enrollment_date,
              currentNodeId: retryEnrollment.current_node_id,
              status: retryEnrollment.status,
              pausedReason: retryEnrollment.paused_reason,
              nextActionAt: retryEnrollment.next_action_at,
              executionData: retryEnrollment.execution_data || {},
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

      return {
        id: data.id,
        automationId: data.automation_id,
        leadId: data.lead_id,
        enrollmentDate: data.enrollment_date,
        currentNodeId: data.current_node_id,
        status: data.status,
        pausedReason: data.paused_reason,
        nextActionAt: data.next_action_at,
        executionData: data.execution_data || {},
        completedAt: data.completed_at,
        cancelledAt: data.cancelled_at,
        metadata: data.metadata || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const enrollLeadsFromTarget = async (automationId: string): Promise<number> => {
    try {
      const automation = automations.find(a => a.id === automationId);
      if (!automation || automation.status !== 'active') return 0;

      let targetLeads: Lead[] = [];

      // Récupérer les leads cibles
      if (automation.targetSegmentId) {
        // Utiliser le segment
        const { data: segment } = await supabase
          .from('lead_segments')
          .select('criteria')
          .eq('id', automation.targetSegmentId)
          .single();

        if (segment) {
          targetLeads = await getLeadsByCriteria(segment.criteria);
        }
      } else if (automation.targetCriteria) {
        // Utiliser les critères directs
        targetLeads = await getLeadsByCriteria(automation.targetCriteria);
      } else {
        return 0;
      }

      // Vérifier les inscriptions existantes
      const leadIds = targetLeads.map(l => l.id);
      if (leadIds.length === 0) return 0;

      const { data: existingEnrollments } = await supabase
        .from('automation_enrollments')
        .select('lead_id')
        .eq('automation_id', automationId)
        .eq('status', 'active')
        .in('lead_id', leadIds);

      const existingLeadIds = new Set(existingEnrollments?.map((e: any) => e.lead_id) || []);
      const newLeads = targetLeads.filter(l => !existingLeadIds.has(l.id));

      // Vérifier la limite d'inscriptions
      if (automation.maxEnrollments) {
        const { count } = await supabase
          .from('automation_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('automation_id', automationId)
          .eq('status', 'active');

        const remaining = automation.maxEnrollments - (count || 0);
        if (remaining <= 0) return 0;
        newLeads.splice(remaining);
      }

      // Inscrire les nouveaux leads
      let enrolledCount = 0;
      for (const lead of newLeads) {
        try {
          await enrollLead(automationId, lead.id);
          enrolledCount++;
        } catch (err) {
          console.error(`Error enrolling lead ${lead.id}:`, err);
        }
      }

      return enrolledCount;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const pauseEnrollment = async (enrollmentId: string, reason: string) => {
    try {
      const { error: updateError } = await supabase
        .from('automation_enrollments')
        .update({
          status: 'paused',
          paused_reason: reason,
        })
        .eq('id', enrollmentId);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const cancelEnrollment = async (enrollmentId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('automation_enrollments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getAutomationStats = async (automationId: string) => {
    try {
      // Compter les inscriptions
      const { count: totalEnrollments } = await supabase
        .from('automation_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId);

      const { count: activeEnrollments } = await supabase
        .from('automation_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId)
        .eq('status', 'active');

      const { count: completedEnrollments } = await supabase
        .from('automation_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId)
        .eq('status', 'completed');

      // Compter les logs d'exécution
      const { count: totalExecutions } = await supabase
        .from('automation_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId);

      const { count: successfulExecutions } = await supabase
        .from('automation_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId)
        .eq('execution_status', 'completed');

      const { count: failedExecutions } = await supabase
        .from('automation_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automationId)
        .eq('execution_status', 'failed');

      return {
        totalEnrollments: totalEnrollments || 0,
        activeEnrollments: activeEnrollments || 0,
        completedEnrollments: completedEnrollments || 0,
        totalExecutions: totalExecutions || 0,
        successfulExecutions: successfulExecutions || 0,
        failedExecutions: failedExecutions || 0,
        successRate: totalExecutions ? ((successfulExecutions || 0) / totalExecutions * 100).toFixed(1) : '0',
      };
    } catch (err) {
      console.error('Error getting automation stats:', err);
      return {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: '0',
      };
    }
  };

  return {
    automations,
    loading,
    error,
    loadAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    enrollLead,
    enrollLeadsFromTarget,
    pauseEnrollment,
    cancelEnrollment,
    getAutomationStats,
  };
};

