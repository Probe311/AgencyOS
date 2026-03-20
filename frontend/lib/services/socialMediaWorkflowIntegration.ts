/**
 * Service d'intégration entre Social Media et workflows automatisés
 * Détection de mentions/commentaires, création leads, qualification depuis réseaux sociaux
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';

export interface SocialMediaMention {
  id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  mentionType: 'mention' | 'comment' | 'message' | 'direct_message';
  content: string;
  author: {
    name?: string;
    username?: string;
    profileUrl?: string;
    followers?: number;
  };
  postUrl?: string;
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Détecte une mention/commentaire sur les réseaux sociaux et crée un lead si nécessaire
 */
export async function createLeadFromSocialMention(
  mention: SocialMediaMention
): Promise<{ leadCreated: boolean; leadId?: string; enriched: boolean }> {
  try {
    // Vérifier si un lead existe déjà pour cet auteur (par email, username, ou nom)
    let existingLeadId: string | null = null;

    if (mention.author.username || mention.author.name) {
      // Rechercher par nom ou entreprise
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .or(`name.ilike.%${mention.author.name || mention.author.username}%,company.ilike.%${mention.author.name || mention.author.username}%`)
        .limit(1)
        .single();

      if (existing) {
        existingLeadId = existing.id;
      }
    }

    // Si lead existe, enregistrer juste l'interaction
    if (existingLeadId) {
      await supabase
        .from('sales_activities')
        .insert({
          lead_id: existingLeadId,
          activity_type: `social_${mention.mentionType}`,
          description: `Mention sur ${mention.platform}: ${mention.content.substring(0, 200)}`,
          metadata: {
            platform: mention.platform,
            mention_type: mention.mentionType,
            content: mention.content,
            author: mention.author,
            post_url: mention.postUrl,
            sentiment: mention.sentiment,
          },
          created_at: mention.timestamp.toISOString(),
        });

      return {
        leadCreated: false,
        leadId: existingLeadId,
        enriched: false,
      };
    }

    // Créer un nouveau lead
    const newLead: Partial<Lead> = {
      name: mention.author.name || mention.author.username || 'Contact Social Media',
      company: mention.author.name || undefined,
      email: undefined, // Pas disponible depuis mention sociale
      phone: undefined,
      source: `social_${mention.platform}`,
      tags: [`${mention.platform}`, 'mention_social'],
      temperature: mention.sentiment === 'positive' ? 'Chaud' : 'Tiède',
      metadata: {
        social_profiles: {
          [mention.platform]: {
            username: mention.author.username,
            profile_url: mention.author.profileUrl,
            followers: mention.author.followers,
          },
        },
        first_mention: mention.timestamp.toISOString(),
      },
    };

    const { data: createdLead, error: createError } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Enregistrer l'interaction sociale
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: createdLead.id,
        activity_type: `social_${mention.mentionType}`,
        description: `Mention sur ${mention.platform}: ${mention.content.substring(0, 200)}`,
        metadata: {
          platform: mention.platform,
          mention_type: mention.mentionType,
          content: mention.content,
          author: mention.author,
          post_url: mention.postUrl,
          sentiment: mention.sentiment,
        },
        created_at: mention.timestamp.toISOString(),
      });

    // Enrichir automatiquement depuis le profil social
    const enriched = await enrichLeadFromSocialProfile(createdLead.id, mention);

    // Qualification automatique
    await qualifyLeadFromSocialData(createdLead.id, mention);

    return {
      leadCreated: true,
      leadId: createdLead.id,
      enriched,
    };
  } catch (error) {
    console.error('Erreur création lead depuis mention sociale:', error);
    return { leadCreated: false, enriched: false };
  }
}

/**
 * Enrichit un lead depuis son profil social
 */
