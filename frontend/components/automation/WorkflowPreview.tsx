import React from 'react';
import { AutomationWorkflow, WorkflowNode, WorkflowEdge } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Zap, Mail, Tag, User, Clock, GitBranch, Settings, ArrowRight } from 'lucide-react';

interface WorkflowPreviewProps {
  workflow: AutomationWorkflow;
  isOpen: boolean;
  onClose: () => void;
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  lead_created: User,
  email_open: Mail,
  email_click: Mail,
  tag_added: Tag,
  form_submit: Settings,
  page_visit: Settings,
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  add_tag: Tag,
  remove_tag: Tag,
  change_status: Settings,
  assign_to: User,
  wait: Clock,
  condition: GitBranch,
};

const getNodeIcon = (node: WorkflowNode): React.ElementType => {
  if (node.type === 'trigger' && node.data.triggerType) {
    return TRIGGER_ICONS[node.data.triggerType] || Zap;
  }
  if (node.type === 'action' && node.data.actionType) {
    return ACTION_ICONS[node.data.actionType] || Zap;
  }
  if (node.type === 'condition') {
    return GitBranch;
  }
  if (node.type === 'wait') {
    return Clock;
  }
  return Zap;
};

const getNodeColor = (node: WorkflowNode): string => {
  if (node.type === 'trigger') {
    return 'bg-emerald-500';
  }
  if (node.type === 'action') {
    return 'bg-blue-500';
  }
  if (node.type === 'condition') {
    return 'bg-amber-500';
  }
  if (node.type === 'wait') {
    return 'bg-purple-500';
  }
  return 'bg-slate-500';
};

export const WorkflowPreview: React.FC<WorkflowPreviewProps> = ({ workflow, isOpen, onClose }) => {
  // Vérification de sécurité
  if (!workflow) {
    return null;
  }

  const nodes = workflow.workflowData?.nodes || [];
  const edges = workflow.workflowData?.edges || [];

  // Organiser les nœuds par niveau (pour un affichage en colonnes)
  const organizeNodesByLevel = () => {
    if (nodes.length === 0) return [];

    // Trouver les nœuds racines (sans entrées)
    const rootNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    const levels: WorkflowNode[][] = [];
    const processed = new Set<string>();

    const processLevel = (currentNodes: WorkflowNode[], level: number) => {
      if (currentNodes.length === 0) return;

      if (!levels[level]) {
        levels[level] = [];
      }

      currentNodes.forEach(node => {
        if (!processed.has(node.id)) {
          levels[level].push(node);
          processed.add(node.id);
        }
      });

      // Trouver les nœuds suivants
      const nextNodes: WorkflowNode[] = [];
      currentNodes.forEach(node => {
        const outgoingEdges = edges.filter(edge => edge.source === node.id);
        outgoingEdges.forEach(edge => {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode && !processed.has(targetNode.id)) {
            nextNodes.push(targetNode);
          }
        });
      });

      if (nextNodes.length > 0) {
        processLevel(nextNodes, level + 1);
      }
    };

    processLevel(rootNodes, 0);
    return levels;
  };

  const levels = organizeNodesByLevel();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Prévisualisation : ${workflow.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Informations générales */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 dark:text-white">Informations</h3>
            <Badge
              className={
                workflow.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : workflow.status === 'paused'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }
            >
              {workflow.status === 'active' ? 'Actif' : workflow.status === 'paused' ? 'En pause' : 'Brouillon'}
            </Badge>
          </div>
          {workflow.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{workflow.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{nodes.length} nœuds</span>
            <span>{edges.length} connexions</span>
            {workflow.scenarioType && workflow.scenarioType !== 'custom' && (
              <Badge variant="outline">{workflow.scenarioType}</Badge>
            )}
          </div>
        </div>

        {/* Schéma du workflow */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 overflow-auto">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Schéma du workflow</h3>
          
          {nodes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Zap size={48} className="mx-auto mb-4 opacity-20" />
              <p>Aucun nœud dans ce workflow</p>
            </div>
          ) : (
            <div className="relative" style={{ minHeight: '400px' }}>
              {/* Vue en colonnes (niveaux) */}
              <div className="flex gap-8 items-start">
                {levels.map((levelNodes, levelIndex) => (
                  <div key={levelIndex} className="flex flex-col gap-4 min-w-[200px]">
                    {levelNodes.map((node) => {
                      const Icon = getNodeIcon(node);
                      const color = getNodeColor(node);
                      const outgoingEdges = edges.filter(edge => edge.source === node.id);
                      const incomingEdges = edges.filter(edge => edge.target === node.id);

                      return (
                        <div
                          key={node.id}
                          className="bg-white dark:bg-slate-800 rounded-lg shadow-md border-2 border-slate-200 dark:border-slate-700 p-4 relative"
                        >
                          {/* Indicateur de connexions entrantes */}
                          {incomingEdges.length > 0 && (
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                              <ArrowRight className="text-slate-400" size={16} />
                            </div>
                          )}

                          <div className="flex items-center gap-3 mb-2">
                            <div className={`${color} p-2 rounded-lg text-white shrink-0`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {node.label}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {node.type === 'trigger' && node.data.triggerType && (
                                  <Badge size="sm" variant="outline">
                                    {node.data.triggerType}
                                  </Badge>
                                )}
                                {node.type === 'action' && node.data.actionType && (
                                  <Badge size="sm" variant="outline">
                                    {node.data.actionType}
                                  </Badge>
                                )}
                                {node.type === 'wait' && node.data.delayMinutes && (
                                  <Badge size="sm" variant="outline">
                                    {node.data.delayMinutes} min
                                  </Badge>
                                )}
                                {node.type === 'condition' && (
                                  <Badge size="sm" variant="outline">
                                    Condition
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Indicateur de connexions sortantes */}
                          {outgoingEdges.length > 0 && (
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                              <ArrowRight className="text-indigo-500" size={16} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Légende */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Légende</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Déclencheur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Action</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Condition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Attendre</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

