import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useEmailSequences } from './useEmailSequences';

export type SignalType = 'site_visit' | 'page_visit' | 'download' | 'form_submit' | 'event_detected' | 'email_engagement';

export interface InterestSignal {
  id: string;
  leadId: string;
  signalType: SignalType;
  signalData: {
    url?: string;
    page?: string;
    resource?: string;
    formType?: string;
    eventType?: string;
    [key: string]: any;
  };
  detectedAt: string;
  processed: boolean;
  reactivationSequenceId?: string;
  createdAt: string;
}

export const useInterestSignals = () => {
  const { enrollLead } = useEmailSequences();
  const [signals, setSignals] = useState<InterestSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectSignal = async (
    leadId: string,
    signalType: SignalType,
    signalData: Record<string, any>
  ): Promise<InterestSignal> => {
    try {
      setLoading(true);

      // Enregistrer le signal
      const { data, error: insertError } = await supabase
        .from('interest_signals')
        .insert({
          lead_id: leadId,
          signal_type: signalType,
          signal_data: signalData,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const signal: InterestSignal = {
        id: data.id,
        leadId: data.lead_id,
        signalType: data.signal_type,
        signalData: data.signal_data,
        detectedAt: data.detected_at,
        processed: data.processed,
        reactivationSequenceId: data.reactivation_sequence_id,
        createdAt: data.created_at,
      };

      // Traiter le signal pour réactivation si nécessaire
      await processSignalForReactivation(signal);

      setSignals([signal, ...signals]);
      setError(null);
      return signal;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processSignalForReactivation = async (signal: InterestSignal) => {
    try {
      // Vérifier si le lead est inactif ou froid
      const { data: lead } = await supabase
        .from('leads')
        .select('temperature, lifecycle_stage, last_activity_date')
        .eq('id', signal.leadId)
        .single();

      if (!lead) return;

      // Déterminer si une réactivation est nécessaire
      const shouldReactivate = 
        (lead.temperature === 'Froid' || lead.temperature === 'Tiède') ||
        (lead.lifecycle_stage === 'Inactif') ||
        (lead.last_activity_date && 
         new Date(lead.last_activity_date).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (!shouldReactivate) {
        // Marquer comme traité sans réactivation
        await supabase
          .from('interest_signals')
          .update({ processed: true })
          .eq('id', signal.id);
        return;
      }

      // Trouver une séquence de réactivation
      const { data: reactivationSequence } = await supabase
        .from('email_sequences')
        .select('id')
        .eq('scenario_type', 'reactivation')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (reactivationSequence) {
        // Inscrire le lead dans la séquence de réactivation
        await enrollLead(reactivationSequence.id, signal.leadId, {
          signalType: signal.signalType,
          signalData: signal.signalData,
        });

        // Mettre à jour le signal
        await supabase
          .from('interest_signals')
          .update({
            processed: true,
            reactivation_sequence_id: reactivationSequence.id,
          })
          .eq('id', signal.id);

        // Mettre à jour la température du lead
        await supabase
          .from('leads')
          .update({
            temperature: 'Tiède',
            last_activity_date: new Date().toISOString(),
          })
          .eq('id', signal.leadId);

        // Créer une notification pour le commercial
        await supabase
          .from('automated_tasks')
          .insert({
            task_type: 'follow_up',
            lead_id: signal.leadId,
            title: `Signal d'intérêt détecté : ${signal.signalType}`,
            description: `Le lead a montré un signal d'intérêt (${signal.signalType}). Réactivation automatique lancée.`,
            priority: 'Haute',
            tags: ['Réactivation', 'Signal d\'intérêt'],
            metadata: {
              signalType: signal.signalType,
              signalData: signal.signalData,
            },
          });
      }
    } catch (err) {
      console.error('Error processing signal for reactivation:', err);
    }
  };

  const getSignalsForLead = async (leadId: string): Promise<InterestSignal[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('interest_signals')
        .select('*')
        .eq('lead_id', leadId)
        .order('detected_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: InterestSignal[] = (data || []).map((s: any) => ({
        id: s.id,
        leadId: s.lead_id,
        signalType: s.signal_type,
        signalData: s.signal_data,
        detectedAt: s.detected_at,
        processed: s.processed,
        reactivationSequenceId: s.reactivation_sequence_id,
        createdAt: s.created_at,
      }));

      return formatted;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    signals,
    loading,
    error,
    detectSignal,
    getSignalsForLead,
    processSignalForReactivation,
  };
};

