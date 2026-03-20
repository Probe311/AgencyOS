import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useBehaviorTriggers } from './useBehaviorTriggers';

export type FormType = 'contact' | 'demo' | 'newsletter' | 'download' | 'quote' | 'other';

export interface FormSubmission {
  id: string;
  leadId: string;
  formName: string;
  formType: FormType;
  formFields: Record<string, any>;
  submittedAt: string;
  sourceUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}

export const useFormSubmissions = () => {
  const { recordBehaviorEvent } = useBehaviorTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackSubmission = async (
    leadId: string,
    formData: {
      formName: string;
      formType: FormType;
      formFields: Record<string, any>;
      sourceUrl?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<FormSubmission> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('form_submissions')
        .insert({
          lead_id: leadId,
          form_name: formData.formName,
          form_type: formData.formType,
          form_fields: formData.formFields,
          submitted_at: new Date().toISOString(),
          source_url: formData.sourceUrl,
          user_agent: formData.userAgent,
          ip_address: formData.ipAddress,
          processed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const submission: FormSubmission = {
        id: data.id,
        leadId: data.lead_id,
        formName: data.form_name,
        formType: data.form_type,
        formFields: data.form_fields,
        submittedAt: data.submitted_at,
        sourceUrl: data.source_url,
        userAgent: data.user_agent,
        ipAddress: data.ip_address,
        metadata: data.metadata || {},
        processed: data.processed,
        processedAt: data.processed_at,
        createdAt: data.created_at,
      };

      // Enregistrer l'événement comportemental
      await recordBehaviorEvent(leadId, 'form_submit', {
        data: {
          formName: formData.formName,
          formType: formData.formType,
          formFields: formData.formFields,
        },
        source: 'form',
        sourceId: data.id,
      });

      // Traiter la soumission selon le type
      await processFormSubmission(submission);

      setError(null);
      return submission;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processFormSubmission = async (submission: FormSubmission) => {
    try {
      // Mettre à jour le profil du lead avec les données du formulaire
      const updates: Record<string, any> = {};
      
      if (submission.formFields.name) {
        updates.name = submission.formFields.name;
      }
      if (submission.formFields.email) {
        updates.email = submission.formFields.email;
      }
      if (submission.formFields.company) {
        updates.company = submission.formFields.company;
      }
      if (submission.formFields.phone) {
        updates.phone = submission.formFields.phone;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('leads')
          .update(updates)
          .eq('id', submission.leadId);
      }

      // Actions spécifiques selon le type de formulaire
      switch (submission.formType) {
        case 'demo':
          // Créer une tâche pour planifier la demo
          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: submission.leadId,
              title: `Planifier demo : ${submission.formFields.name || submission.formFields.company}`,
              description: `Demande de demo reçue via formulaire "${submission.formName}"`,
              priority: 'Haute',
              tags: ['Demo', 'Formulaire'],
            });
          break;

        case 'quote':
          // Créer une tâche pour créer un devis
          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: submission.leadId,
              title: `Créer devis : ${submission.formFields.name || submission.formFields.company}`,
              description: `Demande de devis reçue via formulaire "${submission.formName}"`,
              priority: 'Haute',
              tags: ['Devis', 'Formulaire'],
            });
          break;

        case 'contact':
          // Notification simple
          // TODO: Envoyer notification
          break;
      }

      // Marquer comme traité
      await supabase
        .from('form_submissions')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
    } catch (err) {
      console.error('Error processing form submission:', err);
    }
  };

  return {
    loading,
    error,
    trackSubmission,
  };
};

