/**
 * Service de bibliothèque de templates de workflows
 * Gère les templates pré-configurés, duplication, partage
 */

import { supabase } from '../supabase';
import { AutomatedAction } from '../supabase/hooks/useAutomatedActions';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // 'onboarding', 'nurturing', 'relance', etc.
  tags: string[];
  workflowData: any; // Données complètes du workflow (nodes, edges, config)
  previewImage?: string; // URL de l'image de prévisualisation
  estimatedLeads?: string; // Estimation du nombre de leads affectés
  useCase?: string; // Cas d'usage
  steps?: string[]; // Étapes du workflow
  createdBy: string; // User ID du créateur
  isPublic: boolean; // Template public ou privé
  isOfficial: boolean; // Template officiel (créé par l'équipe)
  createdAt: string;
  updatedAt: string;
  usageCount?: number; // Nombre de fois que le template a été utilisé
}

/**
 * Récupère tous les templates disponibles
 */
export async function getWorkflowTemplates(
  filters?: {
    category?: string;
    tags?: string[];
    search?: string;
    isPublic?: boolean;
    isOfficial?: boolean;
  }
): Promise<WorkflowTemplate[]> {
  try {
    let query = supabase
      .from('workflow_templates')
      .select('*')
      .order('usage_count', { ascending: false });

    if (filters) {
      if (filters.category) {
        query = query.eq('category', filters.category);
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
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Table workflow_templates non disponible:', error);
      // Retourner des templates par défaut
      return getDefaultTemplates();
    }

    return (data || []).map(formatTemplate);
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    return getDefaultTemplates();
  }
}

/**
 * Récupère un template par son ID
 */
export async function getWorkflowTemplateById(templateId: string): Promise<WorkflowTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.warn('Template non trouvé:', error);
      // Chercher dans les templates par défaut
      return getDefaultTemplates().find(t => t.id === templateId) || null;
    }

    return formatTemplate(data);
  } catch (error) {
    console.error('Erreur récupération template:', error);
    return null;
  }
}

/**
 * Crée un nouveau template à partir d'un workflow existant
 */
export async function createTemplateFromWorkflow(
  workflowId: string,
  templateData: {
    name: string;
    description: string;
    category: string;
    tags?: string[];
    isPublic?: boolean;
  }
): Promise<WorkflowTemplate> {
  try {
    // Récupérer le workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow non trouvé');
    }

    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Créer le template
    const { data: template, error: createError } = await supabase
      .from('workflow_templates')
      .insert({
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        tags: templateData.tags || [],
        workflow_data: workflow.workflow_data || workflow,
        is_public: templateData.isPublic || false,
        is_official: false,
        created_by: userId,
        usage_count: 0,
      })
      .select()
      .single();

    if (createError) {
      // Si la table n'existe pas, on peut créer un template en mémoire
      console.warn('Table workflow_templates non disponible:', createError);
      return {
        id: `template_${Date.now()}`,
        ...templateData,
        tags: templateData.tags || [],
        workflowData: workflow.workflow_data || workflow,
        isPublic: templateData.isPublic || false,
        isOfficial: false,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
      };
    }

    return formatTemplate(template);
  } catch (error) {
    console.error('Erreur création template:', error);
    throw error;
  }
}

/**
 * Duplique un template pour créer un nouveau workflow
 */