async function enrichLeadFromSocialProfile(
  leadId: string,
  mention: SocialMediaMention
): Promise<boolean> {
  try {
    const updates: Partial<Lead> = {};

    // Extraire des informations du profil social
    if (mention.author.followers !== undefined) {
      // Si beaucoup de followers, probablement un influenceur
      if (mention.author.followers > 10000) {
        updates.tags = [`${mention.platform}`, 'influenceur'];
        updates.temperature = 'Chaud';
        updates.scoring = 75; // Scoring élevé pour influenceurs
      }
    }

    if (mention.author.profileUrl) {
      // Extraire le site web si LinkedIn ou Twitter
      if (mention.platform === 'linkedin' || mention.platform === 'twitter') {
        // TODO: Scraper le profil pour extraire le site web
      }
    }

    // Mettre à jour le lead
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (updateError) {
        console.error('Erreur mise à jour lead:', updateError);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Erreur enrichissement depuis profil social:', error);
    return false;
  }
}

/**
 * Qualifie un lead depuis les données sociales
 */
async function qualifyLeadFromSocialData(
  leadId: string,
  mention: SocialMediaMention
): Promise<{ qualified: boolean; tags: string[]; temperature?: string }> {
  try {
    const tags: string[] = [];
    let temperature: string | undefined;

    // Analyser le contenu pour déterminer l'intérêt
    const content = mention.content.toLowerCase();

    // Détecter si c'est une entreprise (mots-clés)
    if (content.includes('entreprise') || content.includes('business') || content.includes('startup')) {
      tags.push('entreprise');
    }

    // Détecter si c'est un particulier
    if (content.includes('je ') || content.includes('mon ') || content.includes('ma ')) {
      tags.push('particulier');
    }

    // Détecter si c'est un influenceur
    if (mention.author.followers && mention.author.followers > 10000) {
      tags.push('influenceur');
      temperature = 'Chaud';
    }

    // Analyser le sentiment
    if (mention.sentiment === 'positive') {
      tags.push('intéressé');
      temperature = temperature || 'Chaud';
    } else if (mention.sentiment === 'negative') {
      tags.push('critique');
      temperature = 'Froid';
    }

    // Calculer un scoring initial basé sur les données sociales
    let scoring = 30; // Score de base

    if (tags.includes('influenceur')) scoring += 30;
    if (tags.includes('intéressé')) scoring += 20;
    if (tags.includes('entreprise')) scoring += 10;
    if (mention.sentiment === 'positive') scoring += 10;

    // Récupérer les tags actuels
    const { data: currentLead } = await supabase
      .from('leads')
      .select('tags')
      .eq('id', leadId)
      .single();

    const currentTags = currentLead?.tags || [];

    // Mettre à jour le lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        tags: Array.from(new Set([...currentTags, ...tags])),
        temperature: temperature || 'Tiède',
        scoring: Math.min(100, scoring),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Erreur qualification lead:', updateError);
      return { qualified: false, tags: [] };
    }

    return {
      qualified: tags.length > 0,
      tags,
      temperature,
    };
  } catch (error) {
    console.error('Erreur qualification depuis données sociales:', error);
    return { qualified: false, tags: [] };
  }
}

/**
 * Synchronise les tags entre CRM et Social Media
 * Supporte la synchronisation unidirectionnelle (CRM ← Social ou CRM → Social) ou bidirectionnelle
 */
