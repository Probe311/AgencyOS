/**
 * Service pour les actions automatisées sur les données des leads
 * Permet de mettre à jour statut, scoring, température, tags, etc.
 */

import { supabase } from '../supabase';
import { Lead, LifecycleStage, LeadTemperature } from '../../types';
import { logError, logInfo } from '../utils/logger';

export interface UpdateStatusParams {
  leadId: string;
  newStatus?: string; // Statut pipeline (Nouveau, Découverte, etc.)
  newLifecycleStage?: LifecycleStage; // Étape cycle de vie (Lead, MQL, SQL, etc.)
  reason?: string; // Raison du changement
  notifyTeam?: boolean; // Notifier l'équipe
}

export interface UpdateScoringParams {
  leadId: string;
  change: number; // Modification du score (+5, -10, etc.)
  reason?: string; // Raison de la modification
  notifyIfSignificant?: boolean; // Notifier si changement significatif (>= 10 points)
}

export interface UpdateTemperatureParams {
  leadId: string;
  newTemperature: LeadTemperature;
  reason?: string; // Raison du changement
}

export interface UpdateTagsParams {
  leadId: string;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
  reason?: string; // Raison de la modification
}

export interface UpdateCustomFieldParams {
  leadId: string;
  fieldName: string;
  fieldValue: any;
  reason?: string; // Raison de la modification
}

/**
 * Met à jour le statut (pipeline) et/ou l'étape du cycle de vie d'un lead
 */
export async function updateLeadStatus(params: UpdateStatusParams): Promise<void> {
  try {
    const updates: any = {};
    
    if (params.newStatus) {
      updates.status = params.newStatus;
    }
    
    if (params.newLifecycleStage) {
      updates.lifecycle_stage = params.newLifecycleStage;
    }

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', params.leadId);

    if (error) throw error;

    // Enregistrer dans l'historique (sales_activities)
    await recordActivity({
      leadId: params.leadId,
      activityType: 'status_change',
      description: `Statut mis à jour: ${params.newStatus || 'N/A'} / Cycle de vie: ${params.newLifecycleStage || 'N/A'}`,
      metadata: {
        oldStatus: undefined, // Pourrait être récupéré depuis le lead actuel
        newStatus: params.newStatus,
        oldLifecycleStage: undefined,
        newLifecycleStage: params.newLifecycleStage,
        reason: params.reason,
      },
    });

    // Notification si demandé
    if (params.notifyTeam) {
      // TODO: Implémenter notification équipe
      logInfo(`Notification équipe pour changement statut lead ${params.leadId}`);
    }

    logInfo(`Statut mis à jour pour lead ${params.leadId}`);
  } catch (error) {
    logError('Erreur mise à jour statut lead:', error);
    throw error;
  }
}

/**
 * Modifie le scoring d'un lead
 */
export async function updateLeadScoring(params: UpdateScoringParams): Promise<number> {
  try {
    // Récupérer le lead actuel - utiliser quality_score si scoring n'existe pas
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', params.leadId)
      .single();

    if (fetchError) throw fetchError;

    // Utiliser scoring ou quality_score selon ce qui est disponible
    const currentScoring = (leadData as any)?.scoring || (leadData as any)?.quality_score || 50;
    const newScoring = Math.max(0, Math.min(100, currentScoring + params.change));
    
    // Mettre à jour scoring ou quality_score selon ce qui existe
    const updateField = (leadData as any)?.scoring !== undefined ? 'scoring' : 'quality_score';
    
    const updates: any = {};
    updates[updateField] = newScoring;
    
    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', params.leadId);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    await recordActivity({
      leadId: params.leadId,
      activityType: 'score_change',
      description: `Scoring modifié: ${currentScoring} → ${newScoring} (${params.change > 0 ? '+' : ''}${params.change} points)`,
      metadata: {
        oldScoring: currentScoring,
        newScoring: newScoring,
        change: params.change,
        reason: params.reason,
      },
    });

    // Notification si changement significatif
    if (params.notifyIfSignificant && Math.abs(params.change) >= 10) {
      // TODO: Implémenter notification
      logInfo(`Notification pour changement significatif scoring lead ${params.leadId}`);
    }

    logInfo(`Scoring mis à jour pour lead ${params.leadId}: ${currentScoring} → ${newScoring}`);
    return newScoring;
  } catch (error) {
    logError('Erreur mise à jour scoring lead:', error);
    throw error;
  }
}

/**
 * Change la température d'un lead
 */
