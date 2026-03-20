import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export interface SegmentCriteria {
  // Critères de base
  lifecycleStage?: string[];
  status?: string[];
  source?: string[];
  assignedTo?: string[];
  certified?: boolean;
  
  // Critères de valeur
  valueMin?: number;
  valueMax?: number;
  probabilityMin?: number;
  probabilityMax?: number;
  
  // Critères de dates
  createdAfter?: string; // Date ISO
  createdBefore?: string;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  daysSinceLastActivity?: number; // Inactif depuis X jours
  daysSinceCreated?: number; // Créé il y a X jours
  
  // Critères de température (si disponible)
  temperature?: string[]; // ['Froid', 'Tiède', 'Chaud']
  
  // Critères de famille/secteur (si disponibles)
  family?: string[];
  sector?: string[];
  
  // Critères de tags
  hasTags?: string[]; // Doit avoir ces tags
  hasNotTags?: string[]; // Ne doit pas avoir ces tags
  
  // Critères de scoring (via lead_quality_scores)
  scoringMin?: number;
  scoringMax?: number;
  
  // Critères personnalisés (JSONB)
  customCriteria?: Record<string, any>;
  
  // Opérateurs logiques
  operator?: 'AND' | 'OR'; // Comment combiner les critères
}

export interface LeadSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  isDynamic: boolean;
  leadCount: number;
  lastCalculatedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadSegments = () => {
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: LeadSegment[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        criteria: s.criteria || {},
        isDynamic: s.is_dynamic,
        leadCount: s.lead_count || 0,
        lastCalculatedAt: s.last_calculated_at,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));

      setSegments(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading segments:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async (segment: Omit<LeadSegment, 'id' | 'createdAt' | 'updatedAt' | 'leadCount' | 'lastCalculatedAt'>) => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('lead_segments')
        .insert({
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          is_dynamic: segment.isDynamic,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Calculer le nombre de leads
      const count = await calculateSegmentCount(data.id, segment.criteria);
      await supabase
        .from('lead_segments')
        .update({ lead_count: count, last_calculated_at: new Date().toISOString() })
        .eq('id', data.id);

      await loadSegments();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSegment = async (segmentId: string, updates: Partial<LeadSegment>) => {
    try {
      setLoading(true);
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
      if (updates.isDynamic !== undefined) updateData.is_dynamic = updates.isDynamic;

      const { error: updateError } = await supabase
        .from('lead_segments')
        .update(updateData)
        .eq('id', segmentId);

      if (updateError) throw updateError;

      // Recalculer le nombre de leads si les critères ont changé
      if (updates.criteria) {
        const count = await calculateSegmentCount(segmentId, updates.criteria);
        await supabase
          .from('lead_segments')
          .update({ lead_count: count, last_calculated_at: new Date().toISOString() })
          .eq('id', segmentId);
      }

      await loadSegments();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSegment = async (segmentId: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('lead_segments')
        .delete()
        .eq('id', segmentId);

      if (deleteError) throw deleteError;
      await loadSegments();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculateSegmentCount = async (segmentId: string, criteria: SegmentCriteria): Promise<number> => {
    try {
      const leads = await getLeadsByCriteria(criteria);
      return leads.length;
    } catch (err) {
      console.error('Error calculating segment count:', err);
      return 0;
    }
  };

  const getLeadsByCriteria = async (criteria: SegmentCriteria): Promise<Lead[]> => {
    try {
      let query = supabase.from('leads').select('*');

      // Critères de base
      if (criteria.lifecycleStage && criteria.lifecycleStage.length > 0) {
        query = query.in('lifecycle_stage', criteria.lifecycleStage);
      }

      if (criteria.status && criteria.status.length > 0) {
        query = query.in('status', criteria.status);
      }

      if (criteria.source && criteria.source.length > 0) {
        query = query.in('source', criteria.source);
      }

      if (criteria.assignedTo && criteria.assignedTo.length > 0) {
        query = query.in('assigned_to', criteria.assignedTo);
      }

      if (criteria.certified !== undefined) {
        query = query.eq('certified', criteria.certified);
      }

      // Critères de valeur
      if (criteria.valueMin !== undefined) {
        query = query.gte('value', criteria.valueMin);
      }

      if (criteria.valueMax !== undefined) {
        query = query.lte('value', criteria.valueMax);
      }

      if (criteria.probabilityMin !== undefined) {
        query = query.gte('probability', criteria.probabilityMin);
      }

      if (criteria.probabilityMax !== undefined) {
        query = query.lte('probability', criteria.probabilityMax);
      }

      // Critères de dates
      if (criteria.createdAfter) {
        query = query.gte('created_at', criteria.createdAfter);
      }

      if (criteria.createdBefore) {
        query = query.lte('created_at', criteria.createdBefore);
      }

      if (criteria.lastActivityAfter) {
        query = query.gte('last_activity_date', criteria.lastActivityAfter);
      }

      if (criteria.lastActivityBefore) {
        query = query.lte('last_activity_date', criteria.lastActivityBefore);
      }

      if (criteria.daysSinceLastActivity) {
        const cutoffDate = new Date(Date.now() - criteria.daysSinceLastActivity * 24 * 60 * 60 * 1000);
        query = query.lte('last_activity_date', cutoffDate.toISOString());
      }

      if (criteria.daysSinceCreated) {
        const cutoffDate = new Date(Date.now() - criteria.daysSinceCreated * 24 * 60 * 60 * 1000);
        query = query.lte('created_at', cutoffDate.toISOString());
      }

      // Critères de tags (si la colonne existe)
      if (criteria.hasTags && criteria.hasTags.length > 0) {
        // PostgreSQL array contains
        for (const tag of criteria.hasTags) {
          query = query.contains('tags', [tag]);
        }
      }

      if (criteria.hasNotTags && criteria.hasNotTags.length > 0) {
        // Exclure les leads avec ces tags
        for (const tag of criteria.hasNotTags) {
          query = query.not('tags', 'cs', `{${tag}}`);
        }
      }

      // Critères de température (si disponible dans les métadonnées ou colonne dédiée)
      // Note: À adapter selon votre structure de données

      // Critères de scoring (via lead_quality_scores)
      if (criteria.scoringMin !== undefined || criteria.scoringMax !== undefined) {
        // Joindre avec lead_quality_scores
        query = query.select('*, lead_quality_scores!inner(overall_score)');
        if (criteria.scoringMin !== undefined) {
          query = query.gte('lead_quality_scores.overall_score', criteria.scoringMin);
        }
        if (criteria.scoringMax !== undefined) {
          query = query.lte('lead_quality_scores.overall_score', criteria.scoringMax);
        }
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Filtrer les résultats selon les critères supplémentaires
      let filteredLeads = (data || []) as any[];

      // Filtrer par température, famille, secteur si disponibles dans les métadonnées
      // (À adapter selon votre structure)

      // Filtrer par scoring si pas déjà fait via join
      if (criteria.scoringMin !== undefined || criteria.scoringMax !== undefined) {
        // Si le join n'a pas fonctionné, filtrer manuellement
        const { data: scores } = await supabase
          .from('lead_quality_scores')
          .select('lead_id, overall_score')
          .in('lead_id', filteredLeads.map(l => l.id));

        const scoreMap = new Map(scores?.map((s: any) => [s.lead_id, s.overall_score]) || []);
        
        filteredLeads = filteredLeads.filter(lead => {
          const score = scoreMap.get(lead.id);
          if (score === undefined) return false;
          if (criteria.scoringMin !== undefined && score < criteria.scoringMin) return false;
          if (criteria.scoringMax !== undefined && score > criteria.scoringMax) return false;
          return true;
        });
      }

      return filteredLeads.map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        status: l.status,
        lifecycleStage: l.lifecycle_stage,
        source: l.source,
        value: l.value,
        probability: l.probability,
        notes: l.notes,
        assignedTo: l.assigned_to,
        convertedAt: l.converted_at,
        lostAt: l.lost_at,
        lostReason: l.lost_reason,
        firstContactDate: l.first_contact_date,
        lastActivityDate: l.last_activity_date,
        certified: l.certified,
        certifiedAt: l.certified_at,
        siret: l.siret,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })) as Lead[];
    } catch (err) {
      console.error('Error getting leads by criteria:', err);
      throw err;
    }
  };

  const refreshSegmentCount = async (segmentId: string) => {
    try {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) throw new Error('Segment non trouvé');

      const count = await calculateSegmentCount(segmentId, segment.criteria);
      await supabase
        .from('lead_segments')
        .update({ 
          lead_count: count, 
          last_calculated_at: new Date().toISOString() 
        })
        .eq('id', segmentId);

      await loadSegments();
      return count;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    loadSegments();
  }, []);

  return {
    segments,
    loading,
    error,
    loadSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    getLeadsByCriteria,
    refreshSegmentCount,
    calculateSegmentCount,
  };
};

