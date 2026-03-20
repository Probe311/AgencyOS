import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Lead } from '../../../types';
import { useAutomatedTasks } from './useAutomatedTasks';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChurnRiskDetection {
  id: string;
  leadId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  detectionCriteria: {
    noInteraction?: boolean;
    noBilling?: boolean;
    lowNps?: boolean;
    lowCsat?: boolean;
    unresolvedTickets?: boolean;
    usageDecline?: boolean;
    [key: string]: any;
  };
  lastInteractionDate?: string;
  monthsSinceLastInteraction?: number;
  monthsSinceLastBilling?: number;
  npsScore?: number;
  csatScore?: number;
  unresolvedTicketsCount: number;
  usageDeclineDetected: boolean;
  detectedAt: string;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
}

export const useChurnDetection = () => {
  const { createFollowUpTask } = useAutomatedTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectChurnRisk = async (lead: Lead): Promise<ChurnRiskDetection | null> => {
    try {
      setLoading(true);

      // Récupérer les données nécessaires
      const criteria: Record<string, any> = {};
      let riskScore = 0;

      // 1. Vérifier la dernière interaction
      const { data: lastActivity } = await supabase
        .from('lead_engagement')
        .select('engagement_date')
        .eq('lead_id', lead.id)
        .order('engagement_date', { ascending: false })
        .limit(1)
        .single();

      const lastInteractionDate = lastActivity?.engagement_date || lead.lastContact;
      if (lastInteractionDate) {
        const monthsSinceInteraction = Math.floor(
          (Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        
        if (monthsSinceInteraction >= 3) {
          criteria.noInteraction = true;
          riskScore += 30;
        }
      } else {
        criteria.noInteraction = true;
        riskScore += 30;
      }

      // 2. Vérifier la dernière facturation
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastInvoice) {
        const monthsSinceBilling = Math.floor(
          (Date.now() - new Date(lastInvoice.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        
        if (monthsSinceBilling >= 6) {
          criteria.noBilling = true;
          riskScore += 25;
        }
      } else {
        criteria.noBilling = true;
        riskScore += 25;
      }

      // 3. Vérifier les scores de satisfaction
      const { data: latestSurvey } = await supabase
        .from('satisfaction_surveys')
        .select('nps_score, csat_score')
        .eq('lead_id', lead.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (latestSurvey) {
        if (latestSurvey.nps_score !== null && latestSurvey.nps_score < 6) {
          criteria.lowNps = true;
          riskScore += 20;
        }
        if (latestSurvey.csat_score !== null && latestSurvey.csat_score < 3) {
          criteria.lowCsat = true;
          riskScore += 20;
        }
      }

      // 4. Vérifier les tickets non résolus (TODO: Intégrer avec système de support)
      // Pour l'instant, on simule
      criteria.unresolvedTickets = false;
      // TODO: Compter les tickets non résolus depuis 30+ jours

      // 5. Vérifier le déclin d'utilisation (TODO: Intégrer avec métriques d'utilisation)
      criteria.usageDecline = false;
      // TODO: Détecter le déclin d'utilisation

      // Déterminer le niveau de risque
      let riskLevel: RiskLevel = 'low';
      if (riskScore >= 70) {
        riskLevel = 'critical';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }

      // Si le risque est faible, ne pas créer de détection
      if (riskLevel === 'low') {
        return null;
      }

      // Créer la détection
      const { data, error: insertError } = await supabase
        .from('churn_risk_detection')
        .insert({
          lead_id: lead.id,
          risk_score: riskScore,
          risk_level: riskLevel,
          detection_criteria: criteria,
          last_interaction_date: lastInteractionDate,
          months_since_last_interaction: lastInteractionDate 
            ? Math.floor((Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : null,
          months_since_last_billing: lastInvoice
            ? Math.floor((Date.now() - new Date(lastInvoice.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : null,
          nps_score: latestSurvey?.nps_score,
          csat_score: latestSurvey?.csat_score,
          unresolved_tickets_count: 0, // TODO: Compter réellement
          usage_decline_detected: false, // TODO: Détecter réellement
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const detection: ChurnRiskDetection = {
        id: data.id,
        leadId: data.lead_id,
        riskScore: data.risk_score,
        riskLevel: data.risk_level,
        detectionCriteria: data.detection_criteria,
        lastInteractionDate: data.last_interaction_date,
        monthsSinceLastInteraction: data.months_since_last_interaction,
        monthsSinceLastBilling: data.months_since_last_billing,
        npsScore: data.nps_score,
        csatScore: data.csat_score,
        unresolvedTicketsCount: data.unresolved_tickets_count,
        usageDeclineDetected: data.usage_decline_detected,
        detectedAt: data.detected_at,
        processed: data.processed,
        processedAt: data.processed_at,
        createdAt: data.created_at,
      };

      // Ajouter le tag "À risque churn"
      // TODO: Ajouter le tag au lead

      // Traiter la détection
      await processChurnRisk(detection, lead);

      setError(null);
      return detection;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processChurnRisk = async (detection: ChurnRiskDetection, lead: Lead) => {
    try {
      // Actions selon le niveau de risque
      if (detection.riskLevel === 'critical' || detection.riskLevel === 'high') {
        // Escalade vers success manager
        await escalateToSuccessManager(detection, lead);
      }

      if (detection.monthsSinceLastInteraction && detection.monthsSinceLastInteraction >= 3) {
        // Relance automatique
        await sendReengagementEmail(lead);
      }

      // Créer une tâche pour le success manager
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: null,
          title: `Client à risque churn : ${lead.name || lead.company}`,
          description: `Risque de churn détecté (${detection.riskLevel}). Score : ${detection.riskScore}/100. Critères : ${Object.keys(detection.detectionCriteria).join(', ')}`,
          priority: detection.riskLevel === 'critical' ? 'Urgente' : 'Haute',
          tags: ['Churn', 'Rétention', detection.riskLevel],
          metadata: {
            detectionId: detection.id,
            riskScore: detection.riskScore,
            riskLevel: detection.riskLevel,
          },
        });

      // Marquer comme traité
      await supabase
        .from('churn_risk_detection')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', detection.id);
    } catch (err) {
      console.error('Error processing churn risk:', err);
    }
  };

  const escalateToSuccessManager = async (detection: ChurnRiskDetection, lead: Lead) => {
    try {
      // Récupérer le success manager
      const { data: successManagers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['Manager', 'Admin'])
        .limit(1);

      if (!successManagers || successManagers.length === 0) return;

      const manager = successManagers[0];

      // Créer une tâche urgente
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'follow_up',
          lead_id: lead.id,
          assigned_to: manager.id,
          title: `Client insatisfait : ${lead.name || lead.company} - Score ${detection.npsScore || detection.csatScore || 'N/A'}`,
          description: `Client à risque churn (${detection.riskLevel}). NPS: ${detection.npsScore || 'N/A'}, CSAT: ${detection.csatScore || 'N/A'}. Planification call de récupération recommandée.`,
          priority: 'Urgente',
          tags: ['Escalade', 'Churn', 'Success Manager'],
          metadata: {
            detectionId: detection.id,
            npsScore: detection.npsScore,
            csatScore: detection.csatScore,
          },
        });

      // TODO: Envoyer un email au success manager
    } catch (err) {
      console.error('Error escalating to success manager:', err);
    }
  };

  const sendReengagementEmail = async (lead: Lead) => {
    try {
      // Créer une action de rétention
      await supabase
        .from('client_retention_actions')
        .insert({
          lead_id: lead.id,
          action_type: 'reengagement_email',
          action_status: 'pending',
          metadata: {
            emailType: 'reengagement',
            subject: 'Comment allez-vous ?',
          },
        });

      // TODO: Intégrer avec le système d'envoi d'emails
    } catch (err) {
      console.error('Error sending reengagement email:', err);
    }
  };

  const scanAllClientsForChurn = async () => {
    try {
      setLoading(true);

      // Récupérer tous les clients actifs
      const { data: clients } = await supabase
        .from('leads')
        .select('*')
        .in('lifecycle_stage', ['Client', 'Client Actif']);

      if (!clients) return;

      const detections: ChurnRiskDetection[] = [];

      for (const client of clients) {
        try {
          const detection = await detectChurnRisk(client);
          if (detection) {
            detections.push(detection);
          }
        } catch (err) {
          console.error(`Error detecting churn for client ${client.id}:`, err);
        }
      }

      return detections;
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
    detectChurnRisk,
    scanAllClientsForChurn,
  };
};

