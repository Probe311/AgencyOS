// Factory to create integration service instances
import { Integration } from '../../../types';
import { IntegrationService, getOAuthConfig } from './base';
import { logWarn } from '../../utils/logger';
import { LinkedInService } from './linkedin';
import { InstagramService } from './instagram';
import { TwitterService } from './twitter';
import { TikTokService } from './tiktok';
import { GoogleAdsService } from './googleAds';
import { MetaAdsService } from './metaAds';
import { SlackService } from './slack';
import { NotionService } from './notion';
import { GitHubService } from './github';
import { StripeService } from './stripe';
import { HubSpotService } from './hubspot';
import { ZapierService } from './zapier';
import { MakeService } from './make';
import { YouTubeService } from './youtube';
import { PinterestService } from './pinterest';
import { SnapchatService } from './snapchat';
import { RedditService } from './reddit';
import { DiscordService } from './discord';
import { TelegramService } from './telegram';
import { MicrosoftAdsService } from './microsoftAds';
import { AmazonAdsService } from './amazonAds';
import { LinkedInAdsService } from './linkedinAds';
import { TwitterAdsService } from './twitterAds';

export function createIntegrationService(provider: Integration['provider']): IntegrationService | null {
  const config = getOAuthConfig(provider);
  if (!config) {
    logWarn(`OAuth config not found for provider: ${provider}`);
    return null;
  }

  switch (provider) {
    case 'linkedin':
      return new LinkedInService(config);
    case 'instagram':
      return new InstagramService(config);
    case 'twitter':
      return new TwitterService(config);
    case 'tiktok':
      return new TikTokService(config);
    case 'google_ads':
      return new GoogleAdsService(config);
    case 'meta_ads':
      return new MetaAdsService(config);
    case 'slack':
      return new SlackService(config);
    case 'notion':
      return new NotionService(config);
    case 'github':
      return new GitHubService(config);
    case 'stripe':
      return new StripeService(config);
    case 'hubspot':
      return new HubSpotService(config);
    case 'zapier':
      return new ZapierService(config);
    case 'make':
      return new MakeService(config);
    case 'youtube':
      return new YouTubeService(config);
    case 'pinterest':
      return new PinterestService(config);
    case 'snapchat':
      return new SnapchatService(config);
    case 'reddit':
      return new RedditService(config);
    case 'discord':
      return new DiscordService(config);
    case 'telegram':
      return new TelegramService(config);
    case 'microsoft_ads':
      return new MicrosoftAdsService(config);
    case 'amazon_ads':
      return new AmazonAdsService(config);
    case 'linkedin_ads':
      return new LinkedInAdsService(config);
    case 'twitter_ads':
      return new TwitterAdsService(config);
    default:
      logWarn(`Unknown provider: ${provider}`);
      return null;
  }
}

