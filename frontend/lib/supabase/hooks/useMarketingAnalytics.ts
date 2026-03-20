import { useCallback } from 'react';
import { EmailCampaign, CampaignMetrics, CampaignROI, EmailHeatmapData, EmailSend, EmailClick } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { 
  SupabaseEmailCampaign,
  SupabaseCampaignMetrics,
  SupabaseCampaignROI,
  SupabaseEmailSend,
  SupabaseEmailClick
} from '../types';

interface UseMarketingAnalyticsReturn {
  getCampaignMetrics: (campaignId: string, startDate?: string, endDate?: string) => Promise<CampaignMetrics[]>;
  getCampaignROI: (campaignId: string, periodStart?: string, periodEnd?: string) => Promise<CampaignROI | null>;
  calculateCampaignROI: (campaignId: string, periodStart: string, periodEnd: string) => Promise<CampaignROI | null>;
  getEmailHeatmap: (campaignId: string) => Promise<EmailHeatmapData[]>;
  getCampaignPerformance: (campaignId: string) => Promise<{
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    conversionRate: number;
    totalRevenue: number;
    totalCost: number;
    roi: number;
  }>;
  trackEmailOpen: (trackingPixelId: string) => Promise<void>;
  trackEmailClick: (sendId: string, linkUrl: string, clickX?: number, clickY?: number) => Promise<void>;
}

