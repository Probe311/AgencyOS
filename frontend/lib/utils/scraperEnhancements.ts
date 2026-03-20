/**
 * Améliorations du scraper pour inclure Facebook, Instagram et actualités
 */

/**
 * Améliore le prompt de scraping pour inclure Facebook, Instagram et actualités
 */
export function enhanceScrapingPrompt(basePrompt: string, includeSocial: boolean = true, includeNews: boolean = true): string {
  let enhancedPrompt = basePrompt;

  if (includeSocial) {
    enhancedPrompt += `

PRIORITÉ 2B - RÉSEAUX SOCIAUX PUBLICS (À EXPLOITER) :
6. **Facebook Business / Pages publiques**
   - Rechercher les pages Facebook publiques des entreprises
   - Extract: Nom entreprise, activité, localisation, site web, nombre de followers
   - Identifier les entreprises actives sur Facebook (posts récents = signal d'activité)
   - Extraire les informations de contact publiques depuis la page

7. **Instagram Business / Comptes professionnels**
   - Rechercher les comptes Instagram professionnels publics
   - Extract: Nom entreprise, bio, localisation, site web, nombre d'abonnés
   - Identifier les entreprises avec contenu récent (signe de croissance)
   - Vérifier la présence d'un lien vers le site web dans la bio`;
  }

  if (includeNews) {
    enhancedPrompt += `

PRIORITÉ 3B - ACTUALITÉS ET PRESSE EN LIGNE :
8. **Actualités et presse en ligne**
   - Rechercher les articles de presse mentionnant l'entreprise
   - Sources: Google News, sites de presse locale/régionale, blogs professionnels
   - Extract: Événements récents (recrutement, levée de fonds, expansion, partenariats)
   - Identifier les "trigger events" (événements déclencheurs) qui indiquent un besoin potentiel
   - Détecter les mentions dans la presse comme signal de croissance ou d'activité`;
  }

  enhancedPrompt += `

IMPORTANT - NOUVELLES SOURCES :
- Prioriser les entreprises avec présence active sur les réseaux sociaux (Facebook/Instagram)
- Identifier les entreprises mentionnées récemment dans la presse (signal de croissance)
- Extraire les "trigger events" depuis les actualités (recrutement, levée de fonds, expansion)
- Croiser les données entre réseaux sociaux et actualités pour validation
- Marquer la source de chaque donnée (Facebook, Instagram, Presse) dans data_sources`;

  return enhancedPrompt;
}

/**
 * Extrait les sources sociales depuis les données scrapées
 */
export function extractSocialSources(lead: any): {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
} {
  const sources = lead.sources || lead.data_sources || [];
  const socialSources: any = {};

  sources.forEach((source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('facebook.com') || lowerSource.includes('fb.com')) {
      socialSources.facebook = source;
    } else if (lowerSource.includes('instagram.com')) {
      socialSources.instagram = source;
    } else if (lowerSource.includes('linkedin.com')) {
      socialSources.linkedin = source;
    } else if (lowerSource.includes('twitter.com') || lowerSource.includes('x.com')) {
      socialSources.twitter = source;
    }
  });

  // Vérifier aussi dans social_networks si présent
  if (lead.social_networks) {
    if (lead.social_networks.facebook) socialSources.facebook = lead.social_networks.facebook;
    if (lead.social_networks.instagram) socialSources.instagram = lead.social_networks.instagram;
    if (lead.social_networks.linkedin) socialSources.linkedin = lead.social_networks.linkedin;
    if (lead.social_networks.twitter) socialSources.twitter = lead.social_networks.twitter;
  }

  return socialSources;
}

/**
 * Détecte les trigger events depuis les sources d'actualités
 */
export function detectTriggerEvents(lead: any, sources: string[]): string[] {
  const triggerEvents: string[] = [];
  const newsKeywords = {
    'Recrutement': ['recrutement', 'embauche', 'recrute', 'poste', 'job', 'carrière', 'emploi'],
    'Levée de fonds': ['levée', 'funding', 'investissement', 'financement', 'série', 'round'],
    'Expansion': ['expansion', 'ouverture', 'nouveau', 'développement', 'croissance'],
    'Partenariat': ['partenariat', 'alliance', 'collaboration', 'accord'],
    'Innovation': ['innovation', 'lancement', 'nouveau produit', 'nouveau service'],
  };

  // Vérifier dans les sources
  sources.forEach(source => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('news') || lowerSource.includes('presse') || lowerSource.includes('article')) {
      Object.entries(newsKeywords).forEach(([event, keywords]) => {
        if (keywords.some(keyword => lowerSource.includes(keyword))) {
          if (!triggerEvents.includes(event)) {
            triggerEvents.push(event);
          }
        }
      });
    }
  });

  // Vérifier dans la description
  if (lead.description) {
    const lowerDesc = lead.description.toLowerCase();
    Object.entries(newsKeywords).forEach(([event, keywords]) => {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        if (!triggerEvents.includes(event)) {
          triggerEvents.push(event);
        }
      }
    });
  }

  return triggerEvents;
}

/**
 * Normalise les leads avec les nouvelles sources
 */
export function normalizeLeadWithSocialSources(lead: any): any {
  const socialSources = extractSocialSources(lead);
  const allSources = lead.sources || lead.data_sources || [];
  const triggerEvents = detectTriggerEvents(lead, allSources);

  return {
    ...lead,
    social_networks: {
      ...lead.social_networks,
      ...socialSources,
    },
    trigger_event: lead.trigger_event || (triggerEvents.length > 0 ? triggerEvents.join(', ') : 'Prospection ciblée'),
    trigger_events: triggerEvents,
    has_facebook: !!socialSources.facebook,
    has_instagram: !!socialSources.instagram,
    has_news_mentions: allSources.some((s: string) => 
      s.toLowerCase().includes('news') || 
      s.toLowerCase().includes('presse') || 
      s.toLowerCase().includes('article')
    ),
  };
}