export async function updateLeadTemperature(params: UpdateTemperatureParams): Promise<void> {
  try {
    // Récupérer le lead actuel pour connaître l'ancienne température
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('temperature')
      .eq('id', params.leadId)
      .single();

    if (fetchError) throw fetchError;

    const oldTemperature = leadData?.temperature;

    const { error: updateError } = await supabase
      .from('leads')
      .update({ temperature: params.newTemperature })
      .eq('id', params.leadId);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    await recordActivity({
      leadId: params.leadId,
      activityType: 'temperature_change',
      description: `Température changée: ${oldTemperature || 'N/A'} → ${params.newTemperature}`,
      metadata: {
        oldTemperature: oldTemperature,
        newTemperature: params.newTemperature,
        reason: params.reason,
      },
    });

    // TODO: Déclencher changement séquence nurturing si nécessaire

    logInfo(`Température mise à jour pour lead ${params.leadId}: ${oldTemperature} → ${params.newTemperature}`);
  } catch (error) {
    logError('Erreur mise à jour température lead:', error);
    throw error;
  }
}

/**
 * Ajoute ou supprime des tags d'un lead
 */
export async function updateLeadTags(params: UpdateTagsParams): Promise<string[]> {
  try {
    // Récupérer les tags actuels
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('tags')
      .eq('id', params.leadId)
      .single();

    if (fetchError) throw fetchError;

    const currentTags = (leadData?.tags as string[]) || [];
    let newTags = [...currentTags];

    // Ajouter les nouveaux tags
    if (params.tagsToAdd && params.tagsToAdd.length > 0) {
      params.tagsToAdd.forEach(tag => {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
    }

    // Supprimer les tags
    if (params.tagsToRemove && params.tagsToRemove.length > 0) {
      newTags = newTags.filter(tag => !params.tagsToRemove!.includes(tag));
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update({ tags: newTags })
      .eq('id', params.leadId);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    const addedTags = params.tagsToAdd?.filter(tag => !currentTags.includes(tag)) || [];
    const removedTags = params.tagsToRemove?.filter(tag => currentTags.includes(tag)) || [];

    if (addedTags.length > 0 || removedTags.length > 0) {
      await recordActivity({
        leadId: params.leadId,
        activityType: 'tag_change',
        description: `Tags modifiés${addedTags.length > 0 ? `: +${addedTags.join(', ')}` : ''}${removedTags.length > 0 ? `: -${removedTags.join(', ')}` : ''}`,
        metadata: {
          oldTags: currentTags,
          newTags: newTags,
          addedTags: addedTags,
          removedTags: removedTags,
          reason: params.reason,
        },
      });
    }

    // TODO: Déclencher workflows selon tags

    logInfo(`Tags mis à jour pour lead ${params.leadId}`);
    return newTags;
  } catch (error) {
    logError('Erreur mise à jour tags lead:', error);
    throw error;
  }
}

/**
 * Met à jour un champ personnalisé d'un lead
 */
export async function updateLeadCustomField(params: UpdateCustomFieldParams): Promise<void> {
  try {
    // Récupérer la valeur actuelle
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select(params.fieldName)
      .eq('id', params.leadId)
      .single();

    if (fetchError) throw fetchError;

    const oldValue = (leadData as any)?.[params.fieldName];

    // Mettre à jour le champ
    const updates: any = {};
    updates[params.fieldName] = params.fieldValue;

    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', params.leadId);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    await recordActivity({
      leadId: params.leadId,
      activityType: 'field_change',
      description: `Champ "${params.fieldName}" modifié: ${oldValue || 'N/A'} → ${params.fieldValue}`,
      metadata: {
        fieldName: params.fieldName,
        oldValue: oldValue,
        newValue: params.fieldValue,
        reason: params.reason,
      },
    });

    // TODO: Recalculer scoring si le champ impacte le scoring

    logInfo(`Champ personnalisé "${params.fieldName}" mis à jour pour lead ${params.leadId}`);
  } catch (error) {
    logError('Erreur mise à jour champ personnalisé lead:', error);
    throw error;
  }
}

/**
 * Enregistre une activité dans sales_activities pour la timeline
 */
async function recordActivity(params: {
  leadId: string;
  activityType: string;
  description: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // Récupérer l'utilisateur actuel si disponible
    const { data: { user } } = await supabase.auth.getUser();
    
    const activityData: any = {
      lead_id: params.leadId,
      activity_type: params.activityType,
      description: params.description,
      activity_date: new Date().toISOString(),
    };

    // Ajouter l'utilisateur si disponible
    if (user) {
      activityData.user_id = user.id;
    }

    // Ajouter les métadonnées si disponibles (stockées dans description ou champ séparé si existant)
    if (params.metadata) {
      // Stocker les métadonnées dans description ou créer un champ metadata si la table le supporte
      activityData.description = `${params.description}\n\nMétadonnées: ${JSON.stringify(params.metadata)}`;
    }

    const { error } = await supabase
      .from('sales_activities')
      .insert(activityData);

    if (error) {
      logError('Erreur enregistrement activité:', error);
      // Ne pas faire échouer l'action principale si l'enregistrement d'activité échoue
    }
  } catch (error) {
    logError('Erreur enregistrement activité:', error);
    // Ne pas faire échouer l'action principale si l'enregistrement d'activité échoue
  }
}

/**
 * Vérifie et applique les règles de transition pour changer le lifecycle stage
 */
export async function evaluateLifecycleTransition(
  leadId: string,
  currentStage: LifecycleStage,
  newData?: Partial<Lead>
): Promise<LifecycleStage | null> {
  try {
    // Récupérer le lead complet
    const { data: leadData, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError) throw fetchError;

    const lead = { ...leadData, ...newData } as any;
    const scoring = lead.scoring || 50;
    const temperature = lead.temperature;

    // Règles de transition basiques basées sur le scoring
    if (scoring >= 90 && currentStage !== 'Opportunité' && currentStage !== 'Client') {
      return 'Opportunité';
    }
    if (scoring >= 75 && currentStage === 'Lead' || currentStage === 'MQL') {
      return 'SQL';
    }
    if (scoring >= 60 && currentStage === 'Lead') {
      return 'MQL';
    }
    if (scoring < 40 && currentStage !== 'Inactif' && currentStage !== 'Perdu') {
      // Pas de transition automatique vers Inactif, seulement suggestion
      return null;
    }

    return null; // Pas de transition nécessaire
  } catch (error) {
    logError('Erreur évaluation transition cycle de vie:', error);
    return null;
  }
}

/**
 * Met à jour plusieurs champs d'un lead en une seule fois
 */
export async function bulkUpdateLead(
  leadId: string,
  updates: {
    status?: string;
    lifecycleStage?: LifecycleStage;
    scoring?: number;
    scoringChange?: number;
    temperature?: LeadTemperature;
    tags?: string[];
    tagsToAdd?: string[];
    tagsToRemove?: string[];
    customFields?: Record<string, any>;
    reason?: string;
  }
): Promise<void> {
  try {
    const dbUpdates: any = {};

    // Récupérer le lead actuel
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError) throw fetchError;

    // Préparer les mises à jour
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lifecycleStage !== undefined) dbUpdates.lifecycle_stage = updates.lifecycleStage;
    if (updates.temperature !== undefined) dbUpdates.temperature = updates.temperature;

    // Gestion du scoring
    if (updates.scoring !== undefined) {
      dbUpdates.scoring = updates.scoring;
    } else if (updates.scoringChange !== undefined) {
      const currentScoring = currentLead?.scoring || 50;
      dbUpdates.scoring = Math.max(0, Math.min(100, currentScoring + updates.scoringChange));
    }

    // Gestion des tags
    if (updates.tags !== undefined) {
      dbUpdates.tags = updates.tags;
    } else if (updates.tagsToAdd || updates.tagsToRemove) {
      const currentTags = (currentLead?.tags as string[]) || [];
      let newTags = [...currentTags];

      if (updates.tagsToAdd) {
        updates.tagsToAdd.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
      }

      if (updates.tagsToRemove) {
        newTags = newTags.filter(tag => !updates.tagsToRemove!.includes(tag));
      }

      dbUpdates.tags = newTags;
    }

    // Champs personnalisés
    if (updates.customFields) {
      Object.entries(updates.customFields).forEach(([key, value]) => {
        dbUpdates[key] = value;
      });
    }

    // Appliquer les mises à jour
    const { error: updateError } = await supabase
      .from('leads')
      .update(dbUpdates)
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Enregistrer dans l'historique
    const changes: string[] = [];
    if (updates.status && updates.status !== currentLead?.status) {
      changes.push(`Statut: ${currentLead?.status} → ${updates.status}`);
    }
    if (updates.lifecycleStage && updates.lifecycleStage !== currentLead?.lifecycle_stage) {
      changes.push(`Cycle de vie: ${currentLead?.lifecycle_stage || 'N/A'} → ${updates.lifecycleStage}`);
    }
    if (updates.scoringChange) {
      const oldScoring = currentLead?.scoring || 50;
      const newScoring = dbUpdates.scoring;
      changes.push(`Scoring: ${oldScoring} → ${newScoring} (${updates.scoringChange > 0 ? '+' : ''}${updates.scoringChange})`);
    }
    if (updates.temperature && updates.temperature !== currentLead?.temperature) {
      changes.push(`Température: ${currentLead?.temperature || 'N/A'} → ${updates.temperature}`);
    }
    if (updates.tagsToAdd && updates.tagsToAdd.length > 0) {
      changes.push(`Tags ajoutés: ${updates.tagsToAdd.join(', ')}`);
    }
    if (updates.tagsToRemove && updates.tagsToRemove.length > 0) {
      changes.push(`Tags supprimés: ${updates.tagsToRemove.join(', ')}`);
    }

    if (changes.length > 0) {
      await recordActivity({
        leadId: leadId,
        activityType: 'bulk_update',
        description: `Mise à jour multiple: ${changes.join('; ')}`,
        metadata: {
          changes: changes,
          reason: updates.reason,
          oldData: currentLead,
          newData: dbUpdates,
        },
      });
    }

    logInfo(`Mise à jour multiple effectuée pour lead ${leadId}`);
  } catch (error) {
    logError('Erreur mise à jour multiple lead:', error);
    throw error;
  }
}

