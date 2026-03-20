import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export type FormType = 'email_embedded' | 'landing_page' | 'chatbot';
export type QualificationStatus = 'qualified' | 'not_qualified' | 'needs_review';

export interface QualificationQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  scoringWeight?: number; // Poids pour le calcul du score
  options?: { label: string; value: string; score?: number }[]; // Options pour select/radio
  fieldMapping?: string; // Champ lead à mettre à jour (ex: "budget", "timeline")
}

export interface QualificationForm {
  id: string;
  name: string;
  description?: string;
  formType: FormType;
  questions: QualificationQuestion[];
  scoringRules: {
    minScore?: number;
    qualifiedThreshold?: number;
    needsReviewThreshold?: number;
    [key: string]: any;
  };
  fieldMapping: Record<string, string>; // Mapping réponse -> champ lead
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualificationResponse {
  id: string;
  formId: string;
  leadId: string;
  responses: Record<string, any>;
  calculatedScore?: number;
  qualificationStatus?: QualificationStatus;
  aiInsights?: Record<string, any>;
  submittedAt: string;
  createdAt: string;
}

export const useQualificationForms = () => {
  const [forms, setForms] = useState<QualificationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('qualification_forms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: QualificationForm[] = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        formType: f.form_type,
        questions: f.questions || [],
        scoringRules: f.scoring_rules || {},
        fieldMapping: f.field_mapping || {},
        isActive: f.is_active,
        createdBy: f.created_by,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      setForms(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading qualification forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (form: Omit<QualificationForm, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error: insertError } = await supabase
        .from('qualification_forms')
        .insert({
          name: form.name,
          description: form.description,
          form_type: form.formType,
          questions: form.questions,
          scoring_rules: form.scoringRules,
          field_mapping: form.fieldMapping,
          is_active: form.isActive,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadForms();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const submitResponse = async (
    formId: string,
    leadId: string,
    responses: Record<string, any>
  ): Promise<QualificationResponse> => {
    try {
      const form = forms.find(f => f.id === formId);
      if (!form) throw new Error('Formulaire non trouvé');

      // Calculer le score
      let score = 0;
      form.questions.forEach(question => {
        const answer = responses[question.id];
        if (answer && question.scoringWeight) {
          // Si c'est une question avec options et scores
          if (question.options) {
            const option = question.options.find(opt => opt.value === answer);
            if (option?.score) {
              score += option.score * (question.scoringWeight / 100);
            } else {
              score += question.scoringWeight;
            }
          } else {
            score += question.scoringWeight;
          }
        }
      });

      // Déterminer le statut
      let status: QualificationStatus = 'not_qualified';
      if (score >= (form.scoringRules.qualifiedThreshold || 75)) {
        status = 'qualified';
      } else if (score >= (form.scoringRules.needsReviewThreshold || 50)) {
        status = 'needs_review';
      }

      // Mettre à jour les champs du lead selon le mapping
      const leadUpdates: Record<string, any> = {};
      Object.entries(form.fieldMapping).forEach(([responseKey, leadField]) => {
        if (responses[responseKey]) {
          leadUpdates[leadField] = responses[responseKey];
        }
      });

      if (Object.keys(leadUpdates).length > 0) {
        await supabase
          .from('leads')
          .update(leadUpdates)
          .eq('id', leadId);
      }

      // Mettre à jour le score de qualification
      await supabase
        .from('lead_qualification')
        .upsert({
          lead_id: leadId,
          qualification_score: Math.round(score),
          qualification_status: status === 'qualified' ? 'qualified' : status === 'needs_review' ? 'needs_review' : 'not_qualified',
          qualified_at: status === 'qualified' ? new Date().toISOString() : null,
        });

      // Enregistrer la réponse
      const { data, error: insertError } = await supabase
        .from('qualification_responses')
        .insert({
          form_id: formId,
          lead_id: leadId,
          responses,
          calculated_score: Math.round(score),
          qualification_status: status,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const response: QualificationResponse = {
        id: data.id,
        formId: data.form_id,
        leadId: data.lead_id,
        responses: data.responses,
        calculatedScore: data.calculated_score,
        qualificationStatus: data.qualification_status,
        aiInsights: data.ai_insights,
        submittedAt: data.submitted_at,
        createdAt: data.created_at,
      };

      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    forms,
    loading,
    error,
    loadForms,
    createForm,
    submitResponse,
  };
};

