import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../../api-keys';

export type EnrichmentType = 'ai' | 'clearbit' | 'fullcontact' | 'hunter' | 'sirene' | 'web_scraping' | 'linkedin';
export type EnrichmentStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EnrichmentJob {
  id: string;
  leadId: string;
  enrichmentType: EnrichmentType;
  status: EnrichmentStatus;
  sourceData: Record<string, any>;
  enrichedData: Record<string, any>;
  aiInsights?: {
    description?: string;
    swot?: {
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      threats?: string[];
    };
    techStack?: string[];
    industry?: string;
    [key: string]: any;
  };
  errors: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const useLeadEnrichment = () => {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enrichLeadWithAI = async (lead: Lead): Promise<EnrichmentJob> => {
    let jobData: any = null;
    try {
      setLoading(true);

      // Créer le job
      const { data: job, error: jobError } = await supabase
        .from('lead_enrichment_jobs')
        .insert({
          lead_id: lead.id,
          enrichment_type: 'ai',
          status: 'running',
          source_data: {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            source: lead.source,
            family: lead.family,
          },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jobError) throw jobError;
      jobData = job;

      // Enrichissement IA avec Gemini
      const apiKey = getApiKey('google');
      if (!apiKey) {
        throw new Error('Clé API Gemini non configurée');
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyse cette entreprise et génère un enrichissement :
Nom: ${lead.name || 'N/A'}
Entreprise: ${lead.company || 'N/A'}
Email: ${lead.email || 'N/A'}
Site web: ${lead.website || 'N/A'}
Source: ${lead.source || 'N/A'}
Famille: ${lead.family || 'N/A'}

Génère un JSON avec :
- description: Description de l'entreprise (2-3 phrases)
- swot: {strengths: [], weaknesses: [], opportunities: [], threats: []}
- techStack: [] (technologies utilisées si détectées)
- industry: Secteur d'activité
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      let aiInsights = {};
      if (response.text) {
        try {
          aiInsights = JSON.parse(response.text);
        } catch (e) {
          console.error('Error parsing AI response:', e);
        }
      }

      // Mettre à jour le lead avec les données enrichies
      const leadUpdates: Record<string, any> = {};
      if (aiInsights.description) {
        leadUpdates.description = aiInsights.description;
      }
      if (aiInsights.industry) {
        leadUpdates.sector = aiInsights.industry;
      }

      if (Object.keys(leadUpdates).length > 0) {
        await supabase
          .from('leads')
          .update(leadUpdates)
          .eq('id', lead.id);
      }

      // Enregistrer les données SIRENE si disponibles (simulation)
      // TODO: Intégrer avec l'API SIRENE réelle

      // Mettre à jour le job
      const { data: updatedJob, error: updateError } = await supabase
        .from('lead_enrichment_jobs')
        .update({
          status: 'completed',
          enriched_data: leadUpdates,
          ai_insights: aiInsights,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const enrichmentJob: EnrichmentJob = {
        id: updatedJob.id,
        leadId: updatedJob.lead_id,
        enrichmentType: updatedJob.enrichment_type,
        status: updatedJob.status,
        sourceData: updatedJob.source_data,
        enrichedData: updatedJob.enriched_data,
        aiInsights: updatedJob.ai_insights,
        errors: updatedJob.errors || [],
        startedAt: updatedJob.started_at,
        completedAt: updatedJob.completed_at,
        createdAt: updatedJob.created_at,
      };

      setError(null);
      return enrichmentJob;
    } catch (err) {
      setError(err as Error);
      
      // Marquer le job comme failed
      if (jobData?.id) {
        await supabase
          .from('lead_enrichment_jobs')
          .update({
            status: 'failed',
            errors: [(err as Error).message],
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobData.id);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEnrichmentHistory = async (leadId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('lead_enrichment_jobs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: EnrichmentJob[] = (data || []).map((j: any) => ({
        id: j.id,
        leadId: j.lead_id,
        enrichmentType: j.enrichment_type,
        status: j.status,
        sourceData: j.source_data,
        enrichedData: j.enriched_data,
        aiInsights: j.ai_insights,
        errors: j.errors || [],
        startedAt: j.started_at,
        completedAt: j.completed_at,
        createdAt: j.created_at,
      }));

      return formatted;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    jobs,
    loading,
    error,
    enrichLeadWithAI,
    getEnrichmentHistory,
  };
};