export async function syncTagsBetweenCRMAndSocial(
  leadId: string,
  socialTags: string[],
  direction: 'crm_to_social' | 'social_to_crm' | 'bidirectional'
): Promise<void> {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('tags')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    const crmTags = lead.tags || [];

    if (direction === 'social_to_crm' || direction === 'bidirectional') {
      // Ajouter les tags sociaux au CRM
      const mergedTags = Array.from(new Set([...crmTags, ...socialTags]));
      await supabase
        .from('leads')
        .update({ tags: mergedTags })
        .eq('id', leadId);
    }

    if (direction === 'bidirectional' || direction === 'crm_to_social') {
      // Synchronisation CRM → Social : enregistrer les tags CRM dans les métadonnées pour synchronisation future
      const { data: leadWithMetadata } = await supabase
        .from('leads')
        .select('id, tags, metadata')
        .eq('id', leadId)
        .single();

      if (leadWithMetadata) {
        try {
          const socialProfiles = (leadWithMetadata.metadata as any)?.social_profiles || {};
          
          // Enregistrer les tags CRM dans les métadonnées pour chaque plateforme sociale
          // Quand l'intégration API sera disponible, ces tags pourront être synchronisés
          const updatedMetadata = {
            ...(leadWithMetadata.metadata || {}),
            social_profiles: {
              ...socialProfiles,
              crm_tags: crmTags,
              crm_tags_synced_at: new Date().toISOString(),
            },
          };

          await supabase
            .from('leads')
            .update({ metadata: updatedMetadata })
            .eq('id', leadId);
        } catch (error: any) {
          console.error(`Erreur sync tags CRM → Social pour lead ${leadId}:`, error);
        }
      }
      
      // Note: Pour synchronisation complète vers plateformes, nécessite intégration API Social Media
      // - Facebook: Graph API Custom Labels
      // - Twitter: Twitter Ads API Tags
      // - LinkedIn: LinkedIn API Tags
    }
  } catch (error) {
    console.error('Erreur synchronisation tags:', error);
  }
}

/**
 * Synchronise les segments entre CRM et Social Media
 * Les segments CRM sont basés sur email_segments et peuvent être synchronisés vers les audiences Social Media
 */
export async function syncSegmentsBetweenCRMAndSocial(
  segmentId: string,
  direction: 'crm_to_social' | 'social_to_crm' | 'bidirectional',
  platform?: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
): Promise<{ synced: number; errors: number; details?: string }> {
  try {
    // Récupérer le segment CRM
    const { data: segment } = await supabase
      .from('email_segments')
      .select('*')
      .eq('id', segmentId)
      .single();

    if (!segment) {
      return { synced: 0, errors: 1, details: 'Segment non trouvé' };
    }

    let synced = 0;
    let errors = 0;

    // Pour l'instant, seule la synchronisation CRM → Social est possible
    // La synchronisation Social → CRM nécessite les APIs Social Media
    
    if (direction === 'social_to_crm' || direction === 'bidirectional') {
      console.warn('Synchronisation Social → CRM nécessite intégrations APIs Social Media (Facebook Marketing API, Twitter Ads API, etc.)');
      // TODO: Implémenter quand APIs Social Media seront intégrées
      // - Récupérer audiences depuis API Social Media
      // - Créer/ajouter segments CRM correspondants
      // - Synchroniser les leads
    }

    if (direction === 'crm_to_social' || direction === 'bidirectional') {
      // Récupérer les leads du segment
      const { useEmailSegments } = await import('../supabase/hooks/useEmailSegments');
      const segmentMembers = await useEmailSegments().calculateSegmentMembers(segmentId);
      
      if (!segmentMembers || segmentMembers.length === 0) {
        return { synced: 0, errors: 0, details: 'Aucun lead dans le segment' };
      }

      // TODO: Intégration réelle avec APIs Social Media
      // Pour Facebook: Créer/actualiser Custom Audience
      // Pour Twitter: Créer/actualiser Tailored Audience
      // Pour LinkedIn: Créer/actualiser Matched Audience
      
      // Pour l'instant, on enregistre la configuration de synchronisation dans les métadonnées du segment
      const metadata = segment.metadata || {};
      const syncConfig = {
        ...(metadata.social_sync || {}),
        [platform || 'all']: {
          direction,
          last_sync_at: new Date().toISOString(),
          leads_count: segmentMembers.length,
          status: 'configured', // 'configured' | 'synced' | 'error'
          // Quand l'intégration API sera disponible, on pourra enregistrer l'audience_id
          // audience_id: 'xxx',
        },
      };

      await supabase
        .from('email_segments')
        .update({
          metadata: {
            ...metadata,
            social_sync: syncConfig,
          },
        })
        .eq('id', segmentId);

      synced = segmentMembers.length;
      
      console.log(`Synchronisation segment "${segment.name}" vers ${platform || 'Social Media'} - ${synced} leads (nécessite intégration API pour synchronisation complète)`);
    }

    return { synced, errors };
  } catch (error: any) {
    console.warn('Erreur synchronisation segments Social Media:', error);
    return { synced: 0, errors: 1, details: error.message || 'Erreur inconnue' };
  }
}

