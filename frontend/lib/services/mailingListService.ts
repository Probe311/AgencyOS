/**
 * Service de gestion des listes de diffusion personnalisées
 * Gère les listes statiques/manuelles de leads pour campagnes marketing
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';

export interface MailingList {
  id?: string;
  name: string;
  description?: string;
  type: 'manual' | 'dynamic' | 'hybrid'; // Manuel (ajout/suppression manuelle), Dynamique (basé sur critères), Hybride (les deux)
  criteria?: Record<string, any>; // Critères pour listes dynamiques (JSONB)
  memberCount?: number; // Nombre de membres (calculé)
  isPublic: boolean; // Partage avec toute l'équipe
  isActive: boolean; // Active/désactivée
  tags?: string[]; // Tags pour catégorisation
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MailingListMember {
  id?: string;
  listId: string;
  leadId: string;
  addedAt?: string;
  addedBy?: string;
  source?: 'manual' | 'automatic' | 'import' | 'segment'; // Comment le lead a été ajouté
  metadata?: Record<string, any>; // Métadonnées additionnelles
}

export interface MailingListStats {
  totalMembers: number;
  activeMembers: number; // Leads actifs (non désabonnés)
  unsubscribedMembers: number;
  bounceRate: number; // Taux de rebond
  openRate: number; // Taux d'ouverture
  clickRate: number; // Taux de clic
  lastActivityAt?: string; // Dernière activité
}

/**
 * Récupère toutes les listes de diffusion
 */
export async function getMailingLists(filters?: {
  userId?: string;
  isPublic?: boolean;
  isActive?: boolean;
  type?: 'manual' | 'dynamic' | 'hybrid';
  tags?: string[];
}): Promise<MailingList[]> {
  try {
    let query = supabase
      .from('mailing_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('created_by', filters.userId);
    }

    if (filters?.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculer le nombre de membres pour chaque liste
    const lists = await Promise.all((data || []).map(async (list: any) => {
      const memberCount = await getMailingListMemberCount(list.id);
      return {
        id: list.id,
        name: list.name,
        description: list.description,
        type: list.type,
        criteria: list.criteria,
        memberCount,
        isPublic: list.is_public,
        isActive: list.is_active,
        tags: list.tags || [],
        createdBy: list.created_by,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      };
    }));

    return lists;
  } catch (err) {
    logError('Erreur récupération listes de diffusion:', err);
    throw err;
  }
}

/**
 * Récupère une liste de diffusion par ID
 */
export async function getMailingListById(listId: string): Promise<MailingList | null> {
  try {
    const { data, error } = await supabase
      .from('mailing_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const memberCount = await getMailingListMemberCount(listId);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      criteria: data.criteria,
      memberCount,
      isPublic: data.is_public,
      isActive: data.is_active,
      tags: data.tags || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    logError('Erreur récupération liste de diffusion:', err);
    throw err;
  }
}

/**
 * Crée une nouvelle liste de diffusion
 */
export async function createMailingList(list: Omit<MailingList, 'id' | 'memberCount' | 'createdAt' | 'updatedAt'>): Promise<MailingList> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data, error } = await supabase
      .from('mailing_lists')
      .insert({
        name: list.name,
        description: list.description,
        type: list.type,
        criteria: list.criteria || null,
        is_public: list.isPublic,
        is_active: list.isActive,
        tags: list.tags || [],
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      criteria: data.criteria,
      memberCount: 0,
      isPublic: data.is_public,
      isActive: data.is_active,
      tags: data.tags || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    logError('Erreur création liste de diffusion:', err);
    throw err;
  }
}

/**
 * Met à jour une liste de diffusion
 */
export async function updateMailingList(
  listId: string,
  updates: Partial<Omit<MailingList, 'id' | 'memberCount' | 'createdAt' | 'createdBy'>>
): Promise<MailingList> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('mailing_lists')
      .update(updateData)
      .eq('id', listId)
      .select()
      .single();

    if (error) throw error;

    const memberCount = await getMailingListMemberCount(listId);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      criteria: data.criteria,
      memberCount,
      isPublic: data.is_public,
      isActive: data.is_active,
      tags: data.tags || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    logError('Erreur mise à jour liste de diffusion:', err);
    throw err;
  }
}

/**
 * Supprime une liste de diffusion
 */
export async function deleteMailingList(listId: string): Promise<void> {
  try {
    // Supprimer d'abord les membres (CASCADE devrait le faire automatiquement)
    await supabase
      .from('mailing_list_members')
      .delete()
      .eq('list_id', listId);

    const { error } = await supabase
      .from('mailing_lists')
      .delete()
      .eq('id', listId);

    if (error) throw error;
  } catch (err) {
    logError('Erreur suppression liste de diffusion:', err);
    throw err;
  }
}

