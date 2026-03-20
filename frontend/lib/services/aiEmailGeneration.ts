/**
 * Service de génération IA de messages d'emails
 * Génération automatique selon contexte, ton, canal
 * Optimisation pour engagement
 */

import { callGeminiAPI } from '../ai-client';
import { Lead } from '../../types';
import { replaceVariables, getLeadVariables } from '../utils/variableReplacement';

export interface EmailGenerationContext {
  lead: Lead;
  scenario?: string; // 'onboarding', 'nurturing', 'relance', 'conversion'
  objective?: string; // 'qualification', 'conversion', 'engagement', 'rétention'
  previousEmails?: Array<{ subject: string; sentAt: string }>; // Historique des emails envoyés
  lastInteraction?: string; // Dernière interaction avec le lead
  daysSinceLastActivity?: number; // Nombre de jours depuis la dernière activité
}

export interface EmailGenerationOptions {
  tone?: 'professional' | 'casual' | 'technical' | 'sales'; // Ton du message
  channel?: 'email' | 'sms' | 'whatsapp' | 'in_app'; // Canal de communication
  length?: 'short' | 'medium' | 'long'; // Longueur du message
  includeCTA?: boolean; // Inclure un call-to-action
  ctaText?: string; // Texte du CTA personnalisé
  language?: string; // Langue du message (fr, en, es)
  optimizeForEngagement?: boolean; // Optimiser pour engagement (timing, sujet, structure)
}

export interface GeneratedEmail {
  subject: string;
  htmlContent: string;
  textContent: string;
  cta?: string;
  estimatedOpenRate?: number; // Estimation taux d'ouverture
  estimatedClickRate?: number; // Estimation taux de clic
  optimalSendTime?: string; // Heure optimale d'envoi
  warnings?: string[]; // Avertissements (ton, longueur, etc.)
}

/**
 * Génère un email personnalisé selon le contexte
 */
export async function generateEmail(
  context: EmailGenerationContext,
  options: EmailGenerationOptions = {}
): Promise<GeneratedEmail> {
  try {
    // Adapter automatiquement le ton selon le délai depuis la dernière interaction
    const adaptedTone = adaptToneByDelay(context, options.tone);
    
    const {
      tone = adaptedTone,
      channel = 'email',
      length = 'medium',
      includeCTA = true,
      ctaText,
      language = 'fr',
      optimizeForEngagement = true,
    } = options;

    // Construire le prompt pour l'IA
    const prompt = buildGenerationPrompt(context, options);

    // Générer le contenu avec l'IA
    const generatedContent = await callGeminiAPI(prompt, {
      model: 'gemini-3-pro-preview',
      retryConfig: {
        maxRetries: 2,
        initialDelay: 2000
      }
    });

    // Parser la réponse de l'IA (format JSON ou texte structuré)
    const email = parseGeneratedContent(generatedContent, context.lead);

    // Remplacer les variables avec les vraies données du lead
    const leadVariables = getLeadVariables(context.lead);
    const variableContext = { lead: context.lead, ...leadVariables };
    email.subject = replaceVariables(email.subject, variableContext);
    email.htmlContent = replaceVariables(email.htmlContent, variableContext);
    email.textContent = replaceVariables(email.textContent, variableContext);
    if (email.cta) {
      email.cta = replaceVariables(email.cta, variableContext);
    }

    // Adapter le contenu selon le délai depuis la dernière interaction
    if (context.daysSinceLastActivity !== undefined) {
      email.htmlContent = adaptContentByDelay(context, email.htmlContent);
      email.textContent = adaptContentByDelay(context, email.textContent);
    }

    // Adapter selon le canal
    const adaptedEmail = adaptEmailToChannel(email, channel, length);

    // Optimiser pour l'engagement si demandé
    if (optimizeForEngagement) {
      adaptedEmail.optimalSendTime = calculateOptimalSendTime(context.lead);
      adaptedEmail.estimatedOpenRate = estimateOpenRate(adaptedEmail.subject, context);
      adaptedEmail.estimatedClickRate = estimateClickRate(adaptedEmail, context);
    }

    // Valider le contenu
    const validation = validateEmailContent(adaptedEmail, tone, channel, length);
    adaptedEmail.warnings = validation.warnings;

    return adaptedEmail;
  } catch (error) {
    console.error('Erreur génération email IA:', error);
    throw error;
  }
}

/**
 * Construit le prompt pour la génération IA
 */
