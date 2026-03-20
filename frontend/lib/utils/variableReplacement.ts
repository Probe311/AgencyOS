/**
 * Service de remplacement de variables dynamiques dans les templates
 * Supporte toutes les variables de personnalisation des messages
 */

import { Lead } from '../../types';
import { supabase } from '../supabase';

export interface VariableContext {
  lead?: Lead;
  [key: string]: any;
}

/**
 * Formate un prénom avec capitalisation
 */
function formatFirstName(name: string | null | undefined): string {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Extrait le prénom depuis un nom complet
 */
function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Formate la température avec emoji
 */
function formatTemperature(temperature: string | null | undefined): string {
  if (!temperature) return 'Non définie';
  const emojiMap: Record<string, string> = {
    'Chaud': '🔥 Chaud',
    'Tiède': '🌡️ Tiède',
    'Froid': '❄️ Froid',
  };
  return emojiMap[temperature] || temperature;
}

/**
 * Formate la date relative
 */
function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return 'Non définie';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Date invalide';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays > 1 && diffDays <= 7) return `il y a ${diffDays} jours`;
  if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  if (diffDays > 30 && diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `il y a ${months} mois`;
  }

  // Format complet si plus d'un an
  return dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Récupère toutes les variables disponibles depuis un lead
 */
export function getLeadVariables(lead: Lead): Record<string, any> {
  const variables: Record<string, any> = {};

  // Données contact
  variables.nom = lead.name || '';
  variables.prénom = extractFirstName(lead.name);
  variables.nom_complet = lead.name || '';
  variables.fonction = (lead as any).function || (lead as any).job_title || '';
  variables.téléphone = lead.phone || '';
  variables.email = lead.email || '';

  // Données entreprise
  variables.entreprise = lead.company || '';
  variables.secteur = lead.sector || lead.industry || '';
  variables.taille_entreprise = lead.company_size || '';
  variables.localisation = lead.address || '';
  variables.ville = (lead as any).city || '';
  variables.région = (lead as any).region || '';

  // Données contexte
  variables.scoring = (lead as any)?.scoring || (lead as any)?.quality_score || 0;
  variables.température = formatTemperature(lead.temperature);
  variables.étape_pipeline = lead.status || '';
  variables.statut = lead.status || '';
  variables.valeur_potentielle = (lead as any).estimated_value || (lead as any).deal_amount || 0;

  // Données comportementales (seront enrichies si async appelé)
  variables.dernière_interaction = ''; // Sera calculé depuis sales_activities
  variables.nombre_visites = 0; // Sera calculé depuis website_visits
  variables.ressources_téléchargées = ''; // Sera calculé depuis resource_downloads
  variables.intérêts = (lead as any).interests || (lead as any).tags?.join(', ') || '';

  // Données personnalisées (champs custom depuis metadata ou autres)
  if ((lead as any).metadata) {
    Object.entries((lead as any).metadata).forEach(([key, value]) => {
      variables[`champ_custom_${key}`] = value;
      // Aussi accessible via le nom du champ directement
      variables[key] = value;
    });
  }

  // Données géographiques
  if ((lead as any).geographic_data) {
    const geo = (lead as any).geographic_data;
    variables.ville = variables.ville || geo.city || '';
    variables.région = variables.région || geo.region || '';
    variables.département = geo.department || '';
    variables.code_postal = geo.postal_code || '';
    variables.pays = geo.country || 'France';
  }

  // Données business
  if ((lead as any).business_category) {
    variables.catégorie_métier = (lead as any).business_category;
  }
  if ((lead as any).business_vertical) {
    variables.verticale = (lead as any).business_vertical;
  }

  return variables;
}

/**
 * Récupère toutes les variables disponibles depuis un lead avec données comportementales enrichies (async)
 * Récupère les vraies données depuis sales_activities, email_tracking, website_visits, etc.
 */
export async function getLeadVariablesAsync(lead: Lead): Promise<Record<string, any>> {
  const variables = getLeadVariables(lead);
  
  try {
    // Enrichir avec les données comportementales
    await enrichBehavioralVariables(lead.id, variables);
  } catch (error) {
    console.warn('Erreur enrichissement variables comportementales:', error);
  }
  
  return variables;
}

/**
 * Enrichit les variables comportementales depuis les tables de tracking
 */
async function enrichBehavioralVariables(leadId: string, variables: Record<string, any>): Promise<void> {
  try {
    // 1. Dernière interaction depuis sales_activities
    const { data: lastActivity } = await supabase
      .from('sales_activities')
      .select('created_at, activity_type, description')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastActivity) {
      variables.dernière_interaction = formatRelativeDate(lastActivity.created_at);
      variables.dernière_interaction_date = new Date(lastActivity.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      variables.dernière_interaction_type = getActivityTypeLabel(lastActivity.activity_type);
    } else {
      variables.dernière_interaction = 'Aucune interaction';
    }

    // 2. Nombre de visites depuis sales_activities
    const { count: visitCount } = await supabase
      .from('sales_activities')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('activity_type', 'website_visit');

    variables.nombre_visites = visitCount || 0;

    // Alternative : utiliser table website_visits si elle existe
    try {
      const { count: websiteVisitCount } = await supabase
        .from('website_visits')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId);
      
      if (websiteVisitCount !== null) {
        variables.nombre_visites = websiteVisitCount;
      }
    } catch {
      // Table website_visits n'existe peut-être pas encore
    }

    // 3. Ressources téléchargées depuis sales_activities
    const { data: downloads } = await supabase
      .from('sales_activities')
      .select('description, created_at')
      .eq('lead_id', leadId)
      .eq('activity_type', 'resource_download')
      .order('created_at', { ascending: false })
      .limit(10);

    if (downloads && downloads.length > 0) {
      variables.ressources_téléchargées = downloads
        .map((d: any) => d.description || 'Ressource')
        .join(', ');
      variables.nombre_ressources_téléchargées = downloads.length;
      variables.dernière_ressource_téléchargée = downloads[0]?.description || '';
      variables.dernière_ressource_date = downloads[0]
        ? formatRelativeDate(downloads[0].created_at)
        : '';
    } else {
      variables.ressources_téléchargées = 'Aucune ressource téléchargée';
      variables.nombre_ressources_téléchargées = 0;
    }

    // 4. Statistiques emails depuis email_tracking
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('opened_count, clicked_count, opened_at, clicked_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (emailTracking && emailTracking.length > 0) {
      const totalOpens = emailTracking.reduce((sum: number, e: any) => sum + (e.opened_count || 0), 0);
      const totalClicks = emailTracking.reduce((sum: number, e: any) => sum + (e.clicked_count || 0), 0);
      const lastOpen = emailTracking.find((e: any) => e.opened_at);
      const lastClick = emailTracking.find((e: any) => e.clicked_at);

      variables.emails_ouverts = totalOpens;
      variables.emails_cliqués = totalClicks;
      variables.dernier_email_ouvert = lastOpen ? formatRelativeDate(lastOpen.opened_at) : 'Jamais';
      variables.dernier_email_cliqué = lastClick ? formatRelativeDate(lastClick.clicked_at) : 'Jamais';
    } else {
      variables.emails_ouverts = 0;
      variables.emails_cliqués = 0;
      variables.dernier_email_ouvert = 'Jamais';
      variables.dernier_email_cliqué = 'Jamais';
    }

    // 5. Nombre d'interactions totales
    const { count: totalActivities } = await supabase
      .from('sales_activities')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId);

    variables.nombre_interactions_total = totalActivities || 0;

    // 6. Intérêts détectés depuis les activités (tags, catégories)
    const { data: activityTags } = await supabase
      .from('sales_activities')
      .select('tags, category')
      .eq('lead_id', leadId)
      .not('tags', 'is', null);

    if (activityTags && activityTags.length > 0) {
      const allTags = new Set<string>();
      activityTags.forEach((a: any) => {
        if (Array.isArray(a.tags)) {
          a.tags.forEach((tag: string) => allTags.add(tag));
        }
        if (a.category) allTags.add(a.category);
      });
      if (allTags.size > 0) {
        variables.intérêts = Array.from(allTags).join(', ');
      }
    }

    // 7. Engagement score (calcul simple basé sur interactions)
    const engagementScore = calculateEngagementScore({
      emailOpens: variables.emails_ouverts || 0,
      emailClicks: variables.emails_cliqués || 0,
      visits: variables.nombre_visites || 0,
      downloads: variables.nombre_ressources_téléchargées || 0,
      totalInteractions: variables.nombre_interactions_total || 0,
    });
    variables.score_engagement = engagementScore;
    variables.niveau_engagement = getEngagementLevel(engagementScore);

  } catch (error) {
    console.error('Erreur enrichissement variables comportementales:', error);
  }
}

