import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead, Priority } from '../../../types';

export type TaskType = 'follow_up' | 'qualification' | 'enrichment' | 'custom';

export interface AutomatedTask {
  id: string;
  taskType: TaskType;
  leadId: string;
  assignedTo?: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;
}

export const useAutomatedTasks = () => {
  const [tasks, setTasks] = useState<AutomatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('automated_tasks')
        .select('*')
        .is('completed_at', null)
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;

      const formatted: AutomatedTask[] = (data || []).map((t: any) => ({
        id: t.id,
        taskType: t.task_type,
        leadId: t.lead_id,
        assignedTo: t.assigned_to,
        title: t.title,
        description: t.description,
        priority: t.priority as Priority,
        dueDate: t.due_date,
        tags: t.tags || [],
        metadata: t.metadata || {},
        createdBy: t.created_by,
        createdAt: t.created_at,
        completedAt: t.completed_at,
      }));

      setTasks(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading automated tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFollowUpTask = async (
    lead: Lead,
    options: {
      priority?: Priority;
      dueDays?: number;
      tags?: string[];
      description?: string;
    } = {}
  ): Promise<AutomatedTask> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Déterminer la priorité selon le scoring
      let priority: Priority = 'Moyenne';
      if (lead.qualityScore !== undefined) {
        if (lead.qualityScore > 75) {
          priority = 'Haute';
        } else if (lead.qualityScore < 50) {
          priority = 'Basse';
        }
      }
      priority = options.priority || priority;

      // Calculer la date d'échéance (J+2 par défaut)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (options.dueDays || 2));

      // Construire les tags
      const tags = [
        'Nouveau Lead',
        'À contacter',
        ...(lead.family ? [lead.family] : []),
        ...(options.tags || []),
      ];

      // Construire la description
      const description = options.description || [
        `Lead : ${lead.name || 'Sans nom'}`,
        lead.company ? `Entreprise : ${lead.company}` : '',
        lead.source ? `Source : ${lead.source}` : '',
        lead.qualityScore !== undefined ? `Score : ${lead.qualityScore}/100` : '',
      ].filter(Boolean).join('\n');

      const { data, error: insertError } = await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: lead.assignedTo,
          title: `Contacter nouveau lead : ${lead.name || lead.company || 'Sans nom'} - ${lead.company || ''}`,
          description,
          priority,
          due_date: dueDate.toISOString(),
          tags,
          metadata: {
            leadId: lead.id,
            leadName: lead.name,
            leadCompany: lead.company,
            scoring: lead.qualityScore,
            source: lead.source,
            family: lead.family,
          },
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const task: AutomatedTask = {
        id: data.id,
        taskType: data.task_type,
        leadId: data.lead_id,
        assignedTo: data.assigned_to,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.due_date,
        tags: data.tags || [],
        metadata: data.metadata || {},
        createdBy: data.created_by,
        createdAt: data.created_at,
        completedAt: data.completed_at,
      };

      await loadTasks();
      return task;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('automated_tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (updateError) throw updateError;
      await loadTasks();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    loadTasks,
    createFollowUpTask,
    completeTask,
  };
};

