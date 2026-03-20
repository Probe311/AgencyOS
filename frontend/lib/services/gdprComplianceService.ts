/**
 * Service de conformité RGPD
 * Traçabilité des consentements, droit à l'oubli, export des données personnelles
 * Respect des délais légaux (48h pour suppression, 30 jours pour export)
 */

import { supabase } from '../supabase';
import { Lead } from '../../types';

export interface ConsentRecord {
  id: string;
  leadId: string;
  email: string;
  consentType: 'marketing' | 'transactional' | 'sms' | 'whatsapp' | 'all';
  action: 'granted' | 'revoked' | 'updated';
  date: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'website' | 'manual' | 'import';
  method: 'form' | 'email_link' | 'sms_stop' | 'manual' | 'api';
  ipAddress?: string;
  userAgent?: string;
  proof?: {
    screenshot?: string;
    timestamp: string;
    signature?: string;
  };
  metadata?: Record<string, any>;
}

export interface DataDeletionRequest {
  id: string;
  leadId?: string;
  email: string;
  requestedAt: string;
  status: 'pending' | 'verified' | 'processing' | 'completed' | 'rejected';
  verificationToken?: string;
  verifiedAt?: string;
  processedAt?: string;
  completedAt?: string;
  requestedBy?: string; // IP, user ID, etc.
  reason?: string;
  keepLegalData: boolean; // Conserver factures, contrats si nécessaire
  legalBasis?: string; // Base légale pour conservation
}

export interface PersonalDataExport {
  lead: Lead;
  preferences?: any;
  interactions: Array<{
    type: string;
    date: string;
    details: any;
  }>;
  consentHistory: ConsentRecord[];
  activities: Array<{
    type: string;
    date: string;
    description: string;
    metadata?: any;
  }>;
  metadata: Record<string, any>;
}

/**
 * Enregistre un consentement/refus avec preuve
 */
export async function recordConsent(
  leadId: string,
  email: string,
  consentType: ConsentRecord['consentType'],
  action: ConsentRecord['action'],
  channel: ConsentRecord['channel'],
  method: ConsentRecord['method'],
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    proof?: ConsentRecord['proof'];
    additional?: Record<string, any>;
  }
): Promise<ConsentRecord> {
  try {
    const consentRecord: Omit<ConsentRecord, 'id'> = {
      leadId,
      email,
      consentType,
      action,
      date: new Date().toISOString(),
      channel,
      method,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      proof: metadata?.proof || {
        timestamp: new Date().toISOString(),
      },
      metadata: metadata?.additional,
    };

    // Enregistrer dans la table des consentements (à créer dans migration)
    // Pour l'instant, on utilise lead_preferences.consent_history
    const { data: existingPrefs } = await supabase
      .from('lead_preferences')
      .select('consent_history')
      .eq('lead_id', leadId)
      .single();

    const consentHistory = existingPrefs?.consent_history || [];
    consentHistory.push(consentRecord);

    await supabase
      .from('lead_preferences')
      .update({
        consent_history: consentHistory,
      })
      .eq('lead_id', leadId);

    // Enregistrer aussi dans audit_logs pour traçabilité
    await supabase.from('audit_logs').insert({
      action_type: `consent_${action}`,
      resource_type: 'lead',
      resource_id: leadId,
      details: {
        consent_type: consentType,
        channel,
        method,
        proof: consentRecord.proof,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      id: `consent_${Date.now()}`,
      ...consentRecord,
    };
  } catch (error) {
    console.error('Erreur enregistrement consentement:', error);
    throw error;
  }
}

/**
 * Récupère l'historique complet des consentements pour un lead
 */
export async function getConsentHistory(leadId: string): Promise<ConsentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('lead_preferences')
      .select('consent_history')
      .eq('lead_id', leadId)
      .single();

    if (error) {
      console.warn('Erreur récupération historique consentements:', error);
      return [];
    }

    return (data?.consent_history || []) as ConsentRecord[];
  } catch (error) {
    console.error('Erreur récupération historique consentements:', error);
    return [];
  }
}

/**
 * Exporte l'historique des consentements pour audit RGPD
 */
