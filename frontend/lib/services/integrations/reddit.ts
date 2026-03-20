import { BaseIntegrationService, OAuthConfig } from './base';

export class RedditService extends BaseIntegrationService {
  provider = 'reddit' as const;
  name = 'Reddit';
  category = 'Réseaux Sociaux' as const;

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      duration: 'permanent',
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
    const auth = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange code for token');

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
    const auth = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
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
    const response = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get account info');

    const data = await response.json();
    return {
      id: data.id || '',
      name: data.name || '',
      avatar: data.icon_img || data.snoovatar_img,
    };
  }
}

