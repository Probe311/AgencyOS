// Base class and utilities for all integrations
import { Integration } from '../../../types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface IntegrationService {
  provider: Integration['provider'];
  name: string;
  category: Integration['category'];
  
  // OAuth flow
  getAuthUrl(state?: string): string;
  exchangeCodeForToken(code: string, state?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    accountId?: string;
    accountName?: string;
    accountAvatar?: string;
  }>;
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  
  // API operations
  testConnection(accessToken: string): Promise<boolean>;
  getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  
  // Provider-specific methods
  [key: string]: any;
}

export abstract class BaseIntegrationService implements IntegrationService {
  abstract provider: Integration['provider'];
  abstract name: string;
  abstract category: Integration['category'];
  protected config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  abstract getAuthUrl(state?: string): string;
  abstract exchangeCodeForToken(code: string, state?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    accountId?: string;
    accountName?: string;
    accountAvatar?: string;
  }>;
  abstract refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;
  abstract testConnection(accessToken: string): Promise<boolean>;
  abstract getAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

// Helper to get OAuth config from environment or config
export function getOAuthConfig(provider: Integration['provider']): OAuthConfig | null {
  // In production, these should come from environment variables or a secure config
  const configs: Record<string, Partial<OAuthConfig>> = {
    linkedin: {
      clientId: process.env.VITE_LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.VITE_LINKEDIN_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/linkedin`,
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    instagram: {
      clientId: process.env.VITE_INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.VITE_INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/instagram`,
      scopes: ['user_profile', 'user_media'],
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
    },
    twitter: {
      clientId: process.env.VITE_TWITTER_CLIENT_ID || '',
      clientSecret: process.env.VITE_TWITTER_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/twitter`,
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    },
    tiktok: {
      clientId: process.env.VITE_TIKTOK_CLIENT_ID || '',
      clientSecret: process.env.VITE_TIKTOK_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/tiktok`,
      scopes: ['user.info.basic', 'video.upload'],
      authUrl: 'https://www.tiktok.com/v2/auth/authorize',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
    },
    google_ads: {
      clientId: process.env.VITE_GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_GOOGLE_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/google-ads`,
      scopes: ['https://www.googleapis.com/auth/adwords'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    },
    meta_ads: {
      clientId: process.env.VITE_META_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_META_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/meta-ads`,
      scopes: ['ads_read', 'ads_management', 'business_management'],
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    },
    slack: {
      clientId: process.env.VITE_SLACK_CLIENT_ID || '',
      clientSecret: process.env.VITE_SLACK_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/slack`,
      scopes: ['channels:read', 'chat:write', 'users:read'],
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
    },
    notion: {
      clientId: process.env.VITE_NOTION_CLIENT_ID || '',
      clientSecret: process.env.VITE_NOTION_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/notion`,
      scopes: ['read', 'write'],
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
    },
    github: {
      clientId: process.env.VITE_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.VITE_GITHUB_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/github`,
      scopes: ['repo', 'user'],
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
    },
    stripe: {
      clientId: process.env.VITE_STRIPE_CLIENT_ID || '',
      clientSecret: process.env.VITE_STRIPE_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/stripe`,
      scopes: ['read_write'],
      authUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
    },
    hubspot: {
      clientId: process.env.VITE_HUBSPOT_CLIENT_ID || '',
      clientSecret: process.env.VITE_HUBSPOT_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/hubspot`,
      scopes: ['contacts', 'content', 'reports'],
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    },
    zapier: {
      clientId: process.env.VITE_ZAPIER_CLIENT_ID || '',
      clientSecret: process.env.VITE_ZAPIER_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/zapier`,
      scopes: ['read', 'write', 'webhooks'],
      authUrl: 'https://zapier.com/oauth/authorize',
      tokenUrl: 'https://zapier.com/oauth/token',
    },
    make: {
      clientId: process.env.VITE_MAKE_CLIENT_ID || '',
      clientSecret: process.env.VITE_MAKE_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/make`,
      scopes: ['read', 'write', 'webhooks'],
      authUrl: 'https://www.make.com/oauth/authorize',
      tokenUrl: 'https://www.make.com/oauth/token',
    },
    youtube: {
      clientId: process.env.VITE_YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.VITE_YOUTUBE_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/youtube`,
      scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    },
    pinterest: {
      clientId: process.env.VITE_PINTEREST_CLIENT_ID || '',
      clientSecret: process.env.VITE_PINTEREST_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/pinterest`,
      scopes: ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'],
      authUrl: 'https://www.pinterest.com/oauth',
      tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    },
    snapchat: {
      clientId: process.env.VITE_SNAPCHAT_CLIENT_ID || '',
      clientSecret: process.env.VITE_SNAPCHAT_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/snapchat`,
      scopes: ['snapchat-marketing-api'],
      authUrl: 'https://accounts.snapchat.com/login/oauth2/authorize',
      tokenUrl: 'https://accounts.snapchat.com/login/oauth2/access_token',
    },
    reddit: {
      clientId: process.env.VITE_REDDIT_CLIENT_ID || '',
      clientSecret: process.env.VITE_REDDIT_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/reddit`,
      scopes: ['read', 'submit', 'identity'],
      authUrl: 'https://www.reddit.com/api/v1/authorize',
      tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    },
    discord: {
      clientId: process.env.VITE_DISCORD_CLIENT_ID || '',
      clientSecret: process.env.VITE_DISCORD_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/discord`,
      scopes: ['identify', 'guilds', 'bot'],
      authUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
    },
    telegram: {
      clientId: process.env.VITE_TELEGRAM_BOT_TOKEN || '',
      clientSecret: process.env.VITE_TELEGRAM_BOT_TOKEN || '',
      redirectUri: `${window.location.origin}/oauth/callback/telegram`,
      scopes: ['bot'],
      authUrl: 'https://oauth.telegram.org/auth',
      tokenUrl: 'https://api.telegram.org/bot',
    },
    microsoft_ads: {
      clientId: process.env.VITE_MICROSOFT_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_MICROSOFT_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/microsoft-ads`,
      scopes: ['https://ads.microsoft.com/ads.manage', 'offline_access'],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    },
    amazon_ads: {
      clientId: process.env.VITE_AMAZON_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_AMAZON_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/amazon-ads`,
      scopes: ['advertising::campaign_management'],
      authUrl: 'https://www.amazon.com/ap/oa',
      tokenUrl: 'https://api.amazon.com/auth/o2/token',
    },
    linkedin_ads: {
      clientId: process.env.VITE_LINKEDIN_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_LINKEDIN_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/linkedin-ads`,
      scopes: ['r_ads', 'r_ads_reporting', 'rw_ads'],
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    twitter_ads: {
      clientId: process.env.VITE_TWITTER_ADS_CLIENT_ID || '',
      clientSecret: process.env.VITE_TWITTER_ADS_CLIENT_SECRET || '',
      redirectUri: `${window.location.origin}/oauth/callback/twitter-ads`,
      scopes: ['ads_read', 'ads_write', 'offline.access'],
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    },
  };

  const config = configs[provider];
  if (!config || !config.clientId || !config.clientSecret) {
    return null;
  }

  return config as OAuthConfig;
}

