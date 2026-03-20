import { supabase } from '../supabase';

export type AccountingProvider = 'sage' | 'quickbooks' | 'xero';
export type SyncDirection = 'bidirectional' | 'to_accounting' | 'from_accounting';
export type SyncFrequency = 'manual' | 'hourly' | 'daily' | 'weekly';

export interface AccountingIntegration {
  id: string;
  user_id: string;
  provider: AccountingProvider;
  account_name: string;
  company_id?: string;
  company_name?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  sync_direction: SyncDirection;
  sync_enabled: boolean;
  auto_sync: boolean;
  sync_frequency: SyncFrequency;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'failed' | 'partial';
  last_sync_error?: string;
  sync_invoices: boolean;
  sync_customers: boolean;
  sync_items: boolean;
  sync_payments: boolean;
  metadata?: Record<string, any>;
}

export interface SyncMapping {
  id: string;
  accounting_integration_id: string;
  local_entity_type: 'invoice' | 'customer' | 'item' | 'payment';
  local_entity_id: string;
  external_entity_id: string;
  sync_direction: SyncDirection;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'conflict' | 'error';
}

/**
 * Service d'intégration comptable
 */
export class AccountingIntegrationService {
  /**
   * Obtient l'URL d'autorisation OAuth pour un provider
   */
  static getOAuthUrl(provider: AccountingProvider, redirectUri: string): string {
    const baseUrls: Record<AccountingProvider, string> = {
      sage: 'https://www.sageone.com/oauth2/auth/central',
      quickbooks: 'https://appcenter.intuit.com/connect/oauth2',
      xero: 'https://login.xero.com/identity/connect/authorize'
    };

    const params = new URLSearchParams({
      client_id: 'YOUR_CLIENT_ID', // À configurer
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.getOAuthScopes(provider),
      state: crypto.randomUUID()
    });

    return `${baseUrls[provider]}?${params.toString()}`;
  }

  /**
   * Obtient les scopes OAuth nécessaires
   */
  private static getOAuthScopes(provider: AccountingProvider): string {
    const scopes: Record<AccountingProvider, string> = {
      sage: 'full_access',
      quickbooks: 'com.intuit.quickbooks.accounting',
      xero: 'accounting.transactions accounting.contacts accounting.settings'
    };
    return scopes[provider];
  }

  /**
   * Échange le code OAuth contre un token d'accès
   */
  static async exchangeOAuthCode(
    provider: AccountingProvider,
    code: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; company_id?: string }> {
    // TODO: Implémenter l'échange réel avec les APIs
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expires_in: 3600,
        company_id: `company_${Date.now()}`
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
        .from('accounting_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (fetchError || !integration) {
        throw new Error('Integration not found');
      }

      // TODO: Implémenter le refresh réel selon le provider
      await new Promise(resolve => setTimeout(resolve, 500));

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error: updateError } = await supabase
        .from('accounting_integrations')
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
   * Synchronise les factures avec le système comptable
   */
  static async syncInvoices(integrationId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const { data: integration, error: intError } = await supabase
        .from('accounting_integrations')
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
      let failed = 0;
      const errors: string[] = [];

      // Récupérer les factures non synchronisées
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', integration.user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (invoicesError) throw invoicesError;

      for (const invoice of invoices || []) {
        try {
          // Vérifier si déjà synchronisé
          const { data: existingMapping } = await supabase
            .from('accounting_sync_mappings')
            .select('*')
            .eq('accounting_integration_id', integration.id)
            .eq('local_entity_type', 'invoice')
            .eq('local_entity_id', invoice.id)
            .single();

          if (existingMapping) {
            // Mettre à jour la facture externe
            await this.updateExternalInvoice(integration, existingMapping.external_entity_id, invoice);
          } else {
            // Créer la facture externe
            const externalInvoiceId = await this.createExternalInvoice(integration, invoice);
            
            // Créer le mapping
            await supabase
              .from('accounting_sync_mappings')
              .insert([{
                accounting_integration_id: integration.id,
                local_entity_type: 'invoice',
                local_entity_id: invoice.id,
                external_entity_id: externalInvoiceId,
                sync_direction: integration.sync_direction,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString()
              }]);
          }

          synced++;
        } catch (error: any) {
          console.error('Error syncing invoice:', error);
          failed++;
          errors.push(`Invoice ${invoice.id}: ${error.message}`);
        }
      }

      // Mettre à jour le statut de synchronisation
      await supabase
        .from('accounting_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: failed > 0 ? 'partial' : 'success',
          last_sync_error: failed > 0 ? `${failed} errors occurred` : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      // Logger la synchronisation
      await supabase
        .from('accounting_sync_logs')
        .insert([{
          accounting_integration_id: integrationId,
          sync_type: 'manual',
          entity_type: 'invoice',
          status: failed > 0 ? 'partial' : 'success',
          synced_count: synced,
          failed_count: failed,
          error_message: errors.length > 0 ? errors.join('; ') : null,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }]);

      return { success: true, synced, failed, errors };
    } catch (error: any) {
      await supabase
        .from('accounting_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'failed',
          last_sync_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  /**
   * Crée une facture sur le système comptable externe
   */
  private static async createExternalInvoice(
    integration: AccountingIntegration,
    invoice: any
  ): Promise<string> {
    // TODO: Implémenter la création réelle selon le provider
    await new Promise(resolve => setTimeout(resolve, 500));
    return `external_invoice_${Date.now()}`;
  }

  /**
   * Met à jour une facture sur le système comptable externe
   */
  private static async updateExternalInvoice(
    integration: AccountingIntegration,
    externalInvoiceId: string,
    invoice: any
  ): Promise<void> {
    // TODO: Implémenter la mise à jour réelle selon le provider
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Synchronise les paiements
   */
  static async syncPayments(integrationId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    try {
      // TODO: Implémenter la synchronisation des paiements
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, synced: 0, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 0 };
    }
  }

  /**
   * Exporte les données comptables
   */
  static async exportData(
    integrationId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    entityType: 'invoices' | 'payments' | 'all',
    dateFrom?: string,
    dateTo?: string
  ): Promise<Blob> {
    try {
      // TODO: Implémenter l'export réel
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulation d'un export CSV
      const csvContent = 'Invoice Number,Date,Amount\nINV-001,2025-01-01,1000.00\n';
      return new Blob([csvContent], { type: 'text/csv' });
    } catch (error: any) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
}