/**
 * Récupère le nombre de membres d'une liste
 */
async function getMailingListMemberCount(listId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('mailing_list_members')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    logWarn('Erreur calcul nombre membres:', err);
    return 0;
  }
}

/**
 * Récupère les membres d'une liste de diffusion
 */
export async function getMailingListMembers(
  listId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeLeadData?: boolean;
  }
): Promise<MailingListMember[]> {
  try {
    let query = supabase
      .from('mailing_list_members')
      .select(options?.includeLeadData ? '*, leads(*)' : '*')
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((member: any) => ({
      id: member.id,
      listId: member.list_id,
      leadId: member.lead_id,
      addedAt: member.added_at,
      addedBy: member.added_by,
      source: member.source,
      metadata: member.metadata,
    }));
  } catch (err) {
    logError('Erreur récupération membres liste:', err);
    throw err;
  }
}

/**
 * Ajoute un lead à une liste de diffusion
 */
export async function addLeadToMailingList(
  listId: string,
  leadId: string,
  source: 'manual' | 'automatic' | 'import' | 'segment' = 'manual'
): Promise<MailingListMember> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Vérifier si le lead existe
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Vérifier si le lead est déjà dans la liste
    const { data: existing } = await supabase
      .from('mailing_list_members')
      .select('id')
      .eq('list_id', listId)
      .eq('lead_id', leadId)
      .single();

    if (existing) {
      throw new Error('Lead déjà présent dans la liste');
    }

    const { data, error } = await supabase
      .from('mailing_list_members')
      .insert({
        list_id: listId,
        lead_id: leadId,
        added_by: userId,
        source,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      listId: data.list_id,
      leadId: data.lead_id,
      addedAt: data.added_at,
      addedBy: data.added_by,
      source: data.source,
      metadata: data.metadata,
    };
  } catch (err) {
    logError('Erreur ajout lead à liste:', err);
    throw err;
  }
}

/**
 * Ajoute plusieurs leads à une liste de diffusion
 */
export async function addLeadsToMailingList(
  listId: string,
  leadIds: string[],
  source: 'manual' | 'automatic' | 'import' | 'segment' = 'manual'
): Promise<{ added: number; skipped: number; errors: string[] }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Vérifier quels leads sont déjà dans la liste
    const { data: existing } = await supabase
      .from('mailing_list_members')
      .select('lead_id')
      .eq('list_id', listId)
      .in('lead_id', leadIds);

    const existingLeadIds = new Set((existing || []).map((e: any) => e.lead_id));
    const leadsToAdd = leadIds.filter(id => !existingLeadIds.has(id));

    if (leadsToAdd.length === 0) {
      return {
        added: 0,
        skipped: leadIds.length,
        errors: [],
      };
    }

    const members = leadsToAdd.map(leadId => ({
      list_id: listId,
      lead_id: leadId,
      added_by: userId,
      source,
    }));

    const { error } = await supabase
      .from('mailing_list_members')
      .insert(members);

    if (error) throw error;

    return {
      added: leadsToAdd.length,
      skipped: existingLeadIds.size,
      errors: [],
    };
  } catch (err) {
    logError('Erreur ajout multiple leads à liste:', err);
    throw err;
  }
}

/**
 * Retire un lead d'une liste de diffusion
 */
export async function removeLeadFromMailingList(listId: string, leadId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mailing_list_members')
      .delete()
      .eq('list_id', listId)
      .eq('lead_id', leadId);

    if (error) throw error;
  } catch (err) {
    logError('Erreur retrait lead de liste:', err);
    throw err;
  }
}

/**
 * Retire plusieurs leads d'une liste de diffusion
 */
export async function removeLeadsFromMailingList(listId: string, leadIds: string[]): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('mailing_list_members')
      .delete()
      .eq('list_id', listId)
      .in('lead_id', leadIds)
      .select('id');

    if (error) throw error;

    return (data || []).length;
  } catch (err) {
    logError('Erreur retrait multiple leads de liste:', err);
    throw err;
  }
}

/**
 * Synchronise une liste dynamique selon ses critères
 */
