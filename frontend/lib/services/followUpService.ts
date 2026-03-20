import { supabase, isSupabaseConfigured } from '../supabase';
import { Quote } from '../supabase/hooks/useQuoteFollowUps';

/**
 * Service pour gérer les relances automatiques de devis
 * Vérifie périodiquement les devis envoyés et planifie les relances
 */
export class FollowUpService {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Démarrer le service de vérification des relances
   */
  static start() {
    if (this.isRunning || !isSupabaseConfigured) {
      return;
    }

    this.isRunning = true;
    
    // Vérifier immédiatement
    this.checkAndScheduleFollowUps();
    this.sendPendingFollowUps();

    // Vérifier toutes les heures
    this.checkInterval = setInterval(() => {
      this.checkAndScheduleFollowUps();
      this.sendPendingFollowUps();
    }, 60 * 60 * 1000); // 1 heure
  }

  /**
   * Arrêter le service
   */
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Vérifier les devis envoyés et planifier les relances
   */
  static async checkAndScheduleFollowUps() {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Récupérer les devis envoyés qui n'ont pas encore été acceptés/rejetés
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, lead_id, status, sent_at, total, title, valid_until')
        .eq('status', 'sent')
        .not('sent_at', 'is', null);

      if (error) {
        console.error('Error fetching quotes for follow-ups:', error);
        return;
      }

      if (!quotes || quotes.length === 0) {
        return;
      }

      // Pour chaque devis, vérifier et planifier les relances
      for (const quote of quotes) {
        await this.scheduleFollowUpsForQuote(quote);
        await this.checkIfLost(quote);
      }
    } catch (error) {
      console.error('Error in checkAndScheduleFollowUps:', error);
    }
  }

  /**
   * Planifier les relances pour un devis spécifique
   */
  private static async scheduleFollowUpsForQuote(quote: any) {
    if (!quote.sent_at || !isSupabaseConfigured || !supabase) return;

    try {
      // Vérifier les relances existantes
      const { data: existingFollowUps } = await supabase
        .from('quote_follow_ups')
        .select('follow_up_number')
        .eq('quote_id', quote.id);

      const existingNumbers = existingFollowUps?.map((f: any) => f.follow_up_number) || [];

      // Planifier les relances (J+2, J+5, J+10)
      const sentDate = new Date(quote.sent_at);
      const followUpDates = [
        { number: 1, days: 2 },
        { number: 2, days: 5 },
        { number: 3, days: 10 },
      ];

      for (const { number, days } of followUpDates) {
        if (existingNumbers.includes(number)) continue;

        const followUpDate = new Date(sentDate);
        followUpDate.setDate(followUpDate.getDate() + days);

        // Si la date est passée, créer la relance en statut "pending"
        // Un service cron ou une vérification périodique l'enverra
        const now = new Date();
        if (followUpDate <= now) {
          // Créer la relance immédiatement
          await this.createFollowUp(quote, number, 'email');
        } else {
          // Créer la relance avec une date future (sera envoyée plus tard)
          // Pour l'instant, on crée juste l'enregistrement
          await supabase.from('quote_follow_ups').insert({
            quote_id: quote.id,
            follow_up_number: number,
            follow_up_type: 'email',
            status: 'pending',
            sent_at: null,
            metadata: {
              scheduled_for: followUpDate.toISOString(),
            },
          });
        }
      }
    } catch (error) {
      console.error(`Error scheduling follow-ups for quote ${quote.id}:`, error);
    }
  }

  /**
   * Créer et envoyer une relance
   */
  private static async createFollowUp(quote: any, followUpNumber: number, type: 'email' | 'sms' | 'call' | 'task' = 'email') {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // Récupérer le lead
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, company, email, assigned_to, temperature, lifecycle_stage')
        .eq('id', quote.lead_id)
        .single();

      if (!lead) return;

      // Générer le contenu
      const content = this.generateFollowUpContent(quote, followUpNumber, lead);

      // Créer la relance
      await supabase.from('quote_follow_ups').insert({
        quote_id: quote.id,
        follow_up_number: followUpNumber,
        follow_up_type: type,
        content,
        status: type === 'email' ? 'sent' : 'pending',
        sent_at: type === 'email' ? new Date().toISOString() : null,
        metadata: {
          quoteAmount: quote.total || 0,
          quoteTitle: quote.title,
          leadName: lead.name,
          leadCompany: lead.company,
        },
      });

      // Actions spéciales pour la 3e relance
      if (followUpNumber === 3) {
        await this.escalateToManager(quote, lead);
      }
    } catch (error) {
      console.error(`Error creating follow-up ${followUpNumber} for quote ${quote.id}:`, error);
    }
  }

  /**
   * Générer le contenu d'une relance
   */
  private static generateFollowUpContent(quote: any, followUpNumber: number, lead: any): string {
    const leadName = lead.name || lead.company || 'Cher client';

    switch (followUpNumber) {
      case 1:
        return `Bonjour ${leadName},

Avez-vous eu le temps de consulter le devis que nous vous avons envoyé le ${new Date(quote.sent_at).toLocaleDateString('fr-FR')} ?

Nous restons à votre disposition pour toute question ou précision.

Cordialement,
Notre équipe`;

      case 2:
        return `Bonjour ${leadName},

Nous souhaitons savoir si vous avez des questions concernant notre proposition de ${(quote.total || 0).toLocaleString('fr-FR')}€.

Nous serions ravis de vous aider à clarifier certains points ou de vous présenter des cas clients similaires.

N'hésitez pas à nous contacter.

Cordialement,
Notre équipe`;

      case 3:
        const expiryDate = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('fr-FR') : 'prochainement';
        return `Bonjour ${leadName},

Nous souhaitons vous rappeler que notre proposition reste valable jusqu'au ${expiryDate}.

Seriez-vous disponible pour un échange téléphonique cette semaine afin de répondre à vos questions ?

Cordialement,
Notre équipe`;

      default:
        return `Bonjour ${leadName},

Nous souhaitons faire un point sur notre proposition.

Cordialement,
Notre équipe`;
    }
  }

  /**
   * Escalade vers le manager
   */
  private static async escalateToManager(quote: any, lead: any) {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // Récupérer un manager
      const { data: managers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['Manager', 'Admin'])
        .limit(1);

      if (!managers || managers.length === 0) return;

      const manager = managers[0];

      // Créer une tâche pour le manager
      await supabase.from('automated_tasks').insert({
        task_type: 'follow_up',
        lead_id: quote.lead_id,
        assigned_to: manager.id,
        title: `Relance lead ${lead.name || lead.company} - Devis ${(quote.total || 0).toLocaleString('fr-FR')}€`,
        description: `Le lead n'a pas répondu après 3 relances. Contexte : ${quote.title}, montant : ${(quote.total || 0).toLocaleString('fr-FR')}€, envoyé le ${quote.sent_at ? new Date(quote.sent_at).toLocaleDateString('fr-FR') : 'N/A'}`,
        priority: 'Haute',
        tags: ['Escalade', 'Manager', 'Relance'],
        metadata: {
          quoteId: quote.id,
          quoteAmount: quote.total,
          followUpCount: 3,
        },
      });
    } catch (error) {
      console.error('Error escalating to manager:', error);
    }
  }
    
    const quoteData: Quote = {
      id: quote.id,
      leadId: quote.lead_id,
      quoteNumber: quote.quote_number || quote.id.substring(0, 8),
      title: quote.title || 'Devis',
      amount: quote.total || 0,
      currency: quote.currency || 'EUR',
      status: quote.status as any,
      sentAt: quote.sent_at,
      viewedAt: quote.viewed_at,
      acceptedAt: quote.accepted_at,
      expiresAt: quote.valid_until,
      items: quote.items || [],
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
    };

    try {
      await scheduleFollowUps(quoteData);
    } catch (error) {
      console.error(`Error scheduling follow-ups for quote ${quote.id}:`, error);
    }
  }

  /**
   * Vérifier si un devis doit être marqué comme perdu
   */
  private static async checkIfLost(quote: any) {
    if (!quote.sent_at) return;

    const daysSinceSent = Math.floor(
      (Date.now() - new Date(quote.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Marquer comme perdu après 30 jours
    if (daysSinceSent >= 30) {
      // Récupérer le lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', quote.lead_id)
        .single();

      if (lead) {
        try {
          // Mettre à jour le statut du lead
          await supabase
            .from('leads')
            .update({
              lifecycle_stage: 'Perdu',
            })
            .eq('id', quote.lead_id);

          // Mettre à jour le statut du devis
          await supabase
            .from('quotes')
            .update({
              status: 'rejected',
            })
            .eq('id', quote.id);
        } catch (error) {
          console.error(`Error marking quote ${quote.id} as lost:`, error);
        }
      }
    }
  }

  /**
   * Planifier manuellement les relances pour un devis après son envoi
   */
  static async scheduleFollowUpsAfterQuoteSent(quoteId: string) {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quote && quote.status === 'sent') {
        await this.scheduleFollowUpsForQuote(quote);
      }
    } catch (error) {
      console.error(`Error scheduling follow-ups after quote sent ${quoteId}:`, error);
    }
  }

  /**
   * Envoyer les relances en attente
   */
  static async sendPendingFollowUps() {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // Récupérer les relances en attente dont la date est passée
      const now = new Date().toISOString();
      const { data: pendingFollowUps } = await supabase
        .from('quote_follow_ups')
        .select('*, quotes!inner(id, lead_id, sent_at, total, title, valid_until)')
        .eq('status', 'pending')
        .or(`metadata->>'scheduled_for'.is.null,metadata->>'scheduled_for'.lte.${now}`);

      if (!pendingFollowUps || pendingFollowUps.length === 0) {
        return;
      }

      for (const followUp of pendingFollowUps) {
        const quote = followUp.quotes;
        if (quote) {
          await this.createFollowUp(quote, followUp.follow_up_number, followUp.follow_up_type);
        }
      }
    } catch (error) {
      console.error('Error sending pending follow-ups:', error);
    }
  }
}

