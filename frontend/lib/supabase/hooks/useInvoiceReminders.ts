import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';
import { useEmailSequences } from './useEmailSequences';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type ReminderType = 'gentle' | 'urgent' | 'final_notice' | 'legal';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  metadata: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceReminder {
  id: string;
  invoiceId: string;
  reminderNumber: number;
  reminderType: ReminderType;
  scheduledDate: string;
  sentDate?: string;
  emailSent: boolean;
  daysOverdue: number;
  status: ReminderStatus;
  emailContent?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const useInvoiceReminders = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkOverdueInvoices = async (daysAfterDue: number[] = [7, 15, 30]): Promise<void> => {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Récupérer les factures impayées
      const { data: overdueInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'sent')
        .lt('due_date', today.toISOString().split('T')[0]);

      if (fetchError) throw fetchError;
      if (!overdueInvoices) return;

      for (const invoice of overdueInvoices) {
        const invoiceObj: Invoice = {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          clientId: invoice.client_id,
          projectId: invoice.project_id,
          amount: invoice.amount,
          taxAmount: invoice.tax_amount,
          totalAmount: invoice.total_amount,
          currency: invoice.currency,
          status: invoice.status,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          paidDate: invoice.paid_date,
          paymentMethod: invoice.payment_method,
          paymentReference: invoice.payment_reference,
          notes: invoice.notes,
          items: invoice.items || [],
          metadata: invoice.metadata || {},
          createdBy: invoice.created_by,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at,
        };

        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Vérifier si une relance est nécessaire
        for (const days of daysAfterDue) {
          if (daysOverdue >= days) {
            await createReminderIfNeeded(invoiceObj, days, daysOverdue);
          }
        }

        // Mettre à jour le statut de la facture si nécessaire
        if (daysOverdue > 0 && invoice.status === 'sent') {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        }

        // Actions automatiques selon délai
        await executeAutomaticActions(invoiceObj, daysOverdue);
      }

      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createReminderIfNeeded = async (
    invoice: Invoice,
    reminderDay: number,
    daysOverdue: number
  ) => {
    try {
      // Vérifier si une relance existe déjà pour ce jour
      const { data: existingReminders } = await supabase
        .from('invoice_reminders')
        .select('*')
        .eq('invoice_id', invoice.id)
        .eq('days_overdue', reminderDay);

      if (existingReminders && existingReminders.length > 0) {
        return; // Relance déjà créée
      }

      // Déterminer le type de relance
      let reminderType: ReminderType = 'gentle';
      let reminderNumber = 1;

      if (daysOverdue >= 30) {
        reminderType = 'final_notice';
        reminderNumber = 3;
      } else if (daysOverdue >= 15) {
        reminderType = 'urgent';
        reminderNumber = 2;
      } else if (daysOverdue >= 7) {
        reminderType = 'gentle';
        reminderNumber = 1;
      }

      // Calculer la date de relance
      const dueDate = new Date(invoice.due_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() + reminderDay);

      // Créer la relance
      const { data, error: insertError } = await supabase
        .from('invoice_reminders')
        .insert({
          invoice_id: invoice.id,
          reminder_number: reminderNumber,
          reminder_type: reminderType,
          scheduled_date: reminderDate.toISOString().split('T')[0],
          days_overdue: daysOverdue,
          status: 'pending',
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            currency: invoice.currency,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Envoyer la relance
      await sendReminder(data.id, invoice);
    } catch (err) {
      console.error('Error creating reminder:', err);
    }
  };

  const sendReminder = async (reminderId: string, invoice: Invoice) => {
    try {
      // Récupérer les informations du client
      const { data: client } = await supabase
        .from('leads')
        .select('*')
        .eq('id', invoice.clientId)
        .single();

      if (!client) return;

      // Générer le contenu de l'email selon le type de relance
      const { data: reminder } = await supabase
        .from('invoice_reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (!reminder) return;

      let emailContent = '';
      let subject = '';

      switch (reminder.reminder_type) {
        case 'gentle':
          subject = `Rappel : Facture ${invoice.invoiceNumber} à régler`;
          emailContent = `Bonjour,\n\nNous vous rappelons que la facture ${invoice.invoiceNumber} d'un montant de ${invoice.totalAmount} ${invoice.currency} était due le ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}.\n\nMerci de procéder au règlement dans les plus brefs délais.`;
          break;
        case 'urgent':
          subject = `URGENT : Facture ${invoice.invoiceNumber} en retard`;
          emailContent = `Bonjour,\n\nLa facture ${invoice.invoiceNumber} d'un montant de ${invoice.totalAmount} ${invoice.currency} est en retard de ${reminder.days_overdue} jours.\n\nNous vous prions de régulariser cette situation au plus vite.`;
          break;
        case 'final_notice':
          subject = `Mise en demeure : Facture ${invoice.invoiceNumber}`;
          emailContent = `Bonjour,\n\nLa facture ${invoice.invoiceNumber} d'un montant de ${invoice.totalAmount} ${invoice.currency} est impayée depuis ${reminder.days_overdue} jours.\n\nCette situation nécessite une régularisation immédiate. En l'absence de paiement, des mesures pourront être prises.`;
          break;
      }

      // TODO: Intégrer avec le système d'envoi d'emails
      // Pour l'instant, on marque juste comme envoyé
      await supabase
        .from('invoice_reminders')
        .update({
          email_sent: true,
          sent_date: new Date().toISOString(),
          status: 'sent',
          email_content: emailContent,
        })
        .eq('id', reminderId);
    } catch (err) {
      console.error('Error sending reminder:', err);
    }
  };

  const executeAutomaticActions = async (invoice: Invoice, daysOverdue: number) => {
    try {
      // Récupérer les informations du client
      const { data: client } = await supabase
        .from('leads')
        .select('*')
        .eq('id', invoice.clientId)
        .single();

      if (!client) return;

      // J+15 : Tag "À suivre" et notification
      if (daysOverdue >= 15) {
        // TODO: Ajouter tag "À suivre" au client
        // TODO: Notification équipe comptable

        // Créer une tâche de suivi
        await supabase
          .from('automated_tasks')
          .insert({
            task_type: 'follow_up',
            lead_id: invoice.clientId,
            assigned_to: invoice.createdBy,
            title: `Suivre facture impayée : ${client.name || client.company}`,
            description: `Facture ${invoice.invoiceNumber} impayée depuis ${daysOverdue} jours. Montant : ${invoice.totalAmount} ${invoice.currency}.`,
            priority: 'Haute',
            tags: ['Facture', 'Impayée', 'À suivre'],
            metadata: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              daysOverdue,
            },
          });

        // Notification commercial si client actif
        if (client.lifecycleStage && ['Client', 'Opportunité'].includes(client.lifecycleStage)) {
          // TODO: Envoyer notification au commercial assigné
        }
      }

      // J+30 : Tag "En retard" et notification manager
      if (daysOverdue >= 30) {
        // TODO: Ajouter tag "En retard"
        // TODO: Notification manager

        // Escalade vers manager
        const { data: managers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Manager', 'Admin'])
          .limit(1);

        if (managers && managers.length > 0) {
          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: invoice.clientId,
              assigned_to: managers[0].id,
              title: `Escalade facture impayée : ${client.name || client.company}`,
              description: `Facture ${invoice.invoiceNumber} impayée depuis ${daysOverdue} jours. Escalade requise.`,
              priority: 'Urgente',
              tags: ['Facture', 'Impayée', 'En retard', 'Escalade'],
              metadata: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                daysOverdue,
              },
            });
        }
      }

      // J+45 : Suspension service (si configuré)
      if (daysOverdue >= 45) {
        // TODO: Implémenter la suspension de service si applicable
      }

      // J+60 : Escalade direction, procédure recouvrement
      if (daysOverdue >= 60) {
        const { data: directors } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Admin', 'SuperAdmin'])
          .limit(1);

        if (directors && directors.length > 0) {
          await supabase
            .from('automated_tasks')
            .insert({
              task_type: 'follow_up',
              lead_id: invoice.clientId,
              assigned_to: directors[0].id,
              title: `CRITIQUE : Facture impayée depuis 60 jours - ${client.name || client.company}`,
              description: `Facture ${invoice.invoiceNumber} impayée depuis ${daysOverdue} jours. Procédure de recouvrement requise.`,
              priority: 'Urgente',
              tags: ['Facture', 'Impayée', 'Recouvrement', 'Direction'],
              metadata: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                daysOverdue,
                requiresLegalAction: true,
              },
            });
        }
      }
    } catch (err) {
      console.error('Error executing automatic actions:', err);
    }
  };

  return {
    loading,
    error,
    checkOverdueInvoices,
    sendReminder,
  };
};

