import { useCallback, useState, useEffect } from 'react';
import { AutomationWorkflow, AutomationTrigger, AutomationAction, AutomationExecution } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { 
  mapSupabaseAutomationWorkflowToAutomationWorkflow,
  mapAutomationWorkflowToSupabaseAutomationWorkflow,
  mapSupabaseAutomationTriggerToAutomationTrigger,
  mapSupabaseAutomationActionToAutomationAction,
  mapSupabaseAutomationExecutionToAutomationExecution
} from '../mappers';
import { SupabaseAutomationWorkflow, SupabaseAutomationTrigger, SupabaseAutomationAction } from '../types';

interface UseAutomationWorkflowsReturn {
  workflows: AutomationWorkflow[];
  loading: boolean;
  getWorkflows: () => Promise<void>;
  getWorkflow: (id: string) => Promise<AutomationWorkflow | null>;
  createWorkflow: (workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AutomationWorkflow | null>;
  updateWorkflow: (id: string, workflow: Partial<AutomationWorkflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  activateWorkflow: (id: string) => Promise<void>;
  pauseWorkflow: (id: string) => Promise<void>;
  getWorkflowTriggers: (workflowId: string) => Promise<AutomationTrigger[]>;
  getWorkflowActions: (workflowId: string) => Promise<AutomationAction[]>;
  getWorkflowExecutions: (workflowId?: string, leadId?: string) => Promise<AutomationExecution[]>;
}

export const useAutomationWorkflows = (): UseAutomationWorkflowsReturn => {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  const getWorkflows = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setWorkflows(data.map(mapSupabaseAutomationWorkflowToAutomationWorkflow));
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWorkflows();
  }, [getWorkflows]);

  const getWorkflow = useCallback(async (id: string): Promise<AutomationWorkflow | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        return mapSupabaseAutomationWorkflowToAutomationWorkflow(data);
      }
      return null;
    } catch (err) {
      console.error('Error fetching workflow:', err);
      return null;
    }
  }, []);

  const createWorkflow = useCallback(async (
    workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AutomationWorkflow | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const workflowData = mapAutomationWorkflowToSupabaseAutomationWorkflow(workflow);

      const { data, error } = await supabase
        .from('automation_workflows')
        .insert({
          ...workflowData,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newWorkflow = mapSupabaseAutomationWorkflowToAutomationWorkflow(data);
        setWorkflows(prev => [newWorkflow, ...prev]);
        return newWorkflow;
      }
      return null;
    } catch (err) {
      console.error('Error creating workflow:', err);
      throw err;
    }
  }, []);

  const updateWorkflow = useCallback(async (id: string, workflow: Partial<AutomationWorkflow>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const workflowData = mapAutomationWorkflowToSupabaseAutomationWorkflow(workflow);

      const { error } = await supabase
        .from('automation_workflows')
        .update(workflowData)
        .eq('id', id);

      if (error) throw error;

      await getWorkflows();
    } catch (err) {
      console.error('Error updating workflow:', err);
      throw err;
    }
  }, [getWorkflows]);

  const deleteWorkflow = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('automation_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Error deleting workflow:', err);
      throw err;
    }
  }, []);

  const activateWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'active' });
  }, [updateWorkflow]);

  const pauseWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'paused' });
  }, [updateWorkflow]);

  const getWorkflowTriggers = useCallback(async (workflowId: string): Promise<AutomationTrigger[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('automation_triggers')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: true });

      if (error) throw error;

      if (data) {
        return data.map(mapSupabaseAutomationTriggerToAutomationTrigger);
      }
      return [];
    } catch (err) {
      console.error('Error fetching triggers:', err);
      return [];
    }
  }, []);

  const getWorkflowActions = useCallback(async (workflowId: string): Promise<AutomationAction[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('automation_actions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: true });

      if (error) throw error;

      if (data) {
        return data.map(mapSupabaseAutomationActionToAutomationAction);
      }
      return [];
    } catch (err) {
      console.error('Error fetching actions:', err);
      return [];
    }
  }, []);

  const getWorkflowExecutions = useCallback(async (workflowId?: string, leadId?: string): Promise<AutomationExecution[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('automation_executions')
        .select('*')
        .order('started_at', { ascending: false });

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        return data.map(mapSupabaseAutomationExecutionToAutomationExecution);
      }
      return [];
    } catch (err) {
      console.error('Error fetching executions:', err);
      return [];
    }
  }, []);

  return {
    workflows,
    loading,
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
    getWorkflowTriggers,
    getWorkflowActions,
    getWorkflowExecutions,
  };
};

