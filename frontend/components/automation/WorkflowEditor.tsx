import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, Save, X, Zap, Mail, Tag, User, Clock, GitBranch, Settings, AlertTriangle, CheckCircle, Info, ZoomIn, ZoomOut, Maximize2, Search, GripVertical, LayoutGrid, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { AutomationWorkflow, WorkflowNode, WorkflowEdge, TriggerType, ActionType } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { SearchBar } from '../ui/SearchBar';
import { validateConditionGroup, ValidationResult, ValidationError } from '../../lib/utils/conditionValidator';
import { ConditionGroup } from '../../lib/utils/conditionEvaluator';
import { WorkflowResultsMonitoring } from '../../lib/services/workflowResultsMonitoring';
import { useEffect } from 'react';

interface WorkflowEditorProps {
  workflow?: AutomationWorkflow;
  onSave: (workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

const TRIGGER_TYPES: { value: TriggerType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'lead_created', label: 'Lead créé', icon: User, color: 'bg-emerald-500' },
  { value: 'email_open', label: 'Email ouvert', icon: Mail, color: 'bg-blue-500' },
  { value: 'email_click', label: 'Clic email', icon: Mail, color: 'bg-indigo-500' },
  { value: 'tag_added', label: 'Tag ajouté', icon: Tag, color: 'bg-purple-500' },
  { value: 'form_submit', label: 'Formulaire soumis', icon: Settings, color: 'bg-pink-500' },
  { value: 'page_visit', label: 'Visite page', icon: Settings, color: 'bg-amber-500' },
];

const ACTION_TYPES: { value: ActionType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'send_email', label: 'Envoyer email', icon: Mail, color: 'bg-blue-500' },
  { value: 'add_tag', label: 'Ajouter tag', icon: Tag, color: 'bg-purple-500' },
  { value: 'remove_tag', label: 'Retirer tag', icon: Tag, color: 'bg-rose-500' },
  { value: 'change_status', label: 'Changer statut', icon: Settings, color: 'bg-indigo-500' },
  { value: 'assign_to', label: 'Assigner à', icon: User, color: 'bg-emerald-500' },
  { value: 'wait', label: 'Attendre', icon: Clock, color: 'bg-amber-500' },
  { value: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-slate-500' },
];

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave, onCancel }) => {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [scenarioType, setScenarioType] = useState(workflow?.scenarioType || 'custom');
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.workflowData?.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow?.workflowData?.edges || []);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'trigger' | 'action' | 'condition' | 'wait'>('action');
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [showValidationPanel, setShowValidationPanel] = useState(true);
  const [workflowAlerts, setWorkflowAlerts] = useState<any[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [workflowMetrics, setWorkflowMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsPeriod, setMetricsPeriod] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
    end: new Date(),
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewNodeType, setPreviewNodeType] = useState<{ type: 'trigger' | 'action' | 'condition' | 'wait'; value?: string } | null>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<'trigger' | 'action' | 'condition' | 'wait' | null>(null);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Charger les métriques du workflow si activé
  useEffect(() => {
    if (workflow?.id && showAnalytics) {
      loadWorkflowMetrics();
    }
  }, [workflow?.id, showAnalytics, metricsPeriod]);

  const loadWorkflowMetrics = async () => {
    if (!workflow?.id) return;
    
    setLoadingMetrics(true);
    try {
      const metrics = await WorkflowResultsMonitoring.getWorkflowResultMetrics(
        workflow.id,
        metricsPeriod
      );
      setWorkflowMetrics(metrics);
    } catch (error) {
      console.error('Error loading workflow metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fonction pour aligner sur la grille
  const snapToGrid = useCallback((x: number, y: number) => {
    const gridSize = 20;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, []);

  const addNode = useCallback((type: 'trigger' | 'action' | 'condition' | 'wait', x: number, y: number) => {
    const id = `node-${Date.now()}`;
    const snapped = showGrid ? snapToGrid(x, y) : { x, y };
    const newNode: WorkflowNode = {
      id,
      type,
      label: type === 'trigger' ? 'Nouveau déclencheur' : type === 'action' ? 'Nouvelle action' : type === 'condition' ? 'Condition' : 'Attendre',
      position: snapped,
      data: {
        triggerType: type === 'trigger' ? 'lead_created' : undefined,
        actionType: type === 'action' ? 'send_email' : undefined,
        delayMinutes: type === 'wait' ? 60 : undefined,
      },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
    setIsNodeModalOpen(true);
  }, [showGrid, snapToGrid]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedNode]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setIsNodeModalOpen(false);
    }
  }, [selectedNode]);

  // Validation d'un nœud condition
  const validateNode = useCallback(async (nodeId: string, node: WorkflowNode) => {
    if (node.type !== 'condition' || !node.data.conditionGroup) {
      // Supprimer la validation si ce n'est pas une condition
      setValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[nodeId];
        return newResults;
      });
      return;
    }

    try {
      const conditionGroup = node.data.conditionGroup as ConditionGroup;
      const result = await validateConditionGroup(conditionGroup);
      setValidationResults(prev => ({
        ...prev,
        [nodeId]: result,
      }));
    } catch (error) {
      console.error('Erreur validation condition:', error);
      setValidationResults(prev => ({
        ...prev,
        [nodeId]: {
          valid: false,
          errors: [{
            type: 'logic',
            severity: 'error',
            message: 'Erreur lors de la validation de la condition',
          }],
          warnings: [],
        },
      }));
    }
  }, []);

  // Valider tous les nœuds conditions au chargement et à chaque modification
  useEffect(() => {
    nodes.forEach(node => {
      if (node.type === 'condition' && node.data.conditionGroup) {
        validateNode(node.id, node);
      } else {
        // Supprimer la validation si ce n'est plus une condition
        setValidationResults(prev => {
          const newResults = { ...prev };
          delete newResults[node.id];
          return newResults;
        });
      }
    });
  }, [nodes, validateNode]);

  // Charger les alertes si le workflow existe
  useEffect(() => {
    if (workflow?.id) {
      loadWorkflowAlerts();
    }
  }, [workflow?.id]);

  const loadWorkflowAlerts = async () => {
    try {
      const { WorkflowAlertsService } = await import('../../lib/services/workflowAlertsService');
      const alerts = await WorkflowAlertsService.getActiveAlerts(workflow!.id!);
      setWorkflowAlerts(alerts);
    } catch (error) {
      console.error('Error loading workflow alerts:', error);
    }
  };


  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `edge-${sourceId}-${targetId}`;
    if (!edges.find(e => e.id === edgeId)) {
      setEdges(prev => [...prev, { id: edgeId, source: sourceId, target: targetId }]);
    }
  }, [edges]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Veuillez entrer un nom pour le workflow');
      return;
    }

    // Vérifier s'il y a des erreurs critiques
    const hasCriticalErrors = Object.values(validationResults).some(result => 
      result.errors && result.errors.length > 0
    );

    if (hasCriticalErrors) {
      if (!confirm('Des erreurs ont été détectées dans les conditions. Voulez-vous vraiment enregistrer le workflow ?')) {
        return;
      }
    }

    const workflowData = {
      nodes,
      edges,
    };

    await onSave({
      name,
      description,
      scenarioType: scenarioType as AutomationWorkflow['scenarioType'],
      status: workflow?.status || 'draft',
      workflowData,
    });
  };

  const handleNodeClick = (node: WorkflowNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNode(node);
    setIsNodeModalOpen(true);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === containerRef.current || event.target === canvasRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      
      // Si on drag depuis la bibliothèque, créer un nœud
      if (isDraggingFromLibrary && draggedNodeType) {
        addNode(draggedNodeType, x, y);
        setIsDraggingFromLibrary(false);
        setDraggedNodeType(null);
      } else {
        setIsNodeModalOpen(true);
      }
    }
  };

  // Gestion du drag des nœuds
  const handleNodeDragStart = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    setDraggedNode(node);
  }, []);

  const handleNodeDrag = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const snapped = showGrid ? snapToGrid(x, y) : { x, y };
    updateNode(draggedNode.id, { position: snapped });
  }, [draggedNode, pan, zoom, showGrid, snapToGrid]);

  const handleNodeDragEnd = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Gestion du pan (déplacement du canvas)
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.ctrlKey && !e.metaKey) return; // Middle mouse ou Ctrl/Cmd
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Recherche de nœuds
  const filteredNodes = nodes.filter(node => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return node.label.toLowerCase().includes(query) ||
           (node.data.triggerType && TRIGGER_TYPES.find(t => t.value === node.data.triggerType)?.label.toLowerCase().includes(query)) ||
           (node.data.actionType && ACTION_TYPES.find(a => a.value === node.data.actionType)?.label.toLowerCase().includes(query));
  });

  // Gestion du drag depuis la bibliothèque
  const handleLibraryDragStart = useCallback((e: React.DragEvent, type: 'trigger' | 'action' | 'condition' | 'wait') => {
    setIsDraggingFromLibrary(true);
    setDraggedNodeType(type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
      if (draggedNode) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = (e.clientX - rect.left - pan.x) / zoom;
          const y = (e.clientY - rect.top - pan.y) / zoom;
          const snapped = showGrid ? snapToGrid(x, y) : { x, y };
          updateNode(draggedNode.id, { position: snapped });
        }
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDraggedNode(null);
    };

    if (isPanning || draggedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart, draggedNode, pan, zoom, showGrid, snapToGrid]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du workflow"
            className="text-xl font-bold mb-2"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            rows={1}
            className="text-sm"
          />
        </div>
        <div className="flex gap-3 ml-6 items-center">
          {/* Alertes visuelles */}
          {Object.values(validationResults).some(r => r.errors && r.errors.length > 0) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                Erreurs détectées - Activation bloquée
              </span>
            </div>
          )}
          {workflowAlerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={AlertTriangle}
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className={workflowAlerts.some(a => a.severity === 'critical') ? 'border-red-500 text-red-600' : ''}
            >
              {workflowAlerts.length} alerte{workflowAlerts.length > 1 ? 's' : ''}
            </Button>
          )}
          <Select
            value={scenarioType}
            onChange={(e) => setScenarioType(e.target.value)}
            options={[
              { label: 'Personnalisé', value: 'custom' },
              { label: 'Onboarding', value: 'onboarding' },
              { label: 'Nurturing', value: 'nurturing' },
              { label: 'Relance', value: 'relance' },
            ]}
            containerClassName="w-40"
          />
          <Button
            variant="outline"
            size="sm"
            icon={BarChart3}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Analytics"
          >
            Analytics
          </Button>
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button 
            icon={Save} 
            onClick={handleSave}
            disabled={Object.values(validationResults).some(r => r.errors && r.errors.length > 0)}
            title={Object.values(validationResults).some(r => r.errors && r.errors.length > 0) ? 'Corrigez les erreurs avant d\'enregistrer' : ''}
          >
            Enregistrer
          </Button>
          {workflow?.id && (
            <Button
              variant="primary"
              icon={Play}
              disabled={Object.values(validationResults).some(r => r.errors && r.errors.length > 0) || nodes.length === 0}
              title={Object.values(validationResults).some(r => r.errors && r.errors.length > 0) ? 'Corrigez les erreurs avant d\'activer' : nodes.length === 0 ? 'Ajoutez au moins un nœud' : 'Activer le workflow'}
            >
              Activer
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mr-2">Ajouter :</span>
          <Button
            size="sm"
            variant="ghost"
            icon={Zap}
            onClick={() => addNode('trigger', 100, 100)}
          >
            Déclencheur
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Mail}
            onClick={() => addNode('action', 300, 100)}
          >
            Action
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={GitBranch}
            onClick={() => addNode('condition', 500, 100)}
          >
            Condition
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Clock}
            onClick={() => addNode('wait', 700, 100)}
          >
            Attendre
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar
            placeholder="Rechercher un nœud..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="w-64"
          />
          <Button
            size="sm"
            variant={showGrid ? 'primary' : 'outline'}
            icon={LayoutGrid}
            onClick={() => setShowGrid(!showGrid)}
            title="Grille magnétique"
          />
          <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-600 pl-2">
            <Button
              size="sm"
              variant="outline"
              icon={ZoomOut}
              onClick={handleZoomOut}
              title="Zoom arrière"
            />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={ZoomIn}
              onClick={handleZoomIn}
              title="Zoom avant"
            />
            <Button
              size="sm"
              variant="outline"
              icon={Maximize2}
              onClick={handleZoomReset}
              title="Réinitialiser zoom"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Bibliothèque de nœuds */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-y-auto shrink-0">
          <div className="p-4">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Bibliothèque de nœuds</h3>
            
            {/* Recherche dans la bibliothèque */}
            <div className="mb-4">
              <SearchBar
                placeholder="Rechercher un nœud..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                containerClassName="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Déclencheurs</h4>
                {TRIGGER_TYPES
                  .filter(trigger => !searchQuery || trigger.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(trigger => {
                    const Icon = trigger.icon;
                    return (
                      <div
                        key={trigger.value}
                        draggable
                        onDragStart={(e) => handleLibraryDragStart(e, 'trigger')}
                        onMouseEnter={() => setPreviewNodeType({ type: 'trigger', value: trigger.value })}
                        onMouseLeave={() => setPreviewNodeType(null)}
                        className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500 mb-2 group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`${trigger.color} p-1.5 rounded text-white`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{trigger.label}</span>
                        </div>
                        {previewNodeType?.type === 'trigger' && previewNodeType.value === trigger.value && (
                          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
                            <p className="font-semibold mb-1">Description</p>
                            <p>Déclenche le workflow lorsque {trigger.label.toLowerCase()}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Actions</h4>
                {ACTION_TYPES
                  .filter(action => !searchQuery || action.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(action => {
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.value}
                        draggable
                        onDragStart={(e) => handleLibraryDragStart(e, 'action')}
                        onMouseEnter={() => setPreviewNodeType({ type: 'action', value: action.value })}
                        onMouseLeave={() => setPreviewNodeType(null)}
                        className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 cursor-move hover:border-indigo-500 transition-all duration-500 mb-2 group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`${action.color} p-1.5 rounded text-white`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</span>
                        </div>
                        {previewNodeType?.type === 'action' && previewNodeType.value === action.value && (
                          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
                            <p className="font-semibold mb-1">Description</p>
                            <p>Exécute l'action : {action.label.toLowerCase()}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900"
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          onClick={handleCanvasClick}
        >
          <div
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Grille */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ minWidth: '2000px', minHeight: '1500px' }}>
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6366f1" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '2000px', minHeight: '1500px' }}>
          {/* Draw edges */}
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            // Pour les nœuds conditionnels, calculer les positions des sorties vrai/faux
            const isConditional = sourceNode.type === 'condition';
            const isTruePath = edge.sourceHandle === 'true';
            const isFalsePath = edge.sourceHandle === 'false';

            // Position de départ (sortie du nœud source)
            let x1 = sourceNode.position.x + 100;
            let y1 = sourceNode.position.y + 40;
            
            if (isConditional) {
              // Pour les conditions, deux sorties : vrai (gauche) et faux (droite)
              if (isTruePath) {
                x1 = sourceNode.position.x + 100;
                y1 = sourceNode.position.y + 30; // Sortie "vrai" en haut
              } else if (isFalsePath) {
                x1 = sourceNode.position.x + 100;
                y1 = sourceNode.position.y + 50; // Sortie "faux" en bas
              }
            }

            // Position d'arrivée (entrée du nœud cible)
            const x2 = targetNode.position.x;
            const y2 = targetNode.position.y + 40;

            // Couleur selon le type de lien
            let strokeColor = '#6366f1'; // Par défaut (indigo)
            if (isConditional) {
              if (isTruePath) {
                strokeColor = '#22c55e'; // Vert pour vrai
              } else if (isFalsePath) {
                strokeColor = '#ef4444'; // Rouge pour faux
              }
            }

            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={isConditional ? 3 : 2}
                strokeDasharray={isFalsePath ? '5,5' : '0'}
                markerEnd={`url(#arrowhead-${isTruePath ? 'green' : isFalsePath ? 'red' : 'blue'})`}
              />
            );
          })}
          <defs>
            <marker id="arrowhead-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
            </marker>
            <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
            </marker>
            <marker id="arrowhead-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
        </svg>

            </svg>

            {/* Draw nodes */}
            {(searchQuery ? filteredNodes : nodes).map(node => {
          const nodeType = TRIGGER_TYPES.find(t => t.value === node.data.triggerType) || 
                          ACTION_TYPES.find(a => a.value === node.data.actionType);
          const Icon = nodeType?.icon || Zap;
          const color = nodeType?.color || 'bg-slate-500';
          const isSelected = selectedNode?.id === node.id;
          const validation = validationResults[node.id];
          const hasErrors = validation && validation.errors && validation.errors.length > 0;
          const hasWarnings = validation && validation.warnings && validation.warnings.length > 0;

          return (
            <div
              key={node.id}
              className={`absolute cursor-move transition-all duration-500 ${isSelected ? 'ring-2 ring-indigo-500' : ''} ${!searchQuery || filteredNodes.includes(node) ? '' : 'opacity-30'}`}
              style={{ left: node.position.x, top: node.position.y }}
              onMouseDown={(e) => handleNodeDragStart(e, node)}
              onClick={(e) => handleNodeClick(node, e)}
            >
              <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 ${
                hasErrors ? 'border-red-500' : 
                hasWarnings ? 'border-yellow-500' : 
                isSelected ? 'border-indigo-500' : 
                'border-slate-200 dark:border-slate-700'
              } p-4 min-w-[200px]`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${color} p-2 rounded-lg text-white`}>
                    <Icon size={16} />
                  </div>
                  <GripVertical size={14} className="text-slate-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{node.label}</span>
                  {hasErrors && (
                    <AlertTriangle size={16} className="text-red-500" title={`${validation.errors.length} erreur(s)`} />
                  )}
                  {hasWarnings && !hasErrors && (
                    <AlertTriangle size={16} className="text-yellow-500" title={`${validation.warnings.length} avertissement(s)`} />
                  )}
                  {validation && validation.valid && !hasWarnings && (
                    <CheckCircle size={16} className="text-green-500" title="Aucune erreur" />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="ml-auto"
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {node.type === 'trigger' && node.data.triggerType && (
                    <Badge>{TRIGGER_TYPES.find(t => t.value === node.data.triggerType)?.label}</Badge>
                  )}
                  {node.type === 'action' && node.data.actionType && (
                    <Badge>{ACTION_TYPES.find(a => a.value === node.data.actionType)?.label}</Badge>
                  )}
                  {node.type === 'wait' && node.data.delayMinutes && (
                    <Badge>Attendre {node.data.delayMinutes} min</Badge>
                  )}
                  {node.type === 'condition' && (
                    <Badge>Condition</Badge>
                  )}
                </div>
                
                {/* Sorties pour les nœuds conditionnels */}
                {node.type === 'condition' && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div 
                      className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/40"
                      title="Chemin si condition vraie"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // TODO: Démarrer la création d'une connexion "vrai"
                      }}
                    >
                      ✓ Vrai
                    </div>
                    <div 
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/40"
                      title="Chemin si condition fausse"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // TODO: Démarrer la création d'une connexion "faux"
                      }}
                    >
                      ✗ Faux
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Configuration Modal */}
      <Modal
        isOpen={isNodeModalOpen}
        onClose={() => {
          setIsNodeModalOpen(false);
          setSelectedNode(null);
        }}
        title={selectedNode ? `Configurer ${selectedNode.type === 'trigger' ? 'le déclencheur' : 'l\'action'}` : 'Ajouter un élément'}
      >
        {selectedNode && (
          <div className="space-y-4">
            <Input
              label="Libellé"
              value={selectedNode.label}
              onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
            />
            {selectedNode.type === 'trigger' && (
              <Dropdown
                label="Type de déclencheur"
                value={selectedNode.data.triggerType || 'lead_created'}
                onChange={(value) => updateNode(selectedNode.id, {
                  data: { ...selectedNode.data, triggerType: value },
                  label: TRIGGER_TYPES.find(t => t.value === value)?.label || selectedNode.label,
                })}
                options={TRIGGER_TYPES.map(t => ({ label: t.label, value: t.value }))}
              />
            )}
            {selectedNode.type === 'action' && (
              <Dropdown
                label="Type d'action"
                value={selectedNode.data.actionType || 'send_email'}
                onChange={(value) => updateNode(selectedNode.id, {
                  data: { ...selectedNode.data, actionType: value },
                  label: ACTION_TYPES.find(a => a.value === value)?.label || selectedNode.label,
                })}
                options={ACTION_TYPES.map(a => ({ label: a.label, value: a.value }))}
              />
            )}
            {selectedNode.type === 'wait' && (
              <Input
                label="Délai (minutes)"
                type="number"
                value={selectedNode.data.delayMinutes || 60}
                onChange={(e) => updateNode(selectedNode.id, {
                  data: { ...selectedNode.data, delayMinutes: parseInt(e.target.value) || 60 },
                })}
              />
            )}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => {
                setIsNodeModalOpen(false);
                setSelectedNode(null);
              }}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Analytics Panel */}
      {showAnalytics && workflow?.id && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-slate-500" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Résultats du workflow</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAnalytics(false)}
            >
              Fermer
            </Button>
          </div>
          <div className="p-4 space-y-4">
            {loadingMetrics ? (
              <div className="text-center py-8 text-slate-500">Chargement des métriques...</div>
            ) : workflowMetrics ? (
              <>
                {/* Métriques d'email */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Métriques d'email</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Envoyés</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.emailMetrics.sent}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Taux d'ouverture</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.emailMetrics.openRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Taux de clic</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.emailMetrics.clickRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Score d'engagement</div>
                      <div className={`text-lg font-bold ${
                        workflowMetrics.engagementScore >= 70 ? 'text-green-600 dark:text-green-400' :
                        workflowMetrics.engagementScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {workflowMetrics.engagementScore.toFixed(1)}/100
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métriques de conversion */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Métriques de conversion</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Leads convertis</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.conversionMetrics.leadsConverted}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Taux de conversion</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.conversionMetrics.conversionRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Temps moyen</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflowMetrics.conversionMetrics.averageTimeToConversion.toFixed(1)} jours
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparaison avec benchmarks */}
                {workflowMetrics && (() => {
                  const benchmark = WorkflowResultsMonitoring.getBenchmarkComparison(workflowMetrics);
                  return (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Comparaison avec benchmarks</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Taux d'ouverture</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {benchmark.openRate.current.toFixed(1)}%
                            </span>
                            <span className="text-xs text-slate-500">vs {benchmark.openRate.benchmark}%</span>
                            {benchmark.openRate.status === 'above' && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                Au-dessus
                              </Badge>
                            )}
                            {benchmark.openRate.status === 'below' && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                En dessous
                              </Badge>
                            )}
                            {benchmark.openRate.status === 'equal' && (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                Égal
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Taux de clic</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {benchmark.clickRate.current.toFixed(1)}%
                            </span>
                            <span className="text-xs text-slate-500">vs {benchmark.clickRate.benchmark}%</span>
                            {benchmark.clickRate.status === 'above' && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                Au-dessus
                              </Badge>
                            )}
                            {benchmark.clickRate.status === 'below' && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                En dessous
                              </Badge>
                            )}
                            {benchmark.clickRate.status === 'equal' && (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                Égal
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Taux de conversion</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {benchmark.conversionRate.current.toFixed(1)}%
                            </span>
                            <span className="text-xs text-slate-500">vs {benchmark.conversionRate.benchmark}%</span>
                            {benchmark.conversionRate.status === 'above' && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                Au-dessus
                              </Badge>
                            )}
                            {benchmark.conversionRate.status === 'below' && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                En dessous
                              </Badge>
                            )}
                            {benchmark.conversionRate.status === 'equal' && (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                Égal
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Aucune donnée disponible pour cette période. Le workflow doit être activé et avoir des exécutions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Panel */}
      {showValidationPanel && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-slate-500" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Validation</span>
              {Object.keys(validationResults).length > 0 && (
                <Badge>
                  {Object.values(validationResults).reduce((acc, r) => acc + (r.errors?.length || 0), 0)} erreur(s), {' '}
                  {Object.values(validationResults).reduce((acc, r) => acc + (r.warnings?.length || 0), 0)} avertissement(s)
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowValidationPanel(!showValidationPanel)}
            >
              {showValidationPanel ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
          <div className="p-4 space-y-3">
            {Object.keys(validationResults).length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle size={16} className="text-green-500" />
                <span>Aucune condition à valider</span>
              </div>
            ) : (
              Object.entries(validationResults).map(([nodeId, result]) => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return null;

                return (
                  <div key={nodeId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {node.label}
                      </span>
                      {result.valid && !result.warnings?.length && (
                        <CheckCircle size={16} className="text-green-500" />
                      )}
                      {!result.valid && (
                        <AlertTriangle size={16} className="text-red-500" />
                      )}
                      {result.warnings?.length > 0 && result.valid && (
                        <AlertTriangle size={16} className="text-yellow-500" />
                      )}
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                            <span>❌</span>
                            <div>
                              <div>{error.message}</div>
                              {error.suggestion && (
                                <div className="text-xs text-slate-500 mt-1">💡 {error.suggestion}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="space-y-1">
                        {result.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                            <span>⚠️</span>
                            <div>
                              <div>{warning.message}</div>
                              {warning.suggestion && (
                                <div className="text-xs text-slate-500 mt-1">💡 {warning.suggestion}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.valid && (!result.warnings || result.warnings.length === 0) && (
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle size={16} />
                        <span>Aucune erreur détectée</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

