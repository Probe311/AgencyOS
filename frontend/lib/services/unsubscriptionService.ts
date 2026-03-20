/**
 * Service de gestion du désabonnement (Opt-out)
 * Conforme RGPD, CAN-SPAM, CASL
 * Gère les désabonnements partiels/totaux, préférences, historique
 */

import { supabase } from '../supabase';

export interface UnsubscriptionRecord {
  id: string;
  leadId: string;
  email: string;
  unsubscribedEmailMarketing: boolean;
  unsubscribedEmailTransactional: boolean;
  unsubscribedSMS: boolean;
  unsubscribedWhatsApp: boolean;
  unsubscribedAt?: string;
  unsubscribedReason?: string;
  unsubscribedFrom?: string; // Canal utilisé: 'email', 'sms', 'whatsapp', 'manual', 'import'
  ipAddress?: string;
  userAgent?: string;
  reactivatedAt?: string;
  reactivatedBy?: string;
  consentHistory?: Array<{
    date: string;
    action: 'unsubscribe' | 'reactivate' | 'update';
    channel?: string;
    reason?: string;
  }>;
}

export interface UnsubscriptionPreferences {
  emailMarketing: boolean;
  emailTransactional: boolean;
  sms: boolean;
  whatsApp: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly'; // Pour emails marketing
  contentTypes?: string[]; // Types de contenu désirés (newsletter, promotions, etc.)
}

/**
 * Génère un token unique pour le lien de désabonnement
 */
export function generateUnsubscribeToken(leadId: string, email: string): string {
  // Générer un token sécurisé basé sur l'ID du lead et l'email
  // En production, utiliser une méthode cryptographique sécurisée
  const timestamp = Date.now();
  const data = `${leadId}:${email}:${timestamp}`;
  // Simuler un hash (en production, utiliser crypto.createHash)
  return btoa(data).replace(/[+/=]/g, '');
}

/**
 * Vérifie si un token de désabonnement est valide
 */
export async function validateUnsubscribeToken(token: string): Promise<{ leadId: string; email: string } | null> {
  try {
    // Décoder le token
    const decoded = atob(token);
    const [leadId, email, timestamp] = decoded.split(':');

    if (!leadId || !email) {
      return null;
    }

    // Vérifier que le token n'est pas trop ancien (30 jours max)
    const tokenAge = Date.now() - parseInt(timestamp || '0');
    if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    // Vérifier que le lead existe toujours
    const { data: lead } = await supabase
      .from('leads')
      .select('id, email')
      .eq('id', leadId)
      .eq('email', email)
      .single();

    if (!lead) {
      return null;
    }

    return { leadId, email };
  } catch (error) {
    console.error('Erreur validation token désabonnement:', error);
    return null;
  }
}

/**
 * Génère le lien de désabonnement pour un email
 */
export function generateUnsubscribeLink(leadId: string, email: string, baseUrl?: string): string {
  const token = generateUnsubscribeToken(leadId, email);
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.agencyos.com');
  return `${url}/unsubscribe?token=${token}`;
}

/**
 * Génère le lien de gestion des préférences
 */
export function generatePreferencesLink(leadId: string, email: string, baseUrl?: string): string {
  const token = generateUnsubscribeToken(leadId, email);
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.agencyos.com');
  return `${url}/preferences?token=${token}`;
}

/**
 * Désabonne un lead (partiel ou total)
 */
