import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useLeadAssignment } from './useLeadAssignment';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface OnboardingStep {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
}

export interface ClientOnboarding {
  id: string;
  leadId: string;
  projectId?: string;
  onboardingStatus: OnboardingStatus;
  welcomeEmailSent: boolean;
  documentsSent: boolean;
  kickoffScheduled: boolean;
  kickoffDate?: string;
  accountManagerId?: string;
  onboardingSteps: OnboardingStep[];
  completedSteps: string[];
  metadata: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDocument {
  id: string;
  onboardingId: string;
  documentType: 'contract' | 'cgv' | 'guide' | 'faq' | 'credentials' | 'other';
  documentName: string;
  documentUrl: string;
  sentAt: string;
  openedAt?: string;
  downloadedAt?: string;
  createdAt: string;
}

export const useClientOnboarding = () => {
  const { assignLead } = useLeadAssignment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startOnboarding = async (lead: Lead, quoteId?: string): Promise<ClientOnboarding> => {
    try {
      setLoading(true);

      // Récupérer les informations du devis si disponible
      let quoteAmount = 0;
      let quoteTitle = '';
      if (quoteId) {
        const { data: quote } = await supabase
          .from('quotes')
          .select('amount, title')
          .eq('id', quoteId)
          .single();
        
        if (quote) {
          quoteAmount = quote.amount;
          quoteTitle = quote.title;
        }
      }

      // Définir les étapes d'onboarding
      const steps: OnboardingStep[] = [
        { id: 'welcome_email', name: 'Email de bienvenue', completed: false },
        { id: 'documents', name: 'Envoi documents contractuels', completed: false },
        { id: 'project_creation', name: 'Création projet', completed: false },
        { id: 'account_manager', name: 'Attribution gestionnaire de compte', completed: false },
        { id: 'kickoff', name: 'Planification kick-off', completed: false },
      ];

      // Attribuer un gestionnaire de compte
      const accountManagerId = await assignAccountManager(lead);

      // Créer l'onboarding
      const { data, error: insertError } = await supabase
        .from('client_onboarding')
        .insert({
          lead_id: lead.id,
          onboarding_status: 'in_progress',
          account_manager_id: accountManagerId,
          onboarding_steps: steps,
          started_at: new Date().toISOString(),
          metadata: {
            quoteId,
            quoteAmount,
            quoteTitle,
            leadName: lead.name,
            leadCompany: lead.company,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const onboarding: ClientOnboarding = {
        id: data.id,
        leadId: data.lead_id,
        projectId: data.project_id,
        onboardingStatus: data.onboarding_status,
        welcomeEmailSent: data.welcome_email_sent,
        documentsSent: data.documents_sent,
        kickoffScheduled: data.kickoff_scheduled,
        kickoffDate: data.kickoff_date,
        accountManagerId: data.account_manager_id,
        onboardingSteps: data.onboarding_steps,
        completedSteps: data.completed_steps || [],
        metadata: data.metadata,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Exécuter les actions automatiques
      await executeOnboardingActions(onboarding, lead, quoteAmount, quoteTitle);

      setError(null);
      return onboarding;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignAccountManager = async (lead: Lead): Promise<string | null> => {
    try {
      // Utiliser le système d'attribution automatique
      const assignedUserId = await assignLead(lead);
      return assignedUserId || null;
    } catch (err) {
      console.error('Error assigning account manager:', err);
      return null;
    }
  };

  const executeOnboardingActions = async (
    onboarding: ClientOnboarding,
    lead: Lead,
    quoteAmount: number,
    quoteTitle: string
  ) => {
    try {
      // 1. Envoyer l'email de bienvenue
      await sendWelcomeEmail(onboarding, lead, quoteTitle);

      // 2. Créer le projet associé
      const projectId = await createProject(lead, quoteAmount, quoteTitle, onboarding.id);
      if (projectId) {
        await supabase
          .from('client_onboarding')
          .update({ project_id: projectId })
          .eq('id', onboarding.id);
      }

      // 3. Envoyer les documents contractuels
      await sendDocuments(onboarding, lead);

      // 4. Planifier le kick-off
      await scheduleKickoff(onboarding, lead);

      // 5. Créer la tâche d'onboarding pour le gestionnaire
      if (onboarding.accountManagerId) {
        await supabase
          .from('automated_tasks')
          .insert({
            task_type: 'follow_up',
            lead_id: lead.id,
            assigned_to: onboarding.accountManagerId,
            title: `Onboarding client ${lead.name || lead.company}`,
            description: `Nouveau client converti. Projet créé, documents envoyés.`,
            priority: 'Haute',
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // J+3
            tags: ['Onboarding', 'Nouveau Client'],
            metadata: {
              onboardingId: onboarding.id,
              projectId: onboarding.projectId,
            },
          });
      }
    } catch (err) {
      console.error('Error executing onboarding actions:', err);
    }
  };

  const sendWelcomeEmail = async (onboarding: ClientOnboarding, lead: Lead, serviceName: string) => {
    try {
      // TODO: Intégrer avec le système d'envoi d'emails
      // Pour l'instant, on marque juste comme envoyé
      await supabase
        .from('client_onboarding')
        .update({
          welcome_email_sent: true,
          completed_steps: [...onboarding.completedSteps, 'welcome_email'],
        })
        .eq('id', onboarding.id);
    } catch (err) {
      console.error('Error sending welcome email:', err);
    }
  };

  const createProject = async (lead: Lead, budget: number, serviceName: string, onboardingId: string): Promise<string | null> => {
    try {
      // TODO: Intégrer avec la table projects si elle existe
      // Pour l'instant, on simule la création
      const projectName = `${lead.company || lead.name} - ${serviceName}`;
      
      // Si la table projects existe, créer le projet
      // const { data: project } = await supabase
      //   .from('projects')
      //   .insert({
      //     name: projectName,
      //     client_id: lead.id,
      //     budget,
      //     status: 'En attente',
      //   })
      //   .select()
      //   .single();

      // return project?.id || null;
      
      // Pour l'instant, on retourne null et on marque l'étape comme complétée
      await supabase
        .from('client_onboarding')
        .update({
          completed_steps: ['project_creation'],
        })
        .eq('id', onboardingId);

      return null;
    } catch (err) {
      console.error('Error creating project:', err);
      return null;
    }
  };

  const sendDocuments = async (onboarding: ClientOnboarding, lead: Lead) => {
    try {
      const documents = [
        { type: 'contract', name: 'Contrat de prestation' },
        { type: 'cgv', name: 'Conditions générales de vente' },
        { type: 'guide', name: 'Guide client' },
        { type: 'faq', name: 'FAQ' },
        { type: 'credentials', name: 'Identifiants espace client' },
      ];

      for (const doc of documents) {
        // TODO: Générer/uploader les documents réels
        const documentUrl = `/documents/${doc.type}-${onboarding.id}.pdf`;

        await supabase
          .from('client_documents')
          .insert({
            onboarding_id: onboarding.id,
            document_type: doc.type,
            document_name: doc.name,
            document_url: documentUrl,
          });
      }

      await supabase
        .from('client_onboarding')
        .update({
          documents_sent: true,
          completed_steps: [...onboarding.completedSteps, 'documents'],
        })
        .eq('id', onboarding.id);
    } catch (err) {
      console.error('Error sending documents:', err);
    }
  };

  const scheduleKickoff = async (onboarding: ClientOnboarding, lead: Lead) => {
    try {
      // Planifier le kick-off pour J+7
      const kickoffDate = new Date();
      kickoffDate.setDate(kickoffDate.getDate() + 7);

      await supabase
        .from('client_onboarding')
        .update({
          kickoff_scheduled: true,
          kickoff_date: kickoffDate.toISOString(),
          completed_steps: [...onboarding.completedSteps, 'kickoff'],
        })
        .eq('id', onboarding.id);

      // Créer une tâche pour planifier le kick-off
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: onboarding.accountManagerId,
          title: `Planifier kick-off avec ${lead.name || lead.company}`,
          description: `Client converti, projet créé, documents envoyés. Planifier le rendez-vous de kick-off.`,
          priority: 'Haute',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // J+3
          tags: ['Kick-off', 'Onboarding'],
          metadata: {
            onboardingId: onboarding.id,
            suggestedDate: kickoffDate.toISOString(),
          },
        });
    } catch (err) {
      console.error('Error scheduling kickoff:', err);
    }
  };

  return {
    loading,
    error,
    startOnboarding,
  };
};

