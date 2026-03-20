import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Layout, Save } from 'lucide-react';
import { DashboardWidgetConfig, DashboardWidgetType } from '../../lib/services/dashboardService';
import { DashboardWidget } from './DashboardWidget';
import { WidgetPreview } from './WidgetPreview';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Dropdown } from '../ui/Dropdown';

interface WidgetGridProps {
  widgets: DashboardWidgetConfig[];
  onUpdateWidget: (widgetId: string, updates: Partial<DashboardWidgetConfig>) => void;
  onDeleteWidget: (widgetId: string) => void;
  onAddWidget: (type: DashboardWidgetType, x: number, y: number, w: number, h: number, highlighted?: boolean) => void;
  isEditMode?: boolean;
  gridCols?: number;
  isAddWidgetModalOpen?: boolean;
  onCloseAddWidgetModal?: () => void;
  onOpenAddWidgetModal?: () => void;
}

// Tailles de blocs disponibles dans la grille 8x8
const AVAILABLE_BLOCK_SIZES = [
  { w: 1, h: 1, label: '1x1 (Petit widget)' },
  { w: 2, h: 1, label: '2x1 (1/4 largeur, 1 ligne)' },
  { w: 2, h: 2, label: '2x2 (1/4 largeur, 2 lignes)' },
  { w: 2, h: 3, label: '2x3 (1/4 largeur, 3 lignes)' },
  { w: 2, h: 4, label: '2x4 (1/4 largeur, 4 lignes)' },
  { w: 2, h: 6, label: '2x6 (1/4 largeur, 6 lignes)' },
  { w: 2, h: 8, label: '2x8 (1/4 largeur, 8 lignes)' },
  { w: 4, h: 2, label: '4x2 (1/2 largeur, 2 lignes)' },
  { w: 4, h: 3, label: '4x3 (1/2 largeur, 3 lignes)' },
  { w: 4, h: 4, label: '4x4 (1/2 largeur, 4 lignes)' },
  { w: 6, h: 2, label: '6x2 (3/4 largeur, 2 lignes)' },
  { w: 6, h: 3, label: '6x3 (3/4 largeur, 3 lignes)' },
  { w: 6, h: 4, label: '6x4 (3/4 largeur, 4 lignes)' },
  { w: 8, h: 2, label: '8x2 (Pleine largeur, 2 lignes)' },
  { w: 8, h: 3, label: '8x3 (Pleine largeur, 3 lignes)' },
  { w: 8, h: 4, label: '8x4 (Pleine largeur, 4 lignes)' },
];

