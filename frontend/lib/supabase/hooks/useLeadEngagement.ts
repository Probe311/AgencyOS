import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export type EngagementType = 'email_open' | 'email_click' | 'site_visit' | 'download' | 'form_submit' | 'call' | 'meeting';

export interface LeadEngagement {
  id: string;
  leadId: string;
  engagementType: EngagementType;
  engagementDate: string;
  engagementData?: Record<string, any>;
  createdAt: string;
}

export const useLeadEngagement = (leadId?: string) => {
  const [engagements, setEngagements] = useState<LeadEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (leadId) {
      loadEngagements(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadEngagements = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_engagement')
        .select('*')
        .eq('lead_id', id)
        .order('engagement_date', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const formatted: LeadEngagement[] = (data || []).map((e: any) => ({
        id: e.id,
        leadId: e.lead_id,
        engagementType: e.engagement_type,
        engagementDate: e.engagement_date,
        engagementData: e.engagement_data || {},
        createdAt: e.created_at,
      }));

      setEngagements(formatted);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading engagements:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordEngagement = async (
    leadId: string,
    type: EngagementType,
    data?: Record<string, any>
  ): Promise<LeadEngagement> => {
    try {
      const { data: engagement, error: insertError } = await supabase
        .from('lead_engagement')
        .insert({
          lead_id: leadId,
          engagement_type: type,
          engagement_data: data || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newEngagement: LeadEngagement = {
        id: engagement.id,
        leadId: engagement.lead_id,
        engagementType: engagement.engagement_type,
        engagementDate: engagement.engagement_date,
        engagementData: engagement.engagement_data,
        createdAt: engagement.created_at,
      };

      setEngagements([newEngagement, ...engagements]);

      // Mettre à jour last_activity_date du lead
      await supabase
        .from('leads')
        .update({ last_activity_date: new Date().toISOString() })
        .eq('id', leadId);

      return newEngagement;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const getEngagementCount = (type?: EngagementType): number => {
    if (type) {
      return engagements.filter(e => e.engagementType === type).length;
    }
    return engagements.length;
  };

  const getRecentEngagements = (days: number = 30): LeadEngagement[] => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return engagements.filter(e => new Date(e.engagementDate) >= cutoff);
  };

  return {
    engagements,
    loading,
    error,
    loadEngagements,
    recordEngagement,
    getEngagementCount,
    getRecentEngagements,
  };
};