/**
 * Calcule un score d'engagement basé sur les interactions
 */
function calculateEngagementScore(metrics: {
  emailOpens: number;
  emailClicks: number;
  visits: number;
  downloads: number;
  totalInteractions: number;
}): number {
  let score = 0;
  score += Math.min(metrics.emailOpens * 2, 30); // Max 30 points pour opens
  score += Math.min(metrics.emailClicks * 5, 30); // Max 30 points pour clicks
  score += Math.min(metrics.visits * 3, 20); // Max 20 points pour visites
  score += Math.min(metrics.downloads * 10, 20); // Max 20 points pour téléchargements
  return Math.min(score, 100); // Score max 100
}

/**
 * Retourne le niveau d'engagement selon le score
 */
function getEngagementLevel(score: number): string {
  if (score >= 70) return 'Très élevé';
  if (score >= 50) return 'Élevé';
  if (score >= 30) return 'Moyen';
  if (score >= 10) return 'Faible';
  return 'Très faible';
}

/**
 * Retourne le label d'un type d'activité
 */
function getActivityTypeLabel(activityType: string | null | undefined): string {
  if (!activityType) return 'Interaction';
  const labels: Record<string, string> = {
    email_sent: 'Email envoyé',
    email_open: 'Email ouvert',
    email_click: 'Email cliqué',
    call_made: 'Appel effectué',
    call_received: 'Appel reçu',
    meeting: 'Rendez-vous',
    website_visit: 'Visite site web',
    resource_download: 'Ressource téléchargée',
    form_submission: 'Formulaire rempli',
    note: 'Note ajoutée',
    task_completed: 'Tâche complétée',
    quote_sent: 'Devis envoyé',
    quote_viewed: 'Devis consulté',
    quote_accepted: 'Devis accepté',
  };
  return labels[activityType] || activityType;
}