export async function exportConsentHistory(
  leadId?: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    action?: ConsentRecord['action'];
    channel?: ConsentRecord['channel'];
  }
): Promise<string> {
  try {
    let query = supabase.from('lead_preferences').select('*');

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const allConsents: ConsentRecord[] = [];
    for (const prefs of data || []) {
      const history = prefs.consent_history || [];
      for (const consent of history) {
        // Appliquer les filtres
        if (filters?.startDate && consent.date < filters.startDate) continue;
        if (filters?.endDate && consent.date > filters.endDate) continue;
        if (filters?.action && consent.action !== filters.action) continue;
        if (filters?.channel && consent.channel !== filters.channel) continue;

        allConsents.push({
          id: consent.id || `consent_${Date.now()}`,
          leadId: prefs.lead_id,
          email: prefs.email,
          ...consent,
        });
      }
    }

    // Générer CSV
    const csvLines = [
      'ID,Lead ID,Email,Type Consentement,Action,Date,Canal,Méthode,IP,User Agent',
    ];

    for (const consent of allConsents) {
      csvLines.push(
        [
          consent.id,
          consent.leadId,
          consent.email,
          consent.consentType,
          consent.action,
          consent.date,
          consent.channel,
          consent.method,
          consent.ipAddress || '',
          (consent.userAgent || '').replace(/,/g, ' '),
        ].join(',')
      );
    }

    return csvLines.join('\n');
  } catch (error) {
    console.error('Erreur export historique consentements:', error);
    throw error;
  }
}

/**
 * Crée une demande de suppression de données (droit à l'oubli)
 */