export const useMarketingAnalytics = (): UseMarketingAnalyticsReturn => {
  const getCampaignMetrics = useCallback(async (
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CampaignMetrics[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('metric_date', { ascending: false });

      if (startDate) {
        query = query.gte('metric_date', startDate);
      }
      if (endDate) {
        query = query.lte('metric_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        return data.map((m: SupabaseCampaignMetrics) => ({
          id: m.id,
          campaignId: m.campaign_id,
          metricDate: m.metric_date,
          opens: m.opens,
          uniqueOpens: m.unique_opens,
          clicks: m.clicks,
          uniqueClicks: m.unique_clicks,
          bounces: m.bounces,
          unsubscribes: m.unsubscribes,
          conversions: m.conversions,
          revenue: parseFloat(m.revenue.toString()),
          cost: parseFloat(m.cost.toString()),
          createdAt: m.created_at,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching campaign metrics:', err);
      return [];
    }
  }, []);

  const getCampaignROI = useCallback(async (
    campaignId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<CampaignROI | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      let query = supabase
        .from('campaign_roi')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (periodStart) {
        query = query.gte('period_start', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_end', periodEnd);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const roi = data[0] as SupabaseCampaignROI;
        return {
          id: roi.id,
          campaignId: roi.campaign_id,
          periodStart: roi.period_start,
          periodEnd: roi.period_end,
          totalCost: parseFloat(roi.total_cost.toString()),
          totalRevenue: parseFloat(roi.total_revenue.toString()),
          totalConversions: roi.total_conversions,
          roiPercentage: parseFloat(roi.roi_percentage.toString()),
          createdAt: roi.created_at,
          updatedAt: roi.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching campaign ROI:', err);
      return null;
    }
  }, []);

  const calculateCampaignROI = useCallback(async (
    campaignId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<CampaignROI | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      // Get all metrics for the period
      const metrics = await getCampaignMetrics(campaignId, periodStart, periodEnd);

      // Calculate totals
      const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
      const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);

      // Check if ROI already exists
      const existingROI = await getCampaignROI(campaignId, periodStart, periodEnd);

      if (existingROI) {
        // Update existing ROI
        const { data, error } = await supabase
          .from('campaign_roi')
          .update({
            total_cost: totalCost,
            total_revenue: totalRevenue,
            total_conversions: totalConversions,
          })
          .eq('id', existingROI.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          return {
            id: data.id,
            campaignId: data.campaign_id,
            periodStart: data.period_start,
            periodEnd: data.period_end,
            totalCost: parseFloat(data.total_cost.toString()),
            totalRevenue: parseFloat(data.total_revenue.toString()),
            totalConversions: data.total_conversions,
            roiPercentage: parseFloat(data.roi_percentage.toString()),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } else {
        // Create new ROI
        const { data, error } = await supabase
          .from('campaign_roi')
          .insert({
            campaign_id: campaignId,
            period_start: periodStart,
            period_end: periodEnd,
            total_cost: totalCost,
            total_revenue: totalRevenue,
            total_conversions: totalConversions,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          return {
            id: data.id,
            campaignId: data.campaign_id,
            periodStart: data.period_start,
            periodEnd: data.period_end,
            totalCost: parseFloat(data.total_cost.toString()),
            totalRevenue: parseFloat(data.total_revenue.toString()),
            totalConversions: data.total_conversions,
            roiPercentage: parseFloat(data.roi_percentage.toString()),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Error calculating campaign ROI:', err);
      return null;
    }
  }, [getCampaignMetrics, getCampaignROI]);

  const getEmailHeatmap = useCallback(async (campaignId: string): Promise<EmailHeatmapData[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      // Get all clicks for the campaign
      const { data: sends } = await supabase
        .from('email_sends')
        .select('id')
        .eq('campaign_id', campaignId);

      if (!sends || sends.length === 0) return [];

      const sendIds = sends.map(s => s.id);

      const { data: clicks, error } = await supabase
        .from('email_clicks')
        .select('click_position_x, click_position_y')
        .in('send_id', sendIds)
        .not('click_position_x', 'is', null)
        .not('click_position_y', 'is', null);

      if (error) throw error;

      if (!clicks || clicks.length === 0) return [];

      // Group clicks by position and count
      const positionMap = new Map<string, { x: number; y: number; count: number }>();

      clicks.forEach(click => {
        const x = click.click_position_x || 0;
        const y = click.click_position_y || 0;
        const key = `${x},${y}`;

        if (positionMap.has(key)) {
          positionMap.get(key)!.count++;
        } else {
          positionMap.set(key, { x, y, count: 1 });
        }
      });

      // Find max count for normalization
      const maxCount = Math.max(...Array.from(positionMap.values()).map(v => v.count));

      // Convert to heatmap data
      return Array.from(positionMap.values()).map(pos => ({
        x: pos.x,
        y: pos.y,
        count: pos.count,
        intensity: maxCount > 0 ? pos.count / maxCount : 0,
      }));
    } catch (err) {
      console.error('Error fetching email heatmap:', err);
      return [];
    }
  }, []);

  const getCampaignPerformance = useCallback(async (campaignId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        conversionRate: 0,
        totalRevenue: 0,
        totalCost: 0,
        roi: 0,
      };
    }

    try {
      // Get all sends for the campaign
      const { data: sends, error: sendsError } = await supabase
        .from('email_sends')
        .select('*')
        .eq('campaign_id', campaignId);

      if (sendsError) throw sendsError;

      if (!sends || sends.length === 0) {
        return {
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0,
          conversionRate: 0,
          totalRevenue: 0,
          totalCost: 0,
          roi: 0,
        };
      }

      const totalSent = sends.length;
      const totalOpened = sends.filter(s => s.opened_at).length;
      const totalClicked = sends.filter(s => s.clicked_at).length;
      const totalBounced = sends.filter(s => s.bounced).length;
      const totalUnsubscribed = sends.filter(s => s.unsubscribed).length;

      // Get metrics for conversions and revenue
      const metrics = await getCampaignMetrics(campaignId);
      const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
      const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);

      return {
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        unsubscribeRate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0,
        conversionRate: totalSent > 0 ? (totalConversions / totalSent) * 100 : 0,
        totalRevenue,
        totalCost,
        roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
      };
    } catch (err) {
      console.error('Error calculating campaign performance:', err);
      return {
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        conversionRate: 0,
        totalRevenue: 0,
        totalCost: 0,
        roi: 0,
      };
    }
  }, [getCampaignMetrics]);

  const trackEmailOpen = useCallback(async (trackingPixelId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Find the email send by tracking pixel ID
      const { data: send, error: findError } = await supabase
        .from('email_sends')
        .select('id, opened_at')
        .eq('tracking_pixel_id', trackingPixelId)
        .single();

      if (findError) throw findError;

      // Only update if not already opened
      if (send && !send.opened_at) {
        await supabase
          .from('email_sends')
          .update({ opened_at: new Date().toISOString() })
          .eq('id', send.id);
      }
    } catch (err) {
      console.error('Error tracking email open:', err);
    }
  }, []);

  const trackEmailClick = useCallback(async (
    sendId: string,
    linkUrl: string,
    clickX?: number,
    clickY?: number
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Record the click
      await supabase
        .from('email_clicks')
        .insert({
          send_id: sendId,
          link_url: linkUrl,
          click_position_x: clickX || null,
          click_position_y: clickY || null,
        });

      // Update the send's clicked_at if not already set
      const { data: send } = await supabase
        .from('email_sends')
        .select('clicked_at')
        .eq('id', sendId)
        .single();

      if (send && !send.clicked_at) {
        await supabase
          .from('email_sends')
          .update({ clicked_at: new Date().toISOString() })
          .eq('id', sendId);
      }
    } catch (err) {
      console.error('Error tracking email click:', err);
    }
  }, []);

  return {
    getCampaignMetrics,
    getCampaignROI,
    calculateCampaignROI,
    getEmailHeatmap,
    getCampaignPerformance,
    trackEmailOpen,
    trackEmailClick,
  };
};

