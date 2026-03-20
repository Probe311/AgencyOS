import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useBehaviorTriggers } from './useBehaviorTriggers';

export type EmailType = 'campaign' | 'sequence' | 'manual' | 'automated';

export interface EmailTracking {
  id: string;
  emailId?: string;
  leadId: string;
  emailType: EmailType;
  subject?: string;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  openCount: number;
  clickedLinks: Array<{ url: string; clickedAt: string; count: number }>;
  totalClicks: number;
  isOpened: boolean;
  isClicked: boolean;
  userAgent?: string;
  ipAddress?: string;
  location: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const useEmailTracking = () => {
  const { recordBehaviorEvent } = useBehaviorTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackEmailOpen = async (
    emailId: string,
    leadId: string,
    emailType: EmailType,
    trackingData?: {
      userAgent?: string;
      ipAddress?: string;
      location?: Record<string, any>;
    }
  ): Promise<EmailTracking> => {
    try {
      setLoading(true);

      // Récupérer ou créer le tracking
      const { data: existing } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('email_id', emailId)
        .eq('lead_id', leadId)
        .single();

      let tracking: EmailTracking;

      if (existing) {
        // Mise à jour
        const isFirstOpen = !existing.first_opened_at;
        const openCount = (existing.open_count || 0) + 1;

        const { data, error: updateError } = await supabase
          .from('email_tracking')
          .update({
            first_opened_at: existing.first_opened_at || new Date().toISOString(),
            last_opened_at: new Date().toISOString(),
            open_count: openCount,
            is_opened: true,
            user_agent: trackingData?.userAgent,
            ip_address: trackingData?.ipAddress,
            location: trackingData?.location || {},
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        tracking = mapToEmailTracking(data);

        // Enregistrer l'événement comportemental
        await recordBehaviorEvent(leadId, 'email_open', {
          subtype: isFirstOpen ? 'first_open' : openCount >= 3 ? 'multiple_opens' : 'open',
          data: {
            emailId,
            openCount,
            isFirstOpen,
          },
          source: 'email',
          sourceId: emailId,
        });
      } else {
        // Création
        const { data, error: insertError } = await supabase
          .from('email_tracking')
          .insert({
            email_id: emailId,
            lead_id: leadId,
            email_type: emailType,
            first_opened_at: new Date().toISOString(),
            last_opened_at: new Date().toISOString(),
            open_count: 1,
            is_opened: true,
            user_agent: trackingData?.userAgent,
            ip_address: trackingData?.ipAddress,
            location: trackingData?.location || {},
          })
          .select()
          .single();

        if (insertError) throw insertError;

        tracking = mapToEmailTracking(data);

        // Enregistrer l'événement comportemental
        await recordBehaviorEvent(leadId, 'email_open', {
          subtype: 'first_open',
          data: {
            emailId,
            openCount: 1,
            isFirstOpen: true,
          },
          source: 'email',
          sourceId: emailId,
        });
      }

      setError(null);
      return tracking;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const trackEmailClick = async (
    emailId: string,
    leadId: string,
    linkUrl: string,
    trackingData?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<EmailTracking> => {
    try {
      setLoading(true);

      // Récupérer ou créer le tracking
      const { data: existing } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('email_id', emailId)
        .eq('lead_id', leadId)
        .single();

      let clickedLinks = existing?.clicked_links || [];
      const existingLink = clickedLinks.find((link: any) => link.url === linkUrl);

      if (existingLink) {
        existingLink.count = (existingLink.count || 1) + 1;
        existingLink.clicked_at = new Date().toISOString();
      } else {
        clickedLinks.push({
          url: linkUrl,
          clicked_at: new Date().toISOString(),
          count: 1,
        });
      }

      const totalClicks = clickedLinks.reduce((sum: number, link: any) => sum + (link.count || 1), 0);

      let tracking: EmailTracking;

      if (existing) {
        // Mise à jour
        const { data, error: updateError } = await supabase
          .from('email_tracking')
          .update({
            clicked_links: clickedLinks,
            total_clicks: totalClicks,
            is_clicked: true,
            user_agent: trackingData?.userAgent,
            ip_address: trackingData?.ipAddress,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        tracking = mapToEmailTracking(data);
      } else {
        // Création
        const { data, error: insertError } = await supabase
          .from('email_tracking')
          .insert({
            email_id: emailId,
            lead_id: leadId,
            clicked_links: clickedLinks,
            total_clicks: totalClicks,
            is_clicked: true,
            user_agent: trackingData?.userAgent,
            ip_address: trackingData?.ipAddress,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        tracking = mapToEmailTracking(data);
      }

      // Enregistrer l'événement comportemental
      await recordBehaviorEvent(leadId, 'email_click', {
        subtype: existingLink ? 'multiple_clicks' : 'first_click',
        data: {
          emailId,
          linkUrl,
          clickCount: existingLink?.count || 1,
          totalClicks,
        },
        source: 'email',
        sourceId: emailId,
      });

      setError(null);
      return tracking;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const mapToEmailTracking = (data: any): EmailTracking => ({
    id: data.id,
    emailId: data.email_id,
    leadId: data.lead_id,
    emailType: data.email_type,
    subject: data.subject,
    firstOpenedAt: data.first_opened_at,
    lastOpenedAt: data.last_opened_at,
    openCount: data.open_count || 0,
    clickedLinks: data.clicked_links || [],
    totalClicks: data.total_clicks || 0,
    isOpened: data.is_opened || false,
    isClicked: data.is_clicked || false,
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
    location: data.location || {},
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });

  return {
    loading,
    error,
    trackEmailOpen,
    trackEmailClick,
  };
};

