import { BaseIntegrationService, OAuthConfig } from './base';

export class ZapierService extends BaseIntegrationService {
  provider = 'zapier' as const;
  name = 'Zapier';
  category = 'Automatisation' as const;

  getAuthUrl(state?: string): string {
    // Zapier utilise OAuth 2.0 pour les intégrations personnalisées
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: state || '',
    });
    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, state?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    accountId?: string;
    accountName?: string;
    accountAvatar?: string;
  }> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const data = await response.json();
    const accountInfo = await this.getAccountInfo(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      accountId: accountInfo.id,
      accountName: accountInfo.name,
      accountAvatar: accountInfo.avatar,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      // Test de connexion via l'API Zapier
      // Note: Cette URL peut varier selon votre configuration Zapier
      const response = await fetch('https://api.zapier.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    avatar?: string;
  }> {
    try {
      const response = await fetch('https://api.zapier.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        // Si l'API Zapier n'est pas disponible, retourner des infos par défaut
        return {
          id: 'zapier_user',
          name: 'Compte Zapier',
        };
      }

      const data = await response.json();
      return {
        id: data.id || 'zapier_user',
        name: data.first_name && data.last_name 
          ? `${data.first_name} ${data.last_name}` 
          : data.email || 'Compte Zapier',
        avatar: data.avatar_url,
      };
    } catch {
      // En cas d'erreur, retourner des valeurs par défaut
      return {
        id: 'zapier_user',
        name: 'Compte Zapier',
      };
    }
  }

  // Méthodes spécifiques à Zapier pour gérer les webhooks
  async createWebhook(accessToken: string, webhookUrl: string, events: string[]): Promise<{
    id: string;
    url: string;
  }> {
    // Cette méthode peut être utilisée pour créer des webhooks Zapier
    // qui écouteront les événements de votre application
    const response = await fetch('https://api.zapier.com/v1/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events,
      }),
    });

    if (!response.ok) throw new Error('Failed to create webhook');

    return await response.json();
  }

  // Méthode pour obtenir l'URL de l'API publique de votre application
  // que Zapier pourra utiliser pour créer des Zaps
  getPublicApiUrl(): string {
    // Cette URL devrait pointer vers votre API REST publique
    return `${window.location.origin}/api`;
  }
}

