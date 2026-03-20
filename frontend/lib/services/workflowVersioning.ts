/**
 * Service de versioning des workflows
 * Gère l'historique des modifications, comparaison, restauration
 */

import { supabase } from '../supabase';
import { AutomatedAction } from '../supabase/hooks/useAutomatedActions';

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number; // Numéro de version (1, 2, 3, ...)
  name: string;
  description?: string;
  workflowData: any; // Données complètes du workflow (nodes, edges, config)
  createdBy: string; // User ID
  createdAt: string;
  changelog?: string; // Description des changements
  isCurrentVersion: boolean;
}

export interface VersionDiff {
  added: string[]; // IDs des nœuds/edges ajoutés
  removed: string[]; // IDs des nœuds/edges supprimés
  modified: string[]; // IDs des nœuds/edges modifiés
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    id: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
  }>;
}

/**
 * Sauvegarde une nouvelle version d'un workflow
 */
export async function saveWorkflowVersion(
  workflowId: string,
  workflowData: any,
  changelog?: string
): Promise<WorkflowVersion> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer la version actuelle pour déterminer le numéro de version
    const { data: currentVersions } = await supabase
      .from('workflow_versions')
      .select('version')
      .eq('workflow_id', workflowId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = currentVersions && currentVersions.length > 0
      ? currentVersions[0].version + 1
      : 1;

    // Récupérer les données du workflow actuel
    const { data: workflow } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) {
      throw new Error('Workflow non trouvé');
    }

    // Marquer la version actuelle comme non-courante
    await supabase
      .from('workflow_versions')
      .update({ is_current_version: false })
      .eq('workflow_id', workflowId);

    // Créer la nouvelle version
    const newVersion: Omit<WorkflowVersion, 'id' | 'createdAt'> = {
      workflowId,
      version: nextVersion,
      name: workflow.name,
      description: workflow.description,
      workflowData: workflowData || workflow,
      createdBy: userId,
      changelog: changelog || `Version ${nextVersion}`,
      isCurrentVersion: true,
    };

    const { data: savedVersion, error } = await supabase
      .from('workflow_versions')
      .insert(newVersion)
      .select()
      .single();

    if (error) {
      // Si la table n'existe pas, on peut créer une version en mémoire
      // TODO: Créer la table workflow_versions dans le schema
      console.warn('Table workflow_versions non disponible:', error);
      return {
        id: `version_${workflowId}_${Date.now()}`,
        ...newVersion,
        createdAt: new Date().toISOString(),
      };
    }

    return savedVersion;
  } catch (error) {
    console.error('Erreur sauvegarde version workflow:', error);
    throw error;
  }
}

/**
 * Récupère l'historique des versions d'un workflow
 */
export async function getWorkflowVersions(workflowId: string): Promise<WorkflowVersion[]> {
  try {
    const { data, error } = await supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('version', { ascending: false });

    if (error) {
      console.warn('Table workflow_versions non disponible:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erreur récupération versions workflow:', error);
    return [];
  }
}

/**
 * Compare deux versions d'un workflow
 */
export function compareWorkflowVersions(
  version1: WorkflowVersion,
  version2: WorkflowVersion
): VersionDiff {
  const diff: VersionDiff = {
    added: [],
    removed: [],
    modified: [],
    changes: [],
  };

  const data1 = version1.workflowData || {};
  const data2 = version2.workflowData || {};

  // Comparer les nœuds
  const nodes1 = (data1.nodes || []).map((n: any) => n.id);
  const nodes2 = (data2.nodes || []).map((n: any) => n.id);

  const nodes1Set = new Set(nodes1);
  const nodes2Set = new Set(nodes2);

  // Nœuds ajoutés
  for (const nodeId of nodes2) {
    if (!nodes1Set.has(nodeId)) {
      diff.added.push(`node:${nodeId}`);
      diff.changes.push({
        type: 'added',
        id: nodeId,
        field: 'node',
      });
    }
  }

  // Nœuds supprimés
  for (const nodeId of nodes1) {
    if (!nodes2Set.has(nodeId)) {
      diff.removed.push(`node:${nodeId}`);
      diff.changes.push({
        type: 'removed',
        id: nodeId,
        field: 'node',
      });
    }
  }

  // Nœuds modifiés
  const nodes1Map = new Map((data1.nodes || []).map((n: any) => [n.id, n]));
  const nodes2Map = new Map((data2.nodes || []).map((n: any) => [n.id, n]));

  for (const nodeId of nodes1) {
    if (nodes2Set.has(nodeId)) {
      const node1 = nodes1Map.get(nodeId);
      const node2 = nodes2Map.get(nodeId);

      if (JSON.stringify(node1) !== JSON.stringify(node2)) {
        diff.modified.push(`node:${nodeId}`);
        // Détecter les champs modifiés
        for (const key in node2) {
          if (node1[key] !== node2[key]) {
            diff.changes.push({
              type: 'modified',
              id: nodeId,
              field: key,
              oldValue: node1[key],
              newValue: node2[key],
            });
          }
        }
      }
    }
  }

  // Comparer les edges (connexions)
  const edges1 = (data1.edges || []).map((e: any) => e.id);
  const edges2 = (data2.edges || []).map((e: any) => e.id);

  const edges1Set = new Set(edges1);
  const edges2Set = new Set(edges2);

  // Edges ajoutés
  for (const edgeId of edges2) {
    if (!edges1Set.has(edgeId)) {
      diff.added.push(`edge:${edgeId}`);
      diff.changes.push({
        type: 'added',
        id: edgeId,
        field: 'edge',
      });
    }
  }

  // Edges supprimés
  for (const edgeId of edges1) {
    if (!edges2Set.has(edgeId)) {
      diff.removed.push(`edge:${edgeId}`);
      diff.changes.push({
        type: 'removed',
        id: edgeId,
        field: 'edge',
      });
    }
  }

  return diff;
}

/**
 * Restaure un workflow à une version précédente
 */
export async function restoreWorkflowVersion(
  workflowId: string,
  versionId: string
): Promise<{ success: boolean; newVersion?: WorkflowVersion }> {
  try {
    // Récupérer la version à restaurer
    const { data: versionToRestore, error: versionError } = await supabase
      .from('workflow_versions')
      .select('*')
      .eq('id', versionId)
      .eq('workflow_id', workflowId)
      .single();

    if (versionError || !versionToRestore) {
      throw new Error('Version non trouvée');
    }

    // Récupérer le workflow actuel
    const { data: workflow } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) {
      throw new Error('Workflow non trouvé');
    }

    // Sauvegarder la version actuelle avant restauration
    await saveWorkflowVersion(
      workflowId,
      workflow,
      'Sauvegarde avant restauration'
    );

    // Restaurer les données du workflow
    const { error: updateError } = await supabase
      .from('automated_actions')
      .update({
        ...versionToRestore.workflowData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId);

    if (updateError) {
      throw updateError;
    }

    // Créer une nouvelle version à partir de la version restaurée
    const restoredVersion = await saveWorkflowVersion(
      workflowId,
      versionToRestore.workflowData,
      `Restauration depuis version ${versionToRestore.version}`
    );

    return {
      success: true,
      newVersion: restoredVersion,
    };
  } catch (error) {
    console.error('Erreur restauration version workflow:', error);
    return { success: false };
  }
}

/**
 * Exporte un workflow au format JSON
 */
export async function exportWorkflow(workflowId: string): Promise<string> {
  try {
    const { data: workflow, error } = await supabase
      .from('automated_actions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow non trouvé');
    }

    // Récupérer aussi les versions
    const versions = await getWorkflowVersions(workflowId);

    const exportData = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        workflowData: workflow.workflowData || workflow,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      },
      versions: versions.map(v => ({
        version: v.version,
        workflowData: v.workflowData,
        changelog: v.changelog,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
      })),
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Erreur export workflow:', error);
    throw error;
  }
}

