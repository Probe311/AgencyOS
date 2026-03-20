import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export interface LeadPreferences {
  id: string;
  leadId: string;
  preferredContactMethod?: 'email' | 'phone' | 'linkedin' | 'whatsapp' | 'autre';
  preferredContactTime?: string;
  preferredContactDays?: string[];
  timezone: string;
  language: string;
  communicationStyle?: 'formel' | 'informel' | 'technique' | 'commercial';
  doNotContact: boolean;
  doNotEmail: boolean;
  doNotCall: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const useLeadPreferences = (leadId?: string) => {
  const [preferences, setPreferences] = useState<LeadPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (leadId) {
      loadPreferences(leadId);
    } else {
      setLoading(false);
    }
  }, [leadId]);

  const loadPreferences = async (id: string) => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lead_preferences')
        .select('*')
        .eq('lead_id', id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 = no rows

      if (data) {
        setPreferences({
          id: data.id,
          leadId: data.lead_id,
          preferredContactMethod: data.preferred_contact_method,
          preferredContactTime: data.preferred_contact_time,
          preferredContactDays: data.preferred_contact_days || [],
          timezone: data.timezone || 'Europe/Paris',
          language: data.language || 'fr',
          communicationStyle: data.communication_style,
          doNotContact: data.do_not_contact || false,
          doNotEmail: data.do_not_email || false,
          doNotCall: data.do_not_call || false,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        // Créer des préférences par défaut
        setPreferences(null);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (id: string, updates: Partial<LeadPreferences>) => {
    try {
      const updateData: any = {};
      if (updates.preferredContactMethod !== undefined) updateData.preferred_contact_method = updates.preferredContactMethod;
      if (updates.preferredContactTime !== undefined) updateData.preferred_contact_time = updates.preferredContactTime;
      if (updates.preferredContactDays !== undefined) updateData.preferred_contact_days = updates.preferredContactDays;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
      if (updates.language !== undefined) updateData.language = updates.language;
      if (updates.communicationStyle !== undefined) updateData.communication_style = updates.communicationStyle;
      if (updates.doNotContact !== undefined) updateData.do_not_contact = updates.doNotContact;
      if (updates.doNotEmail !== undefined) updateData.do_not_email = updates.doNotEmail;
      if (updates.doNotCall !== undefined) updateData.do_not_call = updates.doNotCall;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      // Vérifier si les préférences existent
      const { data: existing } = await supabase
        .from('lead_preferences')
        .select('id')
        .eq('lead_id', id)
        .single();

      let result;
      if (existing) {
        const { data, error: updateError } = await supabase
          .from('lead_preferences')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('lead_preferences')
          .insert({
            lead_id: id,
            ...updateData,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
      }

      const updated: LeadPreferences = {
        id: result.id,
        leadId: result.lead_id,
        preferredContactMethod: result.preferred_contact_method,
        preferredContactTime: result.preferred_contact_time,
        preferredContactDays: result.preferred_contact_days || [],
        timezone: result.timezone || 'Europe/Paris',
        language: result.language || 'fr',
        communicationStyle: result.communication_style,
        doNotContact: result.do_not_contact || false,
        doNotEmail: result.do_not_email || false,
        doNotCall: result.do_not_call || false,
        notes: result.notes,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };

      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
  };
};

