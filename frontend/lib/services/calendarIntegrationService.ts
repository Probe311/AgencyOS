import { supabase } from '../supabase';

export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'ical';
export type SyncDirection = 'bidirectional' | 'to_external' | 'from_external';
export type ConflictResolution = 'agencyos_wins' | 'external_wins' | 'manual' | 'newest_wins';

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  account_email: string;
  account_name?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id: string;
  calendar_name: string;
  sync_direction: SyncDirection;
  sync_enabled: boolean;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'failed' | 'partial';
  last_sync_error?: string;
  conflict_resolution: ConflictResolution;
  sync_frequency_minutes: number;
  metadata?: Record<string, any>;
}

export interface SyncMapping {
  id: string;
  calendar_integration_id: string;
  local_entity_type: 'appointment' | 'task' | 'project_event';
  local_entity_id: string;
  external_event_id: string;
  external_calendar_id: string;
  sync_direction: SyncDirection;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'conflict' | 'error';
  conflict_details?: Record<string, any>;
}

export interface SyncConflict {
  id: string;
  calendar_integration_id: string;
  sync_mapping_id?: string;
  local_entity_type: string;
  local_entity_id: string;
  external_event_id: string;
  conflict_type: 'time_change' | 'deletion' | 'creation' | 'update';
  local_data: Record<string, any>;
  external_data: Record<string, any>;
  resolution?: 'local_wins' | 'external_wins' | 'merged' | 'manual';
  resolved_by?: string;
  resolved_at?: string;
}

/**
 * Service d'intégration des calendriers externes
 */
export class CalendarIntegrationService {
  /**
   * Obtient l'URL d'autorisation OAuth pour un provider
   */
  static getOAuthUrl(provider: CalendarProvider, redirectUri: string): string {
    // TODO: Implémenter les URLs OAuth réelles
    const baseUrls: Record<CalendarProvider, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      apple: 'https://appleid.apple.com/auth/authorize',
      ical: '' // Pas d'OAuth pour iCal
    };

