import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { EmailSegment, EmailSegmentCriteria } from '../../../types';
import { evaluateConditionGroup, ConditionGroup } from '../../utils/conditionEvaluator';
import { Lead } from '../../../types';

export const useEmailSegments = () => {
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('email_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedSegments: EmailSegment[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        criteria: s.criteria || {},
        leadCount: s.lead_count || 0,
        isDynamic: s.is_dynamic,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));

      setSegments(formattedSegments);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading email segments:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async (segment: Omit<EmailSegment, 'id' | 'createdAt' | 'updatedAt' | 'leadCount'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Calculate lead count based on criteria
      const leadCount = await calculateLeadCount(segment.criteria);

      const { data, error: insertError } = await supabase
        .from('email_segments')
        .insert({
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          lead_count: leadCount,
          is_dynamic: segment.isDynamic,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newSegment: EmailSegment = {
        id: data.id,
        name: data.name,
        description: data.description,
        criteria: data.criteria,
        leadCount: data.lead_count,
        isDynamic: data.is_dynamic,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSegments([newSegment, ...segments]);
      return newSegment;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateSegment = async (id: string, updates: Partial<EmailSegment>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.criteria !== undefined) {
        updateData.criteria = updates.criteria;
        // Recalculate lead count if criteria changed
        updateData.lead_count = await calculateLeadCount(updates.criteria);
      }
      if (updates.isDynamic !== undefined) updateData.is_dynamic = updates.isDynamic;

      const { data, error: updateError } = await supabase
        .from('email_segments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedSegment: EmailSegment = {
        id: data.id,
        name: data.name,
        description: data.description,
        criteria: data.criteria,
        leadCount: data.lead_count,
        isDynamic: data.is_dynamic,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSegments(segments.map(s => s.id === id ? updatedSegment : s));
      return updatedSegment;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteSegment = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('email_segments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSegments(segments.filter(s => s.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const calculateLeadCount = async (criteria: EmailSegmentCriteria): Promise<number> => {
    try {
      // Si le critère contient une ConditionGroup (pour critères comportementaux), utiliser l'évaluateur
      if ((criteria as any).conditionGroup) {
        const conditionGroup = (criteria as any).conditionGroup as ConditionGroup;
        
        // Récupérer tous les leads et les filtrer avec l'évaluateur de conditions
        const { data: allLeads, error: fetchError } = await supabase
          .from('leads')
          .select('*');
        
        if (fetchError) throw fetchError;
        if (!allLeads) return 0;
        
        // Filtrer les leads selon les conditions comportementales
        const matchingLeads = [];
        for (const lead of allLeads) {
          try {
            const matches = await evaluateConditionGroup(lead as Lead, conditionGroup);
            if (matches) {
              matchingLeads.push(lead);
            }
          } catch (err) {
            console.warn(`Error evaluating conditions for lead ${lead.id}:`, err);
          }
        }
        
        return matchingLeads.length;
      }
      
      // Méthode classique pour critères simples
      let query = supabase.from('leads').select('id', { count: 'exact', head: true });

      // Apply criteria filters
      if (criteria.scoring?.min !== undefined) {
        query = query.gte('scoring', criteria.scoring.min);
      }
      if (criteria.scoring?.max !== undefined) {
        query = query.lte('scoring', criteria.scoring.max);
      }

      if (criteria.temperature) {
        const temps = Array.isArray(criteria.temperature) ? criteria.temperature : [criteria.temperature];
        query = query.in('temperature', temps);
      }

      if (criteria.family) {
        const families = Array.isArray(criteria.family) ? criteria.family : [criteria.family];
        query = query.in('family', families);
      }

      if (criteria.lifecycleStage) {
        const stages = Array.isArray(criteria.lifecycleStage) ? criteria.lifecycleStage : [criteria.lifecycleStage];
        query = query.in('lifecycle_stage', stages);
      }

      if (criteria.tags && criteria.tags.length > 0) {
        query = query.contains('tags', criteria.tags);
      }

      if (criteria.createdAfter) {
        query = query.gte('created_at', criteria.createdAfter);
      }

      if (criteria.createdBefore) {
        query = query.lte('created_at', criteria.createdBefore);
      }

      // Support des critères comportementaux basiques via conditions
      if ((criteria as any).behavioral) {
        const behavioral = (criteria as any).behavioral;
        
        // Pour les critères comportementaux, on doit filtrer après récupération
        // car ils nécessitent des jointures avec sales_activities et email_tracking
        const { data: leads, error: leadsError } = await query;
        if (leadsError) throw leadsError;
        if (!leads || leads.length === 0) return 0;
        
        // Filtrer selon critères comportementaux
        const leadIds = leads.map((l: any) => l.id);
        let matchingCount = 0;
        
        if (behavioral.hasOpenedEmail) {
          const { data: opens } = await supabase
            .from('email_tracking')
            .select('lead_id')
            .in('lead_id', leadIds)
            .gt('open_count', 0);
          
          if (opens) {
            const leadsWithOpens = new Set(opens.map((o: any) => o.lead_id));
            matchingCount = leadsWithOpens.size;
          }
        } else if (behavioral.hasClickedEmail) {
          const { data: clicks } = await supabase
            .from('email_tracking')
            .select('lead_id')
            .in('lead_id', leadIds)
            .gt('click_count', 0);
          
          if (clicks) {
            const leadsWithClicks = new Set(clicks.map((c: any) => c.lead_id));
            matchingCount = leadsWithClicks.size;
          }
        } else {
          // Si pas de critère comportemental spécifique, retourner le count normal
          const { count } = await query;
          return count || 0;
        }
        
        return matchingCount;
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error calculating lead count:', err);
      return 0;
    }
  };
  
  /**
   * Calcule les membres d'un segment en utilisant l'évaluateur de conditions
   * Supporte les critères comportementaux complexes via ConditionGroup
   */
  const calculateSegmentMembers = async (segmentId: string): Promise<string[]> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return [];
    
    return await calculateSegmentMembersFromCriteria(segment.criteria);
  };
  
  /**
   * Calcule les membres d'un segment depuis des critères
   * Supporte les critères comportementaux via ConditionGroup
   */
  const calculateSegmentMembersFromCriteria = async (criteria: EmailSegmentCriteria): Promise<string[]> => {
    try {
      // Si le critère contient une ConditionGroup (pour critères comportementaux), utiliser l'évaluateur
      if ((criteria as any).conditionGroup) {
        const conditionGroup = (criteria as any).conditionGroup as ConditionGroup;
        
        // Récupérer tous les leads et les filtrer avec l'évaluateur de conditions
        const { data: allLeads, error: fetchError } = await supabase
          .from('leads')
          .select('*');
        
        if (fetchError) throw fetchError;
        if (!allLeads) return [];
        
        // Filtrer les leads selon les conditions comportementales
        const matchingLeadIds: string[] = [];
        for (const lead of allLeads) {
          try {
            const matches = await evaluateConditionGroup(lead as Lead, conditionGroup);
            if (matches) {
              matchingLeadIds.push(lead.id);
            }
          } catch (err) {
            console.warn(`Error evaluating conditions for lead ${lead.id}:`, err);
          }
        }
        
        return matchingLeadIds;
      }
      
      // Méthode classique pour critères simples
      let query = supabase.from('leads').select('id');

      // Apply criteria filters
      if (criteria.scoring?.min !== undefined) {
        query = query.gte('scoring', criteria.scoring.min);
      }
      if (criteria.scoring?.max !== undefined) {
        query = query.lte('scoring', criteria.scoring.max);
      }

      if (criteria.temperature) {
        const temps = Array.isArray(criteria.temperature) ? criteria.temperature : [criteria.temperature];
        query = query.in('temperature', temps);
      }

      if (criteria.family) {
        const families = Array.isArray(criteria.family) ? criteria.family : [criteria.family];
        query = query.in('family', families);
      }

      if (criteria.lifecycleStage) {
        const stages = Array.isArray(criteria.lifecycleStage) ? criteria.lifecycleStage : [criteria.lifecycleStage];
        query = query.in('lifecycle_stage', stages);
      }

      if (criteria.tags && criteria.tags.length > 0) {
        query = query.contains('tags', criteria.tags);
      }

      if (criteria.createdAfter) {
        query = query.gte('created_at', criteria.createdAfter);
      }

      if (criteria.createdBefore) {
        query = query.lte('created_at', criteria.createdBefore);
      }

      const { data: leads, error } = await query;

      if (error) throw error;
      return leads?.map((l: any) => l.id) || [];
    } catch (err) {
      console.error('Error calculating segment members:', err);
      return [];
    }
  };

  const refreshSegmentCount = async (id: string) => {
    const segment = segments.find(s => s.id === id);
    if (!segment) return;

    const leadCount = await calculateLeadCount(segment.criteria);
    await updateSegment(id, { leadCount });
  };

  return {
    segments,
    loading,
    error,
    loadSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    calculateLeadCount,
    refreshSegmentCount,
    calculateSegmentMembers,
    calculateSegmentMembersFromCriteria,
  };
};

