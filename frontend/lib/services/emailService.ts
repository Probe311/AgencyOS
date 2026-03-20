/**
 * Service d'envoi d'emails
 * Interface frontend pour envoyer des emails via l'API backend
 */

export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
  emailId?: string; // ID de l'email pour tracking (optionnel)
  leadId?: string; // ID du lead pour tracking (optionnel)
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Envoie un email via l'API backend
 * @param options - Options d'envoi d'email
 * @returns Résultat de l'envoi
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        from: options.from,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: options.attachments,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
    };
  }
}

/**
 * Prépare un email avec tracking pour l'envoi
 * Ajoute automatiquement le pixel de tracking, les liens trackés et le footer de désabonnement
 * @param options - Options d'envoi d'email
 * @param htmlContent - Contenu HTML de l'email
 * @returns Contenu HTML avec tracking intégré et footer de désabonnement
 */
export async function prepareEmailWithTracking(
  options: EmailOptions,
  htmlContent: string
): Promise<string> {
  const { prepareEmailForTracking } = await import('../utils/emailTracking');
  const { addUnsubscribeFooterToHTML, addUnsubscribeFooterToText } = await import('./emailUnsubscribeFooter');
  
  let processedContent = htmlContent;

  // Ajouter le tracking si les IDs sont disponibles
  if (options.emailId && options.leadId) {
    const baseUrl = window.location.origin;
    processedContent = prepareEmailForTracking(
      processedContent,
      options.emailId,
      options.leadId,
      baseUrl
    );
  }

  // Ajouter le footer de désabonnement si leadId disponible
  if (options.leadId && options.to) {
    const email = options.to.includes('<') 
      ? options.to.match(/<([^>]+)>/)?.[1] || options.to 
      : options.to;

    processedContent = addUnsubscribeFooterToHTML(processedContent, {
      leadId: options.leadId,
      email: email,
      baseUrl: window.location.origin,
      showPreferences: true,
    });
  }

  return processedContent;
}

/**
 * Envoie un email avec tracking automatique et footer de désabonnement
 * @param options - Options d'envoi d'email (doit inclure emailId et leadId pour le tracking)
 * @returns Résultat de l'envoi
 */
export async function sendEmailWithTracking(
  options: EmailOptions
): Promise<EmailResult> {
  // Vérifier le désabonnement avant envoi (pour emails marketing uniquement)
  if (options.leadId) {
    const { isLeadUnsubscribed } = await import('./unsubscriptionService');
    const isUnsubscribed = await isLeadUnsubscribed(options.leadId, 'email_marketing');
    
    if (isUnsubscribed) {
      return {
        success: false,
        error: 'Lead désabonné des emails marketing. Envoi annulé pour conformité RGPD.',
      };
    }
  }

  // Préparer le contenu HTML avec tracking et footer de désabonnement si disponible
  if (options.html && options.leadId) {
    options.html = await prepareEmailWithTracking(options, options.html);
  }

  // Préparer aussi le texte plain avec footer si disponible
  if (options.text && options.leadId && options.to) {
    const { addUnsubscribeFooterToText } = await import('./emailUnsubscribeFooter');
    const email = options.to.includes('<') 
      ? options.to.match(/<([^>]+)>/)?.[1] || options.to 
      : options.to;

    options.text = addUnsubscribeFooterToText(options.text, {
      leadId: options.leadId,
      email: email,
      baseUrl: window.location.origin,
      showPreferences: true,
    });
  }

  // Envoyer l'email
  return await sendEmail(options);
}

/**
 * Formatte une adresse email avec nom
 * @param email - Adresse email
 * @param name - Nom (optionnel)
 * @returns Adresse formatée (ex: "John Doe <john@example.com>")
 */
export function formatEmailAddress(email: string, name?: string): string {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}

/**
 * Extrait l'adresse email d'une chaîne formatée
 * @param formatted - Adresse formatée (ex: "John Doe <john@example.com>")
 * @returns Adresse email
 */
export function extractEmailAddress(formatted: string): string {
  const match = formatted.match(/<([^>]+)>/);
  return match ? match[1] : formatted.trim();
}

/**
 * Valide une adresse email
 * @param email - Adresse email à valider
 * @returns true si valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

