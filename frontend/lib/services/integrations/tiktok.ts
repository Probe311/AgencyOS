import { BaseIntegrationService, OAuthConfig } from './base';

export class TikTokService extends BaseIntegrationService {
  provider = 'tiktok' as const;
  name = 'TikTok';
  category = 'Réseaux Sociaux' as const;

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(','),
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
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) throw new Error('Failed to exchange code for token');

    const data = await response.json();
    const accountInfo = await this.getAccountInfo(data.data.access_token);

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
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
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
    };
  }

  async testConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
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
    const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to get account info');

    const data = await response.json();
    return {
      id: data.data.user.open_id || '',
      name: data.data.user.display_name || '',
      avatar: data.data.user.avatar_url,
    };
  }
}

