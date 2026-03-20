/**
 * Service de Social Listening
 * Intègre les APIs de monitoring des mentions sur les réseaux sociaux
 * Documentation: Prêt pour intégration avec Twitter API, Facebook Graph API, Instagram Graph API, LinkedIn API, Google Alerts
 */

import { supabase } from '../supabase';

export type Platform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'web' | 'news' | 'blog' | 'forum' | 'reddit';
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface ListeningQuery {
  id: string;
  name: string;
  description?: string;
  query_type: 'keyword' | 'boolean' | 'hashtag' | 'mention' | 'url';
  query_string: string;
  platforms: Platform[];
  languages: string[];
  countries: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: string;
  listening_query_id?: string;
  platform: Platform;
  author_name: string;
  author_username?: string;
  author_followers_count: number;
  author_influence_score: number;
  content: string;
  url: string;
  sentiment?: Sentiment;
  sentiment_score?: number;
  is_crisis: boolean;
  crisis_severity?: 'low' | 'medium' | 'high' | 'critical';
  is_influencer: boolean;
  engagement_metrics: Record<string, any>;
  published_at: string;
  discovered_at: string;
}

export interface Alert {
  id: string;
  listening_query_id?: string;
  alert_type: 'crisis' | 'volume_spike' | 'sentiment_shift' | 'influencer_mention' | 'competitor_mention' | 'keyword_match' | 'custom';
  alert_name: string;
  trigger_conditions: Record<string, any>;
  is_active: boolean;
  notification_channels: string[];
  last_triggered_at?: string;
  trigger_count: number;
}

/**
 * Service de Social Listening
 */
