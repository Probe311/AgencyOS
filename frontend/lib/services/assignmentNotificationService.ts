/**
 * Service de notifications pour les actions d'affectation
 * Gère l'envoi de notifications (in-app, email, SMS) lors des affectations de leads
 */

import { supabase } from '../supabase';
import { logInfo, logWarn, logError } from '../utils/logger';
import { sendEmail } from './emailService';
import { Lead } from '../../types';

export interface AssignmentNotificationOptions {
  leadId: string;
  lead?: Lead;
  userId: string; // Utilisateur à notifier
  previousUserId?: string; // Utilisateur précédent (pour réattribution)
  notificationType: 'assigned' | 'reassigned' | 'escalated' | 'transferred' | 'vip_assigned';
  reason?: string;
  inApp?: boolean;
  email?: boolean;
  sms?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Envoie une notification in-app dans la table notifications
 */
async function sendInAppNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        priority,
        read: false,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      logError(`Erreur envoi notification in-app à ${userId}:`, error);
      // Ne pas faire échouer si la table n'existe pas encore
      if (error.code === '42P01') {
        logWarn('Table notifications n\'existe pas encore, notification ignorée');
        return;
      }
      throw error;
    }

    logInfo(`Notification in-app envoyée à ${userId}: ${title}`);
  } catch (err) {
    logError(`Erreur lors de l'envoi de notification in-app:`, err);
    // Ne pas faire échouer l'affectation si la notification échoue
  }
}

/**
 * Envoie une notification email
 */
async function sendEmailNotification(
  userId: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  try {
    // Récupérer l'email de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logWarn(`Utilisateur ${userId} introuvable pour notification email`);
      return;
    }

    await sendEmail({
      to: user.email,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      fromName: 'AgencyOS CRM',
    });

    logInfo(`Notification email envoyée à ${user.email}: ${subject}`);
  } catch (err) {
    logError(`Erreur lors de l'envoi de notification email:`, err);
    // Ne pas faire échouer l'affectation si l'email échoue
  }
}

/**
 * Envoie une notification SMS (placeholder pour intégration future)
 */
async function sendSMSNotification(
  userId: string,
  message: string
): Promise<void> {
  try {
    // Récupérer le téléphone de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logWarn(`Utilisateur ${userId} introuvable pour notification SMS`);
      return;
    }

    // TODO: Intégration avec service SMS (Twilio, MessageBird, etc.)
    logInfo(`[SMS] Notification SMS à envoyer à ${userId}: ${message}`);
    logWarn('Service SMS non encore implémenté');
  } catch (err) {
    logError(`Erreur lors de l'envoi de notification SMS:`, err);
    // Ne pas faire échouer l'affectation si le SMS échoue
  }
}

/**
 * Récupère les informations du lead pour les notifications
 */
async function getLeadInfo(leadId: string): Promise<{ name: string; company: string; scoring?: number; temperature?: string }> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('name, company, scoring, temperature')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return { name: 'Lead inconnu', company: '' };
    }

    return {
      name: lead.name || 'Lead sans nom',
      company: lead.company || '',
      scoring: (lead as any).scoring || (lead as any).quality_score,
      temperature: lead.temperature || undefined,
    };
  } catch (err) {
    logError(`Erreur récupération info lead ${leadId}:`, err);
    return { name: 'Lead inconnu', company: '' };
  }
}

/**
 * Envoie les notifications pour une affectation de lead
 */
