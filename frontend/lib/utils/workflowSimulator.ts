/**
 * Service de simulation de workflows pour tester avant activation
 * Permet d'exécuter un workflow en mode test sur des leads de test ou un échantillon
 */

import { Lead } from '../../types';
import { AutomatedAction, ActionExecution } from '../supabase/hooks/useAutomatedActions';
import { ConditionGroup } from './conditionEvaluator';
import { evaluateConditionGroup } from './conditionEvaluator';
import { validateConditionGroup } from './conditionValidator';

export interface WorkflowSimulation {
  workflowId: string;
  workflowName: string;
  leadId: string;
  leadName: string;
  executionResults: SimulationResult[];
  validationErrors: string[];
  warnings: string[];
  isValid: boolean;
  estimatedActions: EstimatedAction[];
}

export interface SimulationResult {
  actionId: string;
  actionName: string;
  actionType: string;
  wouldExecute: boolean;
  reason?: string;
  conditionResult?: boolean;
  estimatedDuration?: number; // ms
  estimatedCost?: number; // Si applicable (SMS, API, etc.)
}

export interface EstimatedAction {
  type: string;
  description: string;
  wouldExecute: boolean;
  conditions: {
    field: string;
    operator: string;
    value: any;
    result: boolean;
  }[];
}

export interface WorkflowConfig {
  name: string;
  description?: string;
  trigger?: {
    type: string;
    conditions?: ConditionGroup;
  };
  actions: AutomatedAction[];
  conditions?: ConditionGroup; // Conditions globales du workflow
}

/**
 * Simule l'exécution d'un workflow sur un lead de test
 */
export async function simulateWorkflow(
  workflow: WorkflowConfig,
  lead: Lead,
  options?: {
    dryRun?: boolean; // Si true, n'exécute pas réellement les actions
    validateOnly?: boolean; // Si true, valide seulement sans simuler
  }
): Promise<WorkflowSimulation> {
  const simulation: WorkflowSimulation = {
    workflowId: workflow.name,
    workflowName: workflow.name,
    leadId: lead.id,
    leadName: lead.name || lead.company_name || 'Lead sans nom',
    executionResults: [],
    validationErrors: [],
    warnings: [],
    isValid: true,
    estimatedActions: [],
  };

  // 1. Valider le workflow
  if (workflow.conditions) {
    const validation = await validateConditionGroup(workflow.conditions, lead);
    if (!validation.valid) {
      simulation.isValid = false;
      simulation.validationErrors = validation.errors.map(e => e.message);
    }
    simulation.warnings = validation.warnings.map(w => w.message);
  }

  // Si validation seulement, retourner maintenant
  if (options?.validateOnly) {
    return simulation;
  }

  // 2. Vérifier le déclencheur
  let triggerMatches = true;
  if (workflow.trigger?.conditions) {
    triggerMatches = await evaluateConditionGroup(lead, workflow.trigger.conditions);
    if (!triggerMatches) {
      simulation.executionResults.push({
        actionId: 'trigger',
        actionName: 'Déclencheur du workflow',
        actionType: workflow.trigger.type,
        wouldExecute: false,
        reason: 'Les conditions du déclencheur ne sont pas remplies',
        conditionResult: false,
      });
      return simulation;
    }
  }

  // 3. Vérifier les conditions globales
  let globalConditionsMatch = true;
  if (workflow.conditions) {
    globalConditionsMatch = await evaluateConditionGroup(lead, workflow.conditions);
    if (!globalConditionsMatch) {
      simulation.executionResults.push({
        actionId: 'global_conditions',
        actionName: 'Conditions globales',
        actionType: 'condition',
        wouldExecute: false,
        reason: 'Les conditions globales ne sont pas remplies',
        conditionResult: false,
      });
      return simulation;
    }
  }

  // 4. Simuler chaque action
  for (const action of workflow.actions) {
    const result = await simulateAction(action, lead, workflow.conditions);
    simulation.executionResults.push(result);
    
    // Estimer la durée et le coût
    result.estimatedDuration = estimateActionDuration(action);
    result.estimatedCost = estimateActionCost(action);
  }

  return simulation;
}

/**
 * Simule l'exécution d'une action
 */
