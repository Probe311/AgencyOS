import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useDataTriggers } from './useDataTriggers';

export type DuplicateStatus = 'detected' | 'confirmed' | 'merged' | 'ignored' | 'false_positive';

export interface LeadDuplicate {
  id: string;
  leadId: string;
  duplicateLeadId: string;
  similarityScore: number;
  matchCriteria: Record<string, any>;
  status: DuplicateStatus;
  mergedInto?: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const useLeadDuplicates = () => {
  const { recordDataChange } = useDataTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectDuplicates = async (leadId: string): Promise<LeadDuplicate[]> => {
    try {
      setLoading(true);

      // Récupérer le lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) throw new Error('Lead non trouvé');

      // Rechercher les doublons potentiels
      const duplicates: LeadDuplicate[] = [];

      // Recherche par email
      if (lead.email) {
        const { data: emailMatches } = await supabase
          .from('leads')
          .select('*')
          .eq('email', lead.email)
          .neq('id', leadId);

        if (emailMatches) {
          for (const match of emailMatches) {
            const similarity = calculateSimilarity(lead, match);
            if (similarity >= 70) {
              duplicates.push({
                id: '', // Sera rempli lors de l'insertion
                leadId: lead.id,
                duplicateLeadId: match.id,
                similarityScore: similarity,
                matchCriteria: { email: true },
                status: 'detected',
                detectedAt: new Date().toISOString(),
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      // Recherche par nom/company
      if (lead.name || lead.company) {
        const searchTerms = [lead.name, lead.company].filter(Boolean);
        for (const term of searchTerms) {
          if (!term) continue;

          const { data: nameMatches } = await supabase
            .from('leads')
            .select('*')
            .or(`name.ilike.%${term}%,company.ilike.%${term}%`)
            .neq('id', leadId);

          if (nameMatches) {
            for (const match of nameMatches) {
              // Vérifier si déjà détecté
              if (duplicates.some(d => d.duplicateLeadId === match.id)) {
                continue;
              }

              const similarity = calculateSimilarity(lead, match);
              if (similarity >= 70) {
                duplicates.push({
                  id: '',
                  leadId: lead.id,
                  duplicateLeadId: match.id,
                  similarityScore: similarity,
                  matchCriteria: { name: true, company: true },
                  status: 'detected',
                  detectedAt: new Date().toISOString(),
                  metadata: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      // Enregistrer les doublons détectés
      const savedDuplicates: LeadDuplicate[] = [];
      for (const duplicate of duplicates) {
        // Vérifier si le doublon existe déjà
        const { data: existing } = await supabase
          .from('lead_duplicates')
          .select('*')
          .eq('lead_id', duplicate.leadId)
          .eq('duplicate_lead_id', duplicate.duplicateLeadId)
          .single();

        if (!existing) {
          const { data, error: insertError } = await supabase
            .from('lead_duplicates')
            .insert({
              lead_id: duplicate.leadId,
              duplicate_lead_id: duplicate.duplicateLeadId,
              similarity_score: duplicate.similarityScore,
              match_criteria: duplicate.matchCriteria,
              status: 'detected',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error saving duplicate:', insertError);
            continue;
          }

          const saved: LeadDuplicate = {
            id: data.id,
            leadId: data.lead_id,
            duplicateLeadId: data.duplicate_lead_id,
            similarityScore: data.similarity_score,
            matchCriteria: data.match_criteria,
            status: data.status,
            mergedInto: data.merged_into,
            detectedAt: data.detected_at,
            resolvedAt: data.resolved_at,
            resolvedBy: data.resolved_by,
            metadata: data.metadata || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };

          savedDuplicates.push(saved);

          // Enregistrer le changement
          await recordDataChange(
            leadId,
            'duplicate_detected',
            'duplicate',
            null,
            duplicate.duplicateLeadId,
            {
              duplicateLeadId: duplicate.duplicateLeadId,
              similarityScore: duplicate.similarityScore,
              matchCriteria: duplicate.matchCriteria,
            }
          );
        }
      }

      setError(null);
      return savedDuplicates;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarity = (lead1: any, lead2: any): number => {
    let score = 0;
    let factors = 0;

    // Email (poids fort)
    if (lead1.email && lead2.email && lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
      score += 50;
      factors++;
    }

    // Nom (poids moyen)
    if (lead1.name && lead2.name) {
      const similarity = stringSimilarity(lead1.name.toLowerCase(), lead2.name.toLowerCase());
      score += similarity * 20;
      factors++;
    }

    // Company (poids moyen)
    if (lead1.company && lead2.company) {
      const similarity = stringSimilarity(lead1.company.toLowerCase(), lead2.company.toLowerCase());
      score += similarity * 20;
      factors++;
    }

    // Téléphone (poids fort)
    if (lead1.phone && lead2.phone && lead1.phone === lead2.phone) {
      score += 10;
      factors++;
    }

    return factors > 0 ? Math.min(score, 100) : 0;
  };

  const stringSimilarity = (str1: string, str2: string): number => {
    // Algorithme de similarité simple (Levenshtein simplifié)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const mergeDuplicates = async (
    duplicateId: string,
    keepLeadId: string,
    mergeLeadId: string
  ): Promise<void> => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // TODO: Implémenter la logique de fusion complète
      // - Fusionner les données
      // - Fusionner les activités
      // - Fusionner les documents
      // - Archiver le lead fusionné

      // Marquer le doublon comme fusionné
      await supabase
        .from('lead_duplicates')
        .update({
          status: 'merged',
          merged_into: keepLeadId,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        })
        .eq('id', duplicateId);

      // Enregistrer le changement
      await recordDataChange(
        keepLeadId,
        'merge',
        'merge',
        null,
        mergeLeadId,
        {
          duplicateId,
          mergedLeadId: mergeLeadId,
        }
      );

      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    detectDuplicates,
    mergeDuplicates,
  };
};

