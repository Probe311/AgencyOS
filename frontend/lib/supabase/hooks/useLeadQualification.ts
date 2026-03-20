import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../../api-keys';
import { Lead } from '../../../types';

export interface LeadQualification {
  id: string;
  leadId: string;
  qualificationStatus: 'pending' | 'qualified' | 'disqualified' | 'needs_review';
  qualificationLevel?: 'MQL' | 'SQL' | 'Opportunity' | 'Customer';
  aiConfidence: number;
  qualificationScore: number;
  qualificationCriteria: {
    budget?: { identified: boolean; amount?: number; range?: string };
    need?: { identified: boolean; description?: string };
    authority?: { identified: boolean; role?: string };
    timeline?: { identified: boolean; timeframe?: string };
  };
  aiAnalysis?: string;
  aiRecommendations?: string[];
  qualifiedBy?: string;
  qualifiedAt?: string;
  lastAiQualificationAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadQualification = (leadId?: string) => {
  const [qualification, setQualification] = useState<LeadQualification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isQualifying, setIsQualifying] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadQualification(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadQualification = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_qualification')
        .select('*')
        .eq('lead_id', id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 = no rows

      if (data) {
        setQualification({
          id: data.id,
          leadId: data.lead_id,
          qualificationStatus: data.qualification_status,
          qualificationLevel: data.qualification_level,
          aiConfidence: data.ai_confidence || 0,
          qualificationScore: data.qualification_score || 0,
          qualificationCriteria: data.qualification_criteria || {},
          aiAnalysis: data.ai_analysis,
          aiRecommendations: data.ai_recommendations || [],
          qualifiedBy: data.qualified_by,
          qualifiedAt: data.qualified_at,
          lastAiQualificationAt: data.last_ai_qualification_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setQualification(null);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading qualification:', err);
    } finally {
      setLoading(false);
    }
  };

  const qualifyLeadWithAI = async (lead: Lead): Promise<LeadQualification> => {
    try {
      setIsQualifying(true);
      setError(null);

      const apiKey = getApiKey('google');
      if (!apiKey) {
        throw new Error('Clé API Gemini non configurée');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Préparer les données du lead pour l'IA
      const leadData = {
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        value: lead.value,
        stage: lead.stage,
        lifecycleStage: lead.lifecycleStage,
        source: lead.source,
        family: lead.family,
        temperature: lead.temperature,
        probability: lead.probability,
      };

      const prompt = `Analyse ce lead commercial et qualifie-le selon les critères BANT (Budget, Autorité, Besoin, Timeline).

Lead à analyser:
${JSON.stringify(leadData, null, 2)}

Réponds en JSON avec cette structure:
{
  "qualificationStatus": "qualified" | "disqualified" | "needs_review",
  "qualificationLevel": "MQL" | "SQL" | "Opportunity" | "Customer" | null,
  "qualificationScore": 0-100,
  "aiConfidence": 0-100,
  "qualificationCriteria": {
    "budget": {"identified": boolean, "amount": number ou null, "range": string ou null},
    "need": {"identified": boolean, "description": string ou null},
    "authority": {"identified": boolean, "role": string ou null},
    "timeline": {"identified": boolean, "timeframe": string ou null}
  },
  "aiAnalysis": "Analyse détaillée du lead",
  "aiRecommendations": ["Recommandation 1", "Recommandation 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (!response.text) {
        throw new Error('Aucune réponse de l\'IA');
      }

      const aiResult = JSON.parse(response.text);

      // Créer ou mettre à jour la qualification
      const qualificationData = {
        lead_id: lead.id,
        qualification_status: aiResult.qualificationStatus,
        qualification_level: aiResult.qualificationLevel,
        ai_confidence: aiResult.aiConfidence,
        qualification_score: aiResult.qualificationScore,
        qualification_criteria: aiResult.qualificationCriteria,
        ai_analysis: aiResult.aiAnalysis,
        ai_recommendations: aiResult.aiRecommendations || [],
        last_ai_qualification_at: new Date().toISOString(),
      };

      // Vérifier si une qualification existe déjà
      const { data: existing } = await supabase
        .from('lead_qualification')
        .select('id')
        .eq('lead_id', lead.id)
        .single();

      let result;
      if (existing) {
        const { data, error: updateError } = await supabase
          .from('lead_qualification')
          .update(qualificationData)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('lead_qualification')
          .insert(qualificationData)
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
      }

      const newQualification: LeadQualification = {
        id: result.id,
        leadId: result.lead_id,
        qualificationStatus: result.qualification_status,
        qualificationLevel: result.qualification_level,
        aiConfidence: result.ai_confidence,
        qualificationScore: result.qualification_score,
        qualificationCriteria: result.qualification_criteria,
        aiAnalysis: result.ai_analysis,
        aiRecommendations: result.ai_recommendations || [],
        qualifiedBy: result.qualified_by,
        qualifiedAt: result.qualified_at,
        lastAiQualificationAt: result.last_ai_qualification_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };

      setQualification(newQualification);
      return newQualification;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsQualifying(false);
    }
  };

  const updateQualificationStatus = async (
    id: string,
    status: 'qualified' | 'disqualified' | 'needs_review',
    level?: 'MQL' | 'SQL' | 'Opportunity' | 'Customer'
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const updateData: any = {
        qualification_status: status,
        qualified_at: new Date().toISOString(),
      };

      if (level) {
        updateData.qualification_level = level;
      }

      if (userId) {
        updateData.qualified_by = userId;
      }

      const { data, error: updateError } = await supabase
        .from('lead_qualification')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated: LeadQualification = {
        id: data.id,
        leadId: data.lead_id,
        qualificationStatus: data.qualification_status,
        qualificationLevel: data.qualification_level,
        aiConfidence: data.ai_confidence,
        qualificationScore: data.qualification_score,
        qualificationCriteria: data.qualification_criteria,
        aiAnalysis: data.ai_analysis,
        aiRecommendations: data.ai_recommendations || [],
        qualifiedBy: data.qualified_by,
        qualifiedAt: data.qualified_at,
        lastAiQualificationAt: data.last_ai_qualification_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setQualification(updated);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    qualification,
    loading,
    error,
    isQualifying,
    loadQualification,
    qualifyLeadWithAI,
    updateQualificationStatus,
  };
};

