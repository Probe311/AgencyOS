/**
 * Service de gestion des leads VIP
 * Détection, suivi renforcé, alertes, dashboard
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';

export interface VIPLead {
  leadId: string;
  lead: Lead;
  detectedAt: string;
  reason: string; // 'high_scoring' | 'high_value' | 'vip_tag' | 'fortune_500' | 'c_level'
  priority: 'high' | 'critical';
  assignedTo?: string;
  status: 'new' | 'contacted' | 'negotiating' | 'converted' | 'lost';
  contactAttempts: number;
  lastContactAt?: string;
  firstResponseTime?: number; // En heures
  escalationLevel: number; // 0 = pas d'escalade, 1 = manager, 2 = direction
  escalatedAt?: string;
  escalatedTo?: string;
}

export interface VIPContactAttempt {
  id: string;
  leadId: string;
  userId: string;
  attemptType: 'email' | 'call' | 'meeting' | 'sms';
  attemptedAt: string;
  result?: 'success' | 'no_answer' | 'voicemail' | 'busy' | 'not_available';
  notes?: string;
  responseReceived?: boolean;
  responseTime?: number; // En minutes
}

/**
 * Détecte si un lead est VIP
 */
export function isVIPLead(lead: Lead): boolean {
  const scoring = lead.scoring || 0;
  const value = lead.value || 0;
  const tags = (lead as any).tags || [];
  const hasVIPTag = tags.some((tag: string) => tag.toLowerCase() === 'vip');
  
  // Critères VIP
  const highScoring = scoring >= 90;
  const highValue = value > 50000;
  const fortune500 = (lead as any).company_size === 'Fortune 500' || 
                     (lead as any).company_size?.includes('5000+');
  const cLevel = (lead as any).title?.toLowerCase().includes('ceo') ||
                 (lead as any).title?.toLowerCase().includes('cto') ||
                 (lead as any).title?.toLowerCase().includes('cfo');
  
  return highScoring || highValue || hasVIPTag || fortune500 || cLevel;
}

/**
 * Détecte la raison pour laquelle un lead est VIP
 */
export function getVIPReason(lead: Lead): string {
  const scoring = lead.scoring || 0;
  const value = lead.value || 0;
  const tags = (lead as any).tags || [];
  
  if (tags.some((tag: string) => tag.toLowerCase() === 'vip')) {
    return 'vip_tag';
  }
  if (scoring >= 90) {
    return 'high_scoring';
  }
  if (value > 50000) {
    return 'high_value';
  }
  if ((lead as any).company_size === 'Fortune 500' || (lead as any).company_size?.includes('5000+')) {
    return 'fortune_500';
  }
  if ((lead as any).title?.toLowerCase().includes('ceo') ||
      (lead as any).title?.toLowerCase().includes('cto') ||
      (lead as any).title?.toLowerCase().includes('cfo')) {
    return 'c_level';
  }
  
  return 'high_scoring'; // Par défaut
}

/**
 * Récupère tous les leads VIP actifs
 */
export async function getVIPLeads(filters?: {
  status?: VIPLead['status'];
  assignedTo?: string;
  priority?: VIPLead['priority'];
}): Promise<VIPLead[]> {
  try {
    // Récupérer tous les leads
    let query = supabase
      .from('leads')
      .select('*')
      .order('scoring', { ascending: false });

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    // Filtrer les leads VIP
    const vipLeadsData: VIPLead[] = [];
    for (const lead of leads || []) {
      if (isVIPLead(lead as Lead)) {
        const vipLead = await enrichVIPLeadData(lead as Lead);
        
        // Appliquer les filtres
        if (filters?.status && vipLead.status !== filters.status) continue;
        if (filters?.assignedTo && vipLead.assignedTo !== filters.assignedTo) continue;
        if (filters?.priority && vipLead.priority !== filters.priority) continue;
        
        vipLeadsData.push(vipLead);
      }
    }

    return vipLeadsData;
  } catch (error) {
    console.error('Erreur récupération leads VIP:', error);
    return [];
  }
}

/**
 * Enrichit les données d'un lead VIP
 */