export async function unsubscribeLead(
  leadId: string,
  preferences: Partial<UnsubscriptionPreferences>,
  options?: {
    reason?: string;
    from?: string; // 'email', 'sms', 'whatsapp', 'manual', 'import'
    ipAddress?: string;
    userAgent?: string;
    userId?: string; // Si désabonnement manuel
  }
): Promise<UnsubscriptionRecord> {
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

    // Récupérer ou créer l'enregistrement de préférences
    const { data: existingPrefs } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    const now = new Date().toISOString();
    const unsubscribedAt = existingPrefs?.unsubscribed_at || now;

    // Mettre à jour les préférences
    const updateData: any = {
      lead_id: leadId,
      email: lead.email || '',
      unsubscribed_email_marketing: preferences.emailMarketing !== undefined
        ? preferences.emailMarketing
        : existingPrefs?.unsubscribed_email_marketing || false,
      unsubscribed_email_transactional: preferences.emailTransactional !== undefined
        ? preferences.emailTransactional
        : existingPrefs?.unsubscribed_email_transactional || false,
      unsubscribed_sms: preferences.sms !== undefined
        ? preferences.sms
        : existingPrefs?.unsubscribed_sms || false,
      unsubscribed_whatsapp: preferences.whatsApp !== undefined
        ? preferences.whatsApp
        : existingPrefs?.unsubscribed_whatsapp || false,
      unsubscribed_at: unsubscribedAt,
      unsubscribed_reason: options?.reason || existingPrefs?.unsubscribed_reason,
      unsubscribed_from: options?.from || existingPrefs?.unsubscribed_from || 'manual',
      ip_address: options?.ipAddress || existingPrefs?.ip_address,
      user_agent: options?.userAgent || existingPrefs?.user_agent,
      frequency: preferences.frequency || existingPrefs?.frequency,
      content_types: preferences.contentTypes || existingPrefs?.content_types || [],
    };

    // Ajouter à l'historique des consentements
    const consentHistory = existingPrefs?.consent_history || [];
    consentHistory.push({
      date: now,
      action: 'unsubscribe',
      channel: options?.from,
      reason: options?.reason,
    });

    updateData.consent_history = consentHistory;

    // Sauvegarder les préférences
    const { data: savedPrefs, error: saveError } = await supabase
      .from('lead_preferences')
      .upsert(updateData, { onConflict: 'lead_id' })
      .select()
      .single();

    if (saveError) {
      console.warn('Table lead_preferences non disponible:', saveError);
      // Fallback: mettre à jour directement dans leads
      await supabase
        .from('leads')
        .update({
          unsubscribed: preferences.emailMarketing || preferences.emailTransactional || preferences.sms || preferences.whatsApp,
          unsubscribed_at: now,
          unsubscribed_reason: options?.reason,
        })
        .eq('id', leadId);

      return {
        id: `unsub_${leadId}_${Date.now()}`,
        leadId,
        email: lead.email || '',
        unsubscribedEmailMarketing: preferences.emailMarketing || false,
        unsubscribedEmailTransactional: preferences.emailTransactional || false,
        unsubscribedSMS: preferences.sms || false,
        unsubscribedWhatsApp: preferences.whatsApp || false,
        unsubscribedAt: now,
        unsubscribedReason: options?.reason,
        unsubscribedFrom: options?.from || 'manual',
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        consentHistory: consentHistory as any,
      };
    }

    // Enregistrer dans l'historique (sales_activities)
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'unsubscribed',
        subject: 'Désabonnement',
        description: `Désabonnement ${options?.from || 'manuel'}${options?.reason ? `: ${options.reason}` : ''}`,
        activity_date: now,
        metadata: {
          unsubscribed_channels: {
            email_marketing: updateData.unsubscribed_email_marketing,
            email_transactional: updateData.unsubscribed_email_transactional,
            sms: updateData.unsubscribed_sms,
            whatsapp: updateData.unsubscribed_whatsapp,
          },
          reason: options?.reason,
          from: options?.from,
        },
      });

    // Retirer le lead de toutes les listes marketing si désabonnement total
    if (updateData.unsubscribed_email_marketing) {
      await removeLeadFromAllMailingLists(leadId);
    }

    // Pauser les séquences d'automation actives
    await pauseAutomationSequencesForLead(leadId);

    return formatUnsubscriptionRecord(savedPrefs);
  } catch (error) {
    console.error('Erreur désabonnement lead:', error);
    throw error;
  }
}

/**
 * Réabonne un lead avec consentement explicite
 */