async function simulateAction(
  action: AutomatedAction,
  lead: Lead,
  globalConditions?: ConditionGroup
): Promise<SimulationResult> {
  const result: SimulationResult = {
    actionId: action.id,
    actionName: action.name,
    actionType: action.actionType,
    wouldExecute: false,
  };

  // Vérifier les conditions de l'action (si présentes dans config)
  if (action.config.conditions) {
    try {
      const conditionGroup = action.config.conditions as ConditionGroup;
      result.conditionResult = await evaluateConditionGroup(lead, conditionGroup);
      result.wouldExecute = result.conditionResult;
      
      if (!result.conditionResult) {
        result.reason = 'Les conditions de l\'action ne sont pas remplies';
      }
    } catch (error) {
      result.wouldExecute = false;
      result.reason = `Erreur lors de l'évaluation des conditions: ${error}`;
    }
  } else {
    // Pas de conditions = exécution toujours
    result.wouldExecute = true;
  }

  // Vérifier les conditions globales si présentes
  if (globalConditions && result.wouldExecute) {
    const globalResult = await evaluateConditionGroup(lead, globalConditions);
    result.wouldExecute = result.wouldExecute && globalResult;
    if (!globalResult) {
      result.reason = 'Les conditions globales du workflow ne sont pas remplies';
    }
  }

  return result;
}

/**
 * Estime la durée d'exécution d'une action (en ms)
 */
function estimateActionDuration(action: AutomatedAction): number {
  const baseDurations: Record<string, number> = {
    'email': 500, // 500ms pour envoi email
    'sms': 300,
    'whatsapp': 400,
    'in_app_notification': 100,
    'slack_notification': 200,
    'teams_notification': 200,
    'voip_call': 0, // Nécessite interaction humaine
    'update_status': 100,
    'update_scoring': 100,
    'update_temperature': 100,
    'update_tags': 100,
    'update_custom_field': 100,
    'bulk_update': 500,
    'create_task': 200,
    'create_appointment': 200,
    'create_note': 100,
    'create_quote': 1000, // Plus long (calculs)
    'create_project': 500,
    'assign_lead': 300,
    'reassign_lead': 400,
    'escalate_to_manager': 200,
    'transfer_to_team': 300,
    'enrich_lead': 3000, // Enrichissement IA peut prendre du temps
  };

  return baseDurations[action.actionType] || 500;
}

/**
 * Estime le coût d'une action (si applicable)
 */
function estimateActionCost(action: AutomatedAction): number {
  const costs: Record<string, number> = {
    'sms': 0.05, // Exemple: 5 centimes par SMS
    'whatsapp': 0.03,
    'voip_call': 0.10, // Exemple: 10 centimes par minute
    'enrich_lead': 0.02, // Coût API d'enrichissement
  };

  return costs[action.actionType] || 0;
}

/**
 * Teste un workflow sur un échantillon de leads
 */
export async function testWorkflowOnSample(
  workflow: WorkflowConfig,
  leads: Lead[],
  options?: {
    sampleSize?: number; // Nombre de leads à tester (10, 20, 50, ou pourcentage)
    samplePercentage?: number; // Pourcentage (10, 20, 50)
    dryRun?: boolean;
  }
): Promise<{
  totalLeads: number;
  testedLeads: number;
  simulations: WorkflowSimulation[];
  summary: {
    totalActions: number;
    totalEstimatedDuration: number; // ms
    totalEstimatedCost: number;
    leadsTriggered: number; // Nombre de leads qui déclenchent le workflow
    actionsExecuted: number; // Nombre d'actions qui seraient exécutées
    averageActionsPerLead: number;
    errorRate: number; // Pourcentage de leads avec erreurs
  };
}> {
  // Sélectionner l'échantillon
  let sampleLeads: Lead[];
  if (options?.samplePercentage) {
    const sampleCount = Math.ceil((leads.length * options.samplePercentage) / 100);
    sampleLeads = leads.slice(0, sampleCount);
  } else if (options?.sampleSize) {
    sampleLeads = leads.slice(0, options.sampleSize);
  } else {
    // Par défaut: 10% ou max 50 leads
    const sampleCount = Math.min(Math.ceil(leads.length * 0.1), 50);
    sampleLeads = leads.slice(0, sampleCount);
  }

  // Simuler pour chaque lead
  const simulations: WorkflowSimulation[] = [];
  for (const lead of sampleLeads) {
    const simulation = await simulateWorkflow(workflow, lead, options);
    simulations.push(simulation);
  }

  // Calculer le résumé
  const leadsTriggered = simulations.filter(s => 
    s.executionResults.some(r => r.wouldExecute) || s.executionResults.length === 0
  ).length;
  
  const actionsExecuted = simulations.reduce((sum, s) => 
    sum + s.executionResults.filter(r => r.wouldExecute).length, 0
  );

  const totalEstimatedDuration = simulations.reduce((sum, s) => 
    sum + s.executionResults
      .filter(r => r.wouldExecute)
      .reduce((actionSum, r) => actionSum + (r.estimatedDuration || 0), 0), 0
  );

  const totalEstimatedCost = simulations.reduce((sum, s) => 
    sum + s.executionResults
      .filter(r => r.wouldExecute)
      .reduce((actionSum, r) => actionSum + (r.estimatedCost || 0), 0), 0
  );

  const errorLeads = simulations.filter(s => !s.isValid || s.validationErrors.length > 0).length;

  return {
    totalLeads: leads.length,
    testedLeads: sampleLeads.length,
    simulations,
    summary: {
      totalActions: workflow.actions.length,
      totalEstimatedDuration,
      totalEstimatedCost,
      leadsTriggered,
      actionsExecuted,
      averageActionsPerLead: leadsTriggered > 0 ? actionsExecuted / leadsTriggered : 0,
      errorRate: (errorLeads / sampleLeads.length) * 100,
    },
  };
}

