/**
 * Utilitaires pour le tracking d'emails
 * Génère les URLs de tracking pour les pixels et les liens
 */

/**
 * Génère une URL de tracking pour le pixel d'ouverture d'email
 * @param emailId - ID de l'email envoyé
 * @param leadId - ID du lead destinataire
 * @param baseUrl - URL de base de l'application (ex: https://app.agencyos.com)
 * @returns URL du pixel de tracking
 */
export const generateTrackingPixelUrl = (
  emailId: string,
  leadId: string,
  baseUrl: string = window.location.origin
): string => {
  const params = new URLSearchParams({
    email_id: emailId,
    lead_id: leadId,
    type: 'open',
  });

  // Encode les paramètres dans l'URL
  // Dans un vrai système, on utiliserait un endpoint API dédié
  return `${baseUrl}/api/tracking/email?${params.toString()}`;
};

/**
 * Génère une URL de tracking pour un lien dans un email
 * @param originalUrl - URL originale à rediriger
 * @param emailId - ID de l'email
 * @param leadId - ID du lead
 * @param linkId - ID unique du lien (optionnel, pour différencier plusieurs liens)
 * @param baseUrl - URL de base de l'application
 * @returns URL de tracking qui redirige vers l'URL originale après tracking
 */
export const generateTrackingLinkUrl = (
  originalUrl: string,
  emailId: string,
  leadId: string,
  linkId?: string,
  baseUrl: string = window.location.origin
): string => {
  const params = new URLSearchParams({
    url: encodeURIComponent(originalUrl),
    email_id: emailId,
    lead_id: leadId,
    type: 'click',
  });

  if (linkId) {
    params.append('link_id', linkId);
  }

  // URL de redirection avec tracking
  // Dans un vrai système, on utiliserait un endpoint API qui track puis redirige
  return `${baseUrl}/api/tracking/redirect?${params.toString()}`;
};

/**
 * Insère le pixel de tracking dans le HTML d'un email
 * @param emailHtml - HTML de l'email
 * @param trackingPixelUrl - URL du pixel de tracking
 * @returns HTML avec le pixel inséré
 */
export const insertTrackingPixel = (emailHtml: string, trackingPixelUrl: string): string => {
  const trackingImg = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  
  // Insérer avant la balise fermante </body>
  if (emailHtml.includes('</body>')) {
    return emailHtml.replace('</body>', `${trackingImg}</body>`);
  }
  
  // Si pas de </body>, ajouter à la fin
  return `${emailHtml}${trackingImg}`;
};

/**
 * Remplace tous les liens dans un email par des URLs de tracking
 * @param emailHtml - HTML de l'email
 * @param emailId - ID de l'email
 * @param leadId - ID du lead
 * @param baseUrl - URL de base
 * @returns HTML avec les liens trackés
 */
export const trackLinksInEmail = (
  emailHtml: string,
  emailId: string,
  leadId: string,
  baseUrl: string = window.location.origin
): string => {
  // Expression régulière pour trouver tous les liens <a href="...">
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  
  let linkCounter = 0;
  
  return emailHtml.replace(linkRegex, (match, originalUrl) => {
    // Ignorer les liens déjà trackés ou les liens spéciaux (mailto:, tel:, #, etc.)
    if (
      originalUrl.startsWith('mailto:') ||
      originalUrl.startsWith('tel:') ||
      originalUrl.startsWith('#') ||
      originalUrl.includes('/api/tracking/')
    ) {
      return match;
    }

    linkCounter++;
    const trackingUrl = generateTrackingLinkUrl(originalUrl, emailId, leadId, `link-${linkCounter}`, baseUrl);
    
    // Remplacer l'URL dans le lien
    return match.replace(originalUrl, trackingUrl);
  });
};

/**
 * Prépare un email HTML pour le tracking (pixel + liens)
 * @param emailHtml - HTML original de l'email
 * @param emailId - ID de l'email
 * @param leadId - ID du lead
 * @param baseUrl - URL de base
 * @returns HTML avec tracking intégré
 */
export const prepareEmailForTracking = (
  emailHtml: string,
  emailId: string,
  leadId: string,
  baseUrl: string = window.location.origin
): string => {
  // 1. Ajouter le pixel de tracking
  const trackingPixelUrl = generateTrackingPixelUrl(emailId, leadId, baseUrl);
  let trackedHtml = insertTrackingPixel(emailHtml, trackingPixelUrl);

  // 2. Remplacer les liens par des URLs trackées
  trackedHtml = trackLinksInEmail(trackedHtml, emailId, leadId, baseUrl);

  return trackedHtml;
};

/**
 * Extrait les informations de tracking depuis une URL
 * @param url - URL contenant les paramètres de tracking
 * @returns Objet avec les paramètres de tracking
 */
export const parseTrackingUrl = (url: string): {
  emailId?: string;
  leadId?: string;
  type?: 'open' | 'click';
  linkId?: string;
  originalUrl?: string;
} => {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    return {
      emailId: params.get('email_id') || undefined,
      leadId: params.get('lead_id') || undefined,
      type: (params.get('type') as 'open' | 'click') || undefined,
      linkId: params.get('link_id') || undefined,
      originalUrl: params.get('url') ? decodeURIComponent(params.get('url')!) : undefined,
    };
  } catch (error) {
    console.error('Error parsing tracking URL:', error);
    return {};
  }
};