async function enrichVIPLeadData(lead: Lead): Promise<VIPLead> {
  // Récupérer les tentatives de contact depuis vip_contact_attempts
  const { data: attempts } = await supabase
    .from('vip_contact_attempts')
    .select('*')
    .eq('lead_id', lead.id)
    .order('attempted_at', { ascending: false });

  const contactAttempts = attempts || [];
  const lastAttempt = contactAttempts[0];
  
  // Calculer le temps de première réponse
  let firstResponseTime: number | undefined;
  if (lead.assigned_at && lastAttempt?.response_received) {
    const assignedAt = new Date(lead.assigned_at);
    const responseAt = new Date(lastAttempt.response_received_at || lastAttempt.attempted_at);
    firstResponseTime = (responseAt.getTime() - assignedAt.getTime()) / (1000 * 60 * 60); // En heures
  }

  // Déterminer le statut
  let status: VIPLead['status'] = 'new';
  if (lead.stage === 'Gagné' || lead.lifecycleStage === 'Client') {
    status = 'converted';
  } else if (lead.stage === 'Perdu' || lead.lifecycleStage === 'Perdu') {
    status = 'lost';
  } else if (contactAttempts.length > 0 && lastAttempt?.response_received) {
    status = lead.stage === 'Négociation' ? 'negotiating' : 'contacted';
  }

  // Déterminer la priorité
  const priority: VIPLead['priority'] = 
    (lead.scoring || 0) >= 95 || (lead.value || 0) > 100000 ? 'critical' : 'high';

  // Récupérer le niveau d'escalade depuis assignment_decisions
  const { data: escalation } = await supabase
    .from('assignment_decisions')
    .select('*')
    .eq('lead_id', lead.id)
    .eq('decision_type', 'escalation')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    leadId: lead.id,
    lead,
    detectedAt: (lead as any).vip_detected_at || lead.created_at || new Date().toISOString(),
    reason: getVIPReason(lead),
    priority,
    assignedTo: lead.assigned_to,
    status,
    contactAttempts: contactAttempts.length,
    lastContactAt: lastAttempt?.attempted_at,
    firstResponseTime,
    escalationLevel: escalation ? 1 : 0, // TODO: Gérer plusieurs niveaux
    escalatedAt: escalation?.created_at,
    escalatedTo: escalation?.assigned_user_id,
  };
}

/**
 * Enregistre une tentative de contact sur un lead VIP
 */
export async function recordVIPContactAttempt(
  leadId: string,
  userId: string,
  attemptType: VIPContactAttempt['attemptType'],
  metadata?: {
    result?: VIPContactAttempt['result'];
    notes?: string;
    responseReceived?: boolean;
    responseTime?: number;
  }
): Promise<VIPContactAttempt> {
  try {
    const attempt: Omit<VIPContactAttempt, 'id'> = {
      leadId,
      userId,
      attemptType,
      attemptedAt: new Date().toISOString(),
      result: metadata?.result,
      notes: metadata?.notes,
      responseReceived: metadata?.responseReceived,
      responseTime: metadata?.responseTime,
    };

    const { data, error } = await supabase
      .from('vip_contact_attempts')
      .insert({
        lead_id: leadId,
        user_id: userId,
        attempt_type: attemptType,
        attempted_at: attempt.attemptedAt,
        result: attempt.result,
        notes: attempt.notes,
        response_received: attempt.responseReceived,
        response_received_at: attempt.responseReceived ? new Date().toISOString() : null,
        response_time_minutes: attempt.responseTime,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      ...attempt,
    };
  } catch (error) {
    console.error('Erreur enregistrement tentative contact VIP:', error);
    throw error;
  }
}

/**
 * Vérifie si un lead VIP nécessite une escalade (pas de réponse sous 24h)
 */
export async function checkVIPEscalation(leadId: string): Promise<{
  needsEscalation: boolean;
  hoursSinceAssignment: number;
  escalationLevel: number;
}> {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('assigned_at, assigned_to')
      .eq('id', leadId)
      .single();

    if (!lead?.assigned_at) {
      return { needsEscalation: false, hoursSinceAssignment: 0, escalationLevel: 0 };
    }

    const assignedAt = new Date(lead.assigned_at);
    const now = new Date();
    const hoursSinceAssignment = (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);

    // Vérifier s'il y a eu une réponse
    const { data: attempts } = await supabase
      .from('vip_contact_attempts')
      .select('response_received')
      .eq('lead_id', leadId)
      .order('attempted_at', { ascending: false })
      .limit(1)
      .single();

    const hasResponse = attempts?.response_received === true;

    // Escalade si pas de réponse après 24h
    const needsEscalation = hoursSinceAssignment > 24 && !hasResponse;

    // Vérifier le niveau d'escalade actuel
    const { data: escalations } = await supabase
      .from('assignment_decisions')
      .select('*')
      .eq('lead_id', leadId)
      .eq('decision_type', 'escalation')
      .order('created_at', { ascending: false });

    const escalationLevel = escalations?.length || 0;

    return {
      needsEscalation,
      hoursSinceAssignment,
      escalationLevel,
    };
  } catch (error) {
    console.error('Erreur vérification escalade VIP:', error);
    return { needsEscalation: false, hoursSinceAssignment: 0, escalationLevel: 0 };
  }
}