export class SocialListeningService {
  /**
   * Recherche des mentions sur Twitter
   * Documentation API: https://developer.twitter.com/en/docs/twitter-api/tweets/search
   * Nécessite: Twitter API v2 avec accès recherche
   */
  static async searchTwitterMentions(
    query: string,
    options?: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
    }
  ): Promise<Mention[]> {
    const USE_REAL_API = process.env.NEXT_PUBLIC_TWITTER_API_ENABLED === 'true';
    const API_TOKEN = process.env.TWITTER_BEARER_TOKEN;

    try {
      if (USE_REAL_API && API_TOKEN && API_TOKEN !== 'simulated_token') {
        // Intégration Twitter API v2 réelle
        const params = new URLSearchParams({
          query: query,
          max_results: String(options?.maxResults || 100),
          'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
          'user.fields': 'name,username,public_metrics,verified',
          expansions: 'author_id'
        });

        if (options?.startTime) params.append('start_time', options.startTime);
        if (options?.endTime) params.append('end_time', options.endTime);
        if (options?.sinceId) params.append('since_id', options.sinceId);

        const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`
          }
        });

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Transformer les résultats en format Mention
        const mentions: Mention[] = (data.data || []).map((tweet: any) => {
          const author = data.includes?.users?.find((u: any) => u.id === tweet.author_id);
          return {
            id: `twitter_${tweet.id}`,
            platform: 'twitter',
            author_name: author?.name || 'Unknown',
            author_username: author?.username,
            author_followers_count: author?.public_metrics?.followers_count || 0,
            author_influence_score: this.calculateInfluenceScore(author?.public_metrics),
            content: tweet.text,
            url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
            sentiment: 'neutral', // À analyser avec IA
            is_crisis: false,
            is_influencer: (author?.public_metrics?.followers_count || 0) > 10000,
            engagement_metrics: tweet.public_metrics || {},
            published_at: tweet.created_at,
            discovered_at: new Date().toISOString()
          };
        });

        // Sauvegarder les mentions dans la base
        await this.saveMentions(mentions);

        return mentions;
      } else {
        // Mode simulation
        return this.getSimulatedMentions('twitter', query, options?.maxResults || 10);
      }
    } catch (error: any) {
      console.error('Error searching Twitter mentions:', error);
      return [];
    }
  }

  /**
   * Recherche des mentions sur Facebook
   * Documentation API: https://developers.facebook.com/docs/graph-api
   */
  static async searchFacebookMentions(
    query: string,
    pageId: string,
    accessToken: string,
    options?: { limit?: number }
  ): Promise<Mention[]> {
    const USE_REAL_API = process.env.NEXT_PUBLIC_FACEBOOK_API_ENABLED === 'true';

    try {
      if (USE_REAL_API && accessToken && accessToken !== 'simulated_token') {
        // Recherche dans les posts de la page
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/posts?q=${encodeURIComponent(query)}&limit=${options?.limit || 25}&access_token=${accessToken}`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.status}`);
        }

        const data = await response.json();
        
        const mentions: Mention[] = (data.data || []).map((post: any) => ({
          id: `facebook_${post.id}`,
          platform: 'facebook',
          author_name: post.from?.name || 'Unknown',
          author_username: post.from?.id,
          author_followers_count: 0,
          author_influence_score: 0,
          content: post.message || '',
          url: post.permalink_url || `https://facebook.com/${post.id}`,
          sentiment: 'neutral',
          is_crisis: false,
          is_influencer: false,
          engagement_metrics: {
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0
          },
          published_at: post.created_time,
          discovered_at: new Date().toISOString()
        }));

        await this.saveMentions(mentions);
        return mentions;
      } else {
        return this.getSimulatedMentions('facebook', query, options?.limit || 10);
      }
    } catch (error: any) {
      console.error('Error searching Facebook mentions:', error);
      return [];
    }
  }

  /**
   * Recherche des mentions sur Instagram
   * Documentation API: https://developers.facebook.com/docs/instagram-api
   */
  static async searchInstagramMentions(
    query: string,
    accountId: string,
    accessToken: string,
    options?: { limit?: number }
  ): Promise<Mention[]> {
    const USE_REAL_API = process.env.NEXT_PUBLIC_INSTAGRAM_API_ENABLED === 'true';

    try {
      if (USE_REAL_API && accessToken && accessToken !== 'simulated_token') {
        // Recherche dans les médias de l'Instagram Business Account
        const response = await fetch(
          `https://graph.instagram.com/v18.0/${accountId}/media?fields=id,caption,like_count,comments_count,timestamp,permalink&limit=${options?.limit || 25}&access_token=${accessToken}`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.status}`);
        }

        const data = await response.json();
        
        const mentions: Mention[] = (data.data || [])
          .filter((media: any) => media.caption?.toLowerCase().includes(query.toLowerCase()))
          .map((media: any) => ({
            id: `instagram_${media.id}`,
            platform: 'instagram',
            author_name: 'Instagram User',
            author_username: accountId,
            author_followers_count: 0,
            author_influence_score: 0,
            content: media.caption || '',
            url: media.permalink || '',
            sentiment: 'neutral',
            is_crisis: false,
            is_influencer: false,
            engagement_metrics: {
              likes: media.like_count || 0,
              comments: media.comments_count || 0
            },
            published_at: media.timestamp,
            discovered_at: new Date().toISOString()
          }));

        await this.saveMentions(mentions);
        return mentions;
      } else {
        return this.getSimulatedMentions('instagram', query, options?.limit || 10);
      }
    } catch (error: any) {
      console.error('Error searching Instagram mentions:', error);
      return [];
    }
  }

  /**
   * Recherche des mentions sur LinkedIn
   * Documentation API: https://docs.microsoft.com/en-us/linkedin/marketing/
   */
  static async searchLinkedInMentions(
    query: string,
    accessToken: string,
    options?: { limit?: number }
  ): Promise<Mention[]> {
    const USE_REAL_API = process.env.NEXT_PUBLIC_LINKEDIN_API_ENABLED === 'true';

    try {
      if (USE_REAL_API && accessToken && accessToken !== 'simulated_token') {
        // LinkedIn n'a pas d'API de recherche publique directe
        // Nécessite d'utiliser l'API de monitoring des pages ou des groupes
        // Pour l'instant, structure de base
        return this.getSimulatedMentions('linkedin', query, options?.limit || 10);
      } else {
        return this.getSimulatedMentions('linkedin', query, options?.limit || 10);
      }
    } catch (error: any) {
      console.error('Error searching LinkedIn mentions:', error);
      return [];
    }
  }

  /**
   * Recherche web avec Google Alerts (simulation)
   * Note: Google Alerts n'a pas d'API publique officielle
   */
  static async searchWebMentions(
    query: string,
    options?: { limit?: number }
  ): Promise<Mention[]> {
    // Google Alerts n'a pas d'API publique
    // Nécessite d'utiliser des services tiers ou du scraping
    // Pour l'instant, simulation
    return this.getSimulatedMentions('web', query, options?.limit || 10);
  }

  /**
   * Recherche hybride sur toutes les plateformes
   */
  static async searchAllPlatforms(
    query: string,
    platforms: Platform[],
    options?: { limit?: number }
  ): Promise<Mention[]> {
    const results: Mention[] = [];

    for (const platform of platforms) {
      try {
        let platformMentions: Mention[] = [];

        switch (platform) {
          case 'twitter':
            platformMentions = await this.searchTwitterMentions(query, { maxResults: options?.limit || 25 });
            break;
          case 'facebook':
            // Nécessite pageId et accessToken
            platformMentions = await this.getSimulatedMentions('facebook', query, options?.limit || 10);
            break;
          case 'instagram':
            // Nécessite accountId et accessToken
            platformMentions = await this.getSimulatedMentions('instagram', query, options?.limit || 10);
            break;
          case 'linkedin':
            // Nécessite accessToken
            platformMentions = await this.getSimulatedMentions('linkedin', query, options?.limit || 10);
            break;
          case 'web':
            platformMentions = await this.searchWebMentions(query, options);
            break;
          default:
            platformMentions = await this.getSimulatedMentions(platform, query, options?.limit || 10);
        }

        results.push(...platformMentions);
      } catch (error: any) {
        console.error(`Error searching ${platform}:`, error);
      }
    }

    return results;
  }

  /**
   * Sauvegarde les mentions dans la base de données
   */
  private static async saveMentions(mentions: Mention[]): Promise<void> {
    try {
      const mentionsToInsert = mentions.map(mention => ({
        listening_query_id: mention.listening_query_id,
        platform: mention.platform,
        author_name: mention.author_name,
        author_username: mention.author_username,
        author_followers_count: mention.author_followers_count,
        author_influence_score: mention.author_influence_score,
        content: mention.content,
        url: mention.url,
        sentiment: mention.sentiment,
        sentiment_score: mention.sentiment_score,
        is_crisis: mention.is_crisis,
        crisis_severity: mention.crisis_severity,
        is_influencer: mention.is_influencer,
        engagement_metrics: mention.engagement_metrics,
        published_at: mention.published_at,
        discovered_at: mention.discovered_at
      }));

      await supabase
        .from('social_mentions')
        .upsert(mentionsToInsert, {
          onConflict: 'url',
          ignoreDuplicates: false
        });
    } catch (error: any) {
      console.error('Error saving mentions:', error);
    }
  }

  /**
   * Calcule le score d'influence d'un utilisateur
   */
  private static calculateInfluenceScore(metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  }): number {
    if (!metrics) return 0;

    const followers = metrics.followers_count || 0;
    const following = metrics.following_count || 0;
    const tweets = metrics.tweet_count || 0;

    // Score basique basé sur les followers et l'engagement
    let score = Math.log10(followers + 1) * 10;
    
    // Bonus pour un ratio followers/following élevé
    if (following > 0) {
      const ratio = followers / following;
      score += Math.min(ratio * 5, 20);
    }

    // Bonus pour l'activité
    if (tweets > 0) {
      score += Math.min(Math.log10(tweets + 1) * 2, 10);
    }

    return Math.round(Math.min(score, 100));
  }

  /**
   * Génère des mentions simulées pour le développement
   */
  private static getSimulatedMentions(
    platform: Platform,
    query: string,
    count: number
  ): Mention[] {
    const mentions: Mention[] = [];

    for (let i = 0; i < count; i++) {
      mentions.push({
        id: `${platform}_${Date.now()}_${i}`,
        platform,
        author_name: `User ${i + 1}`,
        author_username: `@user${i + 1}`,
        author_followers_count: Math.floor(Math.random() * 100000),
        author_influence_score: Math.floor(Math.random() * 100),
        content: `Mention about "${query}" - This is a simulated mention for development purposes.`,
        url: `https://${platform}.com/post/${Date.now()}_${i}`,
        sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)] as Sentiment,
        sentiment_score: Math.random() * 2 - 1, // -1 à 1
        is_crisis: Math.random() > 0.9,
        crisis_severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        is_influencer: Math.random() > 0.7,
        engagement_metrics: {
          likes: Math.floor(Math.random() * 1000),
          comments: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50)
        },
        published_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        discovered_at: new Date().toISOString()
      });
    }

    return mentions;
  }

  /**
   * Analyse le sentiment d'une mention avec IA
   */
  static async analyzeSentiment(content: string): Promise<{ sentiment: Sentiment; score: number }> {
    try {
      // Utiliser l'IA pour analyser le sentiment
      const { generateContent } = await import('../ai-client');
      
      const prompt = `Analyse le sentiment de ce texte et réponds uniquement avec un JSON: {"sentiment": "positive"|"negative"|"neutral"|"mixed", "score": -1 à 1}

Texte: "${content}"`;

      const response = await generateContent(prompt);
      const parsed = JSON.parse(response);

      return {
        sentiment: parsed.sentiment || 'neutral',
        score: parsed.score || 0
      };
    } catch (error: any) {
      console.error('Error analyzing sentiment:', error);
      return { sentiment: 'neutral', score: 0 };
    }
  }

  /**
   * Détecte si une mention est une crise
   */
  static async detectCrisis(mention: Mention): Promise<boolean> {
    if (mention.sentiment === 'negative' && (mention.sentiment_score || 0) < -0.7) {
      return true;
    }

    // Analyser le contenu avec IA pour détecter des mots-clés de crise
    const crisisKeywords = ['urgent', 'crise', 'problème', 'erreur', 'bug', 'panne', 'défaillance'];
    const hasCrisisKeywords = crisisKeywords.some(keyword => 
      mention.content.toLowerCase().includes(keyword)
    );

    return hasCrisisKeywords && mention.sentiment === 'negative';
  }
}