/**
 * Génère un lead de test pour la simulation
 */
export function generateTestLead(overrides?: Partial<Lead>): Lead {
  return {
    id: 'test-lead-' + Date.now(),
    name: overrides?.name || 'Test Lead',
    email: overrides?.email || 'test@example.com',
    company_name: overrides?.company_name || 'Test Company',
    scoring: overrides?.scoring ?? 75,
    temperature: overrides?.temperature || 'Chaud',
    sector: overrides?.sector || 'Tech',
    family: overrides?.family || 'Startups',
    status: overrides?.status || 'Nouveau',
    lifecycle_stage: overrides?.lifecycle_stage || 'Lead',
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    ...overrides,
  } as Lead;
}

/**
 * Formate les résultats de simulation pour affichage
 */
export function formatSimulationResults(simulation: WorkflowSimulation): string {
  const lines: string[] = [];

  lines.push(`\n📊 Simulation du workflow "${simulation.workflowName}"`);
  lines.push(`Lead: ${simulation.leadName} (${simulation.leadId})\n`);

  if (!simulation.isValid) {
    lines.push('❌ Workflow invalide:');
    simulation.validationErrors.forEach(error => {
      lines.push(`  - ${error}`);
    });
    lines.push('');
  }

  if (simulation.warnings.length > 0) {
    lines.push('⚠️ Avertissements:');
    simulation.warnings.forEach(warning => {
      lines.push(`  - ${warning}`);
    });
    lines.push('');
  }

  if (simulation.executionResults.length === 0) {
    lines.push('ℹ️ Aucune action à exécuter (déclencheur non activé)');
    return lines.join('\n');
  }

  lines.push('Actions qui seraient exécutées:');
  simulation.executionResults.forEach((result, index) => {
    const icon = result.wouldExecute ? '✅' : '❌';
    lines.push(`\n${index + 1}. ${icon} ${result.actionName} (${result.actionType})`);
    if (result.wouldExecute) {
      if (result.estimatedDuration) {
        lines.push(`   Durée estimée: ${result.estimatedDuration}ms`);
      }
      if (result.estimatedCost && result.estimatedCost > 0) {
        lines.push(`   Coût estimé: ${result.estimatedCost.toFixed(2)}€`);
      }
    } else {
      lines.push(`   Raison: ${result.reason || 'Non exécuté'}`);
    }
  });

  const totalDuration = simulation.executionResults
    .filter(r => r.wouldExecute)
    .reduce((sum, r) => sum + (r.estimatedDuration || 0), 0);
  const totalCost = simulation.executionResults
    .filter(r => r.wouldExecute)
    .reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  lines.push(`\n📈 Résumé:`);
  lines.push(`  - Actions exécutées: ${simulation.executionResults.filter(r => r.wouldExecute).length}/${simulation.executionResults.length}`);
  if (totalDuration > 0) {
    lines.push(`  - Durée totale estimée: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  }
  if (totalCost > 0) {
    lines.push(`  - Coût total estimé: ${totalCost.toFixed(2)}€`);
  }

  return lines.join('\n');
}

