import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAutomatedTasks } from './useAutomatedTasks';
import { Lead } from '../../../types';

export type FollowUpType = 'email' | 'sms' | 'call' | 'task';
export type FollowUpStatus = 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'failed';

export interface Quote {
  id: string;
  leadId: string;
  quoteNumber: string;
  title: string;
  description?: string;
  amount: number; // Utilise total de la table quotes
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  expiresAt?: string; // Utilise valid_until de la table quotes
  items: any[];
  terms?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteFollowUp {
  id: string;
  quoteId: string;
  followUpNumber: number;
  followUpType: FollowUpType;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  status: FollowUpStatus;
  content?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useQuoteFollowUps = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendFollowUp = async (
    quote: Quote,
    followUpNumber: number,
    followUpType: FollowUpType = 'email'
  ): Promise<QuoteFollowUp> => {
    try {
      setLoading(true);

      // Récupérer les informations du lead
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, company, email, assigned_to, temperature, lifecycle_stage')
        .eq('id', quote.leadId)
        .single();

      if (!lead) throw new Error('Lead non trouvé');

      // Générer le contenu de la relance selon le numéro
      const content = generateFollowUpContent(quote, followUpNumber, lead);

      // Enregistrer la relance
      const { data, error: insertError } = await supabase
        .from('quote_follow_ups')
        .insert({
          quote_id: quote.id,
          follow_up_number: followUpNumber,
          follow_up_type: followUpType,
          content,
          status: followUpType === 'email' ? 'sent' : 'pending',
          sent_at: followUpType === 'email' ? new Date().toISOString() : null,
          metadata: {
            quoteAmount: quote.amount || 0,
            quoteTitle: quote.title,
            leadName: lead.name,
            leadCompany: lead.company,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const followUp: QuoteFollowUp = {
        id: data.id,
        quoteId: data.quote_id,
        followUpNumber: data.follow_up_number,
        followUpType: data.follow_up_type,
        sentAt: data.sent_at,
        openedAt: data.opened_at,
        clickedAt: data.clicked_at,
        repliedAt: data.replied_at,
        status: data.status,
        content: data.content,
        metadata: data.metadata,
        createdAt: data.created_at,
      };

      // Actions spécifiques selon le type de relance
      if (followUpNumber === 3) {
        // Escalade vers manager après 3 relances
        await escalateToManager(quote, lead);
      }

      // Vérifier les ouvertures répétées sans réponse
      await checkRepeatedOpens(quote, lead);

      setError(null);
      return followUp;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUpContent = (quote: Quote, followUpNumber: number, lead: Lead): string => {
    const leadName = lead.name || lead.company || 'Cher client';
    const commercialName = 'Notre équipe'; // TODO: Récupérer le nom du commercial assigné

    switch (followUpNumber) {
      case 1:
        return `Bonjour ${leadName},

Avez-vous eu le temps de consulter le devis que nous vous avons envoyé le ${new Date(quote.sentAt || '').toLocaleDateString('fr-FR')} ?

Nous restons à votre disposition pour toute question ou précision.

Cordialement,
${commercialName}`;

      case 2:
        return `Bonjour ${leadName},

Nous souhaitons savoir si vous avez des questions concernant notre proposition de ${quote.amount.toLocaleString('fr-FR')}€.

Nous serions ravis de vous aider à clarifier certains points ou de vous présenter des cas clients similaires.

N'hésitez pas à nous contacter.

Cordialement,
${commercialName}`;

      case 3:
        const expiryDate = quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString('fr-FR') : 'prochainement';
        return `Bonjour ${leadName},

Nous souhaitons vous rappeler que notre proposition reste valable jusqu'au ${expiryDate}.

Seriez-vous disponible pour un échange téléphonique cette semaine afin de répondre à vos questions ?

Cordialement,
${commercialName}`;

      default:
        return `Bonjour ${leadName},

Nous souhaitons faire un point sur notre proposition.

Cordialement,
${commercialName}`;
    }
  };

  const escalateToManager = async (quote: Quote, lead: Lead) => {
    try {
      // Récupérer le manager
      const { data: managers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['Manager', 'Admin'])
        .limit(1);

      if (!managers || managers.length === 0) return;

      const manager = managers[0];

      // Créer une tâche pour le manager
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: quote.leadId,
          assigned_to: manager.id,
          title: `Relance lead ${lead.name || lead.company} - Devis ${(quote.amount || 0).toLocaleString('fr-FR')}€`,
          description: `Le lead n'a pas répondu après 3 relances. Contexte : ${quote.title}, montant : ${(quote.amount || 0).toLocaleString('fr-FR')}€, envoyé le ${quote.sentAt ? new Date(quote.sentAt).toLocaleDateString('fr-FR') : 'N/A'}`,
          priority: 'Haute',
          tags: ['Escalade', 'Manager', 'Relance'],
          metadata: {
            quoteId: quote.id,
            quoteAmount: quote.amount,
            followUpCount: 3,
          },
        });

      // TODO: Envoyer un email au manager avec le résumé
    } catch (err) {
      console.error('Error escalating to manager:', err);
    }
  };

  const checkRepeatedOpens = async (quote: Quote, lead: Lead) => {
    try {
      // Compter les ouvertures d'emails de relance
      const { data: followUps } = await supabase
        .from('quote_follow_ups')
        .select('opened_at')
        .eq('quote_id', quote.id)
        .not('opened_at', 'is', null);

      if (followUps && followUps.length >= 3) {
        // Récupérer le commercial assigné depuis la base de données
        const { data: leadData } = await supabase
          .from('leads')
          .select('assigned_to')
          .eq('id', quote.leadId)
          .single();
        
        const assignedTo = leadData?.assigned_to || null;
        
        // Notification commercial : intérêt détecté mais pas de réponse
        await supabase
          .from('automated_tasks')
          .insert({
            task_type: 'follow_up',
            lead_id: quote.leadId,
            assigned_to: assignedTo,
            title: `Appeler ${lead.name || lead.company} - Intérêt détecté`,
            description: `Le lead ouvre vos emails (${followUps.length} fois) mais ne répond pas. Suggestion : appel ou email personnalisé.`,
            priority: 'Haute',
            tags: ['Intérêt détecté', 'Appel recommandé'],
            metadata: {
              quoteId: quote.id,
              openCount: followUps.length,
            },
          });
      }
    } catch (err) {
      console.error('Error checking repeated opens:', err);
    }
  };

  const scheduleFollowUps = async (quote: Quote) => {
    try {
      // Vérifier si le devis a été envoyé
      if (quote.status !== 'sent' || !quote.sentAt) return;

      // Vérifier les relances existantes
      const { data: existingFollowUps } = await supabase
        .from('quote_follow_ups')
        .select('follow_up_number')
        .eq('quote_id', quote.id);

      const existingNumbers = existingFollowUps?.map(f => f.follow_up_number) || [];

      // Planifier les relances (J+2, J+5, J+10)
      if (quote.sentAt) {
        const sentDate = new Date(quote.sentAt);
        const followUpDates = [
          { number: 1, days: 2 },
          { number: 2, days: 5 },
          { number: 3, days: 10 },
        ];

        for (const { number, days } of followUpDates) {
          if (existingNumbers.includes(number)) continue;

          const followUpDate = new Date(sentDate);
          followUpDate.setDate(followUpDate.getDate() + days);

          // Si la date est passée, envoyer immédiatement
          if (followUpDate <= new Date()) {
            await sendFollowUp(quote, number);
          }
          // Sinon, créer une tâche programmée (TODO: utiliser un système de cron/jobs)
        }
      }
    } catch (err) {
      console.error('Error scheduling follow-ups:', err);
    }
  };

  const markAsLost = async (quote: Quote, lead: Lead) => {
    try {
      // Vérifier si 30 jours se sont écoulés depuis l'envoi
      if (!quote.sentAt) return;

      const daysSinceSent = Math.floor(
        (Date.now() - new Date(quote.sentAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceSent >= 30) {
        // Mettre à jour le statut du lead
        await supabase
          .from('leads')
          .update({
            lifecycle_stage: 'Perdu',
            // TODO: Ajouter tag "Perdu"
          })
          .eq('id', quote.leadId);

        // Mettre à jour le statut du devis
        await supabase
          .from('quotes')
          .update({ status: 'expired' })
          .eq('id', quote.id);

        // Récupérer le commercial assigné depuis la base de données
        const { data: leadData } = await supabase
          .from('leads')
          .select('assigned_to')
          .eq('id', quote.leadId)
          .single();
        
        const assignedTo = leadData?.assigned_to || null;

        // Notification commercial
        if (assignedTo) {
          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: quote.leadId,
              assigned_to: assignedTo,
              title: `Lead ${lead.name || lead.company} marqué comme perdu`,
              description: `Pas d'activité depuis 30 jours après envoi du devis. Possibilité de réactiver manuellement.`,
              priority: 'Basse',
              tags: ['Perdu', 'Réactivation possible'],
              metadata: {
                quoteId: quote.id,
                daysSinceSent,
              },
            });
        }
      }
    } catch (err) {
      console.error('Error marking as lost:', err);
    }
  };

  return {
    loading,
    error,
    sendFollowUp,
    scheduleFollowUps,
    markAsLost,
  };
};