/**
 * Importe un workflow depuis un fichier JSON
 */
export async function importWorkflow(
  jsonData: string,
  options: {
    createNew?: boolean; // Créer un nouveau workflow ou remplacer existant
    importVersions?: boolean; // Importer aussi l'historique des versions
    workflowId?: string; // ID du workflow à remplacer (si createNew = false)
  } = {}
): Promise<{ workflowId: string; versionsImported: number }> {
  try {
    const {
      createNew = true,
      importVersions = false,
      workflowId: existingWorkflowId,
    } = options;

    // Parser le JSON
    const importData = JSON.parse(jsonData);

    if (!importData.workflow) {
      throw new Error('Format JSON invalide : champ workflow manquant');
    }

    const workflowData = importData.workflow;

    // Récupérer l'utilisateur actuel
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      throw new Error('Utilisateur non authentifié');
    }

    let newWorkflowId: string;

    if (createNew) {
      // Créer un nouveau workflow
      const { data: newWorkflow, error: createError } = await supabase
        .from('automated_actions')
        .insert({
          name: `${workflowData.name} (importé)`,
          description: workflowData.description,
          category: workflowData.category || 'custom',
          workflow_data: workflowData.workflowData,
          is_active: false, // Désactivé par défaut pour validation
          created_by: userId,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      newWorkflowId = newWorkflow.id;
    } else {
      // Remplacer le workflow existant
      if (!existingWorkflowId) {
        throw new Error('workflowId requis pour remplacer un workflow existant');
      }

      const { error: updateError } = await supabase
        .from('automated_actions')
        .update({
          name: workflowData.name,
          description: workflowData.description,
          category: workflowData.category,
          workflow_data: workflowData.workflowData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWorkflowId);

      if (updateError) {
        throw updateError;
      }

      newWorkflowId = existingWorkflowId;
    }

    // Importer les versions si demandé
    let versionsImported = 0;
    if (importVersions && importData.versions && Array.isArray(importData.versions)) {
      for (const versionData of importData.versions) {
        try {
          await supabase
            .from('workflow_versions')
            .insert({
              workflow_id: newWorkflowId,
              version: versionData.version,
              name: workflowData.name,
              description: workflowData.description,
              workflow_data: versionData.workflowData,
              created_by: versionData.createdBy || userId,
              changelog: versionData.changelog || `Importé depuis version ${versionData.version}`,
              is_current_version: false, // Seule la version actuelle est courante
            });

          versionsImported++;
        } catch (error) {
          console.warn('Erreur import version:', error);
        }
      }
    }

    // Créer une version initiale pour le workflow importé
    await saveWorkflowVersion(
      newWorkflowId,
      workflowData.workflowData,
      createNew ? 'Import initial' : 'Import et remplacement'
    );

    return {
      workflowId: newWorkflowId,
      versionsImported,
    };
  } catch (error) {
    console.error('Erreur import workflow:', error);
    throw error;
  }
}

