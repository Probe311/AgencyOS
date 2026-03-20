import { supabase } from '../supabase';

export type SocialPlatform = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'tiktok';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  account_name: string;
  account_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface SocialPost {
  id: string;
  user_id: string;
  social_account_id?: string;
  platform: SocialPlatform;
  content: string;
  media_urls?: string[];
  scheduled_at?: string;
  status: PostStatus;
  published_at?: string;
  external_post_id?: string;
  hashtags?: string[];
  mentions?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PublicationResult {
  success: boolean;
  external_post_id?: string;
  error?: string;
  response_data?: Record<string, any>;
}

/**
 * Service de publication sur les réseaux sociaux
 */
export class SocialMediaService {
  /**
   * Publie un post sur une plateforme
   */
  static async publishPost(
    postId: string,
    accountId: string
  ): Promise<PublicationResult> {
    try {
      // Récupérer le post et le compte
      const { data: post, error: postError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        throw new Error('Post not found');
      }

      const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        throw new Error('Social account not found');
      }

      // Vérifier si le token est expiré
      if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
        // Rafraîchir le token si possible
        const refreshed = await this.refreshToken(account);
        if (!refreshed) {
          throw new Error('Token expired and could not be refreshed');
        }
      }

      // Publier selon la plateforme
      let result: PublicationResult;
      switch (account.platform) {
        case 'linkedin':
          result = await this.publishToLinkedIn(post, account);
          break;
        case 'twitter':
          result = await this.publishToTwitter(post, account);
          break;
        case 'instagram':
          result = await this.publishToInstagram(post, account);
          break;
        case 'facebook':
          result = await this.publishToFacebook(post, account);
          break;
        case 'tiktok':
          result = await this.publishToTikTok(post, account);
          break;
        default:
          throw new Error(`Unsupported platform: ${account.platform}`);
      }

      // Enregistrer le résultat
      if (result.success) {
        await supabase
          .from('social_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: result.external_post_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId);

        await supabase
          .from('social_post_publications')
          .insert([{
            social_post_id: postId,
            social_account_id: accountId,
            publication_status: 'success',
            published_at: new Date().toISOString(),
            external_post_id: result.external_post_id,
            response_data: result.response_data
          }]);
      } else {
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', postId);

        await supabase
          .from('social_post_publications')
          .insert([{
            social_post_id: postId,
            social_account_id: accountId,
            publication_status: 'failed',
            error_message: result.error,
            response_data: result.response_data
          }]);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Publie sur LinkedIn
   * Documentation API: https://docs.microsoft.com/en-us/linkedin/marketing/
   * Nécessite: LinkedIn Marketing Developer Platform access
   */
  private static async publishToLinkedIn(
    post: SocialPost,
    account: SocialAccount
  ): Promise<PublicationResult> {
    try {
      // Vérifier que le token est valide
      if (!account.access_token) {
        throw new Error('LinkedIn access token is missing');
      }

      // Valider le contenu (LinkedIn limite à 3000 caractères)
      if (post.content.length > 3000) {
        throw new Error('LinkedIn post content exceeds 3000 characters limit');
      }

      // Mode simulation (à remplacer par l'API réelle)
      const USE_REAL_API = process.env.NEXT_PUBLIC_LINKEDIN_API_ENABLED === 'true';
      
      if (USE_REAL_API && account.access_token && account.access_token !== 'simulated_token') {
        // Intégration API LinkedIn réelle
        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify({
            author: `urn:li:person:${account.account_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { 
                  text: post.content,
                  attributes: post.mentions?.map(m => ({
                    start: post.content.indexOf(`@${m}`),
                    length: m.length + 1,
                    entity: `urn:li:person:${m}`
                  })) || []
                },
                shareMediaCategory: post.media_urls && post.media_urls.length > 0 ? 'IMAGE' : 'NONE',
                media: post.media_urls?.map(url => ({
                  status: 'READY',
                  media: url,
                  title: { text: '' }
                })) || []
              }
            },
            visibility: { 
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' 
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `LinkedIn API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          external_post_id: data.id || `linkedin_${Date.now()}`,
          response_data: { platform: 'linkedin', ...data }
        };
      } else {
        // Mode simulation pour développement
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          external_post_id: `linkedin_${Date.now()}`,
          response_data: { 
            platform: 'linkedin',
            simulated: true,
            note: 'Set NEXT_PUBLIC_LINKEDIN_API_ENABLED=true and configure access tokens to enable real API'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'LinkedIn publication failed',
        response_data: { platform: 'linkedin', error: error.message }
      };
    }
  }

  /**
   * Publie sur Twitter/X
   * Documentation API: https://developer.twitter.com/en/docs/twitter-api
   * Nécessite: Twitter API v2 access avec OAuth 2.0
   */
  private static async publishToTwitter(
    post: SocialPost,
    account: SocialAccount
  ): Promise<PublicationResult> {
    try {
      if (!account.access_token) {
        throw new Error('Twitter access token is missing');
      }

      // Valider le contenu (Twitter limite à 280 caractères)
      if (post.content.length > 280) {
        throw new Error('Twitter post content exceeds 280 characters limit');
      }

      const USE_REAL_API = process.env.NEXT_PUBLIC_TWITTER_API_ENABLED === 'true';
      
      if (USE_REAL_API && account.access_token && account.access_token !== 'simulated_token') {
        // Intégration API Twitter v2 réelle
        const response = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: post.content,
            // Media IDs si des images sont fournies
            ...(post.media_urls && post.media_urls.length > 0 && {
              media: {
                media_ids: post.media_urls // Nécessite upload préalable via media/upload
              }
            })
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Twitter API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          external_post_id: data.data?.id || `twitter_${Date.now()}`,
          response_data: { platform: 'twitter', ...data }
        };
      } else {
        // Mode simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          external_post_id: `twitter_${Date.now()}`,
          response_data: { 
            platform: 'twitter',
            simulated: true,
            note: 'Set NEXT_PUBLIC_TWITTER_API_ENABLED=true and configure access tokens to enable real API'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Twitter publication failed',
        response_data: { platform: 'twitter', error: error.message }
      };
    }
  }

  /**
   * Publie sur Instagram
   * Documentation API: https://developers.facebook.com/docs/instagram-api
   * Nécessite: Instagram Graph API avec Facebook Business Account
   */
  private static async publishToInstagram(
    post: SocialPost,
    account: SocialAccount
  ): Promise<PublicationResult> {
    try {
      if (!account.access_token) {
        throw new Error('Instagram access token is missing');
      }

      // Instagram nécessite au moins une image
      if (!post.media_urls || post.media_urls.length === 0) {
        throw new Error('Instagram posts require at least one image');
      }

      const USE_REAL_API = process.env.NEXT_PUBLIC_INSTAGRAM_API_ENABLED === 'true';
      
      if (USE_REAL_API && account.access_token && account.access_token !== 'simulated_token') {
        // Intégration Instagram Graph API réelle
        // Étape 1: Créer le conteneur média
        const containerResponse = await fetch(
          `https://graph.instagram.com/v18.0/${account.account_id}/media?image_url=${encodeURIComponent(post.media_urls[0])}&caption=${encodeURIComponent(post.content)}&access_token=${account.access_token}`,
          { method: 'POST' }
        );

        if (!containerResponse.ok) {
          throw new Error('Failed to create Instagram media container');
        }

        const containerData = await containerResponse.json();
        const creationId = containerData.id;

        // Étape 2: Publier le conteneur
        const publishResponse = await fetch(
          `https://graph.instagram.com/v18.0/${account.account_id}/media_publish?creation_id=${creationId}&access_token=${account.access_token}`,
          { method: 'POST' }
        );

        if (!publishResponse.ok) {
          throw new Error('Failed to publish Instagram post');
        }

        const publishData = await publishResponse.json();
        return {
          success: true,
          external_post_id: publishData.id || `instagram_${Date.now()}`,
          response_data: { platform: 'instagram', ...publishData }
        };
      } else {
        // Mode simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          external_post_id: `instagram_${Date.now()}`,
          response_data: { 
            platform: 'instagram',
            simulated: true,
            note: 'Set NEXT_PUBLIC_INSTAGRAM_API_ENABLED=true and configure access tokens to enable real API'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Instagram publication failed',
        response_data: { platform: 'instagram', error: error.message }
      };
    }
  }

  /**
   * Publie sur Facebook
   * Documentation API: https://developers.facebook.com/docs/graph-api
   * Nécessite: Facebook Graph API avec Page access token
   */
  private static async publishToFacebook(
    post: SocialPost,
    account: SocialAccount
  ): Promise<PublicationResult> {
    try {
      if (!account.access_token) {
        throw new Error('Facebook access token is missing');
      }

      if (!account.account_id) {
        throw new Error('Facebook page ID is missing');
      }

      const USE_REAL_API = process.env.NEXT_PUBLIC_FACEBOOK_API_ENABLED === 'true';
      
      if (USE_REAL_API && account.access_token && account.access_token !== 'simulated_token') {
        // Intégration Facebook Graph API réelle
        const params = new URLSearchParams({
          message: post.content,
          access_token: account.access_token
        });

        // Ajouter les médias si disponibles
        if (post.media_urls && post.media_urls.length > 0) {
          params.append('url', post.media_urls[0]);
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/feed?${params.toString()}`,
          { method: 'POST' }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Facebook API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          external_post_id: data.id || `facebook_${Date.now()}`,
          response_data: { platform: 'facebook', ...data }
        };
      } else {
        // Mode simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          external_post_id: `facebook_${Date.now()}`,
          response_data: { 
            platform: 'facebook',
            simulated: true,
            note: 'Set NEXT_PUBLIC_FACEBOOK_API_ENABLED=true and configure access tokens to enable real API'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Facebook publication failed',
        response_data: { platform: 'facebook', error: error.message }
      };
    }
  }

  /**
   * Publie sur TikTok
   * Documentation API: https://developers.tiktok.com/doc/
   * Nécessite: TikTok Marketing API (accès limité)
   * Note: L'API TikTok est très restrictive et nécessite une approbation spéciale
   */
  private static async publishToTikTok(
    post: SocialPost,
    account: SocialAccount
  ): Promise<PublicationResult> {
    try {
      if (!account.access_token) {
        throw new Error('TikTok access token is missing');
      }

      // TikTok nécessite une vidéo
      if (!post.media_urls || post.media_urls.length === 0) {
        throw new Error('TikTok posts require at least one video');
      }

      const USE_REAL_API = process.env.NEXT_PUBLIC_TIKTOK_API_ENABLED === 'true';
      
      if (USE_REAL_API && account.access_token && account.access_token !== 'simulated_token') {
        // Intégration TikTok Marketing API réelle
        // Note: L'API TikTok est complexe et nécessite plusieurs étapes
        // 1. Upload de la vidéo
        // 2. Création du post
        // 3. Publication
        
        // Pour l'instant, structure de base
        const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/post/publish/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: post.media_urls[0], // Nécessite upload préalable
            post_info: {
              title: post.content.substring(0, 150), // TikTok limite à 150 caractères
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
              video_cover_timestamp_ms: 1000
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `TikTok API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          external_post_id: data.data?.post_id || `tiktok_${Date.now()}`,
          response_data: { platform: 'tiktok', ...data }
        };
      } else {
        // Mode simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          external_post_id: `tiktok_${Date.now()}`,
          response_data: { 
            platform: 'tiktok',
            simulated: true,
            note: 'Set NEXT_PUBLIC_TIKTOK_API_ENABLED=true and configure access tokens to enable real API. Note: TikTok API requires special approval.'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'TikTok publication failed',
        response_data: { platform: 'tiktok', error: error.message }
      };
    }
  }

  /**
   * Rafraîchit le token d'accès selon la plateforme
   */
  private static async refreshToken(account: SocialAccount): Promise<boolean> {
    try {
      if (!account.refresh_token) {
        console.warn(`No refresh token available for ${account.platform}`);
        return false;
      }

      const USE_REAL_API = process.env[`NEXT_PUBLIC_${account.platform.toUpperCase()}_API_ENABLED`] === 'true';
      
      if (!USE_REAL_API) {
        // Mode simulation
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }

      let newToken: string;
      let expiresIn: number;

      switch (account.platform) {
        case 'linkedin':
          // LinkedIn OAuth 2.0 token refresh
          const linkedInResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: account.refresh_token,
              client_id: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || '',
              client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
            })
          });
          const linkedInData = await linkedInResponse.json();
          newToken = linkedInData.access_token;
          expiresIn = linkedInData.expires_in;
          break;

        case 'twitter':
          // Twitter OAuth 2.0 token refresh
          const twitterResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              refresh_token: account.refresh_token,
              grant_type: 'refresh_token',
              client_id: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || ''
            })
          });
          const twitterData = await twitterResponse.json();
          newToken = twitterData.access_token;
          expiresIn = twitterData.expires_in;
          break;

        case 'facebook':
        case 'instagram':
          // Facebook/Instagram utilisent le même système
          const fbResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          const fbData = await fbResponse.json();
          newToken = fbData.access_token;
          expiresIn = fbData.expires_in;
          break;

        case 'tiktok':
          // TikTok token refresh
          const tiktokResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refresh_token: account.refresh_token,
              client_id: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID || '',
              client_secret: process.env.TIKTOK_CLIENT_SECRET || ''
            })
          });
          const tiktokData = await tiktokResponse.json();
          newToken = tiktokData.data?.access_token;
          expiresIn = tiktokData.data?.expires_in;
          break;

        default:
          return false;
      }

      if (!newToken) {
        return false;
      }

      // Mettre à jour le token dans la base de données
      const expiresAt = expiresIn 
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 jours par défaut

      await supabase
        .from('social_accounts')
        .update({
          access_token: newToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      return true;
    } catch (error: any) {
      console.error(`Error refreshing ${account.platform} token:`, error);
      return false;
    }
  }

  /**
   * Planifie un post pour publication future
   */
  static async schedulePost(
    postId: string,
    scheduledAt: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('social_posts')
        .update({
          scheduled_at: scheduledAt,
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error scheduling post:', error);
      return false;
    }
  }

  /**
   * Importe des posts depuis un CSV
   */
  static async importBulkPosts(
    userId: string,
    file: File
  ): Promise<{ success: boolean; importId?: string; error?: string }> {
    try {
      // Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bulk-imports')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Créer l'enregistrement d'import
      const { data: importData, error: importError } = await supabase
        .from('social_bulk_imports')
        .insert([{
          user_id: userId,
          filename: file.name,
          file_url: uploadData.path,
          status: 'pending'
        }])
        .select()
        .single();

      if (importError) throw importError;

      // Traiter le fichier en arrière-plan (serait fait par un worker)
      // Pour l'instant, on retourne juste l'ID
      return {
        success: true,
        importId: importData.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Génère des suggestions de hashtags avec IA
   */
  static async generateHashtags(
    content: string,
    platform: SocialPlatform
  ): Promise<string[]> {
    try {
      // Extraire les hashtags existants
      const hashtagRegex = /#\w+/g;
      const existingHashtags = content.match(hashtagRegex) || [];

      // Utiliser l'IA pour générer des hashtags pertinents
      const { generateContent } = await import('../ai-client');
      
      const platformContext = {
        linkedin: 'LinkedIn (professionnel, B2B, carrière)',
        twitter: 'Twitter/X (actualités, tendances, discussions)',
        instagram: 'Instagram (visuel, lifestyle, créatif)',
        facebook: 'Facebook (communauté, engagement)',
        tiktok: 'TikTok (viral, tendances, court format)',
      }[platform];

      const prompt = `Analyse ce contenu et génère 10 hashtags pertinents pour ${platformContext}.
      
Contenu: "${content}"

Règles:
- Génère des hashtags pertinents au contenu
- Inclus des hashtags populaires et tendances si approprié
- Adapte le style selon la plateforme (${platform})
- Évite les hashtags déjà présents: ${existingHashtags.join(', ')}
- Format: liste de hashtags séparés par des virgules, sans # au début

Réponds uniquement avec les hashtags, séparés par des virgules.`;

      const aiResponse = await generateContent(prompt);
      
      // Parser la réponse de l'IA
      const suggestedHashtags = aiResponse
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && !tag.startsWith('#'))
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .filter(tag => !existingHashtags.includes(tag.toLowerCase()))
        .slice(0, 10);

      // Ajouter des hashtags populaires par plateforme si nécessaire
      const platformHashtags: Record<SocialPlatform, string[]> = {
        linkedin: ['#business', '#leadership', '#innovation', '#networking', '#career'],
        twitter: ['#trending', '#news', '#tech', '#business', '#marketing'],
        instagram: ['#instagood', '#photography', '#lifestyle', '#creative', '#inspiration'],
        facebook: ['#community', '#engagement', '#social', '#business', '#marketing'],
        tiktok: ['#fyp', '#viral', '#trending', '#foryou', '#comedy'],
      };

      if (suggestedHashtags.length < 10) {
        const popular = platformHashtags[platform]
          .filter(tag => !existingHashtags.includes(tag.toLowerCase()) && !suggestedHashtags.includes(tag))
          .slice(0, 10 - suggestedHashtags.length);
        suggestedHashtags.push(...popular);
      }

      return [...existingHashtags, ...suggestedHashtags].slice(0, 15);
    } catch (error) {
      console.error('Erreur génération hashtags IA:', error);
      
      // Fallback : suggestions basiques
      const hashtagRegex = /#\w+/g;
      const existingHashtags = content.match(hashtagRegex) || [];
      
      const fallbackHashtags: Record<SocialPlatform, string[]> = {
        linkedin: ['#business', '#leadership', '#innovation'],
        twitter: ['#trending', '#news', '#tech'],
        instagram: ['#instagood', '#photography', '#lifestyle'],
        facebook: ['#community', '#engagement', '#social'],
        tiktok: ['#fyp', '#viral', '#trending'],
      };

      const suggested = fallbackHashtags[platform];
      return [...existingHashtags, ...suggested].slice(0, 10);
    }
  }

  /**
   * Calcule les meilleurs créneaux de publication
   */
  static async calculateOptimalTimes(
    userId: string,
    platform: SocialPlatform
  ): Promise<Array<{ day: number; hour: number; score: number }>> {
    try {
      // Récupérer les données historiques
      const { data: posts } = await supabase
        .from('social_posts')
        .select('published_at, metadata')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('status', 'published')
        .not('published_at', 'is', null);

      if (!posts || posts.length === 0) {
        // Retourner des créneaux par défaut
        return [
          { day: 1, hour: 9, score: 75 }, // Mardi 9h
          { day: 2, hour: 14, score: 80 }, // Mercredi 14h
          { day: 3, hour: 10, score: 70 }, // Jeudi 10h
        ];
      }

      // Analyser les performances par créneau
      const timeSlots: Record<string, { count: number; totalEngagement: number }> = {};
      
      posts.forEach(post => {
        if (post.published_at) {
          const date = new Date(post.published_at);
          const day = date.getDay();
          const hour = date.getHours();
          const key = `${day}_${hour}`;
          
          if (!timeSlots[key]) {
            timeSlots[key] = { count: 0, totalEngagement: 0 };
          }
          
          timeSlots[key].count++;
          const engagement = post.metadata?.engagement || 0;
          timeSlots[key].totalEngagement += engagement;
        }
      });

      // Calculer les scores
      const optimalTimes = Object.entries(timeSlots)
        .map(([key, data]) => {
          const [day, hour] = key.split('_').map(Number);
          const avgEngagement = data.totalEngagement / data.count;
          const score = Math.min(100, (avgEngagement / 100) * 100); // Normaliser
          
          return { day, hour, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Sauvegarder les résultats
      for (const time of optimalTimes) {
        await supabase
          .from('social_optimal_times')
          .upsert({
            user_id: userId,
            platform,
            day_of_week: time.day,
            hour: time.hour,
            engagement_score: time.score,
            confidence_level: Math.min(100, posts.length * 10),
            based_on_posts_count: posts.length
          }, {
            onConflict: 'user_id,platform,day_of_week,hour'
          });
      }

      return optimalTimes;
    } catch (error) {
      console.error('Error calculating optimal times:', error);
      return [];
    }
  }
}

