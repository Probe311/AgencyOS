import React, { useState, useRef, useCallback } from 'react';
import { Save, X, Plus, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { WidgetLibrary, WIDGET_TYPES, WidgetType } from './WidgetLibrary';
import { ReportWidget } from './ReportWidget';
import { ReportBuilderService, ReportWidget as ReportWidgetType, CustomReport } from '../../lib/services/reportBuilderService';
import { useApp } from '../contexts/AppContext';

interface ReportBuilderProps {
  reportId?: string;
  onClose?: () => void;
  onSave?: (reportId: string) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  reportId,
  onClose,
  onSave,
}) => {
  const { showToast, user } = useApp();
  const [widgets, setWidgets] = useState<ReportWidgetType[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    try {
      const report = await ReportBuilderService.getReport(reportId!);
      setWidgets(report.widgets || []);
      setReportName(report.name);
      setReportDescription(report.description || '');
    } catch (error: any) {
      showToast('Erreur lors du chargement du rapport', 'error');
    }
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    const newWidget: ReportWidgetType = {
      id: `widget-${Date.now()}-${Math.random()}`,
      type: widgetType.id as any,
      position: { x: 50, y: 50 },
      size: widgetType.defaultSize,
      config: {},
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
  };

  const handleUpdateWidget = (updatedWidget: ReportWidgetType) => {
    setWidgets(widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetTypeId = e.dataTransfer.getData('widgetType');
    
    if (widgetTypeId) {
      const widgetType = WIDGET_TYPES.find(wt => wt.id === widgetTypeId);
      if (widgetType) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const newWidget: ReportWidgetType = {
            id: `widget-${Date.now()}-${Math.random()}`,
            type: widgetTypeId as any,
            position: { x: Math.max(0, x - widgetType.defaultSize.width / 2), y: Math.max(0, y - widgetType.defaultSize.height / 2) },
            size: widgetType.defaultSize,
            config: {},
          };
          setWidgets([...widgets, newWidget]);
        }
      }
    } else if (draggedWidget) {
      // Déplacer un widget existant
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setWidgets(widgets.map(w => 
          w.id === draggedWidget 
            ? { ...w, position: { x: Math.max(0, x - w.size.width / 2), y: Math.max(0, y - w.size.height / 2) } }
            : w
        ));
      }
    }
    
    setDraggedWidget(null);
  };

  const handleSave = async () => {
    if (!reportName.trim()) {
      showToast('Veuillez entrer un nom pour le rapport', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const report = await ReportBuilderService.saveReport(
        reportName,
        widgets,
        {
          description: reportDescription,
          reportId,
          userId: user?.id,
        }
      );
      
      showToast('Rapport sauvegardé avec succès', 'success');
      setIsSaveModalOpen(false);
      if (onSave) {
        onSave(report.id);
      }
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-900 dark:text-white">Builder de rapports</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Eye} onClick={() => {}}>
            Prévisualiser
          </Button>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" icon={Save} onClick={() => setIsSaveModalOpen(true)}>
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Bibliothèque de widgets */}
        <WidgetLibrary onAddWidget={handleAddWidget} />

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 relative"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={handleCanvasDrop}
          onClick={(e) => {
            if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-area')) {
              setSelectedWidget(null);
            }
          }}
        >
          <div className="canvas-area min-h-full p-8" style={{ position: 'relative' }}>
            {widgets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <p className="text-lg font-medium mb-2">Commencez à construire votre rapport</p>
                  <p className="text-sm">Glissez-déposez des widgets depuis la bibliothèque</p>
                </div>
              </div>
            )}
            
            {widgets.map((widget) => (
              <ReportWidget
                key={widget.id}
                widget={widget}
                onUpdate={handleUpdateWidget}
                onDelete={handleDeleteWidget}
                onDragStart={handleDragStart}
                isSelected={selectedWidget === widget.id}
                onSelect={() => setSelectedWidget(widget.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal Sauvegarde */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Sauvegarder le rapport"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom du rapport *"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="Ex: Rapport mensuel"
          />
          <Input
            label="Description"
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Description du rapport"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || !reportName.trim()}>
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

