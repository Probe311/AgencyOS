import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { calculateLeadQualityScore, LeadQualityScore } from '../../utils/leadValidation';
import { logError } from '../../utils/logger';

export interface LeadQualityScoreRecord {
  id: string;
  lead_id: string;
  overall_score: number;
  email_valid: boolean | null;
  phone_valid: boolean | null;
  data_completeness: number;
  source_reliability: number;
  data_freshness: number;
  missing_fields: string[];
  suspicious_fields: string[];
  last_validated_at: string;
  created_at: string;
  updated_at: string;
}

export function useLeadQualityScores() {
  const [scores, setScores] = useState<Record<string, LeadQualityScoreRecord>>({});
  const [loading, setLoading] = useState(false);

  const calculateAndSaveScore = async (leadId: string, lead: any, dataFreshness?: number) => {
    setLoading(true);
    try {
      const qualityScore = calculateLeadQualityScore(lead, dataFreshness);

      const { data, error } = await supabase
        .from('lead_quality_scores')
        .upsert({
          lead_id: leadId,
          overall_score: qualityScore.overallScore,
          email_valid: qualityScore.emailValid,
          phone_valid: qualityScore.phoneValid,
          data_completeness: qualityScore.dataCompleteness,
          source_reliability: qualityScore.sourceReliability,
          data_freshness: qualityScore.dataFreshness,
          missing_fields: qualityScore.missingFields,
          suspicious_fields: qualityScore.suspiciousFields,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'lead_id',
        })
        .select()
        .single();

      if (error) throw error;

      setScores(prev => ({
        ...prev,
        [leadId]: data,
      }));

      return data;
    } catch (error) {
      logError('Erreur calcul score qualité:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getScore = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_quality_scores')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      if (data) {
        setScores(prev => ({
          ...prev,
          [leadId]: data,
        }));
      }

      return data;
    } catch (error) {
      logError('Erreur récupération score:', error);
      return null;
    }
  };

  const getScoreForLead = (leadId: string): LeadQualityScoreRecord | null => {
    return scores[leadId] || null;
  };

  const validateAndScoreLead = async (leadId: string, lead: any) => {
    // Calculer la fraîcheur des données (jours depuis création)
    const createdAt = lead.created_at ? new Date(lead.created_at) : new Date();
    const dataFreshness = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return await calculateAndSaveScore(leadId, lead, dataFreshness);
  };

  const bulkValidateLeads = async (leads: Array<{ id: string; [key: string]: any }>) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        leads.map(lead => validateAndScoreLead(lead.id, lead).catch(err => {
          logError(`Erreur validation lead ${lead.id}:`, err);
          return null;
        }))
      );

      return results.filter(r => r !== null);
    } finally {
      setLoading(false);
    }
  };

  return {
    scores,
    loading,
    calculateAndSaveScore,
    getScore,
    getScoreForLead,
    validateAndScoreLead,
    bulkValidateLeads,
  };
}

