import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useBehaviorTriggers } from './useBehaviorTriggers';

export type ResourceType = 'whitepaper' | 'guide' | 'case_study' | 'template' | 'checklist' | 'ebook' | 'other';

export interface ResourceDownload {
  id: string;
  leadId: string;
  resourceName: string;
  resourceType: ResourceType;
  resourceUrl: string;
  downloadUrl?: string;
  downloadedAt: string;
  userAgent?: string;
  ipAddress?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useResourceDownloads = () => {
  const { recordBehaviorEvent } = useBehaviorTriggers();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackDownload = async (
    leadId: string,
    resourceData: {
      resourceName: string;
      resourceType: ResourceType;
      resourceUrl: string;
      downloadUrl?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<ResourceDownload> => {
    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('resource_downloads')
        .insert({
          lead_id: leadId,
          resource_name: resourceData.resourceName,
          resource_type: resourceData.resourceType,
          resource_url: resourceData.resourceUrl,
          download_url: resourceData.downloadUrl,
          downloaded_at: new Date().toISOString(),
          user_agent: resourceData.userAgent,
          ip_address: resourceData.ipAddress,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const download: ResourceDownload = {
        id: data.id,
        leadId: data.lead_id,
        resourceName: data.resource_name,
        resourceType: data.resource_type,
        resourceUrl: data.resource_url,
        downloadUrl: data.download_url,
        downloadedAt: data.downloaded_at,
        userAgent: data.user_agent,
        ipAddress: data.ip_address,
        metadata: data.metadata || {},
        createdAt: data.created_at,
      };

      // Enregistrer l'événement comportemental
      await recordBehaviorEvent(leadId, 'resource_download', {
        data: {
          resourceName: resourceData.resourceName,
          resourceType: resourceData.resourceType,
          resourceUrl: resourceData.resourceUrl,
        },
        source: 'website',
        sourceId: data.id,
      });

      setError(null);
      return download;
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
    trackDownload,
  };
};