export async function reactivateLead(
  leadId: string,
  preferences: Partial<UnsubscriptionPreferences>,
  options?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    doubleOptIn?: boolean; // Envoyer un email de confirmation
  }
): Promise<UnsubscriptionRecord> {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) {
      throw new Error('Lead non trouvé');
    }

    // Récupérer les préférences existantes
    const { data: existingPrefs } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    const now = new Date().toISOString();
    const consentHistory = existingPrefs?.consent_history || [];

    // Mettre à jour les préférences (réactivation)
    const updateData: any = {
      lead_id: leadId,
      email: lead.email || '',
      unsubscribed_email_marketing: preferences.emailMarketing === false ? false : existingPrefs?.unsubscribed_email_marketing || false,
      unsubscribed_email_transactional: preferences.emailTransactional === false ? false : existingPrefs?.unsubscribed_email_transactional || false,
      unsubscribed_sms: preferences.sms === false ? false : existingPrefs?.unsubscribed_sms || false,
      unsubscribed_whatsapp: preferences.whatsApp === false ? false : existingPrefs?.unsubscribed_whatsapp || false,
      reactivated_at: now,
      reactivated_by: options?.userId || 'system',
      frequency: preferences.frequency || existingPrefs?.frequency,
      content_types: preferences.contentTypes || existingPrefs?.content_types || [],
    };

    // Ajouter à l'historique
    consentHistory.push({
      date: now,
      action: 'reactivate',
      reason: 'Réabonnement avec consentement explicite',
    });

    updateData.consent_history = consentHistory;

    // Si double opt-in activé, envoyer un email de confirmation
    if (options?.doubleOptIn) {
      // TODO: Envoyer email de confirmation
      // Le lead sera vraiment réabonné après confirmation
      updateData.pending_reactivation = true;
      updateData.reactivation_token = generateUnsubscribeToken(leadId, lead.email || '');
    }

    const { data: savedPrefs, error: saveError } = await supabase
      .from('lead_preferences')
      .upsert(updateData, { onConflict: 'lead_id' })
      .select()
      .single();

    if (saveError) {
      console.warn('Table lead_preferences non disponible:', saveError);
      // Fallback
      await supabase
        .from('leads')
        .update({
          unsubscribed: false,
          reactivated_at: now,
        })
        .eq('id', leadId);

      return {
        id: `reactivate_${leadId}_${Date.now()}`,
        leadId,
        email: lead.email || '',
        unsubscribedEmailMarketing: false,
        unsubscribedEmailTransactional: false,
        unsubscribedSMS: false,
        unsubscribedWhatsApp: false,
        reactivatedAt: now,
        reactivatedBy: options?.userId,
        consentHistory: consentHistory as any,
      };
    }

    // Enregistrer dans l'historique
    await supabase
      .from('sales_activities')
      .insert({
        lead_id: leadId,
        activity_type: 'reactivated',
        subject: 'Réabonnement',
        description: 'Réabonnement avec consentement explicite',
        activity_date: now,
        metadata: {
          reactivated_by: options?.userId,
          double_opt_in: options?.doubleOptIn,
        },
      });

    return formatUnsubscriptionRecord(savedPrefs);
  } catch (error) {
    console.error('Erreur réabonnement lead:', error);
    throw error;
  }
}

/**
 * Récupère les préférences d'un lead
 */
export async function getLeadPreferences(leadId: string): Promise<UnsubscriptionRecord | null> {
  try {
    const { data, error } = await supabase
      .from('lead_preferences')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (error) {
      // Fallback: vérifier dans leads
      const { data: lead } = await supabase
        .from('leads')
        .select('unsubscribed, unsubscribed_at, unsubscribed_reason')
        .eq('id', leadId)
        .single();

      if (lead) {
        return {
          id: `pref_${leadId}`,
          leadId,
          email: '',
          unsubscribedEmailMarketing: lead.unsubscribed || false,
          unsubscribedEmailTransactional: false,
          unsubscribedSMS: false,
          unsubscribedWhatsApp: false,
          unsubscribedAt: lead.unsubscribed_at,
          unsubscribedReason: lead.unsubscribed_reason,
        };
      }

      return null;
    }

    return formatUnsubscriptionRecord(data);
  } catch (error) {
    console.error('Erreur récupération préférences lead:', error);
    return null;
  }
}

/**
 * Vérifie si un lead est désabonné pour un canal spécifique
 */
export async function isLeadUnsubscribed(
  leadId: string,
  channel: 'email_marketing' | 'email_transactional' | 'sms' | 'whatsapp'
): Promise<boolean> {
  try {
    const preferences = await getLeadPreferences(leadId);

    if (!preferences) {
      return false; // Pas de préférences = pas désabonné
    }

    switch (channel) {
      case 'email_marketing':
        return preferences.unsubscribedEmailMarketing;
      case 'email_transactional':
        return preferences.unsubscribedEmailTransactional;
      case 'sms':
        return preferences.unsubscribedSMS;
      case 'whatsapp':
        return preferences.unsubscribedWhatsApp;
      default:
        return false;
    }
  } catch (error) {
    console.error('Erreur vérification désabonnement:', error);
    return false;
  }
}

/**
 * Retire un lead de toutes les listes de diffusion marketing
 */
async function removeLeadFromAllMailingLists(leadId: string): Promise<void> {
  try {
    // Retirer de email_segment_members
    await supabase
      .from('email_segment_members')
      .delete()
      .eq('lead_id', leadId);

    // Retirer de mailing_list_members
    await supabase
      .from('mailing_list_members')
      .delete()
      .eq('lead_id', leadId);

    // Ajouter à mailing_list_exclusions
    await supabase
      .from('mailing_list_exclusions')
      .upsert({
        lead_id: leadId,
        reason: 'unsubscribed',
        excluded_from_all: true,
        excluded_at: new Date().toISOString(),
      }, { onConflict: 'lead_id' });
  } catch (error) {
    console.error('Erreur retrait listes de diffusion:', error);
  }
}