/**
 * Remplace les variables dans un template avec enrichissement comportemental (async)
 * Utilise getLeadVariablesAsync pour récupérer les vraies données comportementales
 */
export async function replaceVariablesAsync(
  template: string,
  context: VariableContext,
  additionalVariables?: Record<string, any>
): Promise<string> {
  if (!template) return '';
  
  const lead = context.lead;
  
  if (!lead) {
    // Si pas de lead, utiliser la version synchrone
    return replaceVariables(template, context, additionalVariables);
  }
  
  // Récupérer toutes les variables avec enrichissement comportemental
  const leadVariables = await getLeadVariablesAsync(lead);
  
  // Fusionner avec les variables additionnelles
  const allVariables: Record<string, any> = {
    ...leadVariables,
    lead,
    ...additionalVariables,
    ...context,
  };
  
  // Utiliser replaceVariablesAdvanced pour le formatage
  return replaceVariablesAdvanced(template, { ...context, ...allVariables }, additionalVariables);
}

/**
 * Remplace les variables dans un template (version synchrone)
 * Supporte les fallbacks avec {{variable|fallback}}
 */
export function replaceVariables(
  template: string,
  context: VariableContext,
  additionalVariables?: Record<string, any>
): string {
  if (!template) return '';

  let result = template;
  const lead = context.lead;
  
  // Récupérer toutes les variables du lead
  const leadVariables = lead ? getLeadVariables(lead) : {};
  
  // Fusionner avec les variables additionnelles
  const allVariables: Record<string, any> = {
    ...leadVariables,
    ...context,
    ...additionalVariables,
  };

  // Remplacer les variables simples {{variable}}
  Object.entries(allVariables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
  });

  // Remplacer les variables avec fallback {{variable|fallback}}
  const fallbackRegex = /{{\s*(\w+)\s*\|\s*([^}]+)\s*}}/g;
  result = result.replace(fallbackRegex, (match, varName, fallback) => {
    const value = allVariables[varName];
    return value ? String(value) : fallback.trim();
  });

  // Nettoyer les variables non remplacées (optionnel - peut être désactivé pour debug)
  // result = result.replace(/{{[^}]+}}/g, '');

  return result;
}