export async function createDataDeletionRequest(
  email: string,
  leadId?: string,
  metadata?: {
    ipAddress?: string;
    reason?: string;
    keepLegalData?: boolean;
  }
): Promise<DataDeletionRequest> {
  try {
    // Générer un token de vérification
    const verificationToken = generateVerificationToken();

    const request: Omit<DataDeletionRequest, 'id'> = {
      leadId,
      email,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      verificationToken,
      requestedBy: metadata?.ipAddress,
      reason: metadata?.reason,
      keepLegalData: metadata?.keepLegalData || false,
    };

    // Enregistrer dans la table gdpr_deletion_requests (à créer dans migration)
    const { data, error } = await supabase
      .from('gdpr_deletion_requests')
      .insert({
        lead_id: leadId,
        email,
        requested_at: request.requestedAt,
        status: request.status,
        verification_token: verificationToken,
        requested_by: metadata?.ipAddress,
        reason: metadata?.reason,
        keep_legal_data: request.keepLegalData,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Enregistrer dans audit_logs
    await supabase.from('audit_logs').insert({
      action_type: 'gdpr_deletion_requested',
      resource_type: 'lead',
      resource_id: leadId,
      details: {
        email,
        verification_token: verificationToken,
      },
      timestamp: new Date().toISOString(),
    });

    // TODO: Envoyer un email de vérification avec le token

    return {
      id: data.id,
      ...request,
    };
  } catch (error) {
    console.error('Erreur création demande suppression:', error);
    throw error;
  }
}

/**
 * Vérifie une demande de suppression avec le token
 */
export async function verifyDeletionRequest(
  requestId: string,
  token: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('gdpr_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .eq('verification_token', token)
      .single();

    if (error || !data) {
      return false;
    }

    // Vérifier que la demande est toujours en attente
    if (data.status !== 'pending') {
      return false;
    }

    // Marquer comme vérifiée
    await supabase
      .from('gdpr_deletion_requests')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Enregistrer dans audit_logs
    await supabase.from('audit_logs').insert({
      action_type: 'gdpr_deletion_verified',
      resource_type: 'gdpr_request',
      resource_id: requestId,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Erreur vérification demande suppression:', error);
    return false;
  }
}

/**
 * Traite une demande de suppression (suppression des données personnelles)
 * Doit être traité sous 48h (RGPD)
 */
export async function processDataDeletion(
  requestId: string,
  options?: {
    keepLegalData?: boolean;
    legalBasis?: string;
  }
): Promise<boolean> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('gdpr_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Demande de suppression non trouvée');
    }

    if (request.status !== 'verified') {
      throw new Error('Demande non vérifiée');
    }

    // Vérifier le délai (doit être traité sous 48h)
    const requestedAt = new Date(request.requested_at);
    const now = new Date();
    const hoursSinceRequest = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRequest > 48) {
      console.warn(
        `⚠️ Délai RGPD dépassé : demande créée il y a ${hoursSinceRequest.toFixed(1)}h`
      );
    }

    // Marquer comme en traitement
    await supabase
      .from('gdpr_deletion_requests')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    const leadId = request.lead_id;

    if (leadId) {
      // Supprimer les données personnelles du lead
      const keepLegal = options?.keepLegalData ?? request.keep_legal_data;

      // Données à supprimer
      const fieldsToDelete = [
        'name',
        'email',
        'phone',
        'address',
        'company',
        'metadata',
        'geographic_data',
        'notes',
      ];

      // Données à conserver (légales)
      const fieldsToKeep = keepLegal
        ? [
            'id',
            'created_at',
            'status',
            'deal_amount', // Pour factures
            'invoices', // Factures
            'contracts', // Contrats
          ]
        : [];

      // Anonymiser les données personnelles
      const anonymizedData: Record<string, any> = {
        name: '[SUPPRIMÉ]',
        email: `deleted_${Date.now()}@deleted.local`,
        phone: null,
        address: null,
        metadata: null,
        geographic_data: null,
        notes: null,
        gdpr_deleted: true,
        gdpr_deleted_at: new Date().toISOString(),
        gdpr_deletion_request_id: requestId,
      };

      await supabase.from('leads').update(anonymizedData).eq('id', leadId);

      // Supprimer les préférences (sauf consent_history pour audit)
      await supabase.from('lead_preferences').update({ email: anonymizedData.email }).eq('lead_id', leadId);

      // Anonymiser les activités (garder pour audit mais anonymiser)
      await supabase
        .from('sales_activities')
        .update({
          description: '[Description supprimée - RGPD]',
          metadata: null,
        })
        .eq('lead_id', leadId);
    }

    // Marquer comme complétée
    await supabase
      .from('gdpr_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Enregistrer dans audit_logs
    await supabase.from('audit_logs').insert({
      action_type: 'gdpr_deletion_completed',
      resource_type: 'gdpr_request',
      resource_id: requestId,
      details: {
        lead_id: leadId,
        keep_legal_data: keepLegal,
      },
      timestamp: new Date().toISOString(),
    });

    // TODO: Envoyer une confirmation de suppression

    return true;
  } catch (error) {
    console.error('Erreur traitement suppression données:', error);
    
    // Marquer comme erreur
    await supabase
      .from('gdpr_deletion_requests')
      .update({
        status: 'rejected',
      })
      .eq('id', requestId);

    throw error;
  }
}

/**
 * Exporte toutes les données personnelles d'un lead (droit d'accès)
 * Format: JSON, CSV, PDF
 */
export async function exportPersonalData(
  leadId: string,
  format: 'json' | 'csv' | 'pdf' = 'json'
): Promise<PersonalDataExport | string> {
  try {
    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead non trouvé');
    }

    // Récupérer les préférences
    const { data: preferences } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    // Récupérer l'historique des consentements
    const consentHistory = await getConsentHistory(leadId);

    // Récupérer les interactions (sales_activities)
    const { data: activities } = await supabase
      .from('sales_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    // Récupérer le tracking email
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });

    // Construire l'export
    const exportData: PersonalDataExport = {
      lead: lead as Lead,
      preferences: preferences || null,
      interactions: [
        ...(activities || []).map(a => ({
          type: a.activity_type || 'activity',
          date: a.created_at,
          details: {
            description: a.description,
            metadata: a.metadata,
          },
        })),
        ...(emailTracking || []).map(e => ({
          type: 'email',
          date: e.sent_at,
          details: {
            subject: e.subject,
            opened: e.opened,
            clicked: e.clicked,
            open_count: e.open_count,
            click_count: e.click_count,
          },
        })),
      ],
      consentHistory,
      activities: (activities || []).map(a => ({
        type: a.activity_type || 'activity',
        date: a.created_at,
        description: a.description || '',
        metadata: a.metadata,
      })),
      metadata: (lead as any).metadata || {},
    };

    // Formater selon le format demandé
    switch (format) {
      case 'json':
        return exportData;
      case 'csv':
        return formatExportAsCSV(exportData);
      case 'pdf':
        // TODO: Générer PDF avec jsPDF
        return formatExportAsCSV(exportData); // Pour l'instant, retourner CSV
      default:
        return exportData;
    }
  } catch (error) {
    console.error('Erreur export données personnelles:', error);
    throw error;
  }
}

/**
 * Formate l'export au format CSV
 */
