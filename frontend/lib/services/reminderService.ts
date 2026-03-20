import { supabase, isSupabaseConfigured } from '../supabase';
import { useNotifications } from '../supabase/hooks/useNotifications';

export interface ReminderCheckResult {
  remindersSent: number;
  errors: string[];
}

/**
 * Service pour gérer les rappels automatiques des tâches
 */
export class ReminderService {
  // Flag pour mémoriser que la table n'existe pas (évite les requêtes répétées)
  private static tableExists: boolean | null = null;
  // Verrou pour éviter les appels parallèles pendant la vérification initiale
  private static checkingTable: Promise<ReminderCheckResult> | null = null;

  /**
   * Vérifie les tâches avec des échéances proches et envoie des notifications
   */
  static async checkAndSendReminders(): Promise<ReminderCheckResult> {
    if (!isSupabaseConfigured || !supabase) {
      return { remindersSent: 0, errors: ['Supabase non configuré'] };
    }

    // Si on sait déjà que la table n'existe pas, ne pas faire de requête
    if (this.tableExists === false) {
      return { remindersSent: 0, errors: [] };
    }

    // Si une vérification est en cours, attendre son résultat
    if (this.checkingTable) {
      return this.checkingTable;
    }

    // Créer une promesse pour cette vérification (évite les appels parallèles)
    this.checkingTable = (async (): Promise<ReminderCheckResult> => {
      const errors: string[] = [];
      let remindersSent = 0;

      try {
        // Récupérer tous les rappels non envoyés dont la date est proche ou passée
        const now = new Date();
        const { data: reminders, error: remindersError } = await supabase
          .from('task_reminders')
          .select(`
            *,
            task:tasks(*),
            user:users(*)
          `)
          .eq('sent', false)
          .lte('reminder_date', now.toISOString());

        if (remindersError) {
          // Si la table n'existe pas (PGRST205), mémoriser et retourner silencieusement sans erreur
          if (remindersError.code === 'PGRST205' || remindersError.message?.includes('Could not find the table')) {
            this.tableExists = false; // Mémoriser que la table n'existe pas
            return { remindersSent: 0, errors: [] };
          }
          // Pour les autres erreurs, les ajouter à la liste
          errors.push(`Erreur récupération rappels: ${remindersError.message}`);
        } else {
          // Si la requête réussit, mémoriser que la table existe
          this.tableExists = true;
        }

        if (reminders && reminders.length > 0) {
        for (const reminder of reminders) {
          try {
            // Créer une notification pour l'utilisateur
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: reminder.user_id,
                title: `Rappel: ${reminder.task?.title || 'Tâche'}`,
                message: `La tâche "${reminder.task?.title || ''}" approche de son échéance.`,
                type: 'task',
                link: `/projects?task=${reminder.task_id}`,
              });

            if (notifError) {
              errors.push(`Erreur notification pour rappel ${reminder.id}: ${notifError.message}`);
              continue;
            }

            // Marquer le rappel comme envoyé (gérer l'erreur si la table n'existe pas)
            const { error: updateError } = await supabase
              .from('task_reminders')
              .update({ sent: true })
              .eq('id', reminder.id);

            if (updateError) {
              // Si la table n'existe pas, ignorer silencieusement
              if (updateError.code === 'PGRST205' || updateError.message?.includes('Could not find the table')) {
                continue;
              }
              errors.push(`Erreur mise à jour rappel ${reminder.id}: ${updateError.message}`);
            } else {
              remindersSent++;
            }
          } catch (err) {
            errors.push(`Erreur traitement rappel ${reminder.id}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
          }
        }
      }
      } catch (err) {
        errors.push(`Erreur générale: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }

      return { remindersSent, errors };
    })();

    // Attendre le résultat et nettoyer le verrou
    try {
      const result = await this.checkingTable;
      this.checkingTable = null;
      return result;
    } catch (err) {
      this.checkingTable = null;
      throw err;
    }
  }

  /**
   * Crée automatiquement des rappels pour une tâche basés sur sa date d'échéance
   */
  static async createDefaultReminders(
    taskId: string,
    dueDate: string,
    assigneeIds: string[]
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !dueDate) {
      return;
    }

    // Si on sait que la table n'existe pas, ne pas essayer de créer des rappels
    if (this.tableExists === false) {
      return;
    }

    try {
      const dueDateObj = new Date(dueDate);
      const reminders = [];

      // Créer des rappels pour chaque assigné
      for (const userId of assigneeIds) {
        // Rappel 1 jour avant
        const reminder1Day = new Date(dueDateObj);
        reminder1Day.setDate(reminder1Day.getDate() - 1);
        
        // Rappel le jour même
        const reminderDay = new Date(dueDateObj);
        reminderDay.setHours(9, 0, 0, 0); // 9h du matin

        reminders.push(
          {
            task_id: taskId,
            user_id: userId,
            reminder_date: reminder1Day.toISOString(),
            reminder_type: 'due_date',
            days_before: 1,
          },
          {
            task_id: taskId,
            user_id: userId,
            reminder_date: reminderDay.toISOString(),
            reminder_type: 'due_date',
            days_before: 0,
          }
        );
      }

      if (reminders.length > 0) {
        const { error } = await supabase
          .from('task_reminders')
          .insert(reminders);

        if (error) {
          // Si la table n'existe pas, mémoriser et ignorer silencieusement
          if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
            // Table n'existe pas, mémoriser et ignorer
            this.tableExists = false;
            return;
          }
          console.error('Erreur création rappels automatiques:', error);
        } else {
          // Si l'insertion réussit, mémoriser que la table existe
          this.tableExists = true;
        }
      }
    } catch (err) {
      console.error('Erreur création rappels:', err);
    }
  }

  /**
   * Démarre un intervalle pour vérifier les rappels périodiquement
   */
  static startReminderChecker(intervalMinutes: number = 60): () => void {
    // Vérifier immédiatement
    this.checkAndSendReminders();

    // Puis vérifier toutes les heures
    const interval = setInterval(() => {
      this.checkAndSendReminders();
    }, intervalMinutes * 60 * 1000);

    // Retourner une fonction pour arrêter l'intervalle
    return () => clearInterval(interval);
  }
}