/**
 * Pause les séquences d'automation actives pour un lead
 */
async function pauseAutomationSequencesForLead(leadId: string): Promise<void> {
  try {
    // Mettre en pause les inscriptions actives dans les séquences
    await supabase
      .from('automation_enrollments')
      .update({
        status: 'paused',
        paused_reason: 'Lead désabonné',
        paused_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('status', 'active');
  } catch (error) {
    console.error('Erreur pause séquences automation:', error);
  }
}

/**
 * Traite un désabonnement par SMS/WhatsApp (mots-clés STOP)
 */
export async function processSMSTopout(
  leadId: string,
  message: string,
  channel: 'sms' | 'whatsapp'
): Promise<boolean> {
  try {
    const stopKeywords = ['stop', 'arrêt', 'arrete', 'unsubscribe', 'desabonner', 'desinscription'];
    const messageLower = message.toLowerCase().trim();

    // Vérifier si le message contient un mot-clé STOP
    const hasStopKeyword = stopKeywords.some(keyword => messageLower.includes(keyword));

    if (!hasStopKeyword) {
      return false;
    }

    // Désabonner le lead du canal SMS/WhatsApp uniquement
    await unsubscribeLead(
      leadId,
      {
        sms: channel === 'sms',
        whatsApp: channel === 'whatsapp',
      },
      {
        from: channel,
        reason: 'STOP via SMS/WhatsApp',
      }
    );

    // TODO: Envoyer message de confirmation
    // "Vous êtes désabonné. Vous continuerez à recevoir des emails transactionnels."

    return true;
  } catch (error) {
    console.error('Erreur traitement STOP SMS/WhatsApp:', error);
    return false;
  }
}

/**
 * Importe une liste de désabonnement depuis un CSV/Excel
 */
export async function importUnsubscriptionList(
  records: Array<{
    email: string;
    date?: string;
    reason?: string;
    channels?: string[]; // ['email_marketing', 'sms', etc.]
  }>
): Promise<{ imported: number; failed: number; errors: string[] }> {
  try {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Trouver le lead par email
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', record.email)
          .single();

        if (!lead) {
          failed++;
          errors.push(`Lead non trouvé pour ${record.email}`);
          continue;
        }

        // Désabonner selon les canaux spécifiés
        const preferences: Partial<UnsubscriptionPreferences> = {};
        if (record.channels) {
          preferences.emailMarketing = record.channels.includes('email_marketing');
          preferences.sms = record.channels.includes('sms');
          preferences.whatsApp = record.channels.includes('whatsapp');
        } else {
          // Par défaut, désabonner de tout
          preferences.emailMarketing = true;
          preferences.sms = true;
          preferences.whatsApp = true;
        }

        await unsubscribeLead(lead.id, preferences, {
          from: 'import',
          reason: record.reason || 'Import liste de désabonnement',
        });

        imported++;
      } catch (error: any) {
        failed++;
        errors.push(`Erreur pour ${record.email}: ${error.message}`);
      }
    }

    // Enregistrer l'import dans les logs d'audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        user_name: 'System',
        action_type: 'unsubscription_list_imported',
        resource_type: 'import',
        resource_id: `import_${Date.now()}`,
        action: `Import liste de désabonnement: ${imported} importés, ${failed} échecs`,
        details: {
          imported,
          failed,
          errors,
        },
      });

    return { imported, failed, errors };
  } catch (error) {
    console.error('Erreur import liste désabonnement:', error);
    throw error;
  }
}

/**
 * Formate un enregistrement de désabonnement depuis les données de la base
 */
function formatUnsubscriptionRecord(data: any): UnsubscriptionRecord {
  return {
    id: data.id,
    leadId: data.lead_id,
    email: data.email || '',
    unsubscribedEmailMarketing: data.unsubscribed_email_marketing || false,
    unsubscribedEmailTransactional: data.unsubscribed_email_transactional || false,
    unsubscribedSMS: data.unsubscribed_sms || false,
    unsubscribedWhatsApp: data.unsubscribed_whatsapp || false,
    unsubscribedAt: data.unsubscribed_at,
    unsubscribedReason: data.unsubscribed_reason,
    unsubscribedFrom: data.unsubscribed_from,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    reactivatedAt: data.reactivated_at,
    reactivatedBy: data.reactivated_by,
    consentHistory: data.consent_history || [],
  };
}

