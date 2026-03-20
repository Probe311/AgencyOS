import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useBehaviorTriggers } from './useBehaviorTriggers';

export interface WebsiteVisit {
  id: string;
  leadId: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  durationSeconds: number;
  visitStartedAt: string;
  visitEndedAt?: string;
  userAgent?: string;
  ipAddress?: string;
  location: Record<string, any>;
  deviceType?: string;
  browser?: string;
  sessionId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useWebsiteTracking = () => {
  const { recordBehaviorEvent } = useBehaviorTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackPageVisit = async (
    leadId: string,
    pageData: {
      pageUrl: string;
      pageTitle?: string;
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
      location?: Record<string, any>;
      deviceType?: string;
      browser?: string;
      sessionId?: string;
    }
  ): Promise<WebsiteVisit> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('website_visits')
        .insert({
          lead_id: leadId,
          page_url: pageData.pageUrl,
          page_title: pageData.pageTitle,
          referrer: pageData.referrer,
          visit_started_at: new Date().toISOString(),
          user_agent: pageData.userAgent,
          ip_address: pageData.ipAddress,
          location: pageData.location || {},
          device_type: pageData.deviceType,
          browser: pageData.browser,
          session_id: pageData.sessionId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const visit: WebsiteVisit = {
        id: data.id,
        leadId: data.lead_id,
        pageUrl: data.page_url,
        pageTitle: data.page_title,
        referrer: data.referrer,
        durationSeconds: data.duration_seconds || 0,
        visitStartedAt: data.visit_started_at,
        visitEndedAt: data.visit_ended_at,
        userAgent: data.user_agent,
        ipAddress: data.ip_address,
        location: data.location || {},
        deviceType: data.device_type,
        browser: data.browser,
        sessionId: data.session_id,
        metadata: data.metadata || {},
        createdAt: data.created_at,
      };

      // Enregistrer l'événement comportemental
      await recordBehaviorEvent(leadId, 'website_visit', {
        data: {
          pageUrl: pageData.pageUrl,
          pageTitle: pageData.pageTitle,
        },
        source: 'website',
        sourceId: data.id,
      });

      setError(null);
      return visit;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateVisitDuration = async (visitId: string, durationSeconds: number) => {
    try {
      await supabase
        .from('website_visits')
        .update({
          duration_seconds: durationSeconds,
          visit_ended_at: new Date().toISOString(),
        })
        .eq('id', visitId);

      // Récupérer la visite pour enregistrer l'événement avec durée
      const { data: visit } = await supabase
        .from('website_visits')
        .select('*')
        .eq('id', visitId)
        .single();

      if (visit) {
        await recordBehaviorEvent(visit.lead_id, 'website_visit', {
          subtype: 'visit_completed',
          data: {
            pageUrl: visit.page_url,
            durationSeconds,
          },
          source: 'website',
          sourceId: visitId,
        });
      }
    } catch (err) {
      console.error('Error updating visit duration:', err);
    }
  };

  return {
    loading,
    error,
    trackPageVisit,
    updateVisitDuration,
  };
};