export async function sendAssignmentNotifications(
  options: AssignmentNotificationOptions
): Promise<void> {
  const {
    leadId,
    lead,
    userId,
    previousUserId,
    notificationType,
    reason,
    inApp = true,
    email = false,
    sms = false,
    priority = notificationType === 'vip_assigned' ? 'urgent' : notificationType === 'escalated' ? 'high' : 'medium',
  } = options;

  try {
    // Récupérer les informations du lead si non fournies
    const leadInfo = lead ? {
      name: lead.name || 'Lead sans nom',
      company: lead.company || '',
      scoring: (lead as any).scoring || (lead as any).quality_score,
      temperature: lead.temperature || undefined,
    } : await getLeadInfo(leadId);

    // Construire les messages selon le type de notification
    let title: string;
    let message: string;
    let emailSubject: string;
    let emailHtml: string;

    switch (notificationType) {
      case 'assigned':
        title = 'Nouveau lead assigné';
        message = `Le lead "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} vous a été assigné.`;
        emailSubject = `Nouveau lead assigné : ${leadInfo.name}`;
        emailHtml = `
          <h2>Nouveau lead assigné</h2>
          <p>Bonjour,</p>
          <p>Le lead <strong>${leadInfo.name}</strong>${leadInfo.company ? ` de l'entreprise <strong>${leadInfo.company}</strong>` : ''} vous a été assigné.</p>
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          ${leadInfo.scoring ? `<p><strong>Scoring :</strong> ${leadInfo.scoring}/100</p>` : ''}
          ${leadInfo.temperature ? `<p><strong>Température :</strong> ${leadInfo.temperature}</p>` : ''}
          <p><a href="${window.location.origin}/crm?leadId=${leadId}">Voir le lead</a></p>
        `;
        break;

      case 'reassigned':
        title = 'Lead réattribué';
        message = `Le lead "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} vous a été réattribué.${reason ? ` Raison : ${reason}` : ''}`;
        emailSubject = `Lead réattribué : ${leadInfo.name}`;
        emailHtml = `
          <h2>Lead réattribué</h2>
          <p>Bonjour,</p>
          <p>Le lead <strong>${leadInfo.name}</strong>${leadInfo.company ? ` de l'entreprise <strong>${leadInfo.company}</strong>` : ''} vous a été réattribué.</p>
          ${previousUserId ? `<p><em>Ce lead était précédemment assigné à un autre commercial.</em></p>` : ''}
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          <p><a href="${window.location.origin}/crm?leadId=${leadId}">Voir le lead</a></p>
        `;
        break;

      case 'escalated':
        title = 'Lead escaladé';
        message = `Le lead "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} vous a été escaladé.${reason ? ` Raison : ${reason}` : ''}`;
        emailSubject = `Lead escaladé : ${leadInfo.name}`;
        emailHtml = `
          <h2>Lead escaladé</h2>
          <p>Bonjour,</p>
          <p>Le lead <strong>${leadInfo.name}</strong>${leadInfo.company ? ` de l'entreprise <strong>${leadInfo.company}</strong>` : ''} vous a été escaladé et nécessite votre attention.</p>
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          <p><a href="${window.location.origin}/crm?leadId=${leadId}">Voir le lead</a></p>
        `;
        priority = 'high';
        break;

      case 'transferred':
        title = 'Lead transféré';
        message = `Le lead "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} vous a été transféré depuis une autre équipe.`;
        emailSubject = `Lead transféré : ${leadInfo.name}`;
        emailHtml = `
          <h2>Lead transféré</h2>
          <p>Bonjour,</p>
          <p>Le lead <strong>${leadInfo.name}</strong>${leadInfo.company ? ` de l'entreprise <strong>${leadInfo.company}</strong>` : ''} vous a été transféré.</p>
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          <p><a href="${window.location.origin}/crm?leadId=${leadId}">Voir le lead</a></p>
        `;
        break;

      case 'vip_assigned':
        title = '🚨 Lead VIP assigné';
        message = `Lead VIP "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} assigné - Action immédiate requise !`;
        emailSubject = `🚨 Lead VIP assigné : ${leadInfo.name}`;
        emailHtml = `
          <h2 style="color: #dc2626;">🚨 Lead VIP assigné</h2>
          <p>Bonjour,</p>
          <p>Un <strong style="color: #dc2626;">lead VIP</strong> vous a été assigné et nécessite une action immédiate.</p>
          <p><strong>Lead :</strong> ${leadInfo.name}${leadInfo.company ? ` (${leadInfo.company})` : ''}</p>
          ${leadInfo.scoring ? `<p><strong>Scoring :</strong> ${leadInfo.scoring}/100</p>` : ''}
          ${leadInfo.temperature ? `<p><strong>Température :</strong> ${leadInfo.temperature}</p>` : ''}
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          <p><strong style="color: #dc2626;">Veuillez contacter ce lead dans les 24 heures.</strong></p>
          <p><a href="${window.location.origin}/crm?leadId=${leadId}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le lead VIP</a></p>
        `;
        priority = 'urgent';
        break;
    }

    // Envoyer notification in-app
    if (inApp) {
      await sendInAppNotification(
        userId,
        title,
        message,
        `assignment_${notificationType}`,
        priority,
        {
          leadId,
          notificationType,
          reason,
          leadName: leadInfo.name,
          leadCompany: leadInfo.company,
        }
      );
    }

    // Envoyer notification email
    if (email) {
      await sendEmailNotification(userId, emailSubject, emailHtml);
    }

    // Envoyer notification SMS (pour VIP uniquement)
    if (sms || notificationType === 'vip_assigned') {
      await sendSMSNotification(userId, message);
    }

    // Si réattribution, notifier aussi l'ancien commercial (si fourni)
    if (notificationType === 'reassigned' && previousUserId && previousUserId !== userId) {
      const previousTitle = 'Lead réattribué à un autre commercial';
      const previousMessage = `Le lead "${leadInfo.name}"${leadInfo.company ? ` (${leadInfo.company})` : ''} a été réattribué à un autre commercial.${reason ? ` Raison : ${reason}` : ''}`;

      if (inApp) {
        await sendInAppNotification(
          previousUserId,
          previousTitle,
          previousMessage,
          'assignment_reassigned_previous',
          'medium',
          {
            leadId,
            newUserId: userId,
            reason,
            leadName: leadInfo.name,
            leadCompany: leadInfo.company,
          }
        );
      }

      if (email) {
        const previousEmailHtml = `
          <h2>Lead réattribué</h2>
          <p>Bonjour,</p>
          <p>Le lead <strong>${leadInfo.name}</strong>${leadInfo.company ? ` de l'entreprise <strong>${leadInfo.company}</strong>` : ''} qui vous était assigné a été réattribué à un autre commercial.</p>
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
          <p><a href="${window.location.origin}/crm?leadId=${leadId}">Voir le lead</a></p>
        `;
        await sendEmailNotification(previousUserId, `Lead réattribué : ${leadInfo.name}`, previousEmailHtml);
      }
    }

    logInfo(`Notifications envoyées pour affectation ${notificationType} du lead ${leadId} à ${userId}`);
  } catch (err) {
    logError(`Erreur lors de l'envoi des notifications d'affectation:`, err);
    // Ne pas faire échouer l'affectation si les notifications échouent
  }
}

/**
 * Notifie un commercial qu'il est surchargé
 */
export async function notifyUserOverload(
  userId: string,
  currentLeadCount: number,
  maxLeads: number
): Promise<void> {
  try {
    const title = '⚠️ Charge de travail élevée';
    const message = `Votre charge de travail est élevée : ${currentLeadCount}/${maxLeads} leads actifs. Les nouveaux leads ne vous seront plus attribués automatiquement jusqu'à réduction de votre charge.`;

    await sendInAppNotification(
      userId,
      title,
      message,
      'workload_overload',
      'medium',
      {
        currentLeadCount,
        maxLeads,
      }
    );

    logInfo(`Notification de surcharge envoyée à ${userId}`);
  } catch (err) {
    logError(`Erreur notification surcharge pour ${userId}:`, err);
  }
}

/**
 * Notifie un manager lors d'une escalade
 */
export async function notifyManagerEscalation(
  managerId: string,
  leadId: string,
  leadName: string,
  reason: string,
  commercialId?: string
): Promise<void> {
  try {
    const title = '🚨 Escalade de lead';
    const message = `Le lead "${leadName}" nécessite une escalade.${reason ? ` Raison : ${reason}` : ''}`;

    await sendInAppNotification(
      managerId,
      title,
      message,
      'escalation',
      'high',
      {
        leadId,
        leadName,
        reason,
        commercialId,
      }
    );

    // Envoyer aussi un email pour les escalades
    const emailHtml = `
      <h2 style="color: #dc2626;">🚨 Escalade de lead</h2>
      <p>Bonjour,</p>
      <p>Le lead <strong>${leadName}</strong> nécessite une escalade et votre intervention.</p>
      ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
      ${commercialId ? `<p><em>Ce lead était précédemment assigné à un commercial qui a besoin de votre support.</em></p>` : ''}
      <p><a href="${window.location.origin}/crm?leadId=${leadId}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le lead</a></p>
    `;
    await sendEmailNotification(managerId, `Escalade : ${leadName}`, emailHtml);

    logInfo(`Notification d'escalade envoyée au manager ${managerId}`);
  } catch (err) {
    logError(`Erreur notification escalade pour manager ${managerId}:`, err);
  }
}

