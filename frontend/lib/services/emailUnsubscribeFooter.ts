/**
 * Service pour générer et intégrer le footer de désabonnement dans les emails
 * Conforme RGPD, CAN-SPAM, CASL
 */

import { generateUnsubscribeLink, generatePreferencesLink } from './unsubscriptionService';

export interface EmailFooterConfig {
  leadId: string;
  email: string;
  baseUrl?: string;
  showPreferences?: boolean; // Afficher aussi le lien de gestion des préférences
  locale?: string; // 'fr', 'en', etc.
  companyName?: string;
}

/**
 * Génère le HTML du footer de désabonnement pour les emails marketing
 */
export function generateUnsubscribeFooterHTML(config: EmailFooterConfig): string {
  const unsubscribeLink = generateUnsubscribeLink(config.leadId, config.email, config.baseUrl);
  const preferencesLink = generatePreferencesLink(config.leadId, config.email, config.baseUrl);

  const texts = getUnsubscribeTexts(config.locale || 'fr');

  let footerHTML = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; font-family: Arial, sans-serif;">
      <p style="margin: 10px 0;">
        ${texts.youReceivedThisEmail}
      </p>
      <p style="margin: 10px 0;">
        <a href="${unsubscribeLink}" style="color: #6366f1; text-decoration: underline;">
          ${texts.unsubscribe}
        </a>
  `;

  if (config.showPreferences) {
    footerHTML += `
        <span style="margin: 0 10px;">|</span>
        <a href="${preferencesLink}" style="color: #6366f1; text-decoration: underline;">
          ${texts.managePreferences}
        </a>
    `;
  }

  footerHTML += `
      </p>
      ${config.companyName ? `<p style="margin: 10px 0;">${config.companyName}</p>` : ''}
      <p style="margin: 10px 0; font-size: 11px; color: #9ca3af;">
        ${texts.complianceNote}
      </p>
    </div>
  `;

  return footerHTML;
}

/**
 * Génère le texte plain du footer de désabonnement pour les emails en texte brut
 */
export function generateUnsubscribeFooterText(config: EmailFooterConfig): string {
  const unsubscribeLink = generateUnsubscribeLink(config.leadId, config.email, config.baseUrl);
  const preferencesLink = generatePreferencesLink(config.leadId, config.email, config.baseUrl);

  const texts = getUnsubscribeTexts(config.locale || 'fr');

  let footerText = `\n\n---\n`;
  footerText += `${texts.youReceivedThisEmail}\n`;
  footerText += `${texts.unsubscribe}: ${unsubscribeLink}\n`;

  if (config.showPreferences) {
    footerText += `${texts.managePreferences}: ${preferencesLink}\n`;
  }

  if (config.companyName) {
    footerText += `${config.companyName}\n`;
  }

  footerText += `${texts.complianceNote}\n`;

  return footerText;
}

/**
 * Intègre automatiquement le footer de désabonnement dans le contenu HTML d'un email
 */
export function addUnsubscribeFooterToHTML(
  htmlContent: string,
  config: EmailFooterConfig
): string {
  // Vérifier si le footer existe déjà
  if (htmlContent.includes('unsubscribe') || htmlContent.includes('désabonner')) {
    return htmlContent; // Footer déjà présent
  }

  // Trouver la fin du body ou la dernière balise fermante
  const footerHTML = generateUnsubscribeFooterHTML(config);

  // Si le HTML contient un </body>, insérer avant
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footerHTML}</body>`);
  }

  // Sinon, ajouter à la fin
  return `${htmlContent}${footerHTML}`;
}

/**
 * Intègre automatiquement le footer de désabonnement dans le contenu texte d'un email
 */
export function addUnsubscribeFooterToText(
  textContent: string,
  config: EmailFooterConfig
): string {
  // Vérifier si le footer existe déjà
  if (textContent.includes('unsubscribe') || textContent.includes('désabonner')) {
    return textContent; // Footer déjà présent
  }

  const footerText = generateUnsubscribeFooterText(config);
  return `${textContent}${footerText}`;
}

/**
 * Retourne les textes de désabonnement selon la locale
 */
function getUnsubscribeTexts(locale: string): {
  youReceivedThisEmail: string;
  unsubscribe: string;
  managePreferences: string;
  complianceNote: string;
} {
  const texts: Record<string, any> = {
    fr: {
      youReceivedThisEmail: 'Vous recevez cet email car vous êtes inscrit à notre liste de diffusion.',
      unsubscribe: 'Se désabonner',
      managePreferences: 'Gérer mes préférences',
      complianceNote: 'Conforme RGPD. Vos données sont protégées et vous pouvez vous désabonner à tout moment.',
    },
    en: {
      youReceivedThisEmail: 'You are receiving this email because you are subscribed to our mailing list.',
      unsubscribe: 'Unsubscribe',
      managePreferences: 'Manage Preferences',
      complianceNote: 'GDPR compliant. Your data is protected and you can unsubscribe at any time.',
    },
    es: {
      youReceivedThisEmail: 'Está recibiendo este correo electrónico porque está suscrito a nuestra lista de correo.',
      unsubscribe: 'Darse de baja',
      managePreferences: 'Gestionar preferencias',
      complianceNote: 'Cumple con RGPD. Sus datos están protegidos y puede darse de baja en cualquier momento.',
    },
  };

  return texts[locale] || texts.fr;
}

