import { supabase } from '../supabase';
import { sendEmail, EmailOptions } from './emailService';

export interface AutomatedReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'overview' | 'time' | 'crm' | 'marketing' | 'finance' | 'custom';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_config: Record<string, any>;
  recipients: string[];
  recipients_emails: string[];
  export_format: string[];
  report_config: Record<string, any>;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  template_id?: string;
}

export interface ReportExecution {
  id: string;
  report_id: string;
  execution_status: 'pending' | 'running' | 'completed' | 'failed';
  execution_started_at: string;
  execution_completed_at: string | null;
  export_files: Array<{ format: string; url: string; filename: string }>;
  recipients_sent: string[];
  recipients_failed: string[];
  error_message?: string;
  metadata: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  content_html?: string;
  template_type: string;
  variables?: any[];
}

/**
 * Service pour l'envoi automatique de rapports par email
 */
export class AutomatedReportEmailService {
  /**
   * Génère le contenu HTML d'un email de rapport
   */
  static generateReportEmailHTML(
    report: AutomatedReport,
    execution: ReportExecution,
    template?: EmailTemplate
  ): string {
    const reportName = report.name;
    const reportDate = new Date(execution.execution_started_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const reportType = this.getReportTypeLabel(report.report_type);
    const filesCount = execution.export_files.length;

    if (template && template.content_html) {
      // Utiliser le template personnalisé
      let html = template.content_html;
      
      // Remplacer les variables
      html = html.replace(/\{\{report_name\}\}/g, reportName);
      html = html.replace(/\{\{report_date\}\}/g, reportDate);
      html = html.replace(/\{\{report_type\}\}/g, reportType);
      html = html.replace(/\{\{files_count\}\}/g, String(filesCount));
      html = html.replace(/\{\{execution_id\}\}/g, execution.id);
      
      return html;
    }

    // Template par défaut
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-top: none;
    }
    .report-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .report-info-item {
      margin: 10px 0;
      display: flex;
      justify-content: space-between;
    }
    .report-info-label {
      font-weight: 600;
      color: #64748b;
    }
    .report-info-value {
      color: #1e293b;
    }
    .files-list {
      margin: 20px 0;
    }
    .file-item {
      padding: 12px;
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      margin: 8px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
      margin-top: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport ${reportType}</h1>
    <p>${reportName}</p>
  </div>
  <div class="content">
    <p>Bonjour,</p>
    <p>Votre rapport automatisé <strong>${reportName}</strong> est maintenant disponible.</p>
    
    <div class="report-info">
      <div class="report-info-item">
        <span class="report-info-label">Type de rapport :</span>
        <span class="report-info-value">${reportType}</span>
      </div>
      <div class="report-info-item">
        <span class="report-info-label">Date de génération :</span>
        <span class="report-info-value">${reportDate}</span>
      </div>
      <div class="report-info-item">
        <span class="report-info-label">Formats disponibles :</span>
        <span class="report-info-value">${filesCount} fichier${filesCount > 1 ? 's' : ''}</span>
      </div>
    </div>

    ${execution.export_files.length > 0 ? `
    <div class="files-list">
      <h3>Fichiers joints :</h3>
      ${execution.export_files.map(file => `
        <div class="file-item">
          <strong>${file.filename}</strong> (${file.format.toUpperCase()})
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.description ? `<p><em>${report.description}</em></p>` : ''}
    
    <p>Cordialement,<br>L'équipe AgencyOS</p>
  </div>
  <div class="footer">
    <p>Ce rapport a été généré automatiquement le ${reportDate}</p>
    <p>Vous recevez cet email car vous êtes configuré comme destinataire de ce rapport automatisé.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Génère le contenu texte d'un email de rapport
   */
  static generateReportEmailText(
    report: AutomatedReport,
    execution: ReportExecution,
    template?: EmailTemplate
  ): string {
    const reportName = report.name;
    const reportDate = new Date(execution.execution_started_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const reportType = this.getReportTypeLabel(report.report_type);
    const filesCount = execution.export_files.length;

    if (template && template.content) {
      // Utiliser le template personnalisé
      let text = template.content;
      
      // Remplacer les variables
      text = text.replace(/\{\{report_name\}\}/g, reportName);
      text = text.replace(/\{\{report_date\}\}/g, reportDate);
      text = text.replace(/\{\{report_type\}\}/g, reportType);
      text = text.replace(/\{\{files_count\}\}/g, String(filesCount));
      text = text.replace(/\{\{execution_id\}\}/g, execution.id);
      
      return text;
    }

    // Template par défaut
    return `
Rapport ${reportType} - ${reportName}

Bonjour,

Votre rapport automatisé "${reportName}" est maintenant disponible.

Type de rapport : ${reportType}
Date de génération : ${reportDate}
Formats disponibles : ${filesCount} fichier${filesCount > 1 ? 's' : ''}

${execution.export_files.length > 0 ? `
Fichiers joints :
${execution.export_files.map(file => `- ${file.filename} (${file.format.toUpperCase()})`).join('\n')}
` : ''}

${report.description ? `\n${report.description}\n` : ''}

Cordialement,
L'équipe AgencyOS

---
Ce rapport a été généré automatiquement le ${reportDate}
Vous recevez cet email car vous êtes configuré comme destinataire de ce rapport automatisé.
    `.trim();
  }

  /**
   * Génère le sujet de l'email
   */
  static generateReportEmailSubject(
    report: AutomatedReport,
    execution: ReportExecution,
    template?: EmailTemplate
  ): string {
    const reportName = report.name;
    const reportDate = new Date(execution.execution_started_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    if (template) {
      return template.subject
        .replace(/\{\{report_name\}\}/g, reportName)
        .replace(/\{\{report_date\}\}/g, reportDate)
        .replace(/\{\{execution_id\}\}/g, execution.id);
    }

    return `📊 Rapport automatisé : ${reportName} - ${reportDate}`;
  }

  /**
   * Récupère un template d'email
   */
  static async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching email template:', error);
      return null;
    }

    return data as EmailTemplate;
  }

  /**
   * Envoie un rapport par email
   */
  static async sendReportEmail(
    report: AutomatedReport,
    execution: ReportExecution,
    recipientEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Récupérer le template si configuré
      let template: EmailTemplate | null = null;
      if (report.template_id) {
        template = await this.getEmailTemplate(report.template_id);
      }

      // Générer le contenu de l'email
      const subject = this.generateReportEmailSubject(report, execution, template || undefined);
      const html = this.generateReportEmailHTML(report, execution, template || undefined);
      const text = this.generateReportEmailText(report, execution, template || undefined);

      // Préparer les pièces jointes
      const attachments = await Promise.all(
        execution.export_files.map(async (file) => {
          try {
            // Télécharger le fichier depuis Supabase Storage
            const { data, error } = await supabase.storage
              .from('reports')
              .download(file.url);

            if (error) throw error;

            // Convertir en base64
            const arrayBuffer = await data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );

            return {
              filename: file.filename,
              content: base64,
              contentType: this.getContentType(file.format),
            };
          } catch (error) {
            console.error(`Error loading file ${file.filename}:`, error);
            return null;
          }
        })
      );

      // Filtrer les pièces jointes valides
      const validAttachments = attachments.filter((a): a is NonNullable<typeof a> => a !== null);

      // Envoyer l'email
      const emailOptions: EmailOptions = {
        to: recipientEmail,
        from: 'noreply@agencyos.com', // TODO: Configurer depuis les paramètres
        subject,
        html,
        text,
        attachments: validAttachments.length > 0 ? validAttachments : undefined,
      };

      const result = await sendEmail(emailOptions);

      if (!result.success) {
        return { success: false, error: result.error || 'Erreur inconnue' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error sending report email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un rapport à tous les destinataires
   */
  static async sendReportToAllRecipients(
    report: AutomatedReport,
    execution: ReportExecution
  ): Promise<{ sent: string[]; failed: Array<{ email: string; error: string }> }> {
    const sent: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    // Récupérer les emails des destinataires utilisateurs
    const userEmails: string[] = [];
    if (report.recipients && report.recipients.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('email')
        .in('id', report.recipients);

      if (users) {
        userEmails.push(...users.map(u => u.email).filter((e): e is string => !!e));
      }
    }

    // Combiner avec les emails directs
    const allRecipients = [...new Set([...userEmails, ...(report.recipients_emails || [])])];

    // Envoyer à chaque destinataire
    for (const email of allRecipients) {
      const result = await this.sendReportEmail(report, execution, email);
      
      if (result.success) {
        sent.push(email);
      } else {
        failed.push({ email, error: result.error || 'Erreur inconnue' });
      }
    }

    // Mettre à jour l'exécution
    await supabase
      .from('automated_report_executions')
      .update({
        recipients_sent: sent,
        recipients_failed: failed.map(f => f.email),
        error_message: failed.length > 0 ? `${failed.length} échec(s) d'envoi` : undefined,
      })
      .eq('id', execution.id);

    return { sent, failed };
  }

  /**
   * Traite l'envoi automatique d'un rapport
   */
  static async processAutomatedReport(reportId: string): Promise<void> {
    try {
      // Récupérer le rapport
      const { data: report, error: reportError } = await supabase
        .from('automated_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError || !report) {
        throw new Error('Rapport non trouvé');
      }

      // Vérifier si le rapport est actif
      if (!report.is_active) {
        return;
      }

      // Créer une exécution
      const { data: execution, error: execError } = await supabase
        .from('automated_report_executions')
        .insert([{
          report_id: reportId,
          execution_status: 'running',
          execution_started_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (execError || !execution) {
        throw new Error('Erreur lors de la création de l\'exécution');
      }

      // TODO: Générer les fichiers du rapport
      // Pour l'instant, on simule des fichiers
      const exportFiles: Array<{ format: string; url: string; filename: string }> = [];
      
      for (const format of report.export_format || ['pdf']) {
        // TODO: Générer le fichier réel
        exportFiles.push({
          format,
          url: `reports/${execution.id}.${format}`,
          filename: `${report.name}_${new Date().toISOString().split('T')[0]}.${format}`,
        });
      }

      // Mettre à jour l'exécution avec les fichiers
      await supabase
        .from('automated_report_executions')
        .update({
          export_files: exportFiles,
        })
        .eq('id', execution.id);

      // Envoyer les emails
      const { sent, failed } = await this.sendReportToAllRecipients(report, {
        ...execution,
        export_files: exportFiles,
      });

      // Finaliser l'exécution
      await supabase
        .from('automated_report_executions')
        .update({
          execution_status: failed.length === 0 ? 'completed' : 'failed',
          execution_completed_at: new Date().toISOString(),
          recipients_sent: sent,
          recipients_failed: failed.map(f => f.email),
          error_message: failed.length > 0 ? `${failed.length} échec(s) d'envoi` : undefined,
        })
        .eq('id', execution.id);

      // Mettre à jour le rapport
      await supabase
        .from('automated_reports')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: (report.run_count || 0) + 1,
          next_run_at: this.calculateNextRunAt(report),
        })
        .eq('id', reportId);

    } catch (error: any) {
      console.error('Error processing automated report:', error);
      
      // Marquer l'exécution comme échouée
      await supabase
        .from('automated_report_executions')
        .update({
          execution_status: 'failed',
          execution_completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('report_id', reportId)
        .eq('execution_status', 'running');
    }
  }

  /**
   * Calcule la prochaine date d'exécution
   */
  static calculateNextRunAt(report: AutomatedReport): string {
    const now = new Date();
    const scheduleType = report.schedule_type;
    const scheduleConfig = report.schedule_config || {};

    switch (scheduleType) {
      case 'daily':
        const dailyHour = scheduleConfig.hour || 9;
        const dailyMinute = scheduleConfig.minute || 0;
        const nextDaily = new Date(now);
        nextDaily.setDate(nextDaily.getDate() + 1);
        nextDaily.setHours(dailyHour, dailyMinute, 0, 0);
        return nextDaily.toISOString();

      case 'weekly':
        const weeklyDay = scheduleConfig.dayOfWeek || 1; // 0 = Dimanche, 1 = Lundi, etc.
        const weeklyHour = scheduleConfig.hour || 9;
        const weeklyMinute = scheduleConfig.minute || 0;
        const nextWeekly = new Date(now);
        const daysUntilNext = (weeklyDay - nextWeekly.getDay() + 7) % 7 || 7;
        nextWeekly.setDate(nextWeekly.getDate() + daysUntilNext);
        nextWeekly.setHours(weeklyHour, weeklyMinute, 0, 0);
        return nextWeekly.toISOString();

      case 'monthly':
        const monthlyDay = scheduleConfig.dayOfMonth || 1;
        const monthlyHour = scheduleConfig.hour || 9;
        const monthlyMinute = scheduleConfig.minute || 0;
        const nextMonthly = new Date(now);
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        nextMonthly.setDate(monthlyDay);
        nextMonthly.setHours(monthlyHour, monthlyMinute, 0, 0);
        return nextMonthly.toISOString();

      default:
        return now.toISOString();
    }
  }

  /**
   * Récupère le label d'un type de rapport
   */
  private static getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      overview: 'Vue d\'ensemble',
      time: 'Temps',
      crm: 'CRM',
      marketing: 'Marketing',
      finance: 'Finance',
      custom: 'Personnalisé',
    };
    return labels[type] || type;
  }

  /**
   * Récupère le type MIME d'un format
   */
  private static getContentType(format: string): string {
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return types[format.toLowerCase()] || 'application/octet-stream';
  }
}