const AVAILABLE_WIDGET_TYPES: Array<{ value: DashboardWidgetType; label: string; defaultW: number; defaultH: number; category: string }> = [
  // Carte de bienvenue
  { value: 'welcome_card', label: 'Carte de bienvenue', defaultW: 8, defaultH: 4, category: 'Spécial' },
  // KPI
  { value: 'kpi_revenue', label: 'KPI Revenu', defaultW: 2, defaultH: 2, category: 'KPI' },
  { value: 'kpi_leads', label: 'KPI Leads', defaultW: 2, defaultH: 2, category: 'KPI' },
  { value: 'kpi_tasks', label: 'KPI Tâches', defaultW: 2, defaultH: 2, category: 'KPI' },
  { value: 'kpi_conversion', label: 'KPI Conversion', defaultW: 2, defaultH: 2, category: 'KPI' },
  { value: 'kpi_total_projects', label: 'KPI Total Projets', defaultW: 2, defaultH: 2, category: 'KPI' },
  { value: 'kpi_total_acquisition', label: 'KPI Total Acquisition', defaultW: 2, defaultH: 2, category: 'KPI' },
  // Graphiques
  { value: 'chart_revenue', label: 'Graphique Revenus (Aire)', defaultW: 6, defaultH: 4, category: 'Graphiques' },
  { value: 'chart_leads', label: 'Graphique Leads (Barres)', defaultW: 6, defaultH: 4, category: 'Graphiques' },
  { value: 'chart_pie', label: 'Graphique en Secteurs', defaultW: 4, defaultH: 4, category: 'Graphiques' },
  { value: 'chart_bar', label: 'Graphique en Barres', defaultW: 6, defaultH: 4, category: 'Graphiques' },
  { value: 'chart_projects_data', label: 'Données Projets (Pending/Running/Ended)', defaultW: 4, defaultH: 3, category: 'Graphiques' },
  { value: 'chart_acquisition_data', label: 'Données Acquisition (Pending/Running/Ended)', defaultW: 4, defaultH: 3, category: 'Graphiques' },
  { value: 'workload_status', label: 'Charge de travail par statut', defaultW: 4, defaultH: 4, category: 'Graphiques' },
  { value: 'sales_by_category', label: 'Ventes par catégorie', defaultW: 4, defaultH: 4, category: 'Graphiques' },
  { value: 'monthly_income', label: 'Revenus mensuels', defaultW: 6, defaultH: 4, category: 'Graphiques' },
  { value: 'project_progress', label: 'Progression Projets (Jauge)', defaultW: 4, defaultH: 3, category: 'Graphiques' },
  // Listes
  { value: 'task_list', label: 'Liste Tâches', defaultW: 4, defaultH: 4, category: 'Listes' },
  { value: 'lead_list', label: 'Liste Leads', defaultW: 8, defaultH: 2, category: 'Listes' },
  { value: 'project_list', label: 'Liste Projets', defaultW: 4, defaultH: 4, category: 'Listes' },
  { value: 'activity_feed', label: 'Flux d\'activité', defaultW: 6, defaultH: 4, category: 'Listes' },
  { value: 'notifications', label: 'Notifications', defaultW: 4, defaultH: 4, category: 'Listes' },
  // Autres
  { value: 'calendar', label: 'Calendrier', defaultW: 6, defaultH: 6, category: 'Autres' },
];

