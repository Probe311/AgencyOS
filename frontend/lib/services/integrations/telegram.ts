import { BaseIntegrationService, OAuthConfig } from './base';

export class TelegramService extends BaseIntegrationService {
  provider = 'telegram' as const;
  name = 'Telegram';
  category = 'Réseaux Sociaux' as const;

  getAuthUrl(state?: string): string {
    // Telegram utilise un système d'authentification différent (Bot API)
    // Pour les bots, on utilise directement le token
    // Pour l'authentification utilisateur, on utilise Telegram Login Widget
    const params = new URLSearchParams({
      bot_id: this.config.clientId,
      origin: window.location.origin,
      request_access: 'write',
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
    // Telegram utilise un système différent, le "token" est généralement le bot token
    // Pour l'authentification utilisateur via widget, on reçoit directement les données
    const accountInfo = await this.getAccountInfo(code);

    return {
      accessToken: code, // Le code contient les données d'authentification Telegram
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
    // Telegram ne nécessite pas de refresh token pour les bots
    return {
      accessToken: refreshToken,
      refreshToken,
    };
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${accessToken}/getMe`);
      const data = await response.json();
      return data.ok === true;
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
      // Pour les bots Telegram
      const response = await fetch(`https://api.telegram.org/bot${accessToken}/getMe`);
      if (response.ok) {
        const data = await response.json();
        return {
          id: data.result?.id?.toString() || '',
          name: data.result?.first_name || data.result?.username || '',
        };
      }
    } catch {
      // Si ce n'est pas un bot token, retourner des valeurs par défaut
    }
    
    return {
      id: 'telegram_user',
      name: 'Compte Telegram',
    };
  }
}

