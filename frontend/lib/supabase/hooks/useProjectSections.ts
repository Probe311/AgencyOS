import { useState, useEffect, useCallback } from 'react';
import { ProjectSection } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseProjectSection } from '../types';

interface UseProjectSectionsReturn {
  sections: ProjectSection[];
  loading: boolean;
  error: string | null;
  getSectionsByProject: (projectId: string) => ProjectSection[];
  addSection: (section: Omit<ProjectSection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProjectSection | null>;
  updateSection: (id: string, updates: Partial<ProjectSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  refreshSections: () => Promise<void>;
}

export const useProjectSections = (): UseProjectSectionsReturn => {
  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('project_sections')
        .select('*')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mappedSections = data.map((s: SupabaseProjectSection) => ({
          id: s.id,
          projectId: s.project_id,
          name: s.name,
          description: s.description || undefined,
          position: s.position,
          color: s.color,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
        setSections(mappedSections);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Error fetching project sections:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('project-sections-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_sections',
          },
          () => {
            fetchSections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchSections]);

  const getSectionsByProject = useCallback((projectId: string): ProjectSection[] => {
    return sections
      .filter(s => s.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  }, [sections]);

  const addSection = useCallback(async (section: Omit<ProjectSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectSection | null> => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, section not saved');
      return null;
    }

    try {
      // Get max position for this project
      const { data: maxPosData } = await supabase
        .from('project_sections')
        .select('position')
        .eq('project_id', section.projectId)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      
      const maxPosition = maxPosData?.position ?? -1;
      
      const { data, error: insertError } = await supabase
        .from('project_sections')
        .insert([{
          project_id: section.projectId,
          name: section.name,
          description: section.description || null,
          position: maxPosition + 1,
          color: section.color || '#6366f1',
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const newSection: ProjectSection = {
          id: data.id,
          projectId: data.project_id,
          name: data.name,
          description: data.description || undefined,
          position: data.position,
          color: data.color,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setSections(prev => [...prev, newSection]);
        return newSection;
      }
      return null;
    } catch (err) {
      console.error('Error adding section:', err);
      throw err;
    }
  }, []);

  const updateSection = useCallback(async (id: string, updates: Partial<ProjectSection>) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, section not updated');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { error: updateError } = await supabase
        .from('project_sections')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating section:', err);
      throw err;
    }
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, section not deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('project_sections')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSections(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting section:', err);
      throw err;
    }
  }, []);

  return {
    sections,
    loading,
    error,
    getSectionsByProject,
    addSection,
    updateSection,
    deleteSection,
    refreshSections: fetchSections,
  };
};

