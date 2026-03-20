import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { LifecycleStage } from '../../../types';

export interface LifecycleMetric {
  id: string;
  metricDate: string;
  fromStage?: LifecycleStage;
  toStage: LifecycleStage;
  transitionCount: number;
  averageDuration: number;
  conversionRate: number;
  abandonmentRate: number;
  totalLeads: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleFunnelData {
  stage: LifecycleStage;
  count: number;
  conversionRate: number;
  averageDuration: number;
}

export const useLifecycleMetrics = () => {
  const [metrics, setMetrics] = useState<LifecycleMetric[]>([]);
  const [funnelData, setFunnelData] = useState<LifecycleFunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateMetrics = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      // Récupérer toutes les transitions dans la période
      const { data: transitions, error: transitionsError } = await supabase
        .from('lifecycle_transitions')
        .select('*')
        .gte('transition_date', start)
        .lte('transition_date', end);

      if (transitionsError) throw transitionsError;

      // Calculer les métriques par transition
      const metricsMap = new Map<string, LifecycleMetric>();

      transitions?.forEach((transition: any) => {
        const key = `${transition.from_stage || 'null'}_${transition.to_stage}_${transition.transition_date.split('T')[0]}`;
        
        if (!metricsMap.has(key)) {
          metricsMap.set(key, {
            id: '',
            metricDate: transition.transition_date.split('T')[0],
            fromStage: transition.from_stage,
            toStage: transition.to_stage,
            transitionCount: 0,
            averageDuration: 0,
            conversionRate: 0,
            abandonmentRate: 0,
            totalLeads: 0,
            createdAt: '',
            updatedAt: '',
          });
        }

        const metric = metricsMap.get(key)!;
        metric.transitionCount += 1;
        if (transition.duration_in_stage) {
          metric.averageDuration = (metric.averageDuration * (metric.transitionCount - 1) + transition.duration_in_stage) / metric.transitionCount;
        }
      });

      // Calculer les taux de conversion et d'abandon
      const stages: LifecycleStage[] = ['Audience', 'Lead', 'MQL', 'SQL', 'Contact', 'Opportunité', 'Client', 'Client Actif', 'Ambassadeur', 'Inactif', 'Perdu'];
      
      for (let i = 0; i < stages.length - 1; i++) {
        const fromStage = stages[i];
        const toStage = stages[i + 1];
        
        const transitionsFrom = transitions?.filter((t: any) => t.from_stage === fromStage) || [];
        const transitionsTo = transitions?.filter((t: any) => t.to_stage === toStage) || [];
        
        const totalInStage = transitionsFrom.length;
        const converted = transitionsTo.length;
        
        if (totalInStage > 0) {
          const conversionRate = (converted / totalInStage) * 100;
          const abandonmentRate = ((totalInStage - converted) / totalInStage) * 100;
          
          const key = `${fromStage}_${toStage}_${end}`;
          if (metricsMap.has(key)) {
            const metric = metricsMap.get(key)!;
            metric.conversionRate = conversionRate;
            metric.abandonmentRate = abandonmentRate;
            metric.totalLeads = totalInStage;
          }
        }
      }

      const calculatedMetrics = Array.from(metricsMap.values());

      // Sauvegarder les métriques
      for (const metric of calculatedMetrics) {
        const { data: existing } = await supabase
          .from('lifecycle_metrics')
          .select('id')
          .eq('metric_date', metric.metricDate)
          .eq('from_stage', metric.fromStage || 'null')
          .eq('to_stage', metric.toStage)
          .single();

        const metricData = {
          metric_date: metric.metricDate,
          from_stage: metric.fromStage,
          to_stage: metric.toStage,
          transition_count: metric.transitionCount,
          average_duration: metric.averageDuration,
          conversion_rate: metric.conversionRate,
          abandonment_rate: metric.abandonmentRate,
          total_leads: metric.totalLeads,
        };

        if (existing) {
          await supabase
            .from('lifecycle_metrics')
            .update(metricData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('lifecycle_metrics')
            .insert(metricData);
        }
      }

      setMetrics(calculatedMetrics);
      await calculateFunnelData(start, end);
    } catch (err) {
      setError(err as Error);
      console.error('Error calculating metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateFunnelData = async (startDate: string, endDate: string) => {
    try {
      const stages: LifecycleStage[] = ['Audience', 'Lead', 'MQL', 'SQL', 'Contact', 'Opportunité', 'Client'];
      
      const funnel: LifecycleFunnelData[] = [];

      for (const stage of stages) {
        // Compter les leads à cette étape
        const { count: stageCount } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('lifecycle_stage', stage);

        // Calculer le taux de conversion depuis l'étape précédente
        let conversionRate = 0;
        const stageIndex = stages.indexOf(stage);
        if (stageIndex > 0) {
          const previousStage = stages[stageIndex - 1];
          const { count: previousCount } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('lifecycle_stage', previousStage);

          if (previousCount && previousCount > 0) {
            conversionRate = ((stageCount || 0) / previousCount) * 100;
          }
        }

        // Calculer la durée moyenne dans cette étape
        const { data: transitions } = await supabase
          .from('lifecycle_transitions')
          .select('duration_in_stage')
          .eq('to_stage', stage)
          .gte('transition_date', startDate)
          .lte('transition_date', endDate)
          .not('duration_in_stage', 'is', null);

        const durations = transitions?.map((t: any) => t.duration_in_stage).filter((d: number) => d > 0) || [];
        const averageDuration = durations.length > 0
          ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
          : 0;

        funnel.push({
          stage,
          count: stageCount || 0,
          conversionRate,
          averageDuration,
        });
      }

      setFunnelData(funnel);
    } catch (err) {
      console.error('Error calculating funnel data:', err);
    }
  };

  const loadMetrics = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('lifecycle_metrics')
        .select('*')
        .gte('metric_date', start)
        .lte('metric_date', end)
        .order('metric_date', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted: LifecycleMetric[] = (data || []).map((m: any) => ({
        id: m.id,
        metricDate: m.metric_date,
        fromStage: m.from_stage,
        toStage: m.to_stage,
        transitionCount: m.transition_count || 0,
        averageDuration: m.average_duration || 0,
        conversionRate: m.conversion_rate || 0,
        abandonmentRate: m.abandonment_rate || 0,
        totalLeads: m.total_leads || 0,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      setMetrics(formatted);
      await calculateFunnelData(start, end);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    funnelData,
    loading,
    error,
    calculateMetrics,
    loadMetrics,
  };
};