function buildGenerationPrompt(
  context: EmailGenerationContext,
  options: EmailGenerationOptions
): string {
  const lead = context.lead;
  const leadData = {
    nom: lead.name || lead.company || 'Contact',
    prénom: extractFirstName(lead.name || ''),
    entreprise: lead.company || '',
    secteur: (lead as any).sector || '',
    scoring: (lead as any).scoring || (lead as any).quality_score || 0,
    température: (lead as any).temperature || '',
    famille: (lead as any).family || '',
    valeur_potentielle: (lead as any).estimated_value || (lead as any).deal_amount || 0,
  };

  const toneDescriptions = {
    professional: 'Ton professionnel, formel, respectueux et structuré',
    casual: 'Ton décontracté, amical, conversationnel et moderne',
    technical: 'Ton technique, spécialisé, détaillé et précis',
    sales: 'Ton commercial, persuasif, orienté résultats avec CTA clair',
  };

  const channelDescriptions = {
    email: 'Format email long, structuré, HTML avec pièces jointes possibles',
    sms: 'Format SMS court (160 caractères max), texte simple, lien court',
    whatsapp: 'Format WhatsApp conversationnel, emojis, médias possibles',
    in_app: 'Format notification in-app court, action rapide',
  };

  const lengthDescriptions = {
    short: '150 mots maximum',
    medium: '150-300 mots',
    long: '300-500 mots',
  };

  let prompt = `Génère un email personnalisé pour un lead avec les caractéristiques suivantes :

**Profil du lead :**
- Nom : ${leadData.nom}
- Entreprise : ${leadData.entreprise}
- Secteur : ${leadData.secteur}
- Scoring : ${leadData.scoring}/100
- Température : ${leadData.température}
- Famille : ${leadData.famille}
- Valeur potentielle : ${leadData.valeur_potentielle}€

**Contexte :**
- Scénario : ${context.scenario || 'général'}
- Objectif : ${context.objective || 'engagement'}
${context.lastInteraction ? `- Dernière interaction : ${context.lastInteraction}` : ''}
${context.daysSinceLastActivity !== undefined ? `- Jours depuis dernière activité : ${context.daysSinceLastActivity} jours` : ''}
${context.previousEmails && context.previousEmails.length > 0 ? `- Emails précédents envoyés : ${context.previousEmails.length}` : ''}

**Adaptation selon délai :**
${context.daysSinceLastActivity !== undefined && context.daysSinceLastActivity < 7 
  ? '- Relance douce : Ton amical, pas d\'urgence, contenu informatif'
  : context.daysSinceLastActivity !== undefined && context.daysSinceLastActivity < 30
  ? '- Relance modérée : Ton professionnel avec urgence modérée, rappel des bénéfices'
  : context.daysSinceLastActivity !== undefined && context.daysSinceLastActivity < 90
  ? '- Relance forte : Ton commercial avec urgence, CTA fort, escalade'
  : context.daysSinceLastActivity !== undefined
  ? '- Relance très forte : Ton commercial très persuasif, offre spéciale, urgence maximale'
  : ''}

**Instructions :**
- Ton : ${toneDescriptions[tone]}
- Canal : ${channelDescriptions[channel]}
- Longueur : ${lengthDescriptions[length]}
- Langue : ${language}
${includeCTA ? `- Inclure un CTA : ${ctaText || 'Appel à l\'action adapté au contexte'}` : ''}

**Structure requise :**
1. Sujet optimisé pour ouverture (personnalisé, bénéfice clair)
2. Introduction accrocheuse
3. Corps avec valeur ajoutée
4. ${includeCTA ? 'CTA clair et actionnable' : 'Conclusion'}

**Variables disponibles :**
{{nom}}, {{prénom}}, {{entreprise}}, {{secteur}}, {{scoring}}, {{température}}, {{valeur_potentielle}}

Génère le contenu au format JSON :
{
  "subject": "Sujet de l'email",
  "htmlContent": "Contenu HTML avec variables {{variable}}",
  "textContent": "Contenu texte avec variables {{variable}}",
  "cta": "Texte du CTA"
}`;

  return prompt;
}

/**
 * Parse le contenu généré par l'IA
 */
function parseGeneratedContent(
  content: string,
  lead: Lead
): GeneratedEmail {
  try {
    // Essayer de parser comme JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || 'Email personnalisé',
        htmlContent: parsed.htmlContent || parsed.html_content || '',
        textContent: parsed.textContent || parsed.text_content || '',
        cta: parsed.cta,
      };
    }

    // Si ce n'est pas du JSON, extraire le sujet et le contenu
    const subjectMatch = content.match(/Sujet[:\s]+(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Email personnalisé';

    // Extraire le contenu HTML et texte
    const htmlMatch = content.match(/HTML[:\s]+([\s\S]*?)(?:TEXTE|$)/i);
    const textMatch = content.match(/TEXTE[:\s]+([\s\S]*?)$/i);

    return {
      subject,
      htmlContent: htmlMatch ? htmlMatch[1].trim() : content,
      textContent: textMatch ? textMatch[1].trim() : content,
    };
  } catch (error) {
    console.error('Erreur parsing contenu IA:', error);
    // Retourner un template par défaut
    return {
      subject: `Bonjour ${lead.name || lead.company || 'Contact'}`,
      htmlContent: `<p>Bonjour,</p><p>Nous espérons que vous allez bien.</p>`,
      textContent: `Bonjour,\n\nNous espérons que vous allez bien.`,
    };
  }
}

