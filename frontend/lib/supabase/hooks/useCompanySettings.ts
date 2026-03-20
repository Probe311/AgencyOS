import { useState, useCallback, useEffect } from 'react';
import { CompanySettings } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
// Note: currentWorkspace n'est pas encore dans AppContext, on utilisera workspace_id depuis les paramètres

interface UseCompanySettingsReturn {
  companySettings: CompanySettings | null;
  loading: boolean;
  getCompanySettings: (workspaceId?: string) => Promise<CompanySettings | null>;
  createCompanySettings: (settings: Partial<CompanySettings>) => Promise<CompanySettings | null>;
  updateCompanySettings: (settingsId: string, settings: Partial<CompanySettings>) => Promise<void>;
}

export const useCompanySettings = (workspaceId?: string): UseCompanySettingsReturn => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const getCompanySettings = useCallback(async (targetWorkspaceId?: string): Promise<CompanySettings | null> => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return null;
    }

    try {
      const finalWorkspaceId = targetWorkspaceId || workspaceId;
      if (!finalWorkspaceId) {
        setLoading(false);
        return null;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('workspace_id', finalWorkspaceId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const settings: CompanySettings = {
          id: data.id,
          workspaceId: data.workspace_id,
          legalName: data.legal_name,
          siren: data.siren || undefined,
          siret: data.siret || undefined,
          vatNumber: data.vat_number || undefined,
          addressLine1: data.address_line1,
          addressLine2: data.address_line2 || undefined,
          postalCode: data.postal_code,
          city: data.city,
          country: data.country || 'France',
          phone: data.phone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          capitalSocial: data.capital_social || undefined,
          legalForm: data.legal_form || undefined,
          rcs: data.rcs || undefined,
          logoUrl: data.logo_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setCompanySettings(settings);
        setLoading(false);
        return settings;
      }

      setLoading(false);
      return null;
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setLoading(false);
      return null;
    }
  }, [workspaceId]);

  const createCompanySettings = useCallback(async (
    settings: Partial<CompanySettings>
  ): Promise<CompanySettings | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const targetWorkspaceId = settings.workspaceId || workspaceId;
      if (!targetWorkspaceId) {
        throw new Error('Workspace ID is required');
      }

      const { data, error } = await supabase
        .from('company_settings')
        .insert({
          workspace_id: targetWorkspaceId,
          legal_name: settings.legalName || '',
          siren: settings.siren || null,
          siret: settings.siret || null,
          vat_number: settings.vatNumber || null,
          address_line1: settings.addressLine1 || '',
          address_line2: settings.addressLine2 || null,
          postal_code: settings.postalCode || '',
          city: settings.city || '',
          country: settings.country || 'France',
          phone: settings.phone || null,
          email: settings.email || null,
          website: settings.website || null,
          capital_social: settings.capitalSocial || null,
          legal_form: settings.legalForm || null,
          rcs: settings.rcs || null,
          logo_url: settings.logoUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newSettings: CompanySettings = {
          id: data.id,
          workspaceId: data.workspace_id,
          legalName: data.legal_name,
          siren: data.siren || undefined,
          siret: data.siret || undefined,
          vatNumber: data.vat_number || undefined,
          addressLine1: data.address_line1,
          addressLine2: data.address_line2 || undefined,
          postalCode: data.postal_code,
          city: data.city,
          country: data.country || 'France',
          phone: data.phone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          capitalSocial: data.capital_social || undefined,
          legalForm: data.legal_form || undefined,
          rcs: data.rcs || undefined,
          logoUrl: data.logo_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setCompanySettings(newSettings);
        return newSettings;
      }

      return null;
    } catch (err) {
      console.error('Error creating company settings:', err);
      throw err;
    }
  }, [workspaceId]);

  const updateCompanySettings = useCallback(async (
    settingsId: string,
    settings: Partial<CompanySettings>
  ): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          legal_name: settings.legalName,
          siren: settings.siren || null,
          siret: settings.siret || null,
          vat_number: settings.vatNumber || null,
          address_line1: settings.addressLine1,
          address_line2: settings.addressLine2 || null,
          postal_code: settings.postalCode,
          city: settings.city,
          country: settings.country || 'France',
          phone: settings.phone || null,
          email: settings.email || null,
          website: settings.website || null,
          capital_social: settings.capitalSocial || null,
          legal_form: settings.legalForm || null,
          rcs: settings.rcs || null,
          logo_url: settings.logoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId);

      if (error) throw error;

      // Refresh settings
      await getCompanySettings();
    } catch (err) {
      console.error('Error updating company settings:', err);
      throw err;
    }
  }, [getCompanySettings]);

  useEffect(() => {
    if (workspaceId) {
      getCompanySettings(workspaceId);
    } else {
      // Si pas de workspaceId, arrêter le chargement
      setLoading(false);
    }
  }, [workspaceId, getCompanySettings]);

  return {
    companySettings,
    loading,
    getCompanySettings,
    createCompanySettings,
    updateCompanySettings,
  };
};