    const params = new URLSearchParams({
      client_id: 'YOUR_CLIENT_ID', // À configurer
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.getOAuthScopes(provider),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${baseUrls[provider]}?${params.toString()}`;
  }

  /**
   * Obtient les scopes OAuth nécessaires
   */
  private static getOAuthScopes(provider: CalendarProvider): string {
    const scopes: Record<CalendarProvider, string> = {
      google: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      outlook: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/offline_access',
      apple: 'calendar',
      ical: ''
    };
    return scopes[provider];
  }

  /**
   * Échange le code OAuth contre un token d'accès
   */
  static async exchangeOAuthCode(
    provider: CalendarProvider,
    code: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    // TODO: Implémenter l'échange réel avec les APIs
    // Pour l'instant, simulation
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expires_in: 3600
      };
    } catch (error: any) {
      throw new Error(`Failed to exchange OAuth code: ${error.message}`);
    }
  }

  /**
   * Rafraîchit le token d'accès
   */
  static async refreshAccessToken(integrationId: string): Promise<boolean> {
    try {
      const { data: integration, error: fetchError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (fetchError || !integration) {
        throw new Error('Integration not found');
      }

      // TODO: Implémenter le refresh réel selon le provider
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mettre à jour le token
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update({
          access_token: `refreshed_token_${Date.now()}`,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Synchronise les événements avec un calendrier externe
   */
  static async syncCalendar(integrationId: string): Promise<{
    success: boolean;
    synced: number;
    conflicts: number;
    errors: number;
  }> {
    try {
      const { data: integration, error: intError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (intError || !integration) {
        throw new Error('Integration not found');
      }

      // Vérifier si le token est expiré
      if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
        const refreshed = await this.refreshAccessToken(integrationId);
        if (!refreshed) {
          throw new Error('Failed to refresh token');
        }
      }

      let synced = 0;
      let conflicts = 0;
      let errors = 0;

      // Synchronisation bidirectionnelle
      if (integration.sync_direction === 'bidirectional' || integration.sync_direction === 'to_external') {
        // Sync local → externe
        const result = await this.syncLocalToExternal(integration);
        synced += result.synced;
        conflicts += result.conflicts;
        errors += result.errors;
      }

      if (integration.sync_direction === 'bidirectional' || integration.sync_direction === 'from_external') {
        // Sync externe → local
        const result = await this.syncExternalToLocal(integration);
        synced += result.synced;
        conflicts += result.conflicts;
        errors += result.errors;
      }

      // Mettre à jour le statut de synchronisation
      await supabase
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: errors > 0 ? 'partial' : conflicts > 0 ? 'partial' : 'success',
          last_sync_error: errors > 0 ? `${errors} errors occurred` : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      return { success: true, synced, conflicts, errors };
    } catch (error: any) {
      await supabase
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'failed',
          last_sync_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      return { success: false, synced: 0, conflicts: 0, errors: 1 };
    }
  }

  /**
   * Synchronise les événements locaux vers le calendrier externe
   */
  private static async syncLocalToExternal(integration: CalendarIntegration): Promise<{
    synced: number;
    conflicts: number;
    errors: number;
  }> {
    try {
      // Récupérer les appointments non synchronisés
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', integration.user_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      let synced = 0;
      let errors = 0;

      for (const appointment of appointments || []) {
        try {
          // Vérifier si déjà synchronisé
          const { data: existingMapping } = await supabase
            .from('calendar_sync_mappings')
            .select('*')
            .eq('calendar_integration_id', integration.id)
            .eq('local_entity_type', 'appointment')
            .eq('local_entity_id', appointment.id)
            .single();

          if (existingMapping) {
            // Mettre à jour l'événement externe
            await this.updateExternalEvent(integration, existingMapping.external_event_id, appointment);
          } else {
            // Créer l'événement externe
            const externalEventId = await this.createExternalEvent(integration, appointment);
            
            // Créer le mapping
            await supabase
              .from('calendar_sync_mappings')
              .insert([{
                calendar_integration_id: integration.id,
                local_entity_type: 'appointment',
                local_entity_id: appointment.id,
                external_event_id: externalEventId,
                external_calendar_id: integration.calendar_id,
                sync_direction: integration.sync_direction,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString()
              }]);
          }

          synced++;
        } catch (error) {
          console.error('Error syncing appointment:', error);
          errors++;
        }
      }

      return { synced, conflicts: 0, errors };
    } catch (error) {
      return { synced: 0, conflicts: 0, errors: 1 };
    }
  }

  /**
   * Synchronise les événements externes vers le local
   */
  private static async syncExternalToLocal(integration: CalendarIntegration): Promise<{
    synced: number;
    conflicts: number;
    errors: number;
  }> {
    try {
      // TODO: Récupérer les événements du calendrier externe
      // Pour l'instant, simulation
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { synced: 0, conflicts: 0, errors: 0 };
    } catch (error) {
      return { synced: 0, conflicts: 0, errors: 1 };
    }
  }

  /**
   * Crée un événement sur le calendrier externe
   */
  private static async createExternalEvent(
    integration: CalendarIntegration,
    appointment: any
  ): Promise<string> {
    // TODO: Implémenter la création réelle selon le provider
    // Pour l'instant, simulation
    await new Promise(resolve => setTimeout(resolve, 500));
    return `external_event_${Date.now()}`;
  }

  /**
   * Met à jour un événement sur le calendrier externe
   */
  private static async updateExternalEvent(
    integration: CalendarIntegration,
    externalEventId: string,
    appointment: any
  ): Promise<void> {
    // TODO: Implémenter la mise à jour réelle selon le provider
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Détecte et résout les conflits
   */
  static async detectConflicts(integrationId: string): Promise<SyncConflict[]> {
    try {
      const { data: conflicts, error } = await supabase
        .from('calendar_sync_conflicts')
        .select('*')
        .eq('calendar_integration_id', integrationId)
        .is('resolution', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return conflicts || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Résout un conflit
   */
  static async resolveConflict(
    conflictId: string,
    resolution: 'local_wins' | 'external_wins' | 'merged' | 'manual',
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_sync_conflicts')
        .update({
          resolution,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conflictId);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Configure un webhook pour recevoir les notifications de changements
   */
  static async setupWebhook(integrationId: string): Promise<boolean> {
    try {
      const { data: integration, error: intError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (intError || !integration) {
        throw new Error('Integration not found');
      }

      // TODO: Implémenter la configuration réelle du webhook selon le provider
      const webhookUrl = `${window.location.origin}/api/calendar-webhooks/${integrationId}`;
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Enregistrer le webhook
      await supabase
        .from('calendar_webhooks')
        .insert([{
          calendar_integration_id: integrationId,
          webhook_id: `webhook_${Date.now()}`,
          webhook_url: webhookUrl,
          expiration_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
          is_active: true
        }]);

      return true;
    } catch (error) {
      return false;
    }
  }
}