/**
 * Adapte l'email selon le canal
 */
function adaptEmailToChannel(
  email: GeneratedEmail,
  channel: string,
  length: string
): GeneratedEmail {
  let adapted = { ...email };

  switch (channel) {
    case 'sms':
      // Limiter à 160 caractères
      adapted.textContent = adapted.textContent.substring(0, 160);
      adapted.htmlContent = ''; // Pas de HTML pour SMS
      break;

    case 'whatsapp':
      // Format conversationnel avec emojis
      adapted.htmlContent = adapted.textContent; // WhatsApp supporte le texte simple
      break;

    case 'in_app':
      // Format court pour notification
      adapted.textContent = adapted.textContent.substring(0, 200);
      adapted.htmlContent = '';
      break;

    case 'email':
    default:
      // Adapter la longueur
      if (length === 'short') {
        // Limiter à 150 mots
        adapted.htmlContent = truncateToWords(adapted.htmlContent, 150);
        adapted.textContent = truncateToWords(adapted.textContent, 150);
      } else if (length === 'long') {
        // Étendre à 500 mots si nécessaire
        // (l'IA génère déjà assez de contenu)
      }
      break;
  }

  return adapted;
}

/**
 * Calcule l'heure optimale d'envoi
 */
function calculateOptimalSendTime(lead: Lead): string {
  // Heures optimales : 10h, 14h, 16h (selon fuseau horaire du lead)
  // Pour l'instant, retourner une heure par défaut
  // TODO: Prendre en compte le fuseau horaire du lead
  const optimalHours = [10, 14, 16];
  const randomHour = optimalHours[Math.floor(Math.random() * optimalHours.length)];
  return `${randomHour}:00`;
}

/**
 * Estime le taux d'ouverture
 */
