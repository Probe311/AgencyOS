import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export interface LeadRelation {
  id: string;
  leadId: string;
  relatedLeadId: string;
  relationType: 'hierarchie' | 'influenceur' | 'partenaire' | 'concurrent' | 'fournisseur' | 'client' | 'autre';
  relationLabel?: string;
  description?: string;
  strength: number; // 0-100
  isReciprocal: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadRelations = (leadId?: string) => {
  const [relations, setRelations] = useState<LeadRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (leadId) {
      loadRelations(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadRelations = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_relations')
        .select('*')
        .or(`lead_id.eq.${id},related_lead_id.eq.${id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: LeadRelation[] = (data || []).map((r: any) => ({
        id: r.id,
        leadId: r.lead_id,
        relatedLeadId: r.related_lead_id,
        relationType: r.relation_type,
        relationLabel: r.relation_label,
        description: r.description,
        strength: r.strength || 50,
        isReciprocal: r.is_reciprocal || false,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      setRelations(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading relations:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRelation = async (relation: Omit<LeadRelation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('lead_relations')
        .insert({
          lead_id: relation.leadId,
          related_lead_id: relation.relatedLeadId,
          relation_type: relation.relationType,
          relation_label: relation.relationLabel,
          description: relation.description,
          strength: relation.strength,
          is_reciprocal: relation.isReciprocal,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newRelation: LeadRelation = {
        id: data.id,
        leadId: data.lead_id,
        relatedLeadId: data.related_lead_id,
        relationType: data.relation_type,
        relationLabel: data.relation_label,
        description: data.description,
        strength: data.strength,
        isReciprocal: data.is_reciprocal,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setRelations([newRelation, ...relations]);
      return newRelation;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteRelation = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('lead_relations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRelations(relations.filter(r => r.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    relations,
    loading,
    error,
    loadRelations,
    createRelation,
    deleteRelation,
  };
};

