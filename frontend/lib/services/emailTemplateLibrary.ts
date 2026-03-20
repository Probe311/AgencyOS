/**
 * Bibliothèque de templates d'emails pré-configurés
 * Templates par catégorie, famille, température, secteur, étape du cycle de vie
 * Support multilingue
 */

import { supabase } from '../supabase';
import { EmailTemplate, EmailTemplateCategory } from '../../types';

export interface TemplateFilter {
  category?: EmailTemplateCategory;
  family?: string; // 'Artisans', 'Startups Tech', etc.
  temperature?: string; // 'Chaud', 'Tiède', 'Froid'
  sector?: string; // 'Tech', 'Retail', 'BTP', etc.
  lifecycleStage?: string; // 'Lead', 'MQL', 'SQL', 'Opportunité', 'Client'
  language?: string; // 'fr', 'en', 'es'
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  isOfficial?: boolean;
}

export interface TemplatePreview {
  template: EmailTemplate;
  previewHtml: string;
  previewText: string;
  variablesUsed: string[];
}

/**
 * Templates pré-configurés par catégorie
 */
const PREDEFINED_TEMPLATES: Partial<EmailTemplate>[] = [
  // BIENVENUE
  {
    name: 'Email de bienvenue - Standard',
    category: 'Bienvenue',
    subject: 'Bienvenue chez {{entreprise}} !',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bonjour {{prénom}},</h1>
        <p>Nous sommes ravis de vous accueillir chez {{entreprise}} !</p>
        <p>Votre profil (score {{scoring}}/100) correspond parfaitement à nos services.</p>
        <p>Dans les prochains jours, vous recevrez des informations personnalisées adaptées à votre secteur : {{secteur}}.</p>
        <p style="margin-top: 30px;">
          <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Découvrir nos services
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Cordialement,<br>
          L'équipe {{entreprise}}
        </p>
      </div>
    `,
    textContent: `Bonjour {{prénom}},\n\nNous sommes ravis de vous accueillir chez {{entreprise}} !\n\nVotre profil (score {{scoring}}/100) correspond parfaitement à nos services.\n\nDans les prochains jours, vous recevrez des informations personnalisées adaptées à votre secteur : {{secteur}}.\n\nCordialement,\nL'équipe {{entreprise}}`,
    variables: [
      { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
      { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
      { name: 'scoring', description: 'Score du lead', example: '75', type: 'number' },
      { name: 'secteur', description: 'Secteur d\'activité', example: 'Technologie', type: 'string' },
    ],
    tags: ['bienvenue', 'onboarding'],
    language: 'fr',
    isOfficial: true,
  },
  // NURTURING - FROID
  {
    name: 'Nurturing - Lead Froid - Éducatif',
    category: 'Nurturing',
    subject: '{{entreprise}} : Ressources pour votre secteur',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bonjour {{prénom}},</h1>
        <p>Nous avons remarqué votre intérêt pour le secteur {{secteur}}.</p>
        <p>Nous avons préparé des ressources spécialement pour vous :</p>
        <ul>
          <li>Guide pratique pour {{secteur}}</li>
          <li>Cas clients similaires</li>
          <li>Tendances du marché</li>
        </ul>
        <p style="margin-top: 30px;">
          <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Télécharger les ressources
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Cordialement,<br>
          L'équipe {{entreprise}}
        </p>
      </div>
    `,
    textContent: `Bonjour {{prénom}},\n\nNous avons remarqué votre intérêt pour le secteur {{secteur}}.\n\nNous avons préparé des ressources spécialement pour vous.\n\nCordialement,\nL'équipe {{entreprise}}`,
    variables: [
      { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
      { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
      { name: 'secteur', description: 'Secteur d\'activité', example: 'Technologie', type: 'string' },
    ],
    tags: ['nurturing', 'froid', 'éducatif'],
    temperature: 'Froid',
    language: 'fr',
    isOfficial: true,
  },
  // NURTURING - CHAUD
  {
    name: 'Nurturing - Lead Chaud - Proposition',
    category: 'Nurturing',
    subject: '{{entreprise}} : Offre spéciale pour vous',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bonjour {{prénom}},</h1>
        <p>Votre profil (score {{scoring}}/100) et votre température {{température}} nous indiquent un fort potentiel.</p>
        <p>Nous avons une offre spéciale adaptée à votre entreprise : <strong>{{entreprise}}</strong>.</p>
        <p style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <strong>Offre exclusive :</strong> Réduction de 20% sur nos services pour le secteur {{secteur}}.
        </p>
        <p style="margin-top: 30px;">
          <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Profiter de l'offre
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Cordialement,<br>
          L'équipe {{entreprise}}
        </p>
      </div>
    `,
    textContent: `Bonjour {{prénom}},\n\nVotre profil (score {{scoring}}/100) et votre température {{température}} nous indiquent un fort potentiel.\n\nNous avons une offre spéciale adaptée à votre entreprise : {{entreprise}}.\n\nOffre exclusive : Réduction de 20% sur nos services pour le secteur {{secteur}}.\n\nCordialement,\nL'équipe {{entreprise}}`,
    variables: [
      { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
      { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
      { name: 'scoring', description: 'Score du lead', example: '85', type: 'number' },
      { name: 'température', description: 'Température du lead', example: 'Chaud', type: 'string' },
      { name: 'secteur', description: 'Secteur d\'activité', example: 'Technologie', type: 'string' },
    ],
    tags: ['nurturing', 'chaud', 'proposition'],
    temperature: 'Chaud',
    language: 'fr',
    isOfficial: true,
  },
  // RELANCE
  {
    name: 'Relance - Opportunité',
    category: 'Relance',
    subject: '{{entreprise}} : Avez-vous consulté notre devis ?',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Bonjour {{prénom}},</h1>
        <p>Nous espérons que vous allez bien.</p>
        <p>Il y a quelques jours, nous vous avons envoyé un devis d'une valeur de {{valeur_potentielle}} pour votre entreprise <strong>{{entreprise}}</strong>.</p>
        <p>Avez-vous eu l'occasion de le consulter ?</p>
        <p>Nous restons à votre disposition pour répondre à toutes vos questions.</p>
        <p style="margin-top: 30px;">
          <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir le devis
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Cordialement,<br>
          L'équipe {{entreprise}}
        </p>
      </div>
    `,
    textContent: `Bonjour {{prénom}},\n\nIl y a quelques jours, nous vous avons envoyé un devis d'une valeur de {{valeur_potentielle}} pour votre entreprise {{entreprise}}.\n\nAvez-vous eu l'occasion de le consulter ?\n\nNous restons à votre disposition pour répondre à toutes vos questions.\n\nCordialement,\nL'équipe {{entreprise}}`,
    variables: [
      { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
      { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
      { name: 'valeur_potentielle', description: 'Valeur du devis', example: '50000€', type: 'currency' },
    ],
    tags: ['relance', 'devis', 'opportunité'],
    lifecycleStage: 'Opportunité',
    language: 'fr',
    isOfficial: true,
  },
  // ONBOARDING CLIENT
  {
    name: 'Onboarding - Nouveau Client',
    category: 'Onboarding',
    subject: 'Bienvenue dans la famille {{entreprise}} !',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Félicitations {{prénom}} !</h1>
        <p>Nous sommes ravis de vous compter parmi nos clients.</p>
        <p>Votre entreprise <strong>{{entreprise}}</strong> fait maintenant partie de notre écosystème.</p>
        <p><strong>Prochaines étapes :</strong></p>
        <ol>
          <li>Rendez-vous de kick-off programmé</li>
          <li>Accès à votre espace client</li>
          <li>Équipe dédiée assignée</li>
        </ol>
        <p style="margin-top: 30px;">
          <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accéder à mon espace
          </a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Cordialement,<br>
          L'équipe {{entreprise}}
        </p>
      </div>
    `,
    textContent: `Félicitations {{prénom}} !\n\nNous sommes ravis de vous compter parmi nos clients.\n\nVotre entreprise {{entreprise}} fait maintenant partie de notre écosystème.\n\nProchaines étapes :\n1. Rendez-vous de kick-off programmé\n2. Accéder à votre espace client\n\nCordialement,\nL'équipe {{entreprise}}`,
    variables: [
      { name: 'prénom', description: 'Prénom du contact', example: 'Jean', type: 'string' },
      { name: 'entreprise', description: 'Nom de l\'entreprise', example: 'Acme Corp', type: 'string' },
    ],
    tags: ['onboarding', 'client', 'bienvenue'],
    lifecycleStage: 'Client',
    language: 'fr',
    isOfficial: true,
  },
];

/**
 * Templates par famille
 */
const TEMPLATES_BY_FAMILY: Record<string, Partial<EmailTemplate>[]> = {
  'Artisans': [
    {
      name: 'Bienvenue - Artisans',
      category: 'Bienvenue',
      subject: 'Solutions adaptées aux artisans de {{secteur}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>En tant qu'artisan dans le secteur {{secteur}}, vous méritez des solutions adaptées à votre activité.</p>
          <p>Nous accompagnons de nombreux artisans locaux et comprenons vos besoins spécifiques :</p>
          <ul>
            <li>Gestion simplifiée</li>
            <li>Tarifs adaptés aux PME</li>
            <li>Support local</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Découvrir nos solutions artisans
            </a>
          </p>
        </div>
      `,
      textContent: `Bonjour {{prénom}},\n\nEn tant qu'artisan dans le secteur {{secteur}}, vous méritez des solutions adaptées à votre activité.\n\nNous accompagnons de nombreux artisans locaux et comprenons vos besoins spécifiques.\n\nCordialement,\nL'équipe {{entreprise}}`,
      family: 'Artisans',
      language: 'fr',
      isOfficial: true,
    },
  ],
  'Startups Tech': [
    {
      name: 'Bienvenue - Startups Tech',
      category: 'Bienvenue',
      subject: '{{entreprise}} : Solutions pour startups en croissance',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Votre startup <strong>{{entreprise}}</strong> dans le secteur tech mérite des solutions innovantes et scalables.</p>
          <p>Nous aidons les startups tech à :</p>
          <ul>
            <li>Scaler rapidement</li>
            <li>Optimiser leurs processus</li>
            <li>Croître efficacement</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Découvrir nos solutions startups
            </a>
          </p>
        </div>
      `,
      textContent: `Bonjour {{prénom}},\n\nVotre startup {{entreprise}} dans le secteur tech mérite des solutions innovantes et scalables.\n\nNous aidons les startups tech à scaler rapidement et optimiser leurs processus.\n\nCordialement,\nL'équipe {{entreprise}}`,
      family: 'Startups Tech',
      language: 'fr',
      isOfficial: true,
    },
  ],
};

/**
 * Templates par étape du cycle de vie
 */
const TEMPLATES_BY_LIFECYCLE: Record<string, Partial<EmailTemplate>[]> = {
  'Lead': [
    {
      name: 'Lead - Découverte',
      category: 'Sales',
      subject: 'Découvrez comment nous aidons les entreprises comme {{entreprise}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Nous avons remarqué votre intérêt pour nos services.</p>
          <p>Découvrez comment nous aidons les entreprises du secteur {{secteur}} à atteindre leurs objectifs.</p>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              En savoir plus
            </a>
          </p>
        </div>
      `,
      lifecycleStage: 'Lead',
      language: 'fr',
      isOfficial: true,
    },
  ],
  'MQL': [
    {
      name: 'MQL - Qualification',
      category: 'Sales',
      subject: '{{entreprise}} : Qualifions vos besoins',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Votre profil (score {{scoring}}/100) indique un fort potentiel.</p>
          <p>Pour mieux vous accompagner, nous aimerions comprendre vos besoins spécifiques.</p>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Répondre au questionnaire
            </a>
          </p>
        </div>
      `,
      lifecycleStage: 'MQL',
      language: 'fr',
      isOfficial: true,
    },
  ],
  'SQL': [
    {
      name: 'SQL - Proposition',
      category: 'Sales',
      subject: '{{entreprise}} : Proposition personnalisée',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Basé sur votre profil et vos besoins, nous avons préparé une proposition personnalisée pour <strong>{{entreprise}}</strong>.</p>
          <p>Valeur estimée : <strong>{{valeur_potentielle}}</strong></p>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Voir la proposition
            </a>
          </p>
        </div>
      `,
      lifecycleStage: 'SQL',
      language: 'fr',
      isOfficial: true,
    },
  ],
  'Opportunité': [
    {
      name: 'Opportunité - Closing',
      category: 'Sales',
      subject: '{{entreprise}} : Finalisons votre projet',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Nous sommes proches de finaliser votre projet d'une valeur de <strong>{{valeur_potentielle}}</strong>.</p>
          <p>Il ne reste que quelques détails à régler pour lancer votre projet avec <strong>{{entreprise}}</strong>.</p>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Finaliser maintenant
            </a>
          </p>
        </div>
      `,
      lifecycleStage: 'Opportunité',
      language: 'fr',
      isOfficial: true,
    },
  ],
  'Client': [
    {
      name: 'Client - Satisfaction',
      category: 'Onboarding',
      subject: '{{entreprise}} : Comment se passe votre expérience ?',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bonjour {{prénom}},</h1>
          <p>Nous espérons que votre expérience avec nos services vous satisfait.</p>
          <p>Votre avis compte beaucoup pour nous aider à améliorer nos services.</p>
          <p style="margin-top: 30px;">
            <a href="#" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Donner mon avis
            </a>
          </p>
        </div>
      `,
      lifecycleStage: 'Client',
      language: 'fr',
      isOfficial: true,
    },
  ],
};

/**
 * Récupère les templates avec filtres
 */
export async function getEmailTemplates(filters: TemplateFilter = {}): Promise<EmailTemplate[]> {
  try {
    let query = supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.family) {
      query = query.contains('tags', [filters.family]);
    }

    if (filters.temperature) {
      query = query.contains('tags', [filters.temperature.toLowerCase()]);
    }

    if (filters.sector) {
      query = query.contains('tags', [filters.sector]);
    }

    if (filters.lifecycleStage) {
      query = query.contains('tags', [filters.lifecycleStage.toLowerCase()]);
    }

    if (filters.language) {
      query = query.eq('language', filters.language);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }

    if (filters.isOfficial !== undefined) {
      query = query.eq('is_official', filters.isOfficial);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Table email_templates non disponible:', error);
      // Retourner les templates prédéfinis si la table n'existe pas
      return getPredefinedTemplates(filters);
    }

    // Combiner avec les templates prédéfinis
    const predefined = getPredefinedTemplates(filters);
    const dbTemplates = (data || []).map(formatTemplate);

    // Fusionner en évitant les doublons
    const allTemplates = [...predefined];
    for (const dbTemplate of dbTemplates) {
      if (!allTemplates.find(t => t.name === dbTemplate.name && t.category === dbTemplate.category)) {
        allTemplates.push(dbTemplate);
      }
    }

    return allTemplates;
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    return getPredefinedTemplates(filters);
  }
}

/**
 * Récupère les templates prédéfinis selon les filtres
 */
function getPredefinedTemplates(filters: TemplateFilter = {}): EmailTemplate[] {
  let templates = [...PREDEFINED_TEMPLATES];

  // Filtrer par famille
  if (filters.family && TEMPLATES_BY_FAMILY[filters.family]) {
    templates = [...templates, ...TEMPLATES_BY_FAMILY[filters.family]];
  }

  // Filtrer par étape du cycle de vie
  if (filters.lifecycleStage && TEMPLATES_BY_LIFECYCLE[filters.lifecycleStage]) {
    templates = [...templates, ...TEMPLATES_BY_LIFECYCLE[filters.lifecycleStage]];
  }

  // Appliquer les autres filtres
  let filtered = templates;

  if (filters.category) {
    filtered = filtered.filter(t => t.category === filters.category);
  }

  if (filters.temperature) {
    filtered = filtered.filter(t => t.temperature === filters.temperature);
  }

  if (filters.sector) {
    filtered = filtered.filter(t => t.tags?.includes(filters.sector!));
  }

  if (filters.language) {
    filtered = filtered.filter(t => (t.language || 'fr') === filters.language);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.name?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    );
  }

  return filtered.map(t => ({
    id: `predefined_${t.name?.replace(/\s+/g, '_').toLowerCase()}`,
    name: t.name || 'Template',
    description: t.description || '',
    category: t.category || 'Custom',
    subject: t.subject || '',
    htmlContent: t.htmlContent || '',
    textContent: t.textContent || '',
    variables: t.variables || [],
    tags: t.tags || [],
    isPublic: t.isPublic || false,
    isOfficial: t.isOfficial || false,
    language: t.language || 'fr',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })) as EmailTemplate[];
}

/**
 * Formate un template depuis les données de la base
 */
function formatTemplate(data: any): EmailTemplate {
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    category: data.category,
    subject: data.subject || '',
    htmlContent: data.html_content || data.htmlContent || '',
    textContent: data.text_content || data.textContent || '',
    variables: data.variables || [],
    tags: data.tags || [],
    isPublic: data.is_public || data.isPublic || false,
    isOfficial: data.is_official || data.isOfficial || false,
    language: data.language || 'fr',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Récupère un template par ID
 */
export async function getEmailTemplateById(templateId: string): Promise<EmailTemplate | null> {
  try {
    // Vérifier si c'est un template prédéfini
    if (templateId.startsWith('predefined_')) {
      const predefined = getPredefinedTemplates();
      return predefined.find(t => t.id === templateId) || null;
    }

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.warn('Erreur récupération template:', error);
      return null;
    }

    return formatTemplate(data);
  } catch (error) {
    console.error('Erreur récupération template:', error);
    return null;
  }
}

/**
 * Recherche de templates par mot-clé
 */
export async function searchEmailTemplates(
  searchQuery: string,
  filters?: TemplateFilter
): Promise<EmailTemplate[]> {
  return getEmailTemplates({
    ...filters,
    search: searchQuery,
  });
}

/**
 * Génère une prévisualisation d'un template avec des données de test
 */
export function previewTemplate(
  template: EmailTemplate,
  testData?: Record<string, any>
): TemplatePreview {
  const defaultTestData = {
    nom: 'Jean Dupont',
    prénom: 'Jean',
    entreprise: 'Acme Corp',
    secteur: 'Technologie',
    scoring: '75',
    température: 'Chaud',
    valeur_potentielle: '50000€',
    dernière_interaction: 'Il y a 3 jours',
  };

  const data = { ...defaultTestData, ...testData };

  // Remplacer les variables dans le HTML
  let previewHtml = template.htmlContent;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    previewHtml = previewHtml.replace(regex, String(value));
  }

  // Remplacer les variables dans le texte
  let previewText = template.textContent;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    previewText = previewText.replace(regex, String(value));
  }

  // Extraire les variables utilisées
  const variablesUsed = template.variables.map(v => v.name);

  return {
    template,
    previewHtml,
    previewText,
    variablesUsed,
  };
}

/**
 * Duplique un template existant
 */
export async function duplicateTemplate(
  templateId: string,
  newName: string
): Promise<EmailTemplate | null> {
  try {
    const original = await getEmailTemplateById(templateId);
    if (!original) {
      return null;
    }

    // Créer un nouveau template basé sur l'original
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: newName,
        description: original.description,
        category: original.category,
        subject: original.subject,
        html_content: original.htmlContent,
        text_content: original.textContent,
        variables: original.variables,
        tags: original.tags,
        is_public: false,
        is_official: false,
        language: original.language,
      })
      .select()
      .single();

    if (error) {
      console.warn('Erreur duplication template:', error);
      return null;
    }

    return formatTemplate(data);
  } catch (error) {
    console.error('Erreur duplication template:', error);
    return null;
  }
}

/**
 * Partage un template avec d'autres utilisateurs
 */
export async function shareTemplate(
  templateId: string,
  userIds: string[]
): Promise<boolean> {
  try {
    // Mettre à jour le template pour le rendre public ou partagé
    const { error } = await supabase
      .from('email_templates')
      .update({ is_public: true })
      .eq('id', templateId);

    if (error) {
      console.warn('Erreur partage template:', error);
      return false;
    }

    // TODO: Créer une table email_template_shares pour le partage spécifique
    return true;
  } catch (error) {
    console.error('Erreur partage template:', error);
    return false;
  }
}

/**
 * Récupère les templates recommandés selon le profil d'un lead
 */
export async function getRecommendedTemplates(lead: {
  family?: string;
  temperature?: string;
  sector?: string;
  lifecycleStage?: string;
  language?: string;
}): Promise<EmailTemplate[]> {
  const filters: TemplateFilter = {
    isOfficial: true,
  };

  if (lead.family) {
    filters.family = lead.family;
  }

  if (lead.temperature) {
    filters.temperature = lead.temperature;
  }

  if (lead.sector) {
    filters.sector = lead.sector;
  }

  if (lead.lifecycleStage) {
    filters.lifecycleStage = lead.lifecycleStage;
  }

  if (lead.language) {
    filters.language = lead.language;
  }

  return getEmailTemplates(filters);
}