// Hauteur d'une cellule de grille en pixels
const GRID_CELL_HEIGHT = 120; // pixels
const GRID_COLS = 8; // Nombre de colonnes dans la grille

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  onUpdateWidget,
  onDeleteWidget,
  onAddWidget,
  isEditMode = false,
  gridCols = GRID_COLS,
  isAddWidgetModalOpen: externalIsAddWidgetModalOpen,
  onCloseAddWidgetModal: externalOnCloseAddWidgetModal,
  onOpenAddWidgetModal: externalOnOpenAddWidgetModal,
}) => {
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [internalIsAddWidgetModalOpen, setInternalIsAddWidgetModalOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [newWidgetType, setNewWidgetType] = useState<DashboardWidgetType>('kpi_revenue');
  const [newWidgetSize, setNewWidgetSize] = useState<{ w: number; h: number }>({ w: 2, h: 2 });
  const [newWidgetHighlighted, setNewWidgetHighlighted] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingWidgetId, setResizingWidgetId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  // Utiliser la modal externe si fournie, sinon la modal interne
  const isAddWidgetModalOpen = externalIsAddWidgetModalOpen !== undefined 
    ? externalIsAddWidgetModalOpen 
    : internalIsAddWidgetModalOpen;
  
  const setIsAddWidgetModalOpen = (open: boolean) => {
    if (externalIsAddWidgetModalOpen !== undefined) {
      // Si la modale est contrôlée depuis l'extérieur
      if (open && externalOnOpenAddWidgetModal) {
        externalOnOpenAddWidgetModal();
      } else if (!open && externalOnCloseAddWidgetModal) {
        externalOnCloseAddWidgetModal();
      }
    } else {
      // Modale contrôlée en interne
      setInternalIsAddWidgetModalOpen(open);
    }
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditMode) return;
    setDraggedWidgetId(widgetId);
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const cellWidth = rect.width / GRID_COLS;
      setDragOffset({
        x: e.clientX - rect.left - (widget.x * cellWidth),
        y: e.clientY - rect.top - (widget.y * GRID_CELL_HEIGHT),
      });
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isEditMode || !gridRef.current) return;
      e.preventDefault();

      if (draggedWidgetId) {
        const rect = gridRef.current.getBoundingClientRect();
        const cellWidth = rect.width / GRID_COLS;
        const x = Math.floor((e.clientX - rect.left) / cellWidth);
        const y = Math.floor((e.clientY - rect.top) / GRID_CELL_HEIGHT);

        const widget = widgets.find((w) => w.id === draggedWidgetId);
        if (widget && (widget.x !== x || widget.y !== y)) {
          // Préserver la taille (w et h) lors du déplacement
          onUpdateWidget(draggedWidgetId, {
            x: Math.max(0, Math.min(GRID_COLS - widget.w, x)),
            y: Math.max(0, y),
            w: widget.w, // Préserver la largeur
            h: widget.h, // Préserver la hauteur
          });
        }
      }
    },
    [isEditMode, draggedWidgetId, widgets, onUpdateWidget]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isEditMode || !gridRef.current) return;
      e.preventDefault();

      const widgetType = e.dataTransfer.getData('widgetType') as DashboardWidgetType;
      if (widgetType && AVAILABLE_WIDGET_TYPES.find((t) => t.value === widgetType)) {
        const widgetTypeConfig = AVAILABLE_WIDGET_TYPES.find((t) => t.value === widgetType)!;
        const rect = gridRef.current.getBoundingClientRect();
        const cellWidth = rect.width / GRID_COLS;
        const x = Math.floor((e.clientX - rect.left) / cellWidth);
        const y = Math.floor((e.clientY - rect.top) / GRID_CELL_HEIGHT);

        onAddWidget(
          widgetType,
          Math.max(0, Math.min(GRID_COLS - widgetTypeConfig.defaultW, x)),
          Math.max(0, y),
          widgetTypeConfig.defaultW,
          widgetTypeConfig.defaultH
        );
      }

      setDraggedWidgetId(null);
    },
    [isEditMode, onAddWidget]
  );

  // Gestion du redimensionnement
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, widgetId: string, direction: 'se' | 'sw' | 'ne' | 'nw') => {
      if (!isEditMode) return;
      e.stopPropagation();
      e.preventDefault();
      setResizingWidgetId(widgetId);
      setResizeDirection(direction);
      const widget = widgets.find((w) => w.id === widgetId);
      if (widget && gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        setResizeStart({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          w: widget.w,
          h: widget.h,
        });
      }
    },
    [isEditMode, widgets]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingWidgetId || !resizeDirection || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const cellWidth = rect.width / GRID_COLS;
      const deltaX = (e.clientX - rect.left - resizeStart.x) / cellWidth;
      const deltaY = (e.clientY - rect.top - resizeStart.y) / GRID_CELL_HEIGHT;

      const widget = widgets.find((w) => w.id === resizingWidgetId);
      if (!widget) return;

      let newW = resizeStart.w;
      let newH = resizeStart.h;
      let newX = widget.x;
      let newY = widget.y;

      // Calculer la nouvelle taille selon la direction
      switch (resizeDirection) {
        case 'se': // Sud-Est (coin inférieur droit)
          newW = Math.max(2, Math.min(GRID_COLS - widget.x, Math.round(resizeStart.w + deltaX)));
          newH = Math.max(2, Math.round(resizeStart.h + deltaY));
          break;
        case 'sw': // Sud-Ouest (coin inférieur gauche)
          newW = Math.max(2, Math.min(widget.x + widget.w, Math.round(resizeStart.w - deltaX)));
          newH = Math.max(2, Math.round(resizeStart.h + deltaY));
          newX = widget.x + widget.w - newW;
          break;
        case 'ne': // Nord-Est (coin supérieur droit)
          newW = Math.max(2, Math.min(GRID_COLS - widget.x, Math.round(resizeStart.w + deltaX)));
          newH = Math.max(2, Math.min(widget.y + widget.h, Math.round(resizeStart.h - deltaY)));
          newY = widget.y + widget.h - newH;
          break;
        case 'nw': // Nord-Ouest (coin supérieur gauche)
          newW = Math.max(2, Math.min(widget.x + widget.w, Math.round(resizeStart.w - deltaX)));
          newH = Math.max(2, Math.min(widget.y + widget.h, Math.round(resizeStart.h - deltaY)));
          newX = widget.x + widget.w - newW;
          newY = widget.y + widget.h - newH;
          break;
      }

      // S'assurer que les valeurs sont dans les limites de la grille
      newX = Math.max(0, Math.min(GRID_COLS - newW, newX));
      newY = Math.max(0, newY);
      newW = Math.max(2, Math.min(GRID_COLS - newX, newW));
      newH = Math.max(2, newH);

      onUpdateWidget(resizingWidgetId, {
        x: newX,
        y: newY,
        w: newW,
        h: newH,
      });
    },
    [resizingWidgetId, resizeDirection, resizeStart, widgets, onUpdateWidget]
  );

  const handleMouseUp = useCallback(() => {
    setResizingWidgetId(null);
    setResizeDirection(null);
  }, []);

  useEffect(() => {
    if (resizingWidgetId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingWidgetId, handleMouseMove, handleMouseUp]);

  const handleAddWidget = () => {
    if (editingWidgetId) {
      // Mise à jour du widget existant
      const widget = widgets.find((w) => w.id === editingWidgetId);
      if (widget) {
        onUpdateWidget(editingWidgetId, {
          type: newWidgetType,
          w: newWidgetSize.w,
          h: newWidgetSize.h,
          highlighted: newWidgetHighlighted,
        });
      }
      setEditingWidgetId(null);
    } else {
      // Ajout d'un nouveau widget
      const maxY = widgets.length > 0 ? Math.max(...widgets.map((w) => w.y + w.h)) : 0;
      onAddWidget(newWidgetType, 0, maxY, newWidgetSize.w, newWidgetSize.h, newWidgetHighlighted);
    }
    setIsAddWidgetModalOpen(false);
    // Réinitialiser à la taille par défaut
    const widgetTypeConfig = AVAILABLE_WIDGET_TYPES.find((t) => t.value === newWidgetType);
    if (widgetTypeConfig) {
      setNewWidgetSize({ w: widgetTypeConfig.defaultW, h: widgetTypeConfig.defaultH });
      setNewWidgetHighlighted(false);
    }
  };

  const handleEditWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget) {
      setEditingWidgetId(widgetId);
      setNewWidgetType(widget.type);
      setNewWidgetSize({ w: widget.w, h: widget.h });
      setNewWidgetHighlighted(widget.highlighted || false);
      setIsAddWidgetModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsAddWidgetModalOpen(false);
    setEditingWidgetId(null);
    // Réinitialiser à la taille par défaut
    const widgetTypeConfig = AVAILABLE_WIDGET_TYPES.find((t) => t.value === newWidgetType);
    if (widgetTypeConfig) {
      setNewWidgetSize({ w: widgetTypeConfig.defaultW, h: widgetTypeConfig.defaultH });
      setNewWidgetHighlighted(false);
    }
  };

  // Calculer la hauteur totale nécessaire
  const maxY = widgets.length > 0 ? Math.max(...widgets.map((w) => w.y + w.h)) : 8;
  const gridRows = Math.max(8, maxY);

  return (
    <>
      <div
        ref={gridRef}
        className={`relative grid grid-cols-8 gap-2 ${isEditMode ? 'bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg' : ''}`}
        style={{ 
          gridTemplateRows: `repeat(${gridRows}, ${GRID_CELL_HEIGHT}px)`,
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => setSelectedWidgetId(null)}
      >
        {/* Lignes de grille visibles en mode édition */}
        {isEditMode && (
          <>
            {/* Lignes verticales */}
            {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute top-0 bottom-0 border-l border-slate-300 dark:border-slate-600 pointer-events-none"
                style={{
                  left: `${(i * 100) / GRID_COLS}%`,
                  zIndex: 0,
                }}
              />
            ))}
            {/* Lignes horizontales */}
            {Array.from({ length: gridRows + 1 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 border-t border-slate-300 dark:border-slate-600 pointer-events-none"
                style={{
                  top: `${i * GRID_CELL_HEIGHT}px`,
                  zIndex: 0,
                }}
              />
            ))}
          </>
        )}
        {widgets.map((widget) => {
          // Utiliser grid-column et grid-row pour positionner les widgets
          const gridColumnStart = widget.x + 1;
          const gridColumnEnd = widget.x + widget.w + 1;
          const gridRowStart = widget.y + 1;
          const gridRowEnd = widget.y + widget.h + 1;

          return (
            <div
              key={widget.id}
              className="relative z-0"
              style={{
                gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
                gridRow: `${gridRowStart} / ${gridRowEnd}`,
              }}
            >
              <DashboardWidget
                widget={widget}
                onUpdate={onUpdateWidget}
                onDelete={onDeleteWidget}
                onDragStart={handleDragStart}
                isSelected={selectedWidgetId === widget.id}
                onSelect={setSelectedWidgetId}
                gridCols={GRID_COLS}
                isEditMode={isEditMode}
                onResizeStart={handleResizeStart}
                onEdit={handleEditWidget}
              />
            </div>
          );
        })}
      </div>

      {/* Modal ajouter/éditer widget */}
      <Modal
        isOpen={isAddWidgetModalOpen}
        onClose={handleCloseModal}
        title={editingWidgetId ? "Modifier le widget" : "Ajouter un widget"}
      >
        <div className="space-y-6">
          <div>
            <Dropdown
              label="Type de widget"
              value={newWidgetType}
              onChange={(value) => {
                const type = value as DashboardWidgetType;
                setNewWidgetType(type);
                const widgetTypeConfig = AVAILABLE_WIDGET_TYPES.find((t) => t.value === type);
                if (widgetTypeConfig) {
                  setNewWidgetSize({ w: widgetTypeConfig.defaultW, h: widgetTypeConfig.defaultH });
                }
              }}
              options={AVAILABLE_WIDGET_TYPES.map((type) => ({
                value: type.value,
                label: `${type.category} - ${type.label} (Recommandé: ${type.defaultW}x${type.defaultH})`,
              }))}
              placeholder="Sélectionner un type de widget"
            />
            {(() => {
              const selectedType = AVAILABLE_WIDGET_TYPES.find((t) => t.value === newWidgetType);
              return selectedType ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-1">
                  Taille recommandée : {selectedType.defaultW}x{selectedType.defaultH}
                </p>
              ) : null;
            })()}
          </div>

          <div>
            <label className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={newWidgetHighlighted}
                onChange={(e) => setNewWidgetHighlighted(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
              />
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mettre en avant le widget
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Affiche le widget avec un fond coloré pour le mettre en évidence
                </div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Taille du bloc (grille 8x8)
            </label>
            
            {/* Sélecteurs de largeur et hauteur */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Largeur</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{newWidgetSize.w} colonnes</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {[1, 2, 4, 6, 8].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        const maxW = Math.min(w, GRID_COLS);
                        setNewWidgetSize(prev => ({ ...prev, w: maxW }));
                      }}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        newWidgetSize.w === w
                          ? 'border-indigo-500 bg-indigo-500 text-white font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                      style={{ gridColumn: `span ${w === 8 ? 8 : w === 6 ? 6 : w === 4 ? 4 : w === 2 ? 2 : 1}` }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hauteur</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{newWidgetSize.h} lignes</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 6, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setNewWidgetSize(prev => ({ ...prev, h }))}
                      className={`h-12 rounded-lg border-2 transition-all flex items-center justify-center ${
                        newWidgetSize.h === h
                          ? 'border-indigo-500 bg-indigo-500 text-white font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600'
                      }`}
                    >
                      {h} ligne{h > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Prévisualisation du widget */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Aperçu
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50 flex items-start justify-center">
              <WidgetPreview type={newWidgetType} size={newWidgetSize} highlighted={newWidgetHighlighted} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleAddWidget}>
              {editingWidgetId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