/**
 * Remplacer les variables avec formatage avancé
 * Supporte les formateurs comme {{nom|capitalize}}, {{scoring|format:score}}
 */
export function replaceVariablesAdvanced(
  template: string,
  context: VariableContext,
  additionalVariables?: Record<string, any>
): string {
  if (!template) return '';

  let result = template;

  // Formatage avec pipes
  // {{nom|capitalize}} -> capitalize la première lettre
  result = result.replace(/{{\s*(\w+)\s*\|\s*capitalize\s*}}/g, (match, varName) => {
    const lead = context.lead;
    if (varName === 'prénom' && lead?.name) {
      return formatFirstName(extractFirstName(lead.name));
    }
    if (varName === 'nom' && lead?.name) {
      return formatFirstName(lead.name);
    }
    const value = context[varName] || additionalVariables?.[varName] || '';
    return value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : '';
  });

  // Formatage scoring {{scoring|format:score}}
  result = result.replace(/{{\s*scoring\s*\|\s*format:score\s*}}/g, () => {
    const lead = context.lead;
    const scoring = (lead as any)?.scoring || (lead as any)?.quality_score || 0;
    return `${scoring}/100`;
  });

  // Formatage température {{température|format:temp}}
  result = result.replace(/{{\s*température\s*\|\s*format:temp\s*}}/g, () => {
    const lead = context.lead;
    return formatTemperature(lead?.temperature);
  });

  // Formatage date relative {{dernière_interaction|format:relative}}
  result = result.replace(/{{\s*dernière_interaction\s*\|\s*format:relative\s*}}/g, () => {
    const lead = context.lead;
    // Utiliser la variable enrichie si disponible (depuis getLeadVariablesAsync)
    const lastInteraction = context.dernière_interaction || (lead as any)?.last_interaction_at;
    if (lastInteraction && typeof lastInteraction === 'string' && lastInteraction.includes('il y a')) {
      return lastInteraction; // Déjà formaté
    }
    return formatRelativeDate(lastInteraction);
  });

  // Formatage montant {{valeur_potentielle|format:currency}}
  result = result.replace(/{{\s*valeur_potentielle\s*\|\s*format:currency\s*}}/g, () => {
    const lead = context.lead;
    const value = (lead as any).estimated_value || (lead as any).deal_amount || 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  });

  // Puis remplacer les variables normales
  result = replaceVariables(result, context, additionalVariables);

  return result;
}

/**
 * Valide qu'un template ne contient pas de variables non résolues
 */
export function validateTemplate(template: string, context: VariableContext): {
  valid: boolean;
  missingVariables: string[];
} {
  const missingVariables: string[] = [];
  const variableRegex = /{{\s*(\w+)(?:\s*\|\s*[^}]+)?\s*}}/g;
  const lead = context.lead;
  const allVariables = lead ? { ...getLeadVariables(lead), ...context } : context;

  let match;
  while ((match = variableRegex.exec(template)) !== null) {
    const varName = match[1];
    if (!allVariables[varName] && !varName.includes('|')) {
      if (!missingVariables.includes(varName)) {
        missingVariables.push(varName);
      }
    }
  }

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

