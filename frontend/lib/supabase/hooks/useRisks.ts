import { useState, useEffect, useCallback } from 'react';
import { Risk } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseRisk } from '../types';

interface UseRisksReturn {
  risks: Risk[];
  loading: boolean;
  error: string | null;
  getRisksByProject: (projectId: string) => Risk[];
  getRisksByTask: (taskId: string) => Risk[];
  addRisk: (risk: Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Risk | null>;
  updateRisk: (id: string, updates: Partial<Risk>) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  refreshRisks: () => Promise<void>;
}

export const useRisks = (): UseRisksReturn => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRisks = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedRisks = data.map((r: SupabaseRisk) => ({
          id: r.id,
          projectId: r.project_id,
          taskId: r.task_id || undefined,
          title: r.title,
          description: r.description || undefined,
          category: (r.category as Risk['category']) || undefined,
          probability: r.probability,
          impact: r.impact as Risk['impact'],
          status: r.status as Risk['status'],
          mitigationPlan: r.mitigation_plan || undefined,
          ownerId: r.owner_id || undefined,
          identifiedDate: r.identified_date,
          targetResolutionDate: r.target_resolution_date || undefined,
          createdBy: r.created_by || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setRisks(mappedRisks);
      } else {
        setRisks([]);
      }
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des risques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisks();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('risks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'risks',
          },
          () => {
            fetchRisks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchRisks]);

  const getRisksByProject = useCallback((projectId: string): Risk[] => {
    return risks.filter(r => r.projectId === projectId);
  }, [risks]);

  const getRisksByTask = useCallback((taskId: string): Risk[] => {
    return risks.filter(r => r.taskId === taskId);
  }, [risks]);

  const addRisk = useCallback(async (risk: Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Risk | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, risk not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('risks')
        .insert([{
          project_id: risk.projectId,
          task_id: risk.taskId || null,
          title: risk.title,
          description: risk.description || null,
          category: risk.category || null,
          probability: risk.probability,
          impact: risk.impact,
          status: risk.status || 'identified',
          mitigation_plan: risk.mitigationPlan || null,
          owner_id: risk.ownerId || null,
          identified_date: risk.identifiedDate,
          target_resolution_date: risk.targetResolutionDate || null,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newRisk: Risk = {
          id: data.id,
          projectId: data.project_id,
          taskId: data.task_id || undefined,
          title: data.title,
          description: data.description || undefined,
          category: (data.category as Risk['category']) || undefined,
          probability: data.probability,
          impact: data.impact as Risk['impact'],
          status: data.status as Risk['status'],
          mitigationPlan: data.mitigation_plan || undefined,
          ownerId: data.owner_id || undefined,
          identifiedDate: data.identified_date,
          targetResolutionDate: data.target_resolution_date || undefined,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setRisks(prev => [newRisk, ...prev]);
        return newRisk;
      }
      return null;
    } catch (err) {
      console.error('Error adding risk:', err);
      throw err;
    }
  }, []);

  const updateRisk = useCallback(async (id: string, updates: Partial<Risk>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, risk not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.category !== undefined) updateData.category = updates.category || null;
      if (updates.probability !== undefined) updateData.probability = updates.probability;
      if (updates.impact !== undefined) updateData.impact = updates.impact;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.mitigationPlan !== undefined) updateData.mitigation_plan = updates.mitigationPlan || null;
      if (updates.ownerId !== undefined) updateData.owner_id = updates.ownerId || null;
      if (updates.targetResolutionDate !== undefined) updateData.target_resolution_date = updates.targetResolutionDate || null;

      const { error: updateError } = await supabase
        .from('risks')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) {
      console.error('Error updating risk:', err);
      throw err;
    }
  }, []);

  const deleteRisk = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, risk not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRisks(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting risk:', err);
      throw err;
    }
  }, []);

  return {
    risks,
    loading,
    error,
    getRisksByProject,
    getRisksByTask,
    addRisk,
    updateRisk,
    deleteRisk,
    refreshRisks: fetchRisks,
  };
};