function estimateOpenRate(subject: string, context: EmailGenerationContext): number {
  let score = 50; // Base 50%

  // Facteurs positifs
  if (subject.includes(context.lead.name || '')) {
    score += 10; // Personnalisation
  }
  if (subject.length < 50) {
    score += 5; // Sujet court
  }
  if (subject.includes('?')) {
    score += 5; // Question dans le sujet
  }
  if (context.scenario === 'onboarding') {
    score += 10; // Email de bienvenue
  }

  // Facteurs négatifs
  if (subject.length > 70) {
    score -= 10; // Sujet trop long
  }
  if (subject.toLowerCase().includes('spam') || subject.toLowerCase().includes('urgent')) {
    score -= 15; // Mots spam
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Estime le taux de clic
 */
function estimateClickRate(email: GeneratedEmail, context: EmailGenerationContext): number {
  let score = 3; // Base 3%

  // Facteurs positifs
  if (email.cta) {
    score += 2; // CTA présent
  }
  if (email.htmlContent.includes('button') || email.htmlContent.includes('bouton')) {
    score += 1; // Bouton visible
  }
  if (context.scenario === 'nurturing') {
    score += 1; // Nurturing = engagement
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Valide le contenu de l'email
 */
function validateEmailContent(
  email: GeneratedEmail,
  tone: string,
  channel: string,
  length: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Vérifier la longueur
  const wordCount = email.htmlContent.split(/\s+/).length;
  if (length === 'short' && wordCount > 150) {
    warnings.push('Le contenu est plus long que prévu (150 mots max)');
  } else if (length === 'medium' && (wordCount < 150 || wordCount > 300)) {
    warnings.push(`Le contenu devrait être entre 150 et 300 mots (actuellement ${wordCount})`);
  }

  // Vérifier le sujet
  if (email.subject.length > 70) {
    warnings.push('Le sujet est trop long (70 caractères recommandés)');
  }

  // Vérifier le CTA
  if (!email.cta && channel === 'email') {
    warnings.push('Aucun CTA détecté dans l\'email');
  }

  // Vérifier le canal SMS
  if (channel === 'sms' && email.textContent.length > 160) {
    warnings.push('Le message SMS dépasse 160 caractères');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Tronque un texte à un nombre de mots
 */
function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Extrait le prénom depuis le nom complet
 */
function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Adapte automatiquement le ton selon le délai depuis la dernière interaction
 */
function adaptToneByDelay(
  context: EmailGenerationContext,
  defaultTone?: 'professional' | 'casual' | 'technical' | 'sales'
): 'professional' | 'casual' | 'technical' | 'sales' {
  // Si un ton est explicitement défini, l'utiliser
  if (defaultTone) {
    return defaultTone;
  }

  // Calculer le délai depuis la dernière interaction
  let daysSinceLastActivity = context.daysSinceLastActivity;
  
  if (!daysSinceLastActivity && context.lastInteraction) {
    const lastInteractionDate = new Date(context.lastInteraction);
    const now = new Date();
    daysSinceLastActivity = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Si pas de dernière interaction, utiliser la date de création du lead
  if (!daysSinceLastActivity && context.lead.created_at) {
    const createdDate = new Date(context.lead.created_at);
    const now = new Date();
    daysSinceLastActivity = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Adapter le ton selon le délai
  if (daysSinceLastActivity === undefined || daysSinceLastActivity < 7) {
    // < 7 jours : Relance douce (ton amical, pas d'urgence)
    return 'casual';
  } else if (daysSinceLastActivity < 30) {
    // 7-30 jours : Relance modérée (ton professionnel avec urgence modérée)
    return 'professional';
  } else if (daysSinceLastActivity < 90) {
    // 30-90 jours : Relance forte (ton commercial avec urgence)
    return 'sales';
  } else {
    // > 90 jours : Relance très forte (ton commercial très persuasif)
    return 'sales';
  }
}

/**
 * Adapte le contenu selon le délai depuis la dernière interaction
 */
function adaptContentByDelay(
  context: EmailGenerationContext,
  baseContent: string
): string {
  let daysSinceLastActivity = context.daysSinceLastActivity;
  
  if (!daysSinceLastActivity && context.lastInteraction) {
    const lastInteractionDate = new Date(context.lastInteraction);
    const now = new Date();
    daysSinceLastActivity = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (daysSinceLastActivity === undefined || daysSinceLastActivity < 7) {
    // < 7 jours : Contenu amical, pas d'urgence
    return baseContent;
  } else if (daysSinceLastActivity < 30) {
    // 7-30 jours : Ajouter une légère urgence
    return baseContent.replace(
      /(Bonjour|Salut)/i,
      (match) => `${match} - Nous aimerions avoir de vos nouvelles`
    );
  } else if (daysSinceLastActivity < 90) {
    // 30-90 jours : Ajouter urgence et bénéfices
    return `Nous n'avons pas eu de nouvelles depuis ${daysSinceLastActivity} jours. ${baseContent}`;
  } else {
    // > 90 jours : Contenu très urgent avec offre spéciale
    return `Il y a ${daysSinceLastActivity} jours que nous n'avons pas eu de contact. ${baseContent} Nous avons une offre spéciale pour vous !`;
  }
}

/**
 * Génère plusieurs variantes d'un email pour A/B testing
 */
export async function generateEmailVariants(
  context: EmailGenerationContext,
  options: EmailGenerationOptions,
  variantCount: number = 2
): Promise<GeneratedEmail[]> {
  const variants: GeneratedEmail[] = [];

  // Variante A : Ton professionnel
  const variantA = await generateEmail(context, { ...options, tone: 'professional' });
  variants.push({ ...variantA, subject: `[A] ${variantA.subject}` });

  // Variante B : Ton décontracté
  const variantB = await generateEmail(context, { ...options, tone: 'casual' });
  variants.push({ ...variantB, subject: `[B] ${variantB.subject}` });

  // Variante C : Sujet différent si demandé
  if (variantCount >= 3) {
    const variantC = await generateEmail(context, { ...options, tone: 'sales' });
    variants.push({ ...variantC, subject: `[C] ${variantC.subject}` });
  }

  return variants;
}

/**
 * Calcule le nombre de jours depuis la dernière activité d'un lead
 */
export async function calculateDaysSinceLastActivity(lead: Lead): Promise<number | undefined> {
  try {
    if (!lead.last_activity_date) {
      // Si pas de dernière activité, utiliser la date de création
      if (lead.created_at) {
        const createdDate = new Date(lead.created_at);
        const now = new Date();
        return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      return undefined;
    }

    const lastActivityDate = new Date(lead.last_activity_date);
    const now = new Date();
    return Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days since last activity:', error);
    return undefined;
  }
}

/**
 * Crée un contexte de génération d'email enrichi avec le délai depuis la dernière activité
 */
export async function createEmailContext(
  lead: Lead,
  scenario?: string,
  objective?: string
): Promise<EmailGenerationContext> {
  const daysSinceLastActivity = await calculateDaysSinceLastActivity(lead);
  
  return {
    lead,
    scenario,
    objective,
    daysSinceLastActivity,
    lastInteraction: lead.last_activity_date || lead.created_at,
  };
}