/**
 * Synchronise automatiquement les segments CRM vers Social Media selon une planification
 * Peut être appelé périodiquement (daily, weekly) ou en temps réel via webhook
 */
export async function scheduleSegmentSync(
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin',
  frequency: 'real_time' | 'daily' | 'weekly' = 'daily'
): Promise<void> {
  try {
    // Récupérer tous les segments avec synchronisation activée
    const { data: segments } = await supabase
      .from('email_segments')
      .select('id, name, metadata')
      .not('metadata->social_sync', 'is', null);

    if (!segments || segments.length === 0) {
      console.log(`Aucun segment à synchroniser vers ${platform}`);
      return;
    }

    // Pour chaque segment, vérifier si une synchronisation est nécessaire
    for (const segment of segments) {
      const syncConfig = (segment.metadata as any)?.social_sync?.[platform];
      
      if (!syncConfig) continue;

      // Vérifier la dernière synchronisation
      const lastSync = syncConfig.last_sync_at ? new Date(syncConfig.last_sync_at) : null;
      const now = new Date();
      const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : Infinity;

      // Synchroniser selon la fréquence
      const shouldSync =
        frequency === 'real_time' ||
        (frequency === 'daily' && hoursSinceSync >= 24) ||
        (frequency === 'weekly' && hoursSinceSync >= 168);

      if (shouldSync) {
        await syncSegmentsBetweenCRMAndSocial(segment.id, syncConfig.direction || 'crm_to_social', platform);
      }
    }

    console.log(`Planification synchronisation segments vers ${platform}: ${frequency} - ${segments.length} segments vérifiés`);
  } catch (error) {
    console.error('Erreur planification synchronisation segments:', error);
  }
}

/**
 * Synchronise automatiquement les segments CRM vers Social Media selon une planification
 * Peut être appelé périodiquement (daily, weekly) ou en temps réel via webhook
 */
export async function scheduleSegmentSync(
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin',
  frequency: 'real_time' | 'daily' | 'weekly' = 'daily'
): Promise<void> {
  try {
    // Récupérer tous les segments avec synchronisation activée
    const { data: segments } = await supabase
      .from('email_segments')
      .select('id, name, metadata')
      .not('metadata->social_sync', 'is', null);

    if (!segments || segments.length === 0) {
      console.log(`Aucun segment à synchroniser vers ${platform}`);
      return;
    }

    // Pour chaque segment, vérifier si une synchronisation est nécessaire
    for (const segment of segments) {
      const syncConfig = (segment.metadata as any)?.social_sync?.[platform];
      
      if (!syncConfig) continue;

      // Vérifier la dernière synchronisation
      const lastSync = syncConfig.last_sync_at ? new Date(syncConfig.last_sync_at) : null;
      const now = new Date();
      const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : Infinity;

      // Synchroniser selon la fréquence
      const shouldSync =
        frequency === 'real_time' ||
        (frequency === 'daily' && hoursSinceSync >= 24) ||
        (frequency === 'weekly' && hoursSinceSync >= 168);

      if (shouldSync) {
        await syncSegmentsBetweenCRMAndSocial(segment.id, syncConfig.direction || 'crm_to_social', platform);
      }
    }

    console.log(`Planification synchronisation segments vers ${platform}: ${frequency} - ${segments.length} segments vérifiés`);
  } catch (error) {
    console.error('Erreur planification synchronisation segments:', error);
  }
}