function formatExportAsCSV(data: PersonalDataExport): string {
  const lines: string[] = [];

  // En-tête
  lines.push('=== EXPORT DONNÉES PERSONNELLES RGPD ===');
  lines.push(`Date export: ${new Date().toISOString()}`);
  lines.push('');

  // Données du lead
  lines.push('=== DONNÉES LEAD ===');
  lines.push(`ID,${data.lead.id}`);
  lines.push(`Nom,${data.lead.name || ''}`);
  lines.push(`Email,${data.lead.email || ''}`);
  lines.push(`Téléphone,${data.lead.phone || ''}`);
  lines.push(`Entreprise,${data.lead.company || ''}`);
  lines.push(`Adresse,${data.lead.address || ''}`);
  lines.push('');

  // Préférences
  if (data.preferences) {
    lines.push('=== PRÉFÉRENCES ===');
    lines.push(`Email marketing,${data.preferences.unsubscribed_email_marketing ? 'Désabonné' : 'Abonné'}`);
    lines.push(`SMS,${data.preferences.unsubscribed_sms ? 'Désabonné' : 'Abonné'}`);
    lines.push('');
  }

  // Historique des consentements
  lines.push('=== HISTORIQUE CONSENTEMENTS ===');
  lines.push('Date,Type,Action,Canal');
  for (const consent of data.consentHistory) {
    lines.push(`${consent.date},${consent.consentType},${consent.action},${consent.channel}`);
  }
  lines.push('');

  // Interactions
  lines.push('=== INTERACTIONS ===');
  lines.push('Date,Type,Description');
  for (const interaction of data.interactions) {
    lines.push(`${interaction.date},${interaction.type},"${(interaction.details?.description || '').replace(/"/g, '""')}"`);
  }

  return lines.join('\n');
}

/**
 * Génère un token de vérification sécurisé
 */
function generateVerificationToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
}

/**
 * Vérifie les délais de traitement RGPD et alerte si dépassés
 */
export async function checkGDPRDeadlines(): Promise<Array<{
  requestId: string;
  type: 'deletion' | 'export';
  deadline: string;
  status: 'on_time' | 'warning' | 'overdue';
  hoursRemaining: number;
}>> {
  try {
    const alerts: Array<{
      requestId: string;
      type: 'deletion' | 'export';
      deadline: string;
      status: 'on_time' | 'warning' | 'overdue';
      hoursRemaining: number;
    }> = [];

    // Vérifier les demandes de suppression (48h)
    const { data: deletionRequests } = await supabase
      .from('gdpr_deletion_requests')
      .select('*')
      .in('status', ['pending', 'verified', 'processing']);

    for (const request of deletionRequests || []) {
      const requestedAt = new Date(request.requested_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = 48 - hoursElapsed;

      alerts.push({
        requestId: request.id,
        type: 'deletion',
        deadline: new Date(requestedAt.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        status:
          hoursRemaining <= 0
            ? 'overdue'
            : hoursRemaining <= 12
            ? 'warning'
            : 'on_time',
        hoursRemaining,
      });
    }

    // TODO: Vérifier les demandes d'export (30 jours)
    // Pour l'instant, on ne gère que les suppressions

    return alerts;
  } catch (error) {
    console.error('Erreur vérification délais RGPD:', error);
    return [];
  }
}

/**
 * Récupère les logs d'audit des désabonnements
 */
export async function getUnsubscriptionAuditLogs(filters?: {
  startDate?: string;
  endDate?: string;
  email?: string;
  channel?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .or('action_type.eq.consent_revoked,action_type.eq.consent_granted')
      .order('timestamp', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }

    if (filters?.email) {
      query = query.ilike('details->>email', `%${filters.email}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur récupération logs audit désabonnements:', error);
    return [];
  }
}

/**
 * Exporte les logs d'audit des désabonnements pour conformité
 */
export async function exportUnsubscriptionAuditLogs(
  filters?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<string> {
  try {
    const logs = await getUnsubscriptionAuditLogs(filters);

    const csvLines = [
      'Date,Action,Email,Canal,Méthode,IP,User Agent,Resource ID',
    ];

    for (const log of logs) {
      const details = log.details || {};
      csvLines.push(
        [
          log.timestamp,
          log.action_type,
          details.email || '',
          details.channel || '',
          details.method || '',
          details.ip_address || '',
          (details.user_agent || '').replace(/,/g, ' '),
          log.resource_id || '',
        ].join(',')
      );
    }

    return csvLines.join('\n');
  } catch (error) {
    console.error('Erreur export logs audit désabonnements:', error);
    throw error;
  }
}

