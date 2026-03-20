/**
 * Service de gestion des templates de recherche de prospection
 * Permet de sauvegarder, charger et réutiliser des recherches de prospection
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface ProspectingSearchTemplate {
  id: string;
  name: string;
  description?: string;
  zone: string;
  activity: string;
  filters?: {
    sector?: string;
    family?: string;
    temperature?: string;
    minScoring?: number;
    maxScoring?: number;
    tags?: string[];
    [key: string]: any;
  };
  is_public: boolean;
  is_official: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProspectingSearchParams {
  zone: string;
  activity: string;
  filters?: {
    sector?: string;
    family?: string;
    temperature?: string;
    minScoring?: number;
    maxScoring?: number;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Crée un template de recherche depuis des paramètres de recherche
 */
export async function createSearchTemplate(
  name: string,
  params: ProspectingSearchParams,
  options?: {
    description?: string;
    isPublic?: boolean;
    isOfficial?: boolean;
    userId?: string;
  }
): Promise<ProspectingSearchTemplate> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = options?.userId || userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const { data, error } = await supabase
      .from('prospecting_search_templates')
      .insert({
        name,
        description: options?.description,
        zone: params.zone,
        activity: params.activity,
        filters: params.filters || {},
        is_public: options?.isPublic || false,
        is_official: options?.isOfficial || false,
        usage_count: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    logInfo(`Template de recherche créé: ${name}`);
    return data as ProspectingSearchTemplate;
  } catch (err) {
    logError(`Erreur création template de recherche:`, err);
    throw err;
  }
}

/**
 * Récupère tous les templates de recherche
 */
export async function getSearchTemplates(options?: {
  userId?: string;
  includePublic?: boolean;
  includeOfficial?: boolean;
  search?: string;
}): Promise<ProspectingSearchTemplate[]> {
  try {
    let query = supabase
      .from('prospecting_search_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    // Filtrer selon les options
    if (options?.userId) {
      query = query.or(`created_by.eq.${options.userId},is_public.eq.true,is_official.eq.true`);
    }

    if (options?.includePublic === false) {
      query = query.eq('is_public', false);
    }

    if (options?.includeOfficial === false) {
      query = query.eq('is_official', false);
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,zone.ilike.%${options.search}%,activity.ilike.%${options.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as ProspectingSearchTemplate[];
  } catch (err) {
    logError(`Erreur récupération templates de recherche:`, err);
    return [];
  }
}

/**
 * Récupère un template par ID
 */
export async function getSearchTemplateById(templateId: string): Promise<ProspectingSearchTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('prospecting_search_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as ProspectingSearchTemplate;
  } catch (err) {
    logError(`Erreur récupération template ${templateId}:`, err);
    return null;
  }
}

/**
 * Met à jour un template de recherche
 */
export async function updateSearchTemplate(
  templateId: string,
  updates: Partial<ProspectingSearchTemplate>
): Promise<ProspectingSearchTemplate> {
  try {
    const { data, error } = await supabase
      .from('prospecting_search_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;

    logInfo(`Template de recherche mis à jour: ${templateId}`);
    return data as ProspectingSearchTemplate;
  } catch (err) {
    logError(`Erreur mise à jour template ${templateId}:`, err);
    throw err;
  }
}

/**
 * Supprime un template de recherche
 */
export async function deleteSearchTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('prospecting_search_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    logInfo(`Template de recherche supprimé: ${templateId}`);
  } catch (err) {
    logError(`Erreur suppression template ${templateId}:`, err);
    throw err;
  }
}

/**
 * Incrémente le compteur d'utilisation d'un template
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    // Si la fonction RPC n'existe pas, faire manuellement
    if (error && error.code === '42883') {
      const template = await getSearchTemplateById(templateId);
      if (template) {
        await updateSearchTemplate(templateId, {
          usage_count: template.usage_count + 1,
        });
      }
    } else if (error) {
      throw error;
    }
  } catch (err) {
    logWarn(`Erreur incrément usage template ${templateId}:`, err);
    // Ne pas faire échouer si l'incrémentation échoue
  }
}

/**
 * Duplique un template de recherche
 */
export async function duplicateSearchTemplate(
  templateId: string,
  newName: string,
  userId?: string
): Promise<ProspectingSearchTemplate> {
  try {
    const template = await getSearchTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} introuvable`);
    }

    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userId || userData?.user?.id;

    return await createSearchTemplate(
      newName,
      {
        zone: template.zone,
        activity: template.activity,
        filters: template.filters,
      },
      {
        description: template.description,
        isPublic: false, // Les duplications sont privées par défaut
        isOfficial: false,
        userId: currentUserId,
      }
    );
  } catch (err) {
    logError(`Erreur duplication template ${templateId}:`, err);
    throw err;
  }
}

/**
 * Sauvegarde automatiquement une recherche comme template si elle correspond à certains critères
 */
export async function autoSaveSearchAsTemplate(
  params: ProspectingSearchParams,
  searchResults: { leadsFound: number; leadsAdded: number },
  options?: {
    minLeadsFound?: number; // Minimum de leads trouvés pour sauvegarder automatiquement
    userId?: string;
  }
): Promise<ProspectingSearchTemplate | null> {
  try {
    const minLeads = options?.minLeadsFound || 10; // Par défaut, sauvegarder si >= 10 leads trouvés

    // Ne sauvegarder que si la recherche a été fructueuse
    if (searchResults.leadsFound < minLeads) {
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = options?.userId || userData?.user?.id;

    if (!userId) {
      return null;
    }

    // Générer un nom automatique basé sur la zone et l'activité
    const autoName = `Recherche: ${params.activity} - ${params.zone}`;

    // Vérifier si un template similaire existe déjà
    const existingTemplates = await getSearchTemplates({ userId });
    const similarTemplate = existingTemplates.find(
      t => t.zone === params.zone && t.activity === params.activity
    );

    if (similarTemplate) {
      // Mettre à jour le compteur d'utilisation du template existant
      await incrementTemplateUsage(similarTemplate.id);
      return similarTemplate;
    }

    // Créer un nouveau template
    return await createSearchTemplate(
      autoName,
      params,
      {
        description: `Recherche automatique sauvegardée (${searchResults.leadsFound} leads trouvés)`,
        isPublic: false,
        isOfficial: false,
        userId,
      }
    );
  } catch (err) {
    logWarn(`Erreur sauvegarde automatique recherche:`, err);
    // Ne pas faire échouer la recherche si la sauvegarde automatique échoue
    return null;
  }
}

/**
 * Applique un template de recherche pour obtenir les paramètres
 */
export async function applySearchTemplate(templateId: string): Promise<ProspectingSearchParams> {
  try {
    const template = await getSearchTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} introuvable`);
    }

    // Incrémenter le compteur d'utilisation
    await incrementTemplateUsage(templateId);

    return {
      zone: template.zone,
      activity: template.activity,
      filters: template.filters,
    };
  } catch (err) {
    logError(`Erreur application template ${templateId}:`, err);
    throw err;
  }
}