/**
 * Génère un rapport quotidien sur les leads VIP
 */
export async function generateVIPDailyReport(): Promise<{
  totalVIPLeads: number;
  newVIPLeads: number;
  contactedVIPLeads: number;
  noResponseVIPLeads: number;
  escalatedVIPLeads: number;
  convertedVIPLeads: number;
  averageResponseTime: number;
  leads: VIPLead[];
}> {
  try {
    const vipLeads = await getVIPLeads();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newVIPLeads = vipLeads.filter(vip => {
      const detectedAt = new Date(vip.detectedAt);
      return detectedAt >= oneDayAgo;
    });

    const contactedVIPLeads = vipLeads.filter(vip => vip.status === 'contacted' || vip.status === 'negotiating');
    const noResponseVIPLeads = vipLeads.filter(vip => {
      if (!vip.assignedTo || !vip.lead.assigned_at) return false;
      const assignedAt = new Date(vip.lead.assigned_at);
      const hoursSince = (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);
      return hoursSince > 24 && vip.contactAttempts === 0;
    });
    const escalatedVIPLeads = vipLeads.filter(vip => vip.escalationLevel > 0);
    const convertedVIPLeads = vipLeads.filter(vip => vip.status === 'converted');

    const responseTimes = vipLeads
      .filter(vip => vip.firstResponseTime !== undefined)
      .map(vip => vip.firstResponseTime!);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      totalVIPLeads: vipLeads.length,
      newVIPLeads: newVIPLeads.length,
      contactedVIPLeads: contactedVIPLeads.length,
      noResponseVIPLeads: noResponseVIPLeads.length,
      escalatedVIPLeads: escalatedVIPLeads.length,
      convertedVIPLeads: convertedVIPLeads.length,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      leads: vipLeads,
    };
  } catch (error) {
    console.error('Erreur génération rapport quotidien VIP:', error);
    throw error;
  }
}

/**
 * Envoie des alertes en temps réel pour les leads VIP
 */
export async function sendVIPAlerts(leadId: string, alertType: 'new' | 'no_response' | 'escalation' | 'conversion'): Promise<void> {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('*, assigned_to')
      .eq('id', leadId)
      .single();

    if (!lead) return;

    const vipLead = await enrichVIPLeadData(lead as Lead);
    const assignedUser = lead.assigned_to;

    // Créer une notification in-app
    if (assignedUser) {
      await supabase.from('notifications').insert({
        user_id: assignedUser,
        type: 'vip_alert',
        title: `Lead VIP: ${lead.name || lead.company}`,
        message: getAlertMessage(alertType, vipLead),
        metadata: {
          leadId,
          alertType,
          priority: vipLead.priority,
        },
        read: false,
      });
    }

    // TODO: Envoyer email et SMS selon la configuration
    // await sendEmail(...);
    // await sendSMS(...);
  } catch (error) {
    console.error('Erreur envoi alertes VIP:', error);
  }
}

/**
 * Génère le message d'alerte selon le type
 */
function getAlertMessage(alertType: string, vipLead: VIPLead): string {
  switch (alertType) {
    case 'new':
      return `Nouveau lead VIP détecté : ${vipLead.reason} - Priorité ${vipLead.priority}`;
    case 'no_response':
      return `Lead VIP sans réponse depuis 24h - Escalade requise`;
    case 'escalation':
      return `Lead VIP escaladé vers le niveau ${vipLead.escalationLevel}`;
    case 'conversion':
      return `Lead VIP converti ! Valeur : ${vipLead.lead.value || 0}€`;
    default:
      return 'Alerte lead VIP';
  }
}

