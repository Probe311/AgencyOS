import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { logError } from '../../utils/logger';

export type ActivityType = 
  | 'email_sent' | 'email_received' | 'email_opened' | 'email_clicked'
  | 'call_made' | 'call_received' | 'call_missed'
  | 'meeting_scheduled' | 'meeting_completed' | 'meeting_cancelled'
  | 'note_added' | 'task_created' | 'task_completed'
  | 'stage_changed' | 'status_changed' | 'value_updated'
  | 'document_sent' | 'document_viewed' | 'document_signed'
  | 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_rejected'
  | 'invoice_sent' | 'invoice_paid'
  | 'contact_created' | 'contact_updated'
  | 'enrichment_updated' | 'score_updated'
  | 'custom';

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id?: string | null;
  activity_type: ActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadActivities(leadId?: string) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!leadId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      logError('Erreur chargement activités:', error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchActivities();

    // Abonnement temps réel
    if (leadId) {
      const channel = supabase
        .channel(`lead-activities-${leadId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lead_activities',
            filter: `lead_id=eq.${leadId}`,
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [leadId, fetchActivities]);

  const createActivity = useCallback(async (
    leadId: string,
    activityType: ActivityType,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    relatedEntityType?: string,
    relatedEntityId?: string,
    userId?: string
  ) => {
    try {
      // Récupérer l'utilisateur actuel depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          user_id: userId || user?.id || null,
          activity_type: activityType,
          title,
          description,
          metadata: metadata || {},
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchActivities();
      return data;
    } catch (error) {
      logError('Erreur création activité:', error);
      throw error;
    }
  }, [fetchActivities]);

  const deleteActivity = useCallback(async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      await fetchActivities();
    } catch (error) {
      logError('Erreur suppression activité:', error);
      throw error;
    }
  }, [fetchActivities]);

  return {
    activities,
    loading,
    createActivity,
    deleteActivity,
    refresh: fetchActivities,
  };
}

