import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';

export interface LeadDormantDetection {
  id: string;
  leadId: string;
  detectionDate: string;
  daysInactive: number;
  lastActivityDate?: string;
  lastEmailOpenDate?: string;
  lastSiteVisitDate?: string;
  scoringDrop?: number;
  dormantCategory?: 'recent' | 'old' | 'very_old';
  actionsTaken: string[];
  reactivated: boolean;
  reactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadDormantDetection = () => {
  const [dormantLeads, setDormantLeads] = useState<LeadDormantDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectDormantLeads = async (inactiveDaysThreshold: number = 30) => {
    try {
      setIsDetecting(true);
      setError(null);

      // Récupérer tous les leads actifs (pas Perdu, pas Inactif)
      const { data: activeLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, last_activity_date, lifecycle_stage')
        .not('lifecycle_stage', 'eq', 'Perdu')
        .not('lifecycle_stage', 'eq', 'Inactif');

      if (leadsError) throw leadsError;

      const now = new Date();
      const thresholdDate = new Date(now.getTime() - inactiveDaysThreshold * 24 * 60 * 60 * 1000);

      const dormantDetections: LeadDormantDetection[] = [];

      for (const lead of activeLeads || []) {
        const lastActivity = lead.last_activity_date ? new Date(lead.last_activity_date) : null;
        
        if (!lastActivity || lastActivity < thresholdDate) {
          const daysInactive = lastActivity
            ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
            : inactiveDaysThreshold;

          // Déterminer la catégorie
          let category: 'recent' | 'old' | 'very_old' = 'recent';
          if (daysInactive >= 90) {
            category = 'very_old';
          } else if (daysInactive >= 60) {
            category = 'old';
          }

          // Récupérer les dernières activités
          const { data: lastEmail } = await supabase
            .from('email_sends')
            .select('sent_at, opened_at')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          // Créer ou mettre à jour la détection
          const { data: existing } = await supabase
            .from('lead_dormant_detection')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('reactivated', false)
            .single();

          const detectionData = {
            lead_id: lead.id,
            detection_date: now.toISOString(),
            days_inactive: daysInactive,
            last_activity_date: lastActivity?.toISOString(),
            last_email_open_date: lastEmail?.opened_at,
            dormant_category: category,
            reactivated: false,
          };

          let result;
          if (existing) {
            const { data, error: updateError } = await supabase
              .from('lead_dormant_detection')
              .update(detectionData)
              .eq('id', existing.id)
              .select()
              .single();

            if (updateError) throw updateError;
            result = data;
          } else {
            const { data, error: insertError } = await supabase
              .from('lead_dormant_detection')
              .insert(detectionData)
              .select()
              .single();

            if (insertError) throw insertError;
            result = data;
          }

          const detection: LeadDormantDetection = {
            id: result.id,
            leadId: result.lead_id,
            detectionDate: result.detection_date,
            daysInactive: result.days_inactive,
            lastActivityDate: result.last_activity_date,
            lastEmailOpenDate: result.last_email_open_date,
            lastSiteVisitDate: result.last_site_visit_date,
            scoringDrop: result.scoring_drop,
            dormantCategory: result.dormant_category,
            actionsTaken: result.actions_taken || [],
            reactivated: result.reactivated,
            reactivatedAt: result.reactivated_at,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
          };

          dormantDetections.push(detection);

          // Actions automatiques
          await applyDormantActions(lead.id, category, daysInactive);
        }
      }

      setDormantLeads(dormantDetections);
      return dormantDetections;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsDetecting(false);
    }
  };

  const applyDormantActions = async (leadId: string, category: string, daysInactive: number) => {
    try {
      // Ajouter le tag "Dormant"
      const { data: lead } = await supabase
        .from('leads')
        .select('tags')
        .eq('id', leadId)
        .single();

      const currentTags = lead?.tags || [];
      if (!currentTags.includes('Dormant')) {
        await supabase
          .from('leads')
          .update({ tags: [...currentTags, 'Dormant'] })
          .eq('id', leadId);
      }

      // Si très dormant (> 90 jours), passer en Inactif
      if (daysInactive >= 90) {
        await supabase
          .from('leads')
          .update({ lifecycle_stage: 'Inactif' })
          .eq('id', leadId);
      }

      // Notification commercial (à implémenter avec le système de notifications)
      // TODO: Créer une notification pour le commercial assigné
    } catch (err) {
      console.error('Error applying dormant actions:', err);
    }
  };

  const reactivateLead = async (leadId: string) => {
    try {
      const { data, error: updateError } = await supabase
        .from('lead_dormant_detection')
        .update({
          reactivated: true,
          reactivated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId)
        .eq('reactivated', false)
        .select()
        .single();

      if (updateError) throw updateError;

      // Retirer le tag "Dormant"
      const { data: lead } = await supabase
        .from('leads')
        .select('tags')
        .eq('id', leadId)
        .single();

      const currentTags = lead?.tags || [];
      const updatedTags = currentTags.filter((tag: string) => tag !== 'Dormant');

      await supabase
        .from('leads')
        .update({ tags: updatedTags })
        .eq('id', leadId);

      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const loadDormantLeads = async (category?: 'recent' | 'old' | 'very_old') => {
    try {
      setLoading(true);
      let query = supabase
        .from('lead_dormant_detection')
        .select('*')
        .eq('reactivated', false)
        .order('days_inactive', { ascending: false });

      if (category) {
        query = query.eq('dormant_category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formatted: LeadDormantDetection[] = (data || []).map((d: any) => ({
        id: d.id,
        leadId: d.lead_id,
        detectionDate: d.detection_date,
        daysInactive: d.days_inactive,
        lastActivityDate: d.last_activity_date,
        lastEmailOpenDate: d.last_email_open_date,
        lastSiteVisitDate: d.last_site_visit_date,
        scoringDrop: d.scoring_drop,
        dormantCategory: d.dormant_category,
        actionsTaken: d.actions_taken || [],
        reactivated: d.reactivated,
        reactivatedAt: d.reactivated_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      setDormantLeads(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading dormant leads:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    dormantLeads,
    loading,
    error,
    isDetecting,
    detectDormantLeads,
    reactivateLead,
    loadDormantLeads,
  };
};