export async function duplicateTemplateAsWorkflow(
  templateId: string,
  workflowName?: string
): Promise<{ workflowId: string }> {
  try {
    const template = await getWorkflowTemplateById(templateId);

    if (!template) {
      throw new Error('Template non trouvé');
    }

    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Créer un nouveau workflow à partir du template
    const { data: newWorkflow, error: createError } = await supabase
      .from('automated_actions')
      .insert({
        name: workflowName || `${template.name} (copie)`,
        description: template.description,
        category: template.category,
        workflow_data: template.workflowData,
        is_active: false, // Désactivé par défaut pour validation
        created_by: userId,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Incrémenter le compteur d'utilisation du template
    await supabase
      .from('workflow_templates')
      .update({
        usage_count: (template.usageCount || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId);

    return {
      workflowId: newWorkflow.id,
    };
  } catch (error) {
    console.error('Erreur duplication template:', error);
    throw error;
  }
}

/**
 * Formate un template depuis les données de la base
 */
function formatTemplate(data: any): WorkflowTemplate {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags || [],
    workflowData: data.workflow_data || data.workflowData,
    previewImage: data.preview_image,
    estimatedLeads: data.estimated_leads,
    useCase: data.use_case,
    steps: data.steps,
    createdBy: data.created_by,
    isPublic: data.is_public,
    isOfficial: data.is_official,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    usageCount: data.usage_count || 0,
  };
}

/**
 * Retourne les templates par défaut (si la table n'existe pas)
 */
function getDefaultTemplates(): WorkflowTemplate[] {
  // Templates basiques pour les scénarios principaux
  return [
    {
      id: 'template-onboarding-new-lead',
      name: 'Onboarding Nouveau Lead',
      description: 'Séquence d\'accueil complète pour les nouveaux leads',
      category: 'onboarding',
      tags: ['onboarding', 'email', 'qualification'],
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead créé', position: { x: 0, y: 0 } },
          { id: 'action-1', type: 'action', label: 'Email de bienvenue', position: { x: 200, y: 0 } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 2 jours', position: { x: 400, y: 0 } },
          { id: 'action-2', type: 'action', label: 'Ressources utiles', position: { x: 600, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
      isPublic: true,
      isOfficial: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      estimatedLeads: 'Tous les nouveaux leads',
      useCase: 'Parfait pour les leads qui viennent de s\'inscrire',
      steps: ['Email de bienvenue (J+0)', 'Ressources utiles (J+2)'],
    },
    {
      id: 'template-nurturing-cold-lead',
      name: 'Nurturing Lead Froid',
      description: 'Séquence de réchauffage pour les leads inactifs',
      category: 'nurturing',
      tags: ['nurturing', 'email', 'réactivation'],
      workflowData: {
        nodes: [
          { id: 'trigger-1', type: 'trigger', label: 'Lead inactif 30+ jours', position: { x: 0, y: 0 } },
          { id: 'action-1', type: 'action', label: 'Email de rappel', position: { x: 200, y: 0 } },
          { id: 'wait-1', type: 'wait', label: 'Attendre 7 jours', position: { x: 400, y: 0 } },
          { id: 'action-2', type: 'action', label: 'Contenu de valeur', position: { x: 600, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'wait-1' },
          { id: 'e3', source: 'wait-1', target: 'action-2' },
        ],
      },
      isPublic: true,
      isOfficial: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      estimatedLeads: 'Leads inactifs > 30 jours',
      useCase: 'Réactivez les leads qui se sont désintéressés',
      steps: ['Email de rappel (J+0)', 'Contenu de valeur (J+7)'],
    },
  ];
}

/**
 * Partage un template avec d'autres utilisateurs
 */
export async function shareWorkflowTemplate(
  templateId: string,
  userIds: string[]
): Promise<{ success: boolean }> {
  try {
    // Créer des entrées de partage
    const shares = userIds.map(userId => ({
      template_id: templateId,
      user_id: userId,
      shared_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('workflow_template_shares')
      .upsert(shares, { onConflict: 'template_id,user_id' });

    if (error) {
      console.warn('Table workflow_template_shares non disponible:', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur partage template:', error);
    return { success: false };
  }
}

/**
 * Recherche des templates par mot-clé
 */
export async function searchWorkflowTemplates(
  searchQuery: string
): Promise<WorkflowTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .order('usage_count', { ascending: false });

    if (error) {
      console.warn('Table workflow_templates non disponible:', error);
      // Rechercher dans les templates par défaut
      const defaultTemplates = getDefaultTemplates();
      return defaultTemplates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return (data || []).map(formatTemplate);
  } catch (error) {
    console.error('Erreur recherche templates:', error);
    return [];
  }
}

