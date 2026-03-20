import { useState, useEffect, useCallback } from 'react';
import { Milestone } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseMilestone } from '../types';

interface UseMilestonesReturn {
  milestones: Milestone[];
  loading: boolean;
  error: string | null;
  getMilestonesByProject: (projectId: string) => Milestone[];
  addMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Milestone | null>;
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  refreshMilestones: () => Promise<void>;
}

export const useMilestones = (): UseMilestonesReturn => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('milestones')
        .select('*')
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedMilestones = data.map((m: SupabaseMilestone) => ({
          id: m.id,
          projectId: m.project_id,
          name: m.name,
          description: m.description || undefined,
          dueDate: m.due_date,
          status: m.status as Milestone['status'],
          color: m.color,
          createdBy: m.created_by || undefined,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        }));
        setMilestones(mappedMilestones);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des jalons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('milestones-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestones',
          },
          () => {
            fetchMilestones();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchMilestones]);

  const getMilestonesByProject = useCallback((projectId: string): Milestone[] => {
    return milestones
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [milestones]);

  const addMilestone = useCallback(async (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<Milestone | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, milestone not saved');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('milestones')
        .insert([{
          project_id: milestone.projectId,
          name: milestone.name,
          description: milestone.description || null,
          due_date: milestone.dueDate,
          status: milestone.status || 'upcoming',
          color: milestone.color || '#6366f1',
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newMilestone: Milestone = {
          id: data.id,
          projectId: data.project_id,
          name: data.name,
          description: data.description || undefined,
          dueDate: data.due_date,
          status: data.status as Milestone['status'],
          color: data.color,
          createdBy: data.created_by || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setMilestones(prev => [...prev, newMilestone]);
        return newMilestone;
      }
      return null;
    } catch (err) {
      console.error('Error adding milestone:', err);
      throw err;
    }
  }, []);

  const updateMilestone = useCallback(async (id: string, updates: Partial<Milestone>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, milestone not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { error: updateError } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('Error updating milestone:', err);
      throw err;
    }
  }, []);

  const deleteMilestone = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, milestone not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting milestone:', err);
      throw err;
    }
  }, []);

  return {
    milestones,
    loading,
    error,
    getMilestonesByProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    refreshMilestones: fetchMilestones,
  };
};

