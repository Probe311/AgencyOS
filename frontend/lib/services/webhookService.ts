import { supabase, isSupabaseConfigured } from '../supabase';
import { Webhook, WebhookEventType } from '../../types';

/**
 * Service pour déclencher des webhooks lors d'événements
 */
export class WebhookService {
  /**
   * Déclenche les webhooks actifs pour un événement donné
   */
  static async triggerEvent(
    eventType: WebhookEventType,
    payload: Record<string, any>
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Récupérer tous les webhooks actifs qui écoutent cet événement
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('active', true)
        .contains('events', [eventType]);

      if (error) {
        console.error('Error fetching webhooks:', error);
        return;
      }

      if (!webhooks || webhooks.length === 0) {
        return; // Aucun webhook à déclencher
      }

      // Déclencher chaque webhook
      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook as any, eventType, payload);
      }
    } catch (err) {
      console.error('Error triggering webhook event:', err);
    }
  }

  /**
   * Envoie un webhook à une URL donnée
   */
  private static async deliverWebhook(
    webhook: Webhook,
    eventType: string,
    payload: Record<string, any>
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    // Créer la signature HMAC si un secret est configuré
    let signature: string | undefined;
    if (webhook.secret) {
      signature = await this.generateSignature(JSON.stringify(webhookPayload), webhook.secret);
    }

    // Préparer les headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AgencyOS-Webhook/1.0',
      ...webhook.headers,
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    // Créer l'enregistrement de delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: webhookPayload,
        status: 'pending',
        attempts: 0,
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Error creating webhook delivery:', deliveryError);
      return;
    }

    // Envoyer le webhook
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload),
      });

      const responseBody = await response.text();

      // Mettre à jour le delivery
      await supabase
        .from('webhook_deliveries')
        .update({
          status: response.ok ? 'success' : 'failed',
          response_status: response.status,
          response_body: responseBody,
          delivered_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq('id', delivery.id);

      if (!response.ok) {
        // Planifier une nouvelle tentative si échec
        await this.scheduleRetry(delivery.id, 1);
      }
    } catch (error: any) {
      // Erreur réseau ou autre
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error_message: error.message || 'Network error',
          attempts: 1,
        })
        .eq('id', delivery.id);

      // Planifier une nouvelle tentative
      await this.scheduleRetry(delivery.id, 1);
    }
  }

  /**
   * Génère une signature HMAC pour le payload
   * Note: En production, cette fonction devrait être exécutée côté serveur
   */
  private static async generateSignature(payload: string, secret: string): Promise<string> {
    // Utiliser Web Crypto API pour HMAC (disponible dans le navigateur)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, payloadData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Planifie une nouvelle tentative de delivery
   */
  private static async scheduleRetry(
    deliveryId: string,
    currentAttempt: number
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Stratégie de retry exponentielle : 1min, 5min, 15min, 1h
    const retryDelays = [1, 5, 15, 60]; // en minutes
    const maxAttempts = 4;

    if (currentAttempt >= maxAttempts) {
      // Arrêter après maxAttempts
      await supabase
        .from('webhook_deliveries')
        .update({ status: 'failed' })
        .eq('id', deliveryId);
      return;
    }

    const delayMinutes = retryDelays[Math.min(currentAttempt, retryDelays.length - 1)];
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);

    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'retrying',
        next_retry_at: nextRetryAt.toISOString(),
        attempts: currentAttempt + 1,
      })
      .eq('id', deliveryId);
  }

  /**
   * Traite les webhooks en attente de retry
   */
  static async processRetries(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const now = new Date().toISOString();

      // Récupérer les deliveries en attente de retry
      const { data: deliveries, error } = await supabase
        .from('webhook_deliveries')
        .select('*, webhooks(*)')
        .eq('status', 'retrying')
        .lte('next_retry_at', now)
        .limit(10);

      if (error) {
        console.error('Error fetching retry deliveries:', error);
        return;
      }

      if (!deliveries || deliveries.length === 0) {
        return;
      }

      // Retry chaque delivery
      for (const delivery of deliveries) {
        const webhook = delivery.webhooks as any;
        await this.deliverWebhook(
          webhook,
          delivery.event_type,
          delivery.payload
        );
      }
    } catch (err) {
      console.error('Error processing retries:', err);
    }
  }
}

// Helper functions pour déclencher des événements spécifiques
export const triggerWebhookEvents = {
  taskCreated: (task: any) => WebhookService.triggerEvent('task.created', { task }),
  taskUpdated: (task: any) => WebhookService.triggerEvent('task.updated', { task }),
  taskDeleted: (taskId: string) => WebhookService.triggerEvent('task.deleted', { taskId }),
  taskStatusChanged: (task: any, oldStatus: string) => 
    WebhookService.triggerEvent('task.status_changed', { task, oldStatus }),
  taskCompleted: (task: any) => WebhookService.triggerEvent('task.completed', { task }),
  
  leadCreated: (lead: any) => WebhookService.triggerEvent('lead.created', { lead }),
  leadUpdated: (lead: any) => WebhookService.triggerEvent('lead.updated', { lead }),
  leadConverted: (lead: any) => WebhookService.triggerEvent('lead.converted', { lead }),
  
  projectCreated: (project: any) => WebhookService.triggerEvent('project.created', { project }),
  projectUpdated: (project: any) => WebhookService.triggerEvent('project.updated', { project }),
  
  invoicePaid: (invoice: any) => WebhookService.triggerEvent('invoice.paid', { invoice }),
  quoteAccepted: (quote: any) => WebhookService.triggerEvent('quote.accepted', { quote }),
};

