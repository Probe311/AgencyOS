// Service to manage OAuth token refresh and expiration
import { Integration } from '../../../types';
import { createIntegrationService } from './integrationFactory';

export class TokenManager {
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Check if a token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(integration: Integration): boolean {
    if (!integration.tokenExpiresAt) {
      return false; // No expiration date means token doesn't expire
    }

    const expiresAt = new Date(integration.tokenExpiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Refresh an access token if it's expired or about to expire
   */
  async refreshTokenIfNeeded(integration: Integration, updateIntegration: (id: string, updates: Partial<Integration>) => Promise<void>): Promise<string | null> {
    if (!integration.refreshToken || !integration.accessToken) {
      return null;
    }

    if (!this.isTokenExpired(integration)) {
      return integration.accessToken; // Token is still valid
    }

    const service = createIntegrationService(integration.provider);
    if (!service) {
      console.warn(`No service found for provider: ${integration.provider}`);
      return null;
    }

    try {
      const tokenData = await service.refreshAccessToken(integration.refreshToken);
      
      await updateIntegration(integration.id, {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || integration.refreshToken,
        tokenExpiresAt: tokenData.expiresIn 
          ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
          : integration.tokenExpiresAt,
      });

      return tokenData.accessToken;
    } catch (error) {
      console.error(`Error refreshing token for ${integration.provider}:`, error);
      
      // Mark integration as error
      await updateIntegration(integration.id, {
        status: 'Erreur',
        lastError: error instanceof Error ? error.message : 'Erreur de rafraîchissement du token',
      });

      return null;
    }
  }

  /**
   * Schedule automatic token refresh for an integration
   */
  scheduleTokenRefresh(
    integration: Integration,
    updateIntegration: (id: string, updates: Partial<Integration>) => Promise<void>
  ): void {
    // Clear existing timer if any
    this.clearRefreshTimer(integration.id);

    if (!integration.tokenExpiresAt) {
      return; // No expiration, no need to schedule refresh
    }

    const expiresAt = new Date(integration.tokenExpiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      const timer = setTimeout(async () => {
        await this.refreshTokenIfNeeded(integration, updateIntegration);
        // Reschedule for next refresh
        const updated = await this.getUpdatedIntegration(integration.id);
        if (updated) {
          this.scheduleTokenRefresh(updated, updateIntegration);
        }
      }, refreshTime);

      this.refreshTimers.set(integration.id, timer);
    }
  }

  /**
   * Clear refresh timer for an integration
   */
  clearRefreshTimer(integrationId: string): void {
    const timer = this.refreshTimers.get(integrationId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(integrationId);
    }
  }

  /**
   * Clear all refresh timers
   */
  clearAllTimers(): void {
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
  }

  /**
   * Get updated integration (helper method)
   * In a real implementation, this would fetch from the database
   */
  private async getUpdatedIntegration(integrationId: string): Promise<Integration | null> {
    // This is a placeholder - in real implementation, fetch from Supabase
    return null;
  }

  /**
   * Test connection for an integration
   */
  async testConnection(integration: Integration): Promise<boolean> {
    if (!integration.accessToken) {
      return false;
    }

    const service = createIntegrationService(integration.provider);
    if (!service) {
      return false;
    }

    try {
      // First, ensure token is valid
      const validToken = await this.refreshTokenIfNeeded(
        integration,
        async () => {} // No-op update function for testing
      );

      if (!validToken) {
        return false;
      }

      return await service.testConnection(validToken);
    } catch (error) {
      console.error(`Error testing connection for ${integration.provider}:`, error);
      return false;
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();