export async function syncDynamicMailingList(listId: string): Promise<{
  added: number;
  removed: number;
  total: number;
}> {
  try {
    const list = await getMailingListById(listId);

    if (!list) {
      throw new Error('Liste non trouvée');
    }

    if (list.type === 'manual') {
      throw new Error('Liste manuelle, pas de synchronisation nécessaire');
    }

    if (!list.criteria) {
      throw new Error('Liste dynamique sans critères');
    }

    // Utiliser le service de segments pour calculer les leads correspondants
    const { calculateSegmentMembersFromCriteria } = await import('../supabase/hooks/useEmailSegments');
    const matchingLeads = await calculateSegmentMembersFromCriteria(list.criteria);

    // Récupérer les membres actuels
    const currentMembers = await getMailingListMembers(listId);
    const currentLeadIds = new Set(currentMembers.map(m => m.leadId));

    // Ajouter les nouveaux leads
    const leadsToAdd = matchingLeads.filter(l => !currentLeadIds.has(l.id));
    const addResult = await addLeadsToMailingList(listId, leadsToAdd.map(l => l.id), 'automatic');

    // Retirer les leads qui ne correspondent plus
    const matchingLeadIds = new Set(matchingLeads.map(l => l.id));
    const leadsToRemove = Array.from(currentLeadIds).filter(id => !matchingLeadIds.has(id));
    const removed = await removeLeadsFromMailingList(listId, leadsToRemove);

    return {
      added: addResult.added,
      removed,
      total: matchingLeads.length,
    };
  } catch (err) {
    logError('Erreur synchronisation liste dynamique:', err);
    throw err;
  }
}

/**
 * Récupère les statistiques d'une liste de diffusion
 */
export async function getMailingListStats(listId: string): Promise<MailingListStats> {
  try {
    // Récupérer les membres
    const members = await getMailingListMembers(listId);
    const leadIds = members.map(m => m.leadId);

    if (leadIds.length === 0) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        unsubscribedMembers: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
      };
    }

    // Récupérer les leads pour vérifier les désabonnements
    const { data: leads } = await supabase
      .from('leads')
      .select('id, unsubscribed')
      .in('id', leadIds);

    const unsubscribedCount = (leads || []).filter((l: any) => l.unsubscribed).length;
    const activeMembers = (leads || []).length - unsubscribedCount;

    // Récupérer les statistiques de tracking email pour cette liste
    // (nécessite une table de tracking par liste ou campagne)
    // Pour l'instant, on calcule depuis email_tracking global

    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('opened, clicked, bounced')
      .in('lead_id', leadIds);

    const tracking = emailTracking || [];
    const totalSent = tracking.length;
    const totalOpened = tracking.filter((e: any) => e.opened).length;
    const totalClicked = tracking.filter((e: any) => e.clicked).length;
    const totalBounced = tracking.filter((e: any) => e.bounced).length;

    return {
      totalMembers: members.length,
      activeMembers,
      unsubscribedMembers: unsubscribedCount,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    };
  } catch (err) {
    logError('Erreur calcul statistiques liste:', err);
    throw err;
  }
}

/**
 * Importe une liste de leads depuis un CSV/JSON
 */
export async function importLeadsToMailingList(
  listId: string,
  leads: Array<{ email?: string; phone?: string; company?: string }>,
  matchBy: 'email' | 'phone' | 'company' | 'all' = 'all'
): Promise<{
  added: number;
  notFound: number;
  errors: string[];
}> {
  try {
    let matchedLeadIds: string[] = [];
    const errors: string[] = [];

    for (const leadData of leads) {
      try {
        let query = supabase.from('leads').select('id');

        if (matchBy === 'email' && leadData.email) {
          query = query.eq('email', leadData.email);
        } else if (matchBy === 'phone' && leadData.phone) {
          query = query.eq('phone', leadData.phone);
        } else if (matchBy === 'company' && leadData.company) {
          query = query.ilike('company', `%${leadData.company}%`);
        } else {
          // Match par tous les critères disponibles
          if (leadData.email) {
            query = query.or(`email.eq.${leadData.email}`);
          }
          if (leadData.phone) {
            query = query.or(`phone.eq.${leadData.phone}`);
          }
          if (leadData.company) {
            query = query.or(`company.ilike.%${leadData.company}%`);
          }
        }

        const { data: matches, error } = await query.limit(1);

        if (error) {
          errors.push(`Erreur recherche lead: ${leadData.email || leadData.phone || leadData.company}`);
          continue;
        }

        if (matches && matches.length > 0) {
          matchedLeadIds.push(matches[0].id);
        } else {
          errors.push(`Lead non trouvé: ${leadData.email || leadData.phone || leadData.company}`);
        }
      } catch (err: any) {
        errors.push(`Erreur traitement lead: ${err.message}`);
      }
    }

    // Ajouter les leads trouvés
    const addResult = await addLeadsToMailingList(listId, matchedLeadIds, 'import');

    return {
      added: addResult.added,
      notFound: errors.length,
      errors: errors.slice(0, 10), // Limiter à 10 erreurs
    };
  } catch (err) {
    logError('Erreur import leads dans liste:', err);
    throw err;
  }
}

