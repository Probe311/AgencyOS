import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useChurnDetection } from './useChurnDetection';

export type SurveyType = 'nps' | 'csat' | 'custom';
export type SurveyTrigger = 'project_delivery' | 'periodic' | 'churn_risk' | 'custom';
export type SurveyStatus = 'pending' | 'sent' | 'opened' | 'submitted' | 'expired';

export interface SatisfactionSurvey {
  id: string;
  leadId: string;
  surveyType: SurveyType;
  surveyTrigger: SurveyTrigger;
  npsScore?: number; // 0-10
  csatScore?: number; // 1-5
  openFeedback?: string;
  strengths: string[];
  improvements: string[];
  submittedAt?: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  status: SurveyStatus;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useSatisfactionSurveys = () => {
  const { detectChurnRisk } = useChurnDetection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendSurvey = async (
    lead: Lead,
    trigger: SurveyTrigger,
    surveyType: SurveyType = 'nps'
  ): Promise<SatisfactionSurvey> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('satisfaction_surveys')
        .insert({
          lead_id: lead.id,
          survey_type: surveyType,
          survey_trigger: trigger,
          status: 'pending',
          metadata: {
            leadName: lead.name,
            leadCompany: lead.company,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const survey: SatisfactionSurvey = {
        id: data.id,
        leadId: data.lead_id,
        surveyType: data.survey_type,
        surveyTrigger: data.survey_trigger,
        npsScore: data.nps_score,
        csatScore: data.csat_score,
        openFeedback: data.open_feedback,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        submittedAt: data.submitted_at,
        sentAt: data.sent_at,
        openedAt: data.opened_at,
        clickedAt: data.clicked_at,
        status: data.status,
        metadata: data.metadata,
        createdAt: data.created_at,
      };

      // TODO: Envoyer l'email avec le lien vers l'enquête
      // Pour l'instant, on marque comme envoyé
      await supabase
        .from('satisfaction_surveys')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', survey.id);

      setError(null);
      return survey;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitSurveyResponse = async (
    surveyId: string,
    responses: {
      npsScore?: number;
      csatScore?: number;
      openFeedback?: string;
      strengths?: string[];
      improvements?: string[];
    }
  ): Promise<SatisfactionSurvey> => {
    try {
      setLoading(true);

      const { data, error: updateError } = await supabase
        .from('satisfaction_surveys')
        .update({
          nps_score: responses.npsScore,
          csat_score: responses.csatScore,
          open_feedback: responses.openFeedback,
          strengths: responses.strengths || [],
          improvements: responses.improvements || [],
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', surveyId)
        .select()
        .single();

      if (updateError) throw updateError;

      const survey: SatisfactionSurvey = {
        id: data.id,
        leadId: data.lead_id,
        surveyType: data.survey_type,
        surveyTrigger: data.survey_trigger,
        npsScore: data.nps_score,
        csatScore: data.csat_score,
        openFeedback: data.open_feedback,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        submittedAt: data.submitted_at,
        sentAt: data.sent_at,
        openedAt: data.opened_at,
        clickedAt: data.clicked_at,
        status: data.status,
        metadata: data.metadata,
        createdAt: data.created_at,
      };

      // Vérifier si le score est faible et déclencher une escalade
      if ((responses.npsScore !== undefined && responses.npsScore < 6) ||
          (responses.csatScore !== undefined && responses.csatScore < 3)) {
        // Récupérer le lead
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', survey.leadId)
          .single();

        if (lead) {
          // Détecter le risque de churn
          await detectChurnRisk(lead);
        }
      }

      setError(null);
      return survey;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const schedulePeriodicSurveys = async () => {
    try {
      // Récupérer les clients actifs qui n'ont pas reçu d'enquête depuis 6 mois
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: clients } = await supabase
        .from('leads')
        .select('id, name, company')
        .in('lifecycle_stage', ['Client', 'Client Actif']);

      if (!clients) return;

      for (const client of clients) {
        // Vérifier la dernière enquête
        const { data: lastSurvey } = await supabase
          .from('satisfaction_surveys')
          .select('created_at')
          .eq('lead_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const shouldSend = !lastSurvey || 
          new Date(lastSurvey.created_at) < sixMonthsAgo;

        if (shouldSend) {
          await sendSurvey(client, 'periodic', 'nps');
        }
      }
    } catch (err) {
      console.error('Error scheduling periodic surveys:', err);
    }
  };

  return {
    loading,
    error,
    sendSurvey,
    submitSurveyResponse,
    schedulePeriodicSurveys,
  };
};

